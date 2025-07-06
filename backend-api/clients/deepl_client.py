import os
import aiohttp
import asyncio
import logging
import time
from typing import List, Optional, Union
from dataclasses import dataclass

logger = logging.getLogger(__name__)

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
if not DEEPL_API_KEY:
    logger.warning("DEEPL_API_KEY not found in environment variables. DeepL translation will fail.")

# Default to the pro API endpoint, switch to free if the key indicates it.
DEEPL_API_URL = "https://api.deepl.com/v2/translate"
if DEEPL_API_KEY and ":fx" in DEEPL_API_KEY:
    DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"

# Rate limiting configuration
RATE_LIMIT_REQUESTS = 20  # Max requests per RATE_LIMIT_WINDOW seconds
RATE_LIMIT_WINDOW = 60  # seconds

# Track rate limit state
rate_limit_queue = []
rate_limit_lock = asyncio.Lock()

@dataclass
class RateLimitState:
    requests: List[float]  # Timestamps of recent requests
    
    def add_request(self):
        now = time.time()
        self.requests = [ts for ts in self.requests if now - ts < RATE_LIMIT_WINDOW]
        self.requests.append(now)
        
    def should_wait(self) -> bool:
        now = time.time()
        self.requests = [ts for ts in self.requests if now - ts < RATE_LIMIT_WINDOW]
        return len(self.requests) >= RATE_LIMIT_REQUESTS
    
    def get_wait_time(self) -> float:
        if not self.requests:
            return 0.0
        now = time.time()
        oldest = min(self.requests)
        return max(0.0, (oldest + RATE_LIMIT_WINDOW) - now)

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
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0
) -> Union[str, List[str], None]:
    """
    Translates text to the target language using the DeepL API with retry logic.

    Args:
        text: The text or list of texts to translate.
        target_lang: The target language code (e.g., 'PT' for Portuguese).
        max_retries: Maximum number of retry attempts.
        initial_delay: Initial delay between retries in seconds.
        max_delay: Maximum delay between retries in seconds.

    Returns:
        The translated text(s), or None if translation fails.
    """
    if not DEEPL_API_KEY:
        logger.error("Cannot translate with DeepL: DEEPL_API_KEY is not set.")
        return None

    is_batch = isinstance(text, list)
    if not is_batch:
        text = [text]
    
    if not text:
        return [] if is_batch else None

    headers = {
        "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {
        "text": text,
        "target_lang": target_lang,
        "preserve_formatting": True,
        "formality": "prefer_less"  # More natural translations
    }

    delay = initial_delay
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            # Enforce rate limiting before making the request
            await _rate_limit()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    DEEPL_API_URL, 
                    headers=headers, 
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=30)  # 30-second timeout
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        translations = [t["text"] for t in result.get("translations", [])]
                        
                        if len(translations) == len(text):
                            if is_batch:
                                return translations
                            return translations[0] if translations else None
                        
                        logger.warning("Mismatch in number of translations returned")
                        return None
                    
                    # Handle rate limiting
                    elif response.status == 429:
                        retry_after = float(response.headers.get('Retry-After', delay))
                        logger.warning(f"Rate limited. Retrying after {retry_after} seconds...")
                        await asyncio.sleep(min(retry_after, max_delay))
                        continue
                        
                    # Handle other errors
                    error_text = await response.text()
                    logger.error(f"DeepL API error: {response.status} - {error_text}")
                    
                    # If it's a client error (4xx), don't retry
                    if 400 <= response.status < 500 and response.status != 429:
                        break
                        
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            last_exception = e
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
            
            # Don't retry on client errors
            if isinstance(e, aiohttp.ClientResponseError) and 400 <= e.status < 500:
                break
                
        # Exponential backoff
        if attempt < max_retries:
            sleep_time = min(delay * (2 ** attempt), max_delay)
            logger.info(f"Retrying in {sleep_time:.2f} seconds... (attempt {attempt + 1}/{max_retries})")
            await asyncio.sleep(sleep_time)
    
    logger.error(f"All {max_retries + 1} attempts failed. Last error: {str(last_exception) if last_exception else 'Unknown'}")
    return None if not is_batch else [None] * len(text)