import logging
from typing import Literal, List, Union, Dict, Optional, Tuple, Any
from clients.deepl_client import DeepLQuotaExceededError, translate_text_deepl, get_rate_limit_status
import json
import httpx
import os
import asyncio
import time
import hashlib
import random
from baml_client import b

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
TRANSLATION_CACHE_SIZE = int(os.getenv("TRANSLATION_CACHE_SIZE", "1000"))
TRANSLATION_CACHE_TTL = int(os.getenv("TRANSLATION_CACHE_TTL", "86400"))  # 24 hours in seconds
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "50"))  # Increased maximum number of texts in a single batch
MIN_TEXT_LENGTH_FOR_TRANSLATION = int(os.getenv("MIN_TEXT_LENGTH_FOR_TRANSLATION", "5"))  # Minimum text length to translate
MAX_RETRIES = int(os.getenv("MAX_TRANSLATION_RETRIES", "1"))  # Reduced retries to improve latency
MAX_TEXT_LENGTH_PER_BATCH = int(os.getenv("MAX_TEXT_LENGTH_PER_BATCH", "5000"))  # Maximum total characters in a batch

# Request deduplication window (in seconds)
DEDUPLICATION_WINDOW = float(os.getenv("DEDUPLICATION_WINDOW", "0.05"))  # Reduced deduplication window

# --- RATE LIMITING ---
BASE_RETRY_DELAY = float(os.getenv("BASE_RETRY_DELAY", "0.5"))  # Reduced base delay
MAX_RETRY_DELAY = float(os.getenv("MAX_RETRY_DELAY", "5.0"))   # Reduced max delay
RETRY_JITTER = float(os.getenv("RETRY_JITTER", "0.1"))        # Reduced jitter
CONCURRENT_REQUESTS_LIMIT = int(os.getenv("CONCURRENT_REQUESTS_LIMIT", "20"))  # Increased concurrency

# Semaphore to limit concurrent API calls
api_semaphore = asyncio.Semaphore(CONCURRENT_REQUESTS_LIMIT)

# --- TRANSLATION CACHE ---
# Simple in-memory cache with TTL
translation_cache: Dict[str, Tuple[str, float]] = {}  # {cache_key: (translated_text, timestamp)}

# For request deduplication - track recent requests within deduplication window
recent_requests: Dict[str, Tuple[asyncio.Task, float]] = {}  # {request_key: (task, timestamp)}

# For batch deduplication - longer window for batch requests
batch_deduplication_cache: Dict[str, Tuple[List[str], float]] = {}  # {batch_key: (results, timestamp)}

# Cache metrics
cache_metrics = {
    "hits": 0,
    "misses": 0,
    "batch_hits": 0,
    "batch_misses": 0,
    "deduplication_hits": 0,
    "baml_success": 0,
    "baml_failure": 0,
    "deepl_success": 0,
    "deepl_failure": 0,
    "rate_limit_retries": 0
}

# Locks for thread safety
cache_lock = asyncio.Lock()
deduplication_lock = asyncio.Lock()

def _get_cache_key(text: str, target_lang: str) -> str:
    """Generate a cache key for a translation request"""
    return hashlib.md5(f"{text}:{target_lang}".encode()).hexdigest()

def _get_batch_cache_key(texts: List[str], target_lang: str) -> str:
    """Generate a cache key for a batch translation request"""
    # Sort texts to ensure consistent hashing regardless of order
    sorted_texts = sorted(texts)
    combined = "||".join(sorted_texts) + f":{target_lang}"
    return hashlib.md5(combined.encode()).hexdigest()

def _get_request_key(text: Union[str, List[str]], target_lang: str, field_name: str = None) -> str:
    """Generate a unique key for request deduplication"""
    if isinstance(text, list):
        content = _get_batch_cache_key(text, target_lang)
    else:
        content = _get_cache_key(text, target_lang)
    return f"{content}:{field_name or 'unknown'}"

async def _cleanup_expired_entries():
    """Clean up expired cache and deduplication entries"""
    now = time.time()
    
    async with cache_lock:
        # Clean up translation cache
        expired_keys = [
            key for key, (_, timestamp) in translation_cache.items()
            if now - timestamp > TRANSLATION_CACHE_TTL
        ]
        for key in expired_keys:
            del translation_cache[key]
        
        # Clean up batch deduplication cache
        expired_batch_keys = [
            key for key, (_, timestamp) in batch_deduplication_cache.items()
            if now - timestamp > TRANSLATION_CACHE_TTL
        ]
        for key in expired_batch_keys:
            del batch_deduplication_cache[key]
    
    async with deduplication_lock:
        # Clean up recent requests (much shorter TTL)
        expired_request_keys = [
            key for key, (task, timestamp) in recent_requests.items()
            if now - timestamp > DEDUPLICATION_WINDOW or task.done()
        ]
        for key in expired_request_keys:
            del recent_requests[key]

