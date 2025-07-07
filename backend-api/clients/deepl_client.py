import os
import aiohttp
import asyncio
import logging
import time
from typing import List, Optional, Union
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
if not DEEPL_API_KEY:
    logger.warning("DEEPL_API_KEY not found in environment variables. DeepL translation will fail.")

# Default to the pro API endpoint, switch to free if the key indicates it.
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"
if DEEPL_API_KEY and ":fx" in DEEPL_API_KEY:
    DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"

# Rate limiting parameters
MAX_REQUESTS_PER_MINUTE = 5  # Conservative limit for free tier
REQUEST_TIMESTAMPS = []
RETRY_DELAY_BASE = 5  # Base delay in seconds
MAX_RETRIES = 3

# Track rate limit state
rate_limit_queue = []
rate_limit_lock = asyncio.Lock()

@dataclass
class RateLimitState:
    requests: List[float]  # Timestamps of recent requests
    
    def add_request(self):
        now = time.time()
        self.requests = [ts for ts in self.requests if now - ts < 60]
        self.requests.append(now)
        
    def should_wait(self) -> bool:
        now = time.time()
        self.requests = [ts for ts in self.requests if now - ts < 60]
        return len(self.requests) >= MAX_REQUESTS_PER_MINUTE
    
    def get_wait_time(self) -> float:
        if not self.requests:
            return 0.0
        now = time.time()
        oldest = min(self.requests)
        return max(0.0, (oldest + 60) - now)

# Global rate limit state
rate_limit_state = RateLimitState(requests=[])

async def _rate_limit():
    """Enforce rate limiting with exponential backoff"""
    async with rate_limit_lock:
        if rate_limit_state.should_wait():
            wait_time = rate_limit_state.get_wait_time()
            if wait_time > 0:
                logger.warning(f"Rate limit reached. Waiting {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)
        rate_limit_state.add_request()

async def translate_text_deepl(
    text: Union[str, List[str]], 
    target_lang: str = "EN-US",
    source_lang: Optional[str] = None,
    max_retries: int = MAX_RETRIES
) -> Union[str, List[str]]:
    """
    Translates text using DeepL API with rate limiting and retry logic.
    
    Args:
        text: Single string or list of strings to translate
        target_lang: Target language code (e.g., "EN-US", "PT-BR")
        source_lang: Source language code (optional)
        max_retries: Maximum number of retry attempts
    
    Returns:
        Translated text (string or list of strings)
    
    Raises:
        Exception: If translation fails after all retries
    """
    if not DEEPL_API_KEY:
        raise ValueError("DeepL API key not configured. Please set DEEPL_API_KEY environment variable.")
    
    # Check if we need to wait due to rate limiting
    await _respect_rate_limit()
    
    # Prepare the request payload
    payload = {
        "text": text if isinstance(text, list) else [text],
        "target_lang": target_lang,
    }
    if source_lang:
        payload["source_lang"] = source_lang
    
    headers = {
        "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Attempt translation with retries
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    DEEPL_API_URL,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
                
                # Record this request for rate limiting
                _record_request()
                
                # Handle response
                if response.status_code == 429:  # Too Many Requests
                    retry_after = int(response.headers.get("Retry-After", RETRY_DELAY_BASE * (2 ** attempt)))
                    logger.warning(f"Rate limit reached. Waiting {retry_after} seconds...")
                    await asyncio.sleep(retry_after)
                    continue
                    
                response.raise_for_status()
                data = response.json()
                
                translations = [item["text"] for item in data.get("translations", [])]
                
                # Return result in the same format as input
                if isinstance(text, list):
                    return translations
                else:
                    return translations[0] if translations else ""
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error during DeepL translation: {e.response.status_code} - {e.response.text}")
            if attempt < max_retries:
                wait_time = RETRY_DELAY_BASE * (2 ** attempt)
                logger.info(f"Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
            else:
                raise Exception(f"DeepL translation failed after {max_retries} retries: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error during DeepL translation: {str(e)}")
            if attempt < max_retries:
                wait_time = RETRY_DELAY_BASE * (2 ** attempt)
                logger.info(f"Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
            else:
                raise Exception(f"DeepL translation failed after {max_retries} retries: {str(e)}")

def _record_request():
    """Record a timestamp for rate limiting purposes"""
    global REQUEST_TIMESTAMPS
    now = time.time()
    REQUEST_TIMESTAMPS.append(now)
    
    # Remove timestamps older than 1 minute
    REQUEST_TIMESTAMPS = [ts for ts in REQUEST_TIMESTAMPS if now - ts < 60]

async def _respect_rate_limit():
    """Wait if necessary to respect the rate limit"""
    global REQUEST_TIMESTAMPS
    now = time.time()
    
    # Clean up old timestamps
    REQUEST_TIMESTAMPS = [ts for ts in REQUEST_TIMESTAMPS if now - ts < 60]
    
    # Check if we're at the limit
    if len(REQUEST_TIMESTAMPS) >= MAX_REQUESTS_PER_MINUTE:
        # Calculate how long to wait
        oldest = min(REQUEST_TIMESTAMPS) if REQUEST_TIMESTAMPS else now
        wait_time = max(0, 60 - (now - oldest))
        
        if wait_time > 0:
            logger.info(f"Rate limiting: Waiting {wait_time:.2f} seconds before next DeepL request")
            await asyncio.sleep(wait_time)