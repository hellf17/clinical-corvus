import logging
from typing import Literal, List, Union, Dict, Optional, Tuple, Any
from clients.deepl_client import translate_text_deepl
import httpx
import os
import asyncio
import time
import hashlib

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
BAML_TRANSLATOR_URL = os.getenv("BAML_TRANSLATOR_URL", "http://localhost:8000/api/translate")
TRANSLATION_CACHE_SIZE = int(os.getenv("TRANSLATION_CACHE_SIZE", "1000"))
TRANSLATION_CACHE_TTL = int(os.getenv("TRANSLATION_CACHE_TTL", "86400"))  # 24 hours in seconds
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "20"))  # Maximum number of texts in a single batch
MIN_TEXT_LENGTH_FOR_TRANSLATION = int(os.getenv("MIN_TEXT_LENGTH_FOR_TRANSLATION", "5"))  # Minimum text length to translate
MAX_RETRIES = int(os.getenv("MAX_TRANSLATION_RETRIES", "2"))  # Maximum number of retries for failed translations
ENABLE_BATCH_DEDUPLICATION = True  # Enable deduplication of batch translation requests

# --- TRANSLATION CACHE ---
# Simple in-memory cache with TTL
translation_cache: Dict[str, Tuple[str, float]] = {}  # {cache_key: (translated_text, timestamp)}
# Track recent batch requests to prevent duplicates
recent_batch_requests: Dict[str, Tuple[List[str], float]] = {}  # {hash: (results, timestamp)}

# Active translation requests to prevent duplicates
active_requests: Dict[str, asyncio.Task] = {}
request_lock = asyncio.Lock()

def _get_cache_key(text: str, target_lang: str) -> str:
    """Generate a cache key for a translation request"""
    return hashlib.md5(f"{text}:{target_lang}".encode()).hexdigest()

def _get_batch_cache_key(texts: List[str], target_lang: str) -> str:
    """Generate a cache key for a batch translation request"""
    # Sort texts to ensure consistent hashing regardless of order
    sorted_texts = sorted(texts)
    combined = "||".join(sorted_texts) + f":{target_lang}"
    return hashlib.md5(combined.encode()).hexdigest()

def _get_from_cache(text: str, target_lang: str) -> Optional[str]:
    """Get a translation from cache if available and not expired"""
    key = _get_cache_key(text, target_lang)
    if key in translation_cache:
        translated, timestamp = translation_cache[key]
        if time.time() - timestamp < TRANSLATION_CACHE_TTL:
            return translated
        # Remove expired entry
        del translation_cache[key]
    return None

def _get_batch_from_cache(texts: List[str], target_lang: str) -> Optional[List[str]]:
    """Get a batch translation from cache if available and not expired"""
    if not ENABLE_BATCH_DEDUPLICATION:
        return None
        
    key = _get_batch_cache_key(texts, target_lang)
    if key in recent_batch_requests:
        results, timestamp = recent_batch_requests[key]
        if time.time() - timestamp < TRANSLATION_CACHE_TTL:
            logger.info(f"Batch cache hit! Reusing previous translation for {len(texts)} items")
            return results
        # Remove expired entry
        del recent_batch_requests[key]
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
    if not ENABLE_BATCH_DEDUPLICATION:
        return
        
    # Limit the number of batch requests we store to avoid memory issues
    if len(recent_batch_requests) >= 50:  # Store up to 50 recent batch requests
        oldest_key = min(recent_batch_requests.items(), key=lambda x: x[1][1])[0]
        del recent_batch_requests[oldest_key]
    
    key = _get_batch_cache_key(texts, target_lang)
    recent_batch_requests[key] = (results, time.time())
    
    # Also add individual translations to the main cache
    for i, text in enumerate(texts):
        if i < len(results):
            _add_to_cache(text, results[i], target_lang)

# --- MAIN TRANSLATION SERVICE ---
async def translate(text: Union[str, List[str]], target_lang: Literal["EN", "PT"] = "EN", field_name: str = None) -> Union[str, List[str]]:
    """    
    Translate text using BAML as primary, fall back to DeepL if BAML fails.
    Can handle either a single string or a list of strings.
    target_lang: "EN" for English, "PT" for Portuguese (Brazilian)
    field_name: Optional name of the field being translated (for better logging)
    Returns translated text (or list of translated texts), or raises Exception if all fail.
    """
    # Handle batch translation if text is a list
    if isinstance(text, list):
        return await _translate_batch_with_lock(text, target_lang, field_name)
    
    # Single text translation
    return await _translate_single_with_lock(text, target_lang, field_name)

