import logging
from typing import Literal, List, Union, Dict, Optional, Tuple, Any
from clients.deepl_client import translate_text_deepl, get_rate_limit_status
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
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "20"))  # Maximum number of texts in a single batch
MIN_TEXT_LENGTH_FOR_TRANSLATION = int(os.getenv("MIN_TEXT_LENGTH_FOR_TRANSLATION", "5"))  # Minimum text length to translate
MAX_RETRIES = int(os.getenv("MAX_TRANSLATION_RETRIES", "3"))  # Maximum number of retries for failed translations

# Request deduplication window (in seconds)
DEDUPLICATION_WINDOW = float(os.getenv("DEDUPLICATION_WINDOW", "0.1"))  # 100ms window

# --- RATE LIMITING ---
BASE_RETRY_DELAY = float(os.getenv("BASE_RETRY_DELAY", "1.0"))  # Base delay in seconds
MAX_RETRY_DELAY = float(os.getenv("MAX_RETRY_DELAY", "30.0"))  # Maximum delay in seconds
RETRY_JITTER = float(os.getenv("RETRY_JITTER", "0.25"))  # Random jitter factor (0.0-1.0)
CONCURRENT_REQUESTS_LIMIT = int(os.getenv("CONCURRENT_REQUESTS_LIMIT", "10"))  # Increased for better concurrency

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
            
            if isinstance(e, httpx.HTTPStatusError):
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

    # Translate the remaining texts in optimized batches
    translated_texts = []
    for i in range(0, len(texts_to_translate), MAX_BATCH_SIZE):
        batch = texts_to_translate[i:i + MAX_BATCH_SIZE]
        try:
            translated_batch = await _translate_batch_with_fallback(batch, target_lang, field_name)
            translated_texts.extend(translated_batch)
        except Exception as e:
            logger.error(f"Batch translation failed for field '{field_name}': {e}")
            # If a batch fails, we keep the original text for that batch
            translated_texts.extend(batch)

    # Map translated texts back to their original positions
    for i, original_idx in enumerate(original_indices):
        if i < len(translated_texts):
            final_results[original_idx] = translated_texts[i]
            # Add successful individual translations to cache
            _add_to_cache(texts[original_idx], translated_texts[i], target_lang)

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
        logger.info(f"Attempting DeepL batch translation for {len(texts)} items to {deepl_target}")
        
        try:
            # DeepL can handle larger batches efficiently with character-based limiting
            translated = await _retry_with_exponential_backoff(
                translate_text_deepl, 
                texts, 
                target_lang=deepl_target
            )
            
            if translated and len(translated) == len(texts):
                logger.info(f"DeepL batch translation succeeded for all {len(texts)} items")
                cache_metrics["deepl_success"] += len(texts)
                return translated
            else:
                logger.warning(f"DeepL returned incomplete batch: got {len(translated) if translated else 0} of {len(texts)} items")
                cache_metrics["deepl_failure"] += len(texts)
                raise Exception(f"DeepL returned incomplete translation batch")
                
        except Exception as e:
            logger.warning(f"DeepL batch translation failed: {e}")
            cache_metrics["deepl_failure"] += len(texts)
            raise e
    
    # Helper function for BAML fallback
    async def _baml_translate_batch():
        logger.info(f"Attempting BAML batch translation for {len(texts)} items to {target_lang}")
        
        # Process in smaller sub-batches for better resilience
        sub_batch_size = 5  # Smaller batches for BAML
        result = list(texts)  # Start with original texts as fallback
        successful_items = 0
        
        # Split into sub-batches
        sub_batches = [texts[i:i+sub_batch_size] for i in range(0, len(texts), sub_batch_size)]
        
        # Process each sub-batch
        for idx, sub_batch in enumerate(sub_batches):
            try:
                # Use circuit breaker to protect the service
                sub_result = await baml_circuit.execute(_process_baml_sub_batch, sub_batch, target_lang)
                
                # Update results
                start_idx = idx * sub_batch_size
                for i, translated in enumerate(sub_result):
                    if start_idx + i < len(result) and translated != sub_batch[i]:
                        result[start_idx + i] = translated
                        successful_items += 1
                
                logger.info(f"BAML sub-batch {idx+1}/{len(sub_batches)} succeeded")
            except Exception as e:
                logger.warning(f"BAML sub-batch {idx+1}/{len(sub_batches)} failed: {e}")
        
        # Track metrics
        cache_metrics["baml_success"] += successful_items
        cache_metrics["baml_failure"] += (len(texts) - successful_items)
        
        logger.info(f"BAML batch translation succeeded for {successful_items} of {len(texts)} items")
        return result
    
    # Process a single BAML sub-batch
    async def _process_baml_sub_batch(sub_batch, target_lang):
        if target_lang == "EN":
            tasks = [_retry_with_exponential_backoff(b.TranslateToEnglish, text) for text in sub_batch]
        else:
            tasks = [_retry_with_exponential_backoff(b.TranslateToPortuguese, text) for text in sub_batch]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        except asyncio.TimeoutError:
            logger.warning(f"BAML sub-batch timed out")
            return sub_batch  # Return original texts on timeout
        
        # Process results and handle any errors
        processed_results = list(sub_batch)  # Start with original texts
        
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.warning(f"BAML translation failed for item {i}: {str(res)[:100]}")
                continue
            
            # Extract translated text from BAML response
            try:
                if hasattr(res, 'translated_text') and res.translated_text:
                    processed_results[i] = res.translated_text
                elif hasattr(res, 'raw_llm_response') and res.raw_llm_response:
                    processed_results[i] = str(res.raw_llm_response).strip()
                elif isinstance(res, str) and res.strip():
                    processed_results[i] = res.strip()
            except Exception as e:
                logger.warning(f"Error processing BAML response for item {i}: {e}")
        
        return processed_results
    
    # Try DeepL first (primary translation system)
    try:
        return await _deepl_translate_batch()
    except Exception as e:
        logger.warning(f"DeepL batch translation failed: {e}, trying BAML fallback")
    
    # Fallback to BAML if DeepL fails
    try:
        return await _baml_translate_batch()
    except Exception as e:
        logger.error(f"Both DeepL and BAML batch translation failed: {e}")
    
    # If all translation methods fail, return the original texts
    logger.error("All translation methods failed, returning original texts")
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
        
        try:
            translated = await _retry_with_exponential_backoff(translate_text_deepl, [text], target_lang=deepl_target)
            
            if not translated or len(translated) == 0 or not translated[0]:
                cache_metrics["deepl_failure"] += 1
                raise ValueError(f"DeepL returned empty translation")
                
            logger.info(f"DeepL translation succeeded for {field_name or 'unknown field'}")
            cache_metrics["deepl_success"] += 1
            return translated[0]
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
    
    # 1. Try DeepL first (primary translation system)
    try:
        translated_text = await _deepl_translate_single()
        _add_to_cache(text, translated_text, target_lang)
        return translated_text
    except Exception as e:
        logger.warning(f"DeepL translation failed for {field_name or 'unknown field'}, trying BAML fallback: {e}")
    
    # 2. Fallback to BAML
    try:
        translated_text = await _baml_translate_single()
        _add_to_cache(text, translated_text, target_lang)
        return translated_text
    except Exception as e:
        logger.error(f"Both DeepL and BAML translation failed for {field_name or 'unknown field'}: {e}")
    
    # 3. If all translation methods fail, return the original text as fallback
    logger.error(f"All translation methods failed for {field_name or 'unknown field'}, returning original text")
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
