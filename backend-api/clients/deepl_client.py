import os
import aiohttp
import asyncio
import logging
import time
import random
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

# Character-based rate limiting for DeepL Free tier
# Free tier: 500,000 characters/month = ~16,393 characters/day
DAILY_CHARACTER_LIMIT = int(os.getenv("DEEPL_DAILY_CHAR_LIMIT", "500000"))  # DeepL Free tier: 500,000 chars/month
BURST_CHARACTER_LIMIT = int(os.getenv("DEEPL_BURST_CHAR_LIMIT", "10000"))   # Increased burst capacity
BURST_REFILL_RATE = float(os.getenv("DEEPL_BURST_REFILL_RATE", "50.0"))     # Characters per second refill (allows faster bursts)

# Retry configuration
MAX_RETRIES = int(os.getenv("DEEPL_MAX_RETRIES", "3"))
BASE_RETRY_DELAY = float(os.getenv("DEEPL_BASE_RETRY_DELAY", "2.0"))
MAX_RETRY_DELAY = float(os.getenv("DEEPL_MAX_RETRY_DELAY", "60.0"))
RETRY_JITTER = float(os.getenv("DEEPL_RETRY_JITTER", "0.25"))

@dataclass
class CharacterBucket:
    """Token bucket implementation for character-based rate limiting"""
    capacity: int
    tokens: float
    last_refill: float
    refill_rate: float  # tokens per second
    
    def __post_init__(self):
        if self.last_refill == 0:
            self.last_refill = time.time()
    
    def _refill(self):
        """Refill the bucket based on elapsed time"""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
    
    def can_consume(self, tokens: int) -> bool:
        """Check if we can consume the requested tokens"""
        self._refill()
        return self.tokens >= tokens
    
    def consume(self, tokens: int) -> bool:
        """Consume tokens if available"""
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def time_until_available(self, tokens: int) -> float:
        """Calculate time until requested tokens are available"""
        self._refill()
        if self.tokens >= tokens:
            return 0.0
        needed = tokens - self.tokens
        return needed / self.refill_rate

@dataclass
class DailyUsageTracker:
    """Track daily character usage"""
    date: str
    characters_used: int
    
    def is_today(self) -> bool:
        """Check if the tracked date is today"""
        today = time.strftime("%Y-%m-%d")
        return self.date == today
    
    def reset_if_new_day(self):
        """Reset usage if it's a new day"""
        if not self.is_today():
            self.date = time.strftime("%Y-%m-%d")
            self.characters_used = 0
    
    def can_use(self, characters: int) -> bool:
        """Check if we can use the requested characters today"""
        self.reset_if_new_day()
        return self.characters_used + characters <= DAILY_CHARACTER_LIMIT
    
    def use_characters(self, characters: int):
        """Record character usage"""
        self.reset_if_new_day()
        self.characters_used += characters

# Global rate limiting state
burst_bucket = CharacterBucket(
    capacity=BURST_CHARACTER_LIMIT,
    tokens=BURST_CHARACTER_LIMIT,
    last_refill=0,
    refill_rate=BURST_REFILL_RATE
)

daily_tracker = DailyUsageTracker(
    date=time.strftime("%Y-%m-%d"),
    characters_used=0
)

rate_limit_lock = asyncio.Lock()

# Circuit breaker for DeepL service
class DeepLCircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=300):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.lock = asyncio.Lock()
    
    async def execute(self, func, *args, **kwargs):
        async with self.lock:
            # Check if circuit should be reset
            if self.state == "OPEN" and time.time() - self.last_failure_time > self.reset_timeout:
                logger.info("DeepL circuit breaker changing from OPEN to HALF-OPEN")
                self.state = "HALF-OPEN"
            
            # If circuit is open, fail fast
            if self.state == "OPEN":
                remaining = int(self.reset_timeout - (time.time() - self.last_failure_time))
                logger.warning(f"DeepL circuit breaker is OPEN. Failing fast. Will retry in {remaining}s")
                raise Exception(f"DeepL circuit breaker is open. Service temporarily unavailable.")
        
        # Execute the function
        try:
            result = await func(*args, **kwargs)
            
            # If successful and in HALF-OPEN, close the circuit
            if self.state == "HALF-OPEN":
                async with self.lock:
                    logger.info("DeepL circuit breaker changing from HALF-OPEN to CLOSED")
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
                    logger.warning(f"DeepL circuit breaker changing from CLOSED to OPEN after {self.failures} failures")
                    self.state = "OPEN"
                elif self.state == "HALF-OPEN":
                    logger.warning("DeepL circuit breaker changing from HALF-OPEN back to OPEN after failure")
                    self.state = "OPEN"
            
            raise e

# Global circuit breaker instance
circuit_breaker = DeepLCircuitBreaker()

def _calculate_character_count(text: Union[str, List[str]]) -> int:
    """Calculate total character count for rate limiting"""
    if isinstance(text, str):
        return len(text)
    elif isinstance(text, list):
        return sum(len(t) for t in text if t)
    return 0