async def _translate_batch_with_lock(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Thread-safe wrapper for batch translation that prevents duplicate requests.
    """
    # Generate a unique key for this request
    request_key = _get_batch_cache_key(texts, target_lang) + f":{field_name or 'unknown'}"
    
    async with request_lock:
        # Check if this exact request is already in progress
        if request_key in active_requests and not active_requests[request_key].done():
            logger.info(f"Reusing in-progress batch translation for {len(texts)} items")
            try:
                # Wait for the existing task to complete
                return await active_requests[request_key]
            except Exception as e:
                # If the existing task failed, we'll try again
                logger.warning(f"Reused in-progress batch translation failed: {e}, will retry")
                pass
        
        # Create a new task for this request
        task = asyncio.create_task(_translate_batch(texts, target_lang, field_name))
        active_requests[request_key] = task
    
    try:
        # Wait for our task to complete
        result = await task
        return result
    finally:
        # Clean up completed tasks
        async with request_lock:
            if request_key in active_requests and active_requests[request_key].done():
                del active_requests[request_key]

async def _translate_single_with_lock(text: str, target_lang: Literal["EN", "PT"], field_name: str = None) -> str:
    """
    Thread-safe wrapper for single text translation that prevents duplicate requests.
    """
    # Generate a unique key for this request
    request_key = _get_cache_key(text, target_lang) + f":{field_name or 'unknown'}"
    
    async with request_lock:
        # Check if this exact request is already in progress
        if request_key in active_requests and not active_requests[request_key].done():
            logger.info(f"Reusing in-progress translation for text: {text[:20]}...")
            try:
                # Wait for the existing task to complete
                return await active_requests[request_key]
            except Exception as e:
                # If the existing task failed, we'll try again
                logger.warning(f"Reused in-progress translation failed: {e}, will retry")
                pass
        
        # Create a new task for this request
        task = asyncio.create_task(_translate_single_text(text, target_lang, field_name))
        active_requests[request_key] = task
    
    try:
        # Wait for our task to complete
        result = await task
        return result
    finally:
        # Clean up completed tasks
        async with request_lock:
            if request_key in active_requests and active_requests[request_key].done():
                del active_requests[request_key]

async def _translate_batch(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Efficiently translate a batch of texts with caching and filtering.
    """
    # Skip empty lists
    if not texts:
        return []
    
    # Check if this exact batch has been translated recently
    cached_batch = _get_batch_from_cache(texts, target_lang)
    if cached_batch:
        return cached_batch
        
    # Filter out empty or very short texts that don't need translation
    filtered_texts = []
    filtered_indices = []
    result = list(texts)  # Create a copy to preserve original order
    
    # Check cache and filter texts that need translation
    for i, item in enumerate(texts):
        if not item or len(item) < MIN_TEXT_LENGTH_FOR_TRANSLATION:
            continue
            
        # Check cache first
        cached = _get_from_cache(item, target_lang)
        if cached:
            result[i] = cached
        else:
            filtered_texts.append(item)
            filtered_indices.append(i)
    
    # If all texts were cached or too short, return early
    if not filtered_texts:
        return result
        
    # Log batch information
    logger.info(f"Batch translation: {len(filtered_texts)}/{len(texts)} items need translation, target_lang={target_lang}")
    
    # Process in smaller batches if needed
    translated_texts = []
    for i in range(0, len(filtered_texts), MAX_BATCH_SIZE):
        batch = filtered_texts[i:i+MAX_BATCH_SIZE]
        try:
            # Try batch translation first
            batch_result = await _translate_batch_with_fallback(batch, target_lang, f"{field_name}_batch_{i}" if field_name else None)
            translated_texts.extend(batch_result)
        except Exception as e:
            # If batch fails, try individual translations
            logger.warning(f"Batch translation failed: {e}, falling back to individual translation")
            for j, item in enumerate(batch):
                try:
                    single_result = await _translate_single_text(item, target_lang, f"{field_name}[{i+j}]" if field_name else None)
                    translated_texts.append(single_result)
                except Exception as e:
                    logger.error(f"Individual translation failed for item {i+j}: {e}")
                    translated_texts.append(item)  # Use original as fallback
    
    # Map translated texts back to their original positions
    for i, idx in enumerate(filtered_indices):
        if i < len(translated_texts):
            result[idx] = translated_texts[i]
            # Add successful translation to cache
            _add_to_cache(filtered_texts[i], translated_texts[i], target_lang)
    
    # Cache the entire batch result to avoid duplicate requests
    _add_batch_to_cache(texts, result, target_lang)
    
    return result

async def _translate_batch_with_fallback(texts: List[str], target_lang: Literal["EN", "PT"], field_name: str = None) -> List[str]:
    """
    Translate a batch of texts with BAML, falling back to DeepL if needed.
    """
    # Try BAML first
    try:
        baml_func = "BatchTranslateToEnglish" if target_lang == "EN" else "BatchTranslateToPortuguese"
        url = f"{BAML_TRANSLATOR_URL}/{baml_func}"
        payload = {"inputs": texts}
        logger.info(f"Attempting BAML batch translation: URL={url}, Items={len(texts)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"BAML batch translation failed with status {response.status_code}: {response.text}")
                response.raise_for_status()

            data = response.json()
            translated = data.get("translated_texts")
            
            if not translated or len(translated) != len(texts):
                logger.error(f"BAML batch response invalid. Expected {len(texts)} items, got {len(translated) if translated else 0}. Response: {data}")
                raise Exception("BAML batch translation returned incorrect number of items")
            
            logger.info(f"BAML batch translation succeeded for {len(texts)} items.")
            return translated
    except Exception as e:
        logger.warning(f"BAML batch translation failed: {e}, will try DeepL fallback.")

    # Fallback to DeepL
    try:
        deepl_target = "EN-US" if target_lang == "EN" else "PT-BR"
        translated = await translate_text_deepl(texts, target_lang=deepl_target)
        if translated and len(translated) == len(texts):
            logger.debug(f"DeepL batch translation succeeded: {target_lang}, {len(texts)} items")
            return translated
        logger.error(f"DeepL returned incomplete batch for {field_name or 'unknown field'}")
        raise Exception("DeepL batch translation returned incomplete results")
    except Exception as e:
        logger.error(f"Both BAML and DeepL batch translation failed: {e}")
        raise Exception(f"Batch translation failed for target_lang={target_lang}: {e}")

async def _translate_single_text(text: str, target_lang: Literal["EN", "PT"], field_name: str = None) -> str:
    """
    Translate a single text string with caching and retry logic.
    """
    # Skip empty or very short texts
    if not text or len(text) < MIN_TEXT_LENGTH_FOR_TRANSLATION:
        return text
        
    # Check cache first
    cached = _get_from_cache(text, target_lang)
    if cached:
        return cached
        
    # 1. Try BAML
    try:
        baml_func = "TranslateToEnglish" if target_lang == "EN" else "TranslateToPortuguese"
        url = f"{BAML_TRANSLATOR_URL}/{baml_func}"
        payload = {"input": text}
        logger.info(f"Attempting BAML single translation: URL={url}")

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30)

            if response.status_code != 200:
                logger.error(f"BAML single translation failed with status {response.status_code}: {response.text}")
                response.raise_for_status()

            data = response.json()
            translated = data.get("translated_text") or data.get("result", {}).get("translated_text")
            
            if not translated:
                logger.error(f"BAML single response invalid. Response: {data}")
                raise Exception("BAML translation did not return translated_text")
            
            _add_to_cache(text, translated, target_lang)
            logger.info(f"BAML single translation succeeded.")
            return translated
    except Exception as e:
        logger.warning(f"BAML single translation failed: {e}, will try DeepL fallback.")

    # 2. Fallback to DeepL
    try:
        deepl_target = "EN-US" if target_lang == "EN" else "PT-BR"
        translated = await translate_text_deepl(text, target_lang=deepl_target)
        if translated:
            _add_to_cache(text, translated, target_lang)
            logger.debug(f"DeepL fallback translation succeeded: {target_lang}")
            return translated
        logger.error(f"DeepL returned None for {field_name or 'unknown field'}, all translation methods failed.")
        raise Exception("All translation methods failed")
    except Exception as e:
        logger.error(f"Both BAML and DeepL translation failed: {e}")
        raise Exception(f"Translation failed for target_lang={target_lang}: {e}")

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