def _get_from_cache(cache_key: str) -> Optional[str]:
    """Get a translation from cache if it exists and is not expired"""
    if cache_key in translation_cache:
        translated_text, timestamp = translation_cache[cache_key]
        if time.time() - timestamp < TRANSLATION_CACHE_TTL:
            cache_metrics["hits"] += 1
            return translated_text
        else:
            # Remove expired entry
            del translation_cache[cache_key]
    
    cache_metrics["misses"] += 1
    return None

def _get_batch_from_cache(texts: List[str], target_lang: str) -> Optional[List[str]]:
    """Get a batch translation from cache if available and not expired"""
    key = _get_batch_cache_key(texts, target_lang)
    if key in batch_deduplication_cache:
        results, timestamp = batch_deduplication_cache[key]
        if time.time() - timestamp < TRANSLATION_CACHE_TTL:
            cache_metrics["batch_hits"] += 1
            return results
        else:
            # Remove expired entry
            del batch_deduplication_cache[key]
    
    cache_metrics["batch_misses"] += 1
    return None

def _add_to_cache(text: str, translated: str, target_lang: str) -> None:
    """Add a translation to cache with current timestamp"""
    # Ensure cache doesn't grow too large by removing oldest entries
    if len(translation_cache) >= TRANSLATION_CACHE_SIZE:
        oldest_key = min(translation_cache.items(), key=lambda x: x[1][1])[0]
        del translation_cache[oldest_key]
    
    key = _get_cache_key(text, target_lang)
    translation_cache[key] = (translated, time.time())

def _add_batch_to_cache(texts: List[str], results: List[str], target_lang: str) -> None:
    """Add a batch translation to cache with current timestamp"""
    # Limit the number of batch requests we store to avoid memory issues
    if len(batch_deduplication_cache) >= 50:  # Store up to 50 recent batch requests
        oldest_key = min(batch_deduplication_cache.items(), key=lambda x: x[1][1])[0]
        del batch_deduplication_cache[oldest_key]
    
    key = _get_batch_cache_key(texts, target_lang)
    batch_deduplication_cache[key] = (results, time.time())
    
    # Also add individual translations to the main cache
    for i, text in enumerate(texts):
        if i < len(results):
            _add_to_cache(text, results[i], target_lang)

