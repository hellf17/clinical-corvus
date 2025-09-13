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

class DeepLQuotaExceededError(Exception):
    """Custom exception for DeepL quota exceeded errors."""
    pass

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

# Global quota exceeded flag
quota_exceeded = False
quota_exceeded_time = 0
QUOTA_RESET_TIMEOUT = 3600  # 1 hour before retrying after quota exceeded

# Persistent storage for quota tracking
import json
import os
from pathlib import Path

# File to store persistent quota data
QUOTA_DATA_FILE = os.getenv("DEEPL_QUOTA_FILE", "deepl_quota.json")
QUOTA_DATA_DIR = os.getenv("DEEPL_QUOTA_DIR", "/tmp/clinical_corvus")

# Ensure directory exists
Path(QUOTA_DATA_DIR).mkdir(parents=True, exist_ok=True)
QUOTA_FILE_PATH = Path(QUOTA_DATA_DIR) / QUOTA_DATA_FILE

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
            logger.error(f"🚫 DAILY LIMIT EXCEEDED: Used: {daily_tracker.characters_used}, "
                        f"Requested: {character_count}, Remaining: {remaining_chars}")
            raise Exception(f"Daily DeepL character limit exceeded. Try again tomorrow.")
        
        # Check burst capacity
        if not burst_bucket.can_consume(character_count):
            wait_time = burst_bucket.time_until_available(character_count)
            if wait_time > 0:
                logger.warning(f"⏰ BURST LIMIT REACHED: Waiting {wait_time:.2f}s for {character_count} chars...")
                logger.warning(f"   Current burst: {burst_bucket.tokens:.1f}/{burst_bucket.capacity} chars")
                logger.warning(f"   Daily usage: {daily_tracker.characters_used}/{DAILY_CHARACTER_LIMIT} chars")
                await asyncio.sleep(wait_time)
        
        # Consume characters from burst bucket
        if not burst_bucket.consume(character_count):
            # This shouldn't happen after waiting, but just in case
            logger.warning("Failed to consume characters from burst bucket after waiting")
            raise Exception("Rate limit error: unable to consume characters")
        
        # Record daily usage
        daily_tracker.use_characters(character_count)
        
        logger.info(f"✅ RATE LIMIT OK: Used {character_count} chars. "
                    f"Daily: {daily_tracker.characters_used}/{DAILY_CHARACTER_LIMIT} ({daily_tracker.characters_used/DAILY_CHARACTER_LIMIT*100:.1f}%), "
                    f"Burst: {burst_bucket.tokens:.1f}/{burst_bucket.capacity}")

