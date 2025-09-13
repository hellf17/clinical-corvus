"""
Test suite for the improved rate limiting and backoff strategies.
Tests DeepL character-based limiting, BAML retry policies, and request deduplication.
"""

import pytest
import asyncio
import time
import os
from unittest.mock import patch, AsyncMock, MagicMock
from typing import List

# Import the modules we're testing
from clients.deepl_client import (
    translate_text_deepl, 
    get_rate_limit_status, 
    reset_daily_usage,
    burst_bucket,
    daily_tracker,
    circuit_breaker
)
from services.translator_service import (
    translate,
    translate_with_fallback,
    get_translation_metrics,
    reset_translation_metrics,
    clear_translation_cache,
    _translate_single_with_deduplication,
    _translate_batch_with_deduplication
)

class TestDeepLRateLimiting:
    """Test DeepL character-based rate limiting"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Reset rate limiting state before each test"""
        reset_daily_usage()
        burst_bucket.tokens = burst_bucket.capacity
        burst_bucket.last_refill = time.time()
        circuit_breaker.state = "CLOSED"
        circuit_breaker.failures = 0
        
    def test_character_count_calculation(self):
        """Test character counting for rate limiting"""
        from clients.deepl_client import _calculate_character_count
        
        # Single string
        assert _calculate_character_count("Hello world") == 11
        
        # List of strings
        assert _calculate_character_count(["Hello", "world"]) == 10
        
        # Empty inputs
        assert _calculate_character_count("") == 0
        assert _calculate_character_count([]) == 0
        assert _calculate_character_count(["", None, "test"]) == 4
    
    def test_daily_usage_tracking(self):
        """Test daily character usage tracking"""
        # Should start with zero usage
        assert daily_tracker.characters_used == 0
        assert daily_tracker.is_today()
        
        # Test usage tracking
        daily_tracker.use_characters(100)
        assert daily_tracker.characters_used == 100
        
        # Test daily limit check
        assert daily_tracker.can_use(15900)  # Should be within limit
        assert not daily_tracker.can_use(16000)  # Should exceed limit
    
    def test_burst_bucket_refill(self):
        """Test token bucket refill mechanism"""
        # Consume all tokens
        burst_bucket.consume(burst_bucket.capacity)
        assert burst_bucket.tokens == 0
        
        # Wait a bit and check refill
        time.sleep(0.1)
        burst_bucket._refill()
        assert burst_bucket.tokens > 0
        
        # Test time until available
        needed_tokens = 1000
        wait_time = burst_bucket.time_until_available(needed_tokens)
        assert wait_time >= 0
    
    @pytest.mark.asyncio
    async def test_rate_limit_waiting(self):
        """Test rate limiting wait mechanism"""
        from clients.deepl_client import _wait_for_rate_limit
        
        # Should pass with small character count
        start_time = time.time()
        await _wait_for_rate_limit(100)
        elapsed = time.time() - start_time
        assert elapsed < 0.1  # Should be immediate
        
        # Test burst limit
        burst_bucket.tokens = 50  # Set low token count
        start_time = time.time()
        await _wait_for_rate_limit(100)  # Request more than available
        elapsed = time.time() - start_time
        assert elapsed > 0.05  # Should have waited
    
    @pytest.mark.asyncio
    async def test_daily_limit_exceeded(self):
        """Test daily limit enforcement"""
        from clients.deepl_client import _wait_for_rate_limit
        
        # Set usage near limit
        daily_tracker.characters_used = 15999
        
        # Should fail when exceeding daily limit
        with pytest.raises(Exception, match="Daily DeepL character limit exceeded"):
            await _wait_for_rate_limit(100)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_functionality(self):
        """Test circuit breaker pattern"""
        # Test closed state (normal operation)
        assert circuit_breaker.state == "CLOSED"
        
        async def failing_function():
            raise Exception("Test failure")
        
        # Trigger failures to open circuit
        for _ in range(circuit_breaker.failure_threshold):
            with pytest.raises(Exception):
                await circuit_breaker.execute(failing_function)
        
        # Circuit should now be open
        assert circuit_breaker.state == "OPEN"
        
        # Should fail fast when circuit is open
        with pytest.raises(Exception, match="Circuit breaker.*is open"):
            await circuit_breaker.execute(failing_function)
    
    @pytest.mark.asyncio
    @patch('clients.deepl_client.httpx.AsyncClient')
    async def test_deepl_translation_success(self, mock_client):
        """Test successful DeepL translation with rate limiting"""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "translations": [{"text": "Hello world"}]
        }
        mock_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        
        # Test translation
        result = await translate_text_deepl("Olá mundo", target_lang="EN-US")
        assert result == "Hello world"
        
        # Check that rate limiting was applied
        assert daily_tracker.characters_used > 0
    
    @pytest.mark.asyncio
    @patch('clients.deepl_client.httpx.AsyncClient')
    async def test_deepl_429_retry_logic(self, mock_client):
        """Test 429 error handling with exponential backoff"""
        # Mock 429 response followed by success
        mock_429_response = MagicMock()
        mock_429_response.status_code = 429
        mock_429_response.headers = {"Retry-After": "1"}
        
        mock_success_response = MagicMock()
        mock_success_response.status_code = 200
        mock_success_response.json.return_value = {
            "translations": [{"text": "Hello world"}]
        }
        mock_success_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=[mock_429_response, mock_success_response]
        )
        
        # Should retry and succeed
        start_time = time.time()
        result = await translate_text_deepl("Olá mundo", target_lang="EN-US", max_retries=2)
        elapsed = time.time() - start_time
        
        assert result == "Hello world"
        assert elapsed >= 1.0  # Should have waited for retry-after
    
    def test_rate_limit_status_monitoring(self):
        """Test rate limit status monitoring"""
        status = get_rate_limit_status()
        
        assert "daily_usage" in status
        assert "burst_capacity" in status
        assert "circuit_breaker" in status
        
        assert status["daily_usage"]["limit"] == 16000
        assert status["burst_capacity"]["capacity"] == 2000
        assert status["circuit_breaker"]["state"] == "CLOSED"