async def _exponential_backoff_with_jitter(attempt: int) -> float:
    """Calculate exponential backoff delay with jitter"""
    delay = min(BASE_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
    jitter = random.uniform(-RETRY_JITTER * delay, RETRY_JITTER * delay)
    return max(0.1, delay + jitter)  # Minimum 100ms delay

async def _retry_with_exponential_backoff(func, *args, **kwargs):
    """
    Execute a function with exponential backoff retry logic.
    Handles rate limits (HTTP 429) and other transient errors.
    """
    last_exception = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            # Use the semaphore to limit concurrent API calls
            async with api_semaphore:
                return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            
            # Check if it's a rate limit error (HTTP 429)
            is_rate_limit = False
            is_transient = False
            
            if isinstance(e, DeepLQuotaExceededError):
                is_transient = False # Not a transient error, should not be retried
            elif isinstance(e, httpx.HTTPStatusError):
                if e.response.status_code == 429:
                    is_rate_limit = True
                    is_transient = True
                elif 500 <= e.response.status_code < 600:
                    is_transient = True
            elif any(keyword in str(e).lower() for keyword in ["429", "rate limit", "too many requests", "timeout", "connection"]):
                is_rate_limit = True
                is_transient = True
            
            # If we've exhausted our retries or it's not a transient error
            if attempt >= MAX_RETRIES or not is_transient:
                if is_rate_limit:
                    logger.error(f"Rate limit exceeded after {attempt+1} attempts: {e}")
                    cache_metrics["rate_limit_retries"] += attempt
                raise e
                
            # Track rate limit retries
            if is_rate_limit:
                cache_metrics["rate_limit_retries"] += 1
            
            # Calculate backoff delay with exponential increase and jitter
            wait_time = await _exponential_backoff_with_jitter(attempt)
            
            logger.warning(f"Translation API request failed (attempt {attempt+1}/{MAX_RETRIES+1}): {e}. Retrying in {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
    
    # This should never happen, but just in case
    raise last_exception or Exception("Unknown error in retry logic")

# Circuit breaker pattern to prevent overwhelming failing services
class CircuitBreaker:
    def __init__(self, name, failure_threshold=3, reset_timeout=180):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout  # seconds
        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.lock = asyncio.Lock()
    
    async def execute(self, func, *args, **kwargs):
        async with self.lock:
            # Check if circuit should be reset
            if self.state == "OPEN" and time.time() - self.last_failure_time > self.reset_timeout:
                logger.info(f"Circuit breaker {self.name} changing from OPEN to HALF-OPEN")
                self.state = "HALF-OPEN"
            
            # If circuit is open, fail fast
            if self.state == "OPEN":
                remaining = int(self.reset_timeout - (time.time() - self.last_failure_time))
                logger.warning(f"Circuit breaker {self.name} is OPEN. Failing fast. Will retry in {remaining}s")
                raise Exception(f"Circuit breaker {self.name} is open. Service temporarily unavailable.")
        
        # Execute the function
        try:
            result = await func(*args, **kwargs)
            
            # If successful and in HALF-OPEN, close the circuit
            if self.state == "HALF-OPEN":
                async with self.lock:
                    logger.info(f"Circuit breaker {self.name} changing from HALF-OPEN to CLOSED")
                    self.state = "CLOSED"
                    self.failures = 0
            
            return result
            
        except Exception as e:
            # Record the failure
            async with self.lock:
                self.failures += 1
                self.last_failure_time = time.time()
                
                # If too many failures, open the circuit
                if self.state == "CLOSED" and self.failures >= self.failure_threshold:
                    logger.warning(f"Circuit breaker {self.name} changing from CLOSED to OPEN after {self.failures} failures")
                    self.state = "OPEN"
                elif self.state == "HALF-OPEN":
                    logger.warning(f"Circuit breaker {self.name} changing from HALF-OPEN back to OPEN after failure")
                    self.state = "OPEN"
            
            raise e

# Create circuit breakers for each translation service
baml_circuit = CircuitBreaker("BAML", failure_threshold=3, reset_timeout=180)  # 3 minutes

# --- MAIN TRANSLATION SERVICE ---
async def translate(text: Union[str, List[str]], target_lang: Literal["EN", "PT"] = "EN", field_name: str = None) -> Union[str, List[str]]:
    """    
    Translate text using DeepL as primary, fall back to BAML if DeepL fails.
    Can handle either a single string or a list of strings.
    target_lang: "EN" for English, "PT" for Portuguese (Brazilian)
    field_name: Optional name of the field being translated (for better logging)
    Returns translated text (or list of translated texts), or raises Exception if all fail.
    """
    # Clean up expired entries periodically
    if random.random() < 0.1:  # 10% chance to clean up
        asyncio.create_task(_cleanup_expired_entries())
    
    # Handle batch translation if text is a list
    if isinstance(text, list):
        return await _translate_batch_with_deduplication(text, target_lang, field_name)
    
    # Single text translation
    return await _translate_single_with_deduplication(text, target_lang, field_name)

async def _translate_single_with_deduplication(text: str, target_lang: Literal["EN", "PT"], field_name: str = None) -> str:
    """
    Thread-safe wrapper for single text translation with request deduplication.
    """
    # Generate a unique key for this request
    request_key = _get_request_key(text, target_lang, field_name)
    
    async with deduplication_lock:
        # Check if this exact request is already in progress within the deduplication window
        if request_key in recent_requests:
            task, timestamp = recent_requests[request_key]
            if time.time() - timestamp <= DEDUPLICATION_WINDOW and not task.done():
                logger.info(f"Deduplicating translation request for text: {text[:50]}...")
                cache_metrics["deduplication_hits"] += 1
                try:
                    # Wait for the existing task to complete
                    return await task
                except Exception as e:
                    # If the existing task failed, we'll try again
                    logger.warning(f"Deduplicated translation failed: {e}, will retry")
                    pass
        
        # Create a new task for this request
        task = asyncio.create_task(_translate_single_text(text, target_lang, field_name))
        recent_requests[request_key] = (task, time.time())
    
    try:
        # Wait for our task to complete
        result = await task
        return result
    finally:
        # Clean up completed tasks (will be cleaned up by periodic cleanup too)
        pass

async def _translate_batch_with_deduplication(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Thread-safe wrapper for batch translation with request deduplication.
    """
    # Generate a unique key for this request
    request_key = _get_request_key(texts, target_lang, field_name)
    
    async with deduplication_lock:
        # Check if this exact request is already in progress within the deduplication window
        if request_key in recent_requests:
            task, timestamp = recent_requests[request_key]
            if time.time() - timestamp <= DEDUPLICATION_WINDOW and not task.done():
                logger.info(f"Deduplicating batch translation request for {len(texts)} items")
                cache_metrics["deduplication_hits"] += 1
                try:
                    # Wait for the existing task to complete
                    return await task
                except Exception as e:
                    # If the existing task failed, we'll try again
                    logger.warning(f"Deduplicated batch translation failed: {e}, will retry")
                    pass
        
        # Create a new task for this request
        task = asyncio.create_task(_translate_batch(texts, target_lang, field_name))
        recent_requests[request_key] = (task, time.time())
    
    try:
        # Wait for our task to complete
        result = await task
        return result
    finally:
        # Clean up completed tasks (will be cleaned up by periodic cleanup too)
        pass

async def _translate_batch(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Efficiently translate a batch of texts with caching and filtering.
    """
    if not texts:
        return []

    # Log diagnostic information
    total_chars = sum(len(text) for text in texts)
    logger.info(f"🔍 TRANSLATION BATCH DEBUG: {len(texts)} items, {total_chars} chars, field: {field_name or 'unknown'}")
    
    # Use a copy to avoid modifying the original list
    final_results = list(texts)
    
    # Check cache for the entire batch first
    cached_results = _get_batch_from_cache(texts, target_lang)
    if cached_results:
        logger.debug(f"Batch cache hit for {field_name or 'unknown field'}")
        return cached_results

    # Filter out texts that are already translated (from individual cache) or too short
    texts_to_translate = []
    original_indices = []
    for i, text in enumerate(texts):
        if not text or len(text.strip()) < MIN_TEXT_LENGTH_FOR_TRANSLATION:
            continue

        cache_key = _get_cache_key(text, target_lang)
        cached_translation = _get_from_cache(cache_key)
        
        if cached_translation:
            final_results[i] = cached_translation
        else:
            texts_to_translate.append(text)
            original_indices.append(i)

    if not texts_to_translate:
        logger.debug("All texts in batch were either cached or too short.")
        return final_results

# Log rate limit status before processing
    rate_status = get_rate_limit_status()
    logger.info(f"🔍 RATE LIMIT STATUS before batch: {rate_status['burst_capacity']['available']}/{rate_status['burst_capacity']['capacity']} chars available")
    
    # Translate the remaining texts in optimized batches
    translated_texts = []
    
    # Use adaptive batch sizing based on current rate limit status
    adaptive_batch_size = _calculate_adaptive_batch_size(rate_status, len(texts_to_translate))
    logger.info(f"🔍 ADAPTIVE BATCH SIZE: {adaptive_batch_size} (original max: {MAX_BATCH_SIZE})")
    
    # Process in smaller, adaptive batches to avoid rate limiting
    for i in range(0, len(texts_to_translate), adaptive_batch_size):
        batch = texts_to_translate[i:i + adaptive_batch_size]
        batch_chars = sum(len(text) for text in batch)
        logger.info(f"🔍 PROCESSING BATCH: {len(batch)} items, {batch_chars} chars")
        
        try:
            translated_batch = await _translate_batch_with_fallback(batch, target_lang, field_name)
            translated_texts.extend(translated_batch)
            logger.info(f"✅ BATCH SUCCESS: {len(batch)} items translated")
        except Exception as e:
            logger.error(f"❌ BATCH FAILED for field '{field_name}': {e}")
            # If a batch fails, we keep the original text for that batch
            translated_texts.extend(batch)

    # Map the translated texts back to their original positions
    for i, translated_text in enumerate(translated_texts):
        if i < len(original_indices):
            original_index = original_indices[i]
            final_results[original_index] = translated_text
        else:
            logger.warning(f"Mismatch between translated texts and original indices. Index {i} is out of bounds.")

    # Cache the entire batch result
    _add_batch_to_cache(texts, final_results, target_lang)
    
    return final_results

async def _translate_batch_with_fallback(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Translate a batch of texts with DeepL primary, BAML fallback.
    Uses intelligent batching and circuit breaker for service protection.
    """
    # Helper function for DeepL translation
    async def _deepl_translate_batch():
        deepl_target = "EN-US" if target_lang == "EN" else "PT-BR"
        batch_chars = sum(len(text) for text in texts)
        logger.info(f"🌐 DEEPL ATTEMPT: {len(texts)} items, {batch_chars} chars → {deepl_target}")
        
        try:
            # Check if we have quota before attempting DeepL
            rate_limit_status = get_rate_limit_status()
            logger.info(f"🔍 QUOTA CHECK: {rate_limit_status['burst_capacity']['available']}/{rate_limit_status['burst_capacity']['capacity']} chars available")
            
            if rate_limit_status and rate_limit_status.get('quota_exceeded', False):
                logger.warning("🚫 DEEPL QUOTA EXCEEDED, skipping attempt")
                raise Exception("DeepL quota exceeded - skipping retry")
                
            # DeepL can handle larger batches efficiently with character-based limiting
            translated = await _retry_with_exponential_backoff(
                translate_text_deepl,
                texts,
                target_lang=deepl_target
            )
            
            if translated and len(translated) == len(texts):
                logger.info(f"✅ DEEPL SUCCESS: {len(texts)} items translated")
                cache_metrics["deepl_success"] += len(texts)
                return translated
            else:
                logger.warning(f"❌ DEEPL INCOMPLETE: got {len(translated) if translated else 0} of {len(texts)} items")
                cache_metrics["deepl_failure"] += len(texts)
                raise Exception(f"DeepL returned incomplete translation batch")
                
        except DeepLQuotaExceededError as e:
            logger.warning(f"🚫 DEEPL QUOTA EXCEEDED: {e}")
            cache_metrics["deepl_failure"] += len(texts)
            raise  # Re-raise to be caught by the fallback logic
        except Exception as e:
            logger.warning(f"❌ DEEPL FAILED: {e}")
            cache_metrics["deepl_failure"] += len(texts)
            raise e
    
    # Helper function for BAML fallback - OPTIMIZED FOR LARGE CONTEXT
    async def _baml_translate_batch(texts: List[str], target_lang: str, field_name: Optional[str] = None) -> List[str]:
        """
        Translates a batch of texts using BAML with concurrent, robust, JSON-based batching.
        """
        if not texts:
            return []

        logger.info(f"🚀 BAML BATCH: Translating {len(texts)} items to {target_lang} for field: {field_name} using JSON mode.")

        # 1. Handle cached and short texts first
        texts_to_process = []
        original_indices_map = {}
        final_results = list(texts)  # Initialize with original texts

        for i, text in enumerate(texts):
            if not text or len(text.strip()) < MIN_TEXT_LENGTH_FOR_TRANSLATION:
                continue
            
            cache_key = _get_cache_key(text, target_lang)
            cached = _get_from_cache(cache_key)
            if cached:
                final_results[i] = cached
            else:
                original_indices_map[len(texts_to_process)] = i
                texts_to_process.append(text)

        if not texts_to_process:
            logger.info("🚀 BAML BATCH: All items were cached or too short.")
            return final_results

        # 2. Group remaining texts into batches
        MAX_BAML_CHARS_PER_CALL = 100000  # Conservative limit for a single API call
        batches = []
        current_batch = []
        current_len = 0
        for text in texts_to_process:
            if current_len + len(text) > MAX_BAML_CHARS_PER_CALL and current_batch:
                batches.append(current_batch)
                current_batch = []
                current_len = 0
            current_batch.append(text)
            current_len += len(text)
        if current_batch:
            batches.append(current_batch)
        
        logger.info(f"🚀 BAML BATCH: Processing {len(texts_to_process)} items in {len(batches)} batches.")

        # 3. Process each batch concurrently
        async def process_batch(batch: List[str]):
            lang_str = "English" if target_lang == "EN" else "Portuguese (Brazil)"
            
            prompt = (
                f"Please translate the following {len(batch)} text snippets to {lang_str}. "
                "Return the translations as a single, valid JSON array of strings, where each string is a translation. "
                "The JSON array must contain exactly as many strings as the input. Do not add any text before or after the JSON array. "
                "Example: [\"translation 1\", \"translation 2\", ...]\n\n"
                "Here are the texts to translate:\n"
                f"{json.dumps(batch, ensure_ascii=False)}"
            )
            
            try:
                baml_function = b.TranslateToEnglish if target_lang == "EN" else b.TranslateToPortuguese
                result = await baml_circuit.execute(_retry_with_exponential_backoff, baml_function, prompt)

                if result and hasattr(result, 'raw_llm_response'):
                    response_text = str(result.raw_llm_response).strip()
                    start = response_text.find('[')
                    end = response_text.rfind(']')
                    if start != -1 and end != -1:
                        json_str = response_text[start:end+1]
                        try:
                            translations = json.loads(json_str)
                            if isinstance(translations, list) and len(translations) == len(batch):
                                return translations
                            else:
                                logger.warning(f"BAML JSON length mismatch. Got {len(translations)}, expected {len(batch)}.")
                        except json.JSONDecodeError:
                            logger.warning(f"BAML JSON parsing failed for response: {json_str[:200]}...")
            except Exception as e:
                logger.error(f"Error during BAML batch processing: {e}", exc_info=True)

            return batch # Fallback to original batch on any error

        tasks = [process_batch(batch) for batch in batches]
        translated_batches = await asyncio.gather(*tasks)

        # 4. Reconstruct the final results list
        processed_texts_count = 0
        successful_translations = 0
        for i, translated_batch in enumerate(translated_batches):
            original_batch = batches[i]
            for j, translated_text in enumerate(translated_batch):
                original_index = original_indices_map[processed_texts_count]
                final_results[original_index] = translated_text
                if translated_text != original_batch[j]:
                    _add_to_cache(original_batch[j], translated_text, target_lang)
                    successful_translations += 1
                processed_texts_count += 1
                
        logger.info(f"🚀 BAML BATCH RESULT: {successful_translations}/{len(texts_to_process)} non-cached items translated successfully.")
        return final_results
    
    # Try DeepL translation first (primary strategy)
    try:
        return await _deepl_translate_batch()
    except Exception as e:
        logger.warning(f"DeepL batch translation failed, falling back to BAML: {e}")
    
    # If DeepL fails, try BAML as fallback - OPTIMIZED
    try:
        logger.info(f"🔄 FALLING BACK TO OPTIMIZED BAML: {len(texts)} items")
        return await _baml_translate_batch(texts, target_lang, field_name)
    except Exception as e:
        logger.error(f"🔄 OPTIMIZED BAML FAILED: {e}")
        # Try the original BAML approach as final fallback
        try:
            logger.info(f"🔄 FALLING BACK TO ORIGINAL BAML: {len(texts)} items")
            return await _translate_single_baml_batch(texts, target_lang, field_name) # Changed to _translate_single_baml_batch
        except Exception as fallback_e:
            logger.error(f"🔄 ORIGINAL BAML ALSO FAILED: {fallback_e}")
    
    # If all fail, return the original texts
    logger.error("🔄 ALL TRANSLATION METHODS FAILED, returning original texts")
    return texts

async def _translate_single_text(text: str, target_lang: Literal["EN", "PT"], field_name: str = None) -> str:
    """
    Translate a single text with DeepL primary, BAML fallback.
    """
    # Skip empty or very short texts
    if not text or len(text.strip()) < MIN_TEXT_LENGTH_FOR_TRANSLATION:
        return text
    
    # Check cache first
    cache_key = _get_cache_key(text, target_lang)
    cached = _get_from_cache(cache_key)
    if cached:
        logger.debug(f"Cache hit for {field_name or 'unknown field'} translation")
        return cached
    
    # Helper function for DeepL translation
    async def _deepl_translate_single():
        deepl_target = "EN-US" if target_lang == "EN" else "PT-BR"
        logger.info(f"Attempting DeepL translation for text of length {len(text)} to {deepl_target}")
        
        # Check quota before attempting
        rate_limit_status = get_rate_limit_status()
        if rate_limit_status and rate_limit_status.get('quota_exceeded', False):
            logger.warning("DeepL quota exceeded, skipping DeepL translation attempt")
            raise Exception("DeepL quota exceeded - skipping retry")
        
        try:
            translated = await _retry_with_exponential_backoff(translate_text_deepl, [text], target_lang=deepl_target)
            
            if not translated or len(translated) == 0 or not translated[0]:
                cache_metrics["deepl_failure"] += 1
                raise ValueError(f"DeepL returned empty translation")
                
            logger.info(f"DeepL translation succeeded for {field_name or 'unknown field'}")
            cache_metrics["deepl_success"] += 1
            return translated[0]
        except DeepLQuotaExceededError as e:
            logger.warning(f"DeepL quota exceeded for single translation: {e}")
            cache_metrics["deepl_failure"] += 1
            raise  # Re-raise to trigger BAML fallback
        except Exception as e:
            logger.warning(f"DeepL translation failed: {e}")
            cache_metrics["deepl_failure"] += 1
            raise e
    
    # Helper function for BAML fallback
    async def _baml_translate_single():
        logger.info(f"Attempting BAML translation for text of length {len(text)} to {target_lang}")
        try:
            if target_lang == "EN":
                result = await baml_circuit.execute(_retry_with_exponential_backoff, b.TranslateToEnglish, text)
            else:
                result = await baml_circuit.execute(_retry_with_exponential_backoff, b.TranslateToPortuguese, text)
            
            if not result or not hasattr(result, 'translated_text') or not result.translated_text:
                cache_metrics["baml_failure"] += 1
                raise ValueError(f"BAML returned empty or invalid translation")
                
            logger.info(f"BAML translation succeeded for {field_name or 'unknown field'}")
            cache_metrics["baml_success"] += 1
            return result.translated_text
        except Exception as e:
            logger.warning(f"BAML translation failed: {e}")
            cache_metrics["baml_failure"] += 1
            raise e
    
    # Try DeepL translation first (primary strategy)
    try:
        translated_text = await _deepl_translate_single()
        _add_to_cache(text, translated_text, target_lang)
        return translated_text
    except Exception as e:
        logger.warning(f"DeepL translation failed, falling back to BAML: {e}")
    
    # If DeepL fails, try BAML as fallback
    try:
        translated_text = await _baml_translate_single()
        _add_to_cache(text, translated_text, target_lang)
        return translated_text
    except Exception as e:
        logger.error(f"BAML translation failed for {field_name or 'unknown field'}: {e}")
    
    # If both fail, return the original text
    logger.error(f"Translation failed for {field_name or 'unknown field'}, returning original text")
    return text

# Add a fallback mechanism for translations
async def translate_with_fallback(text: Union[str, List[str]], target_lang: Literal["EN", "PT"] = "EN", field_name: str = None) -> Union[str, List[str]]:
    """
    Translate with fallback to original text if translation fails.
    This is useful for non-critical translations where showing the original text is better than an error.
    """
    try:
        return await translate(text, target_lang, field_name)
    except Exception as e:
        logger.error(f"Translation failed and falling back to original text: {e}")
        return text

# Monitoring and utility functions
def get_translation_metrics() -> dict:
    """Get current translation metrics for monitoring"""
    deepl_status = get_rate_limit_status()
    
    return {
        "cache_metrics": cache_metrics.copy(),
        "deepl_rate_limiting": deepl_status,
        "baml_circuit_breaker": {
            "state": baml_circuit.state,
            "failures": baml_circuit.failures,
            "last_failure": baml_circuit.last_failure_time
        },
        "cache_sizes": {
            "translation_cache": len(translation_cache),
            "batch_cache": len(batch_deduplication_cache),
            "recent_requests": len(recent_requests)
        }
    }

def reset_translation_metrics():
    """Reset translation metrics (for testing)"""
    global cache_metrics
    cache_metrics = {
        "hits": 0,
        "misses": 0,
        "batch_hits": 0,
        "batch_misses": 0,
        "deduplication_hits": 0,
        "baml_success": 0,
        "baml_failure": 0,
        "deepl_success": 0,
        "deepl_failure": 0,
        "rate_limit_retries": 0
    }

async def clear_translation_cache():
    """Clear all translation caches"""
    async with cache_lock:
        translation_cache.clear()
        batch_deduplication_cache.clear()
    
    async with deduplication_lock:
        recent_requests.clear()
def _calculate_adaptive_batch_size(rate_status: dict, total_items: int) -> int:
    """
    Calculate adaptive batch size based on current rate limit status.
    Smaller batches when rate limits are approaching, larger batches when plenty of capacity.
    """
    burst_available = rate_status['burst_capacity']['available']
    burst_capacity = rate_status['burst_capacity']['capacity']
    
    # Calculate percentage of burst capacity remaining
    capacity_percentage = burst_available / burst_capacity
    
    # Adaptive batch sizing based on available capacity
    if capacity_percentage > 0.8:  # Plenty of capacity
        adaptive_size = min(MAX_BATCH_SIZE, 25)  # Use larger batches
    elif capacity_percentage > 0.5:  # Moderate capacity
        adaptive_size = min(MAX_BATCH_SIZE, 15)  # Medium batches
    elif capacity_percentage > 0.2:  # Low capacity
        adaptive_size = min(MAX_BATCH_SIZE, 8)   # Small batches
    else:  # Very low capacity
        adaptive_size = min(MAX_BATCH_SIZE, 3)   # Very small batches
    
    # Ensure we don't create empty batches
    if total_items > 0 and adaptive_size <= 0:
        adaptive_size = 1
    
    # Don't create batches larger than what we need to process
    adaptive_size = min(adaptive_size, total_items)
    
    logger.debug(f"Adaptive batch size calculation: {capacity_percentage:.2f} capacity -> {adaptive_size} items")
    return adaptive_size

def _consolidate_texts_into_batches(texts: List[str]) -> List[Union[str, List[str]]]:
    """
    Consolidate multiple small texts into fewer, larger batches to reduce API calls.
    Returns a list of either individual large texts or lists of small texts that have been consolidated.
    """
    if not texts:
        return []
    
    consolidated_batches = []
    current_batch = []
    current_batch_char_count = 0
    
    for text in texts:
        text_length = len(text)
        
        # If this single text is already larger than our max batch size, add it as is
        if text_length > MAX_TEXT_LENGTH_PER_BATCH:
            # First, add any accumulated batch
            if current_batch:
                consolidated_batches.append(current_batch)
                current_batch = []
                current_batch_char_count = 0
            
            # Then add the large text as a single item
            consolidated_batches.append(text)
            continue
        
        # If adding this text would exceed our max batch size, finalize current batch
        if current_batch_char_count + text_length > MAX_TEXT_LENGTH_PER_BATCH or len(current_batch) >= MAX_BATCH_SIZE:
            if current_batch:
                consolidated_batches.append(current_batch)
                current_batch = []
                current_batch_char_count = 0
        
        # Add text to current batch
        current_batch.append(text)
        current_batch_char_count += text_length
    
    # Add any remaining texts in the current batch
    if current_batch:
        consolidated_batches.append(current_batch)
    
    return consolidated_batches

async def _translate_batch_with_baml_optimized(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Optimized BAML translation that leverages the large context window (164K tokens)
    to process very large batches in a single API call.
    """
    if not texts:
        return []
    
    logger.info(f"🚀 BAML OPTIMIZED: {len(texts)} items to {target_lang}")
    
    # Calculate total characters and estimate token usage
    total_chars = sum(len(text) for text in texts)
    estimated_tokens = total_chars * 0.25  # Rough estimate: 1 token ≈ 4 chars
    
    logger.info(f"🚀 BAML OPTIMIZED: {total_chars} chars ≈ {estimated_tokens:.0f} tokens")
    
    # Check if we can process in a single batch
    if estimated_tokens < 120000:  # Leave some safety margin
        logger.info(f"🚀 BAML OPTIMIZED: Single batch processing")
        return await _translate_single_baml_batch(texts, target_lang, field_name)
    else:
        logger.info(f"🚀 BAML OPTIMIZED: Multi-batch processing required")
        return await _translate_multi_baml_batch(texts, target_lang, field_name)

async def _translate_single_baml_batch(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Process a single large batch using BAML's large context window.
    """
    logger.info(f"🚀 SINGLE BAML BATCH: {len(texts)} items")
    
    # Check cache for each item first
    cached_results = []
    texts_to_process = []
    indices_to_process = []
    
    for i, text in enumerate(texts):
        cache_key = _get_cache_key(text, target_lang)
        cached = _get_from_cache(cache_key)
        if cached:
            cached_results.append((i, cached))
        else:
            texts_to_process.append(text)
            indices_to_process.append(i)
    
    # If all items are cached, return immediately
    if not texts_to_process:
        logger.info(f"🚀 SINGLE BAML BATCH: All items cached, no API call needed")
        result = list(texts)
        for i, cached in cached_results:
            result[i] = cached
        return result
    
    # Process all uncached items in a single BAML call
    try:
        if target_lang == "EN":
            # Create a single prompt with all texts to translate
            prompt = f"Translate the following {len(texts_to_process)} texts to English. Return each translation on a new line, numbered 1 to {len(texts_to_process)}:\n\n"
            for i, text in enumerate(texts_to_process):
                prompt += f"{i+1}. {text}\n"
            
            logger.info(f"🚀 SINGLE BAML BATCH: Processing {len(texts_to_process)} items in one call")
            
            # Use BAML with the optimized prompt
            result = await baml_circuit.execute(
                _retry_with_exponential_backoff,
                b.TranslateToEnglish,
                prompt
            )
            
            # Parse the response to extract individual translations
            if result and hasattr(result, 'raw_llm_response'):
                response_text = str(result.raw_llm_response)
                # Parse numbered lines
                lines = response_text.strip().split('\n')
                translations = []
                
                for line in lines:
                    line = line.strip()
                    if line and ('.' in line):
                        # Extract text after the number and period
                        parts = line.split('.', 1)
                        if len(parts) > 1:
                            translations.append(parts[1].strip())
                        else:
                            translations.append(line)
                    elif line:
                        translations.append(line)
                
                # Ensure we have the right number of translations
                while len(translations) < len(texts_to_process):
                    translations.append(texts_to_process[len(translations)])  # Fallback to original
                
                # Update results
                processed_results = list(texts)  # Start with originals
                for i, (original_idx, translation) in enumerate(zip(indices_to_process, translations)):
                    if i < len(translations) and translation and translation != texts_to_process[i]:
                        processed_results[original_idx] = translation
                        _add_to_cache(texts_to_process[i], translation, target_lang)
                
                logger.info(f"🚀 SINGLE BAML BATCH: Successfully processed {len(translations)} items")
                return processed_results
            
        else:  # Portuguese
            # Similar approach for Portuguese translation
            prompt = f"Translate the following {len(texts_to_process)} texts to Portuguese (Brazil). Return each translation on a new line, numbered 1 to {len(texts_to_process)}:\n\n"
            for i, text in enumerate(texts_to_process):
                prompt += f"{i+1}. {text}\n"
            
            logger.info(f"🚀 SINGLE BAML BATCH: Processing {len(texts_to_process)} items in one call")
            
            result = await baml_circuit.execute(
                _retry_with_exponential_backoff,
                b.TranslateToPortuguese,
                prompt
            )
            
            # Parse the response (same logic as above)
            if result and hasattr(result, 'raw_llm_response'):
                response_text = str(result.raw_llm_response)
                lines = response_text.strip().split('\n')
                translations = []
                
                for line in lines:
                    line = line.strip()
                    if line and ('.' in line):
                        parts = line.split('.', 1)
                        if len(parts) > 1:
                            translations.append(parts[1].strip())
                        else:
                            translations.append(line)
                    elif line:
                        translations.append(line)
                
                while len(translations) < len(texts_to_process):
                    translations.append(texts_to_process[len(translations)])
                
                processed_results = list(texts)
                for i, (original_idx, translation) in enumerate(zip(indices_to_process, translations)):
                    if i < len(translations) and translation and translation != texts_to_process[i]:
                        processed_results[original_idx] = translation
                        _add_to_cache(texts_to_process[i], translation, target_lang)
                
                logger.info(f"🚀 SINGLE BAML BATCH: Successfully processed {len(translations)} items")
                return processed_results
        
    except Exception as e:
        logger.error(f"🚀 SINGLE BAML BATCH failed: {e}")
        # Fall back to individual processing
        return await _translate_multi_baml_batch(texts, target_lang, field_name)

async def _translate_multi_baml_batch(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Process multiple large batches using BAML when single batch is too large.
    """
    logger.info(f"🚀 MULTI BAML BATCH: {len(texts)} items requiring multiple batches")
    
    # Calculate optimal batch size for multi-batch processing
    total_chars = sum(len(text) for text in texts)
    avg_chars_per_text = total_chars / len(texts) if texts else 100
    MAX_BAML_CHARS = 80000  # Smaller batches for multi-batch processing
    batch_size = max(1, int(MAX_BAML_CHARS / (avg_chars_per_text * 1.5)))
    batch_size = min(batch_size, 50)  # Cap at 50 items per batch
    
    logger.info(f"🚀 MULTI BAML BATCH: Processing in batches of {batch_size} items")
    
    # Process in batches
    results = list(texts)  # Start with originals
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        logger.info(f"🚀 MULTI BAML BATCH: Processing batch {i//batch_size + 1} with {len(batch)} items")
        
        try:
            batch_result = await _translate_single_baml_batch(batch, target_lang, field_name)
            
            # Update results
            for j, translated in enumerate(batch_result):
                if i + j < len(results) and translated != batch[j]:
                    results[i + j] = translated
                    
        except Exception as e:
            logger.error(f"🚀 MULTI BAML BATCH: Batch {i//batch_size + 1} failed: {e}")
            # Keep original texts for failed batch
    
    logger.info(f"🚀 MULTI BAML BATCH: Completed {len(texts)} items")
    return results