async def _exponential_backoff_with_jitter(attempt: int) -> float:
    """Calculate exponential backoff delay with jitter"""
    delay = min(BASE_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
    jitter = random.uniform(-RETRY_JITTER * delay, RETRY_JITTER * delay)
    return max(0.1, delay + jitter)  # Minimum 100ms delay

async def translate_text_deepl(
    text: Union[str, List[str]],
    target_lang: str = "EN-US",
    source_lang: Optional[str] = None
) -> Union[str, List[str]]:
    """
    Translates text using DeepL API. This function makes a single API call attempt.
    Retries and fallbacks should be handled by the calling service.
    
    Args:
        text: Single string or list of strings to translate
        target_lang: Target language code (e.g., "EN-US", "PT-BR")
        source_lang: Source language code (optional)
    
    Returns:
        Translated text (string or list of strings)
    
    Raises:
        DeepLQuotaExceededError: If the DeepL quota is exceeded.
        httpx.HTTPStatusError: For other HTTP-related errors.
        Exception: For other unexpected errors.
    """
    if not DEEPL_API_KEY:
        raise ValueError("DeepL API key not configured. Please set DEEPL_API_KEY environment variable.")

    # Check for pre-existing quota exceeded state to fail fast
    global quota_exceeded, quota_exceeded_time
    if quota_exceeded and time.time() - quota_exceeded_time < QUOTA_RESET_TIMEOUT:
        logger.warning("DeepL quota was previously exceeded. Skipping request to avoid further errors.")
        raise DeepLQuotaExceededError("DeepL quota exceeded (cached state)")

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
            return await client.post(
                DEEPL_API_URL,
                json=payload,
                headers=headers,
                timeout=30
            )

    response = await circuit_breaker.execute(_make_request)
    
    # Enhanced quota and rate limit handling
    response_text = response.text
    is_quota_exceeded = _detect_quota_exceeded(response_text, response.status_code)
    
    if response.status_code == 456 or is_quota_exceeded:
        logger.error(f"DeepL quota exceeded detected: {response.status_code} - {response_text}")
        quota_exceeded = True
        quota_exceeded_time = time.time()
        _save_persistent_usage()  # Save state immediately
        raise DeepLQuotaExceededError(f"DeepL quota exceeded: {response_text}")

    # Let the retry handler in the service layer deal with rate limits (429)
    # and server errors (5xx)
    response.raise_for_status()
    
    # Parse successful response
    data = response.json()
    translations = [item["text"] for item in data.get("translations", [])]
    
    # Log successful translation
    logger.info(f"DeepL translation successful. Characters: {character_count}, "
               f"Daily usage: {daily_tracker.characters_used}/{DAILY_CHARACTER_LIMIT}")
    
    # Save persistent usage data
    _save_persistent_usage()
    
    # Reset quota exceeded flag on successful translation
    if quota_exceeded:
        logger.info("DeepL translation successful, resetting quota exceeded flag")
        quota_exceeded = False
        quota_exceeded_time = 0
        _save_persistent_usage()

    # Return result in the same format as input
    if isinstance(text, list):
        return translations
    else:
        return translations[0] if translations else ""

# Persistent storage functions
def _load_quota_data():
    """Load quota data from persistent storage"""
    try:
        if QUOTA_FILE_PATH.exists():
            with open(QUOTA_FILE_PATH, 'r') as f:
                data = json.load(f)
                return data
    except Exception as e:
        logger.warning(f"Failed to load quota data: {e}")
    return {}

def _save_quota_data(data: dict):
    """Save quota data to persistent storage"""
    try:
        with open(QUOTA_FILE_PATH, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"Failed to save quota data: {e}")

def _load_persistent_usage():
    """Load daily usage from persistent storage"""
    try:
        data = _load_quota_data()
        today = time.strftime("%Y-%m-%d")
        
        # Check if we have data for today
        if data.get("date") == today:
            daily_tracker.characters_used = data.get("daily_usage", 0)
            logger.info(f"Loaded persistent daily usage: {daily_tracker.characters_used} characters")
        else:
            # New day, reset usage
            daily_tracker.characters_used = 0
            logger.info("New day detected, resetting daily usage")
            
    except Exception as e:
        logger.warning(f"Failed to load persistent usage: {e}")

def _save_persistent_usage():
    """Save daily usage to persistent storage"""
    try:
        data = {
            "date": time.strftime("%Y-%m-%d"),
            "daily_usage": daily_tracker.characters_used,
            "last_updated": time.time()
        }
        _save_quota_data(data)
    except Exception as e:
        logger.warning(f"Failed to save persistent usage: {e}")

# Enhanced quota detection with persistent storage
def _detect_quota_exceeded(response_text: str, status_code: int) -> bool:
    """Enhanced quota detection based on response patterns"""
    text = response_text.lower()
    
    # Common quota exceeded patterns
    quota_patterns = [
        "quota exceeded",
        "usage limit",
        "character limit",
        "monthly limit",
        "daily limit",
        "subscription limit",
        "plan limit",
        "insufficient credits",
        "payment required",
        "upgrade required"
    ]
    
    # Check for specific HTTP status codes
    if status_code == 403 or status_code == 429:
        return True
    
    # Check response text for quota patterns
    for pattern in quota_patterns:
        if pattern in text:
            return True
    
    return False

# Utility functions for monitoring
def get_rate_limit_status() -> dict:
    """Get current rate limiting status for monitoring"""
    daily_tracker.reset_if_new_day()
    burst_bucket._refill()
    
    # Load persistent data if it's a new day
    _load_persistent_usage()
    
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
        },
        "quota_exceeded": quota_exceeded,
        "quota_exceeded_time": quota_exceeded_time,
        "persistent_storage": {
            "file_path": str(QUOTA_FILE_PATH),
            "exists": QUOTA_FILE_PATH.exists()
        }
    }

def reset_daily_usage():
    """Reset daily usage counter (for testing)"""
    global daily_tracker
    daily_tracker = DailyUsageTracker(
        date=time.strftime("%Y-%m-%d"),
        characters_used=0
    )
    _save_persistent_usage()

# Initialize persistent storage on module load
_load_persistent_usage()