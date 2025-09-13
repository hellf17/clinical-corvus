import redis
import json
import logging
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class CacheService:
    def __init__(self):
        try:
            self.redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info("Successfully connected to Redis.")
        except redis.exceptions.ConnectionError as e:
            logger.error(f"Could not connect to Redis: {e}")
            self.redis_client = None

    def get(self, key: str):
        if not self.redis_client:
            return None
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                logger.info(f"Cache HIT for key: {key}")
                return json.loads(cached_data)
            logger.info(f"Cache MISS for key: {key}")
            return None
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return None

    def set(self, key: str, value: dict, ttl: int = 3600):
        if not self.redis_client:
            return
        try:
            self.redis_client.set(key, json.dumps(value), ex=ttl)
            logger.info(f"Set cache for key: {key} with TTL: {ttl}s")
        except Exception as e:
            logger.error(f"Error setting cache: {e}")

cache_service = CacheService()