async def _wait_for_rate_limit(character_count: int):
    """Wait for rate limiting based on character usage"""
    async with rate_limit_lock:
        # Check daily limit
        if not daily_tracker.can_use(character_count):
            remaining_chars = DAILY_CHARACTER_LIMIT - daily_tracker.characters_used
            logger.error(f"Daily DeepL character limit exceeded. Used: {daily_tracker.characters_used}, "
                        f"Requested: {character_count}, Remaining: {remaining_chars}")
            raise Exception(f"Daily DeepL character limit exceeded. Try again tomorrow.")
        
        # Check burst capacity
        if not burst_bucket.can_consume(character_count):
            wait_time = burst_bucket.time_until_available(character_count)
            if wait_time > 0:
                logger.info(f"DeepL burst limit reached. Waiting {wait_time:.2f} seconds for {character_count} characters...")
                await asyncio.sleep(wait_time)
        
        # Consume characters from burst bucket
        if not burst_bucket.consume(character_count):
            # This shouldn't happen after waiting, but just in case
            logger.warning("Failed to consume characters from burst bucket after waiting")
            raise Exception("Rate limit error: unable to consume characters")
        
        # Record daily usage
        daily_tracker.use_characters(character_count)
        
        logger.debug(f"DeepL rate limit check passed. Used {character_count} characters. "
                    f"Daily: {daily_tracker.characters_used}/{DAILY_CHARACTER_LIMIT}, "
                    f"Burst: {burst_bucket.tokens:.1f}/{burst_bucket.capacity}")

async def _exponential_backoff_with_jitter(attempt: int) -> float:
    """Calculate exponential backoff delay with jitter"""
    delay = min(BASE_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
    jitter = random.uniform(-RETRY_JITTER * delay, RETRY_JITTER * delay)
    return max(0.1, delay + jitter)  # Minimum 100ms delay

async def translate_text_deepl(
    text: Union[str, List[str]], 
    target_lang: str = "EN-US",
    source_lang: Optional[str] = None,
    max_retries: int = MAX_RETRIES
) -> Union[str, List[str]]:
    """
    Translates text using DeepL API with intelligent character-based rate limiting and retry logic.
    
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
    
    # Calculate character count for rate limiting
    character_count = _calculate_character_count(text)
    
    # Check rate limits before making request
    await _wait_for_rate_limit(character_count)
    
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
    
    # Use circuit breaker to protect the service
    async def _make_request():
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPL_API_URL,
                json=payload,
                headers=headers,
                timeout=30
            )
            return response
    
    # Attempt translation with retries and exponential backoff
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            response = await circuit_breaker.execute(_make_request)
            
            # Handle rate limiting response
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                if attempt < max_retries:
                    logger.warning(f"DeepL rate limit hit (429). Waiting {retry_after} seconds... (Attempt {attempt + 1}/{max_retries + 1})")
                    await asyncio.sleep(retry_after)
                    continue
                else:
                    raise Exception(f"DeepL rate limit exceeded after {max_retries + 1} attempts")
            
            # Handle quota exceeded
            if response.status_code == 456:
                logger.error("DeepL quota exceeded for this billing period")
                raise Exception("DeepL quota exceeded. Please check your billing.")
            
            # Raise for other HTTP errors
            response.raise_for_status()
            
            # Parse successful response
            data = response.json()
            translations = [item["text"] for item in data.get("translations", [])]
            
            # Log successful translation
            logger.info(f"DeepL translation successful. Characters: {character_count}, "
                       f"Daily usage: {daily_tracker.characters_used}/{DAILY_CHARACTER_LIMIT}")
            
            # Return result in the same format as input
            if isinstance(text, list):
                return translations
            else:
                return translations[0] if translations else ""
                
        except httpx.HTTPStatusError as e:
            last_exception = e
            logger.error(f"HTTP error during DeepL translation: {e.response.status_code} - {e.response.text}")
            
            # Don't retry on client errors (4xx) except 429
            if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                raise Exception(f"DeepL client error: {e.response.status_code} - {e.response.text}")
            
            if attempt < max_retries:
                wait_time = await _exponential_backoff_with_jitter(attempt)
                logger.info(f"Retrying DeepL request in {wait_time:.2f} seconds... (Attempt {attempt + 1}/{max_retries + 1})")
                await asyncio.sleep(wait_time)
            
        except Exception as e:
            last_exception = e
            logger.error(f"Error during DeepL translation: {str(e)}")
            
            if attempt < max_retries:
                wait_time = await _exponential_backoff_with_jitter(attempt)
                logger.info(f"Retrying DeepL request in {wait_time:.2f} seconds... (Attempt {attempt + 1}/{max_retries + 1})")
                await asyncio.sleep(wait_time)
    
    # If we get here, all retries failed
    raise Exception(f"DeepL translation failed after {max_retries + 1} attempts: {str(last_exception)}")

# Utility functions for monitoring
def get_rate_limit_status() -> dict:
    """Get current rate limiting status for monitoring"""
    daily_tracker.reset_if_new_day()
    burst_bucket._refill()
    
    return {
        "daily_usage": {
            "used": daily_tracker.characters_used,
            "limit": DAILY_CHARACTER_LIMIT,
            "remaining": DAILY_CHARACTER_LIMIT - daily_tracker.characters_used,
            "percentage": (daily_tracker.characters_used / DAILY_CHARACTER_LIMIT) * 100
        },
        "burst_capacity": {
            "available": int(burst_bucket.tokens),
            "capacity": burst_bucket.capacity,
            "refill_rate": burst_bucket.refill_rate
        },
        "circuit_breaker": {
            "state": circuit_breaker.state,
            "failures": circuit_breaker.failures,
            "last_failure": circuit_breaker.last_failure_time
        }
    }

def reset_daily_usage():
    """Reset daily usage counter (for testing)"""
    global daily_tracker
    daily_tracker = DailyUsageTracker(
        date=time.strftime("%Y-%m-%d"),
        characters_used=0
    )