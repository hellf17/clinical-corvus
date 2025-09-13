import pytest
import asyncio
import json
import os
from unittest.mock import patch, AsyncMock, MagicMock
from pathlib import Path

# Import the modules we need to test
from clients.deepl_client import (
    translate_text_deepl, 
    get_rate_limit_status, 
    reset_daily_usage,
    _detect_quota_exceeded,
    _load_quota_data,
    _save_quota_data
)
from services.translator_service import translate
from services.translation_monitor import TranslationMonitor

class TestDeepLQuotaHandling:
    """Test DeepL quota detection and handling"""
    
    @pytest.fixture
    def mock_quota_file(self, tmp_path):
        """Create a temporary quota file for testing"""
        quota_file = tmp_path / "test_quota.json"
        return quota_file
    
    @pytest.fixture
    def setup_quota_env(self, mock_quota_file):
        """Setup environment for quota testing"""
        os.environ["DEEPL_QUOTA_FILE"] = str(mock_quota_file)
        os.environ["DEEPL_QUOTA_DIR"] = str(mock_quota_file.parent)
        yield
        # Cleanup
        if mock_quota_file.exists():
            mock_quota_file.unlink()
    
    @pytest.mark.asyncio
    async def test_quota_exceeded_detection(self):
        """Test quota exceeded detection patterns"""
        
        # Test various quota exceeded patterns
        quota_patterns = [
            "quota exceeded",
            "usage limit reached",
            "character limit exceeded",
            "monthly limit reached",
            "daily limit exceeded",
            "subscription limit reached",
            "plan limit exceeded",
            "insufficient credits",
            "payment required",
            "upgrade required"
        ]
        
        for pattern in quota_patterns:
            assert _detect_quota_exceeded(pattern, 403) == True
            assert _detect_quota_exceeded(pattern, 429) == True
            assert _detect_quota_exceeded(pattern, 200) == True  # Should detect in text regardless of status
        
        # Test non-quota errors
        non_quota_patterns = [
            "server error",
            "timeout",
            "network error",
            "invalid request"
        ]
        
        for pattern in non_quota_patterns:
            assert _detect_quota_exceeded(pattern, 403) == False
            assert _detect_quota_exceeded(pattern, 429) == False
    
    @pytest.mark.asyncio
    async def test_persistent_storage(self, setup_quota_env):
        """Test persistent storage of quota data"""
        
        # Test saving and loading quota data
        test_data = {
            "date": "2024-01-01",
            "daily_usage": 1000,
            "last_updated": 1234567890
        }
        
        _save_quota_data(test_data)
        loaded_data = _load_quota_data()
        
        assert loaded_data == test_data
    
    @pytest.mark.asyncio
    async def test_rate_limit_status(self):
        """Test rate limit status reporting"""
        
        status = get_rate_limit_status()
        
        # Check structure
        assert "daily_usage" in status
        assert "burst_capacity" in status
        assert "circuit_breaker" in status
        assert "quota_exceeded" in status
        assert "persistent_storage" in status
        
        # Check daily usage structure
        daily = status["daily_usage"]
        assert "used" in daily
        assert "limit" in daily
        assert "remaining" in daily
        assert "percentage" in daily
    
    @pytest.mark.asyncio
    @patch('clients.deepl_client.httpx.AsyncClient')
    async def test_quota_exceeded_handling(self, mock_client_class):
        """Test handling of quota exceeded responses"""
        
        # Mock quota exceeded response
        mock_response = AsyncMock()
        mock_response.status_code = 403
        mock_response.text = "quota exceeded"
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        with pytest.raises(Exception) as exc_info:
            await translate_text_deepl("Hello world")
        
        assert "quota exceeded" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    @patch('clients.deepl_client.httpx.AsyncClient')
    async def test_successful_translation_resets_quota_flag(self, mock_client_class):
        """Test that successful translation resets quota exceeded flag"""
        
        # Mock successful response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "translations": [{"text": "Olá mundo"}]
        }
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.post.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        # First set quota exceeded flag
        from clients.deepl_client import quota_exceeded, quota_exceeded_time
        quota_exceeded = True
        quota_exceeded_time = 1234567890
        
        # Perform successful translation
        result = await translate_text_deepl("Hello world", target_lang="PT")
        
        # Check that quota flag was reset
        from clients.deepl_client import quota_exceeded
        assert quota_exceeded == False
    
    @pytest.mark.asyncio
    @patch('services.translator_service.translate_text_deepl')
    @patch('services.translator_service.translate_text_baml')
    async def test_fallback_to_baml_on_quota_exceeded(self, mock_baml, mock_deepl):
        """Test fallback to BAML when DeepL quota is exceeded"""
        
        # Mock DeepL quota exceeded
        mock_deepl.side_effect = Exception("DeepL quota exceeded")
        
        # Mock successful BAML translation
        mock_baml.return_value = "Texto traduzido"
        
        result = await translate("Hello world", target_lang="PT")
        
        # Should fallback to BAML
        assert result == "Texto traduzido"
        mock_baml.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_translation_monitor_health_check(self):
        """Test translation monitor health checks"""
        
        monitor = TranslationMonitor()
        
        # Test health check structure
        health = await monitor.get_system_health()
        
        assert "timestamp" in health
        assert "overall_healthy" in health
        assert "services" in health
        assert "recommendations" in health
        
        # Check services structure
        services = health["services"]
        assert "deepl" in services
        assert "baml" in services
    
    @pytest.mark.asyncio
    async def test_monitor_recommendations(self):
        """Test monitor recommendation generation"""
        
        monitor = TranslationMonitor()
        
        # Test high usage recommendations
        deepl_high_usage = {
            "usage_percentage": 85,
            "quota_exceeded": False
        }
        
        baml_healthy = {"healthy": True}
        
        recommendations = monitor._generate_recommendations(deepl_high_usage, baml_healthy)
        
        # Should have warning recommendation
        warning_recs = [r for r in recommendations if r["type"] == "warning"]
        assert len(warning_recs) > 0
        
        # Test quota exceeded recommendations
        deepl_quota_exceeded = {
            "usage_percentage": 100,
            "quota_exceeded": True
        }
        
        recommendations = monitor._generate_recommendations(deepl_quota_exceeded, baml_healthy)
        
        # Should have critical recommendation
        critical_recs = [r for r in recommendations if r["type"] == "critical"]
        assert len(critical_recs) > 0
    
    @pytest.mark.asyncio
    async def test_monitor_metrics_storage(self, tmp_path):
        """Test metrics storage functionality"""
        
        metrics_file = tmp_path / "test_metrics.json"
        os.environ["TRANSLATION_METRICS_FILE"] = str(metrics_file)
        
        monitor = TranslationMonitor()
        
        # Test saving metrics
        test_metrics = {
            "timestamp": "2024-01-01T00:00:00",
            "overall_healthy": True,
            "services": {}
        }
        
        await monitor.save_metrics(test_metrics)
        
        # Check file was created
        assert metrics_file.exists()
        
        # Check content
        with open(metrics_file, 'r') as f:
            saved_metrics = json.load(f)
        
        assert len(saved_metrics) == 1
        assert saved_metrics[0] == test_metrics
    
    @pytest.mark.asyncio
    async def test_daily_usage_persistence(self, setup_quota_env):
        """Test daily usage persistence across restarts"""
        
        # Reset daily usage
        reset_daily_usage()
        
        # Simulate some usage
        from clients.deepl_client import daily_tracker
        daily_tracker.use_characters(500)
        
        # Save usage
        from clients.deepl_client import _save_persistent_usage
        _save_persistent_usage()
        
        # Simulate restart by creating new tracker
        new_tracker = daily_tracker.__class__(
            date="1970-01-01",  # Force reset
            characters_used=0
        )
        
        # Load persistent data
        from clients.deepl_client import _load_persistent_usage
        _load_persistent_usage()
        
        # Check usage was restored
        assert daily_tracker.characters_used == 500

def run_quota_tests():
    """Run all quota-related tests"""
    pytest.main([__file__, "-v", "-k", "quota"])

if __name__ == "__main__":
    run_quota_tests()