class TestTranslatorServiceDeduplication:
    """Test translator service request deduplication and batching"""
    
    @pytest.fixture(autouse=True)
    async def setup_method(self):
        """Reset translator service state before each test"""
        reset_translation_metrics()
        await clear_translation_cache()
    
    @pytest.mark.asyncio
    async def test_request_deduplication(self):
        """Test that duplicate requests are deduplicated"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            mock_deepl.return_value = ["Translated text"]
            
            # Start multiple identical requests simultaneously
            tasks = [
                _translate_single_with_deduplication("Test text", "EN", "test_field")
                for _ in range(5)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # All should return the same result
            assert all(result == "Translated text" for result in results)
            
            # DeepL should only be called once due to deduplication
            assert mock_deepl.call_count == 1
            
            # Check metrics
            metrics = get_translation_metrics()
            assert metrics["cache_metrics"]["deduplication_hits"] >= 4
    
    @pytest.mark.asyncio
    async def test_batch_deduplication(self):
        """Test that duplicate batch requests are deduplicated"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            mock_deepl.return_value = ["Text 1", "Text 2", "Text 3"]
            
            test_batch = ["Texto 1", "Texto 2", "Texto 3"]
            
            # Start multiple identical batch requests simultaneously
            tasks = [
                _translate_batch_with_deduplication(test_batch, "EN", "test_batch")
                for _ in range(3)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # All should return the same result
            expected = ["Text 1", "Text 2", "Text 3"]
            assert all(result == expected for result in results)
            
            # DeepL should only be called once due to deduplication
            assert mock_deepl.call_count == 1
    
    @pytest.mark.asyncio
    async def test_cache_hit_performance(self):
        """Test that cached translations are fast"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            mock_deepl.return_value = ["Cached result"]
            
            # First call should hit DeepL
            start_time = time.time()
            result1 = await translate("Test text", "EN", "cache_test")
            first_call_time = time.time() - start_time
            
            # Second call should hit cache
            start_time = time.time()
            result2 = await translate("Test text", "EN", "cache_test")
            second_call_time = time.time() - start_time
            
            assert result1 == result2 == "Cached result"
            assert second_call_time < first_call_time / 10  # Cache should be much faster
            assert mock_deepl.call_count == 1  # Only called once
            
            # Check cache metrics
            metrics = get_translation_metrics()
            assert metrics["cache_metrics"]["hits"] >= 1
    
    @pytest.mark.asyncio
    async def test_batch_optimization(self):
        """Test that batch processing is optimized"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            mock_deepl.return_value = ["Result 1", "Result 2", "Result 3", "Result 4", "Result 5"]
            
            # Test batch processing
            test_texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"]
            results = await translate(test_texts, "EN", "batch_test")
            
            assert len(results) == 5
            assert mock_deepl.call_count == 1  # Should be batched into single call
            
            # Check that individual items are cached
            cached_result = await translate("Text 1", "EN", "individual_test")
            assert cached_result == "Result 1"
            
            # DeepL shouldn't be called again for cached item
            assert mock_deepl.call_count == 1
    
    @pytest.mark.asyncio
    async def test_fallback_mechanism(self):
        """Test fallback from DeepL to BAML"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl, \
             patch('services.translator_service.b.TranslateToEnglish') as mock_baml:
            
            # Make DeepL fail
            mock_deepl.side_effect = Exception("DeepL API error")
            
            # Make BAML succeed
            mock_baml_result = MagicMock()
            mock_baml_result.translated_text = "BAML translation"
            mock_baml.return_value = mock_baml_result
            
            result = await translate("Test text", "EN", "fallback_test")
            assert result == "BAML translation"
            
            # Check that both services were attempted
            assert mock_deepl.call_count >= 1
            assert mock_baml.call_count >= 1
            
            # Check metrics
            metrics = get_translation_metrics()
            assert metrics["cache_metrics"]["deepl_failure"] >= 1
            assert metrics["cache_metrics"]["baml_success"] >= 1
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self):
        """Test circuit breaker integration with BAML"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl, \
             patch('services.translator_service.b.TranslateToEnglish') as mock_baml:
            
            # Make DeepL fail
            mock_deepl.side_effect = Exception("DeepL unavailable")
            
            # Make BAML fail repeatedly to trigger circuit breaker
            mock_baml.side_effect = Exception("BAML API error")
            
            # Try multiple translations to trigger circuit breaker
            for i in range(5):
                try:
                    await translate(f"Test text {i}", "EN", f"circuit_test_{i}")
                except Exception:
                    pass  # Expected to fail
            
            # Check circuit breaker metrics
            metrics = get_translation_metrics()
            assert metrics["baml_circuit_breaker"]["failures"] >= 3
    
    @pytest.mark.asyncio
    async def test_translation_with_fallback_never_fails(self):
        """Test that translate_with_fallback never raises exceptions"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl, \
             patch('services.translator_service.b.TranslateToEnglish') as mock_baml:
            
            # Make both services fail
            mock_deepl.side_effect = Exception("DeepL error")
            mock_baml.side_effect = Exception("BAML error")
            
            # Should return original text instead of raising exception
            original_text = "Test text that fails to translate"
            result = await translate_with_fallback(original_text, "EN", "never_fail_test")
            assert result == original_text
    
    def test_metrics_collection(self):
        """Test that metrics are properly collected"""
        metrics = get_translation_metrics()
        
        # Check structure
        assert "cache_metrics" in metrics
        assert "deepl_rate_limiting" in metrics
        assert "baml_circuit_breaker" in metrics
        assert "cache_sizes" in metrics
        
        # Check cache metrics structure
        cache_metrics = metrics["cache_metrics"]
        expected_keys = [
            "hits", "misses", "batch_hits", "batch_misses", "deduplication_hits",
            "baml_success", "baml_failure", "deepl_success", "deepl_failure", "rate_limit_retries"
        ]
        for key in expected_keys:
            assert key in cache_metrics
        
        # Check DeepL rate limiting structure
        deepl_metrics = metrics["deepl_rate_limiting"]
        assert "daily_usage" in deepl_metrics
        assert "burst_capacity" in deepl_metrics
        assert "circuit_breaker" in deepl_metrics


class TestIntegrationScenarios:
    """Integration tests for real-world scenarios"""
    
    @pytest.mark.asyncio
    async def test_high_volume_translation_scenario(self):
        """Test handling of high-volume translation requests"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            # Simulate varying response times and occasional failures
            def deepl_side_effect(texts, **kwargs):
                if len(texts) > 10:
                    raise Exception("Batch too large")
                return [f"Translated: {text}" for text in texts]
            
            mock_deepl.side_effect = deepl_side_effect
            
            # Generate a large number of texts to translate
            test_texts = [f"Text to translate {i}" for i in range(50)]
            
            start_time = time.time()
            results = await translate(test_texts, "EN", "high_volume_test")
            elapsed = time.time() - start_time
            
            assert len(results) == 50
            assert all("Translated:" in result for result in results)
            
            # Should complete in reasonable time due to batching
            assert elapsed < 10.0  # Should be much faster than individual requests
            
            # Check that batching was used effectively
            metrics = get_translation_metrics()
            assert metrics["cache_metrics"]["deepl_success"] > 0
    
    @pytest.mark.asyncio
    async def test_mixed_cache_and_new_requests(self):
        """Test scenario with mix of cached and new translation requests"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            mock_deepl.return_value = ["New translation"]
            
            # First, populate cache with some translations
            await translate("Cached text", "EN", "mixed_test")
            
            # Now mix cached and new requests
            mixed_texts = [
                "Cached text",  # Should hit cache
                "New text 1",   # Should call DeepL
                "Cached text",  # Should hit cache again
                "New text 2",   # Should call DeepL
            ]
            
            results = await translate(mixed_texts, "EN", "mixed_batch_test")
            
            assert len(results) == 4
            
            # Check that DeepL was called efficiently (not for cached items)
            metrics = get_translation_metrics()
            assert metrics["cache_metrics"]["hits"] >= 2  # At least 2 cache hits
    
    @pytest.mark.asyncio
    async def test_concurrent_translation_requests(self):
        """Test handling of concurrent translation requests"""
        with patch('services.translator_service.translate_text_deepl') as mock_deepl:
            call_count = 0
            
            async def slow_deepl_response(texts, **kwargs):
                nonlocal call_count
                call_count += 1
                await asyncio.sleep(0.1)  # Simulate network delay
                return [f"Concurrent result {call_count}: {text}" for text in texts]
            
            mock_deepl.side_effect = slow_deepl_response
            
            # Start multiple concurrent requests
            tasks = [
                translate(f"Concurrent text {i}", "EN", f"concurrent_test_{i}")
                for i in range(10)
            ]
            
            start_time = time.time()
            results = await asyncio.gather(*tasks)
            elapsed = time.time() - start_time
            
            assert len(results) == 10
            
            # Should complete faster than sequential execution due to concurrency
            assert elapsed < 1.0  # Much faster than 10 * 0.1 seconds
            
            # Check that concurrent requests were handled properly
            assert all("Concurrent result" in result for result in results)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])