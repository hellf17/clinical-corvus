import logging
import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class TranslationMonitor:
    """Monitor translation service health and quota usage"""
    
    def __init__(self):
        self.metrics_file = Path(os.getenv("TRANSLATION_METRICS_FILE", "translation_metrics.json"))
        self.alert_threshold = float(os.getenv("TRANSLATION_ALERT_THRESHOLD", "80.0"))  # 80% usage
        self.check_interval = int(os.getenv("TRANSLATION_CHECK_INTERVAL", "300"))  # 5 minutes
        
    async def check_deepl_quota(self) -> Dict[str, Any]:
        """Check DeepL quota status and return metrics"""
        try:
            from clients.deepl_client import get_rate_limit_status
            status = get_rate_limit_status()
            
            daily_usage = status.get("daily_usage", {})
            usage_percentage = daily_usage.get("percentage", 0)
            
            # Check if we need to alert
            alert_needed = usage_percentage >= self.alert_threshold
            
            return {
                "service": "deepl",
                "timestamp": datetime.now().isoformat(),
                "usage_percentage": usage_percentage,
                "daily_used": daily_usage.get("used", 0),
                "daily_limit": daily_usage.get("limit", 0),
                "remaining": daily_usage.get("remaining", 0),
                "quota_exceeded": status.get("quota_exceeded", False),
                "circuit_breaker_state": status.get("circuit_breaker", {}).get("state", "unknown"),
                "alert_needed": alert_needed
            }
            
        except Exception as e:
            logger.error(f"Failed to check DeepL quota: {e}")
            return {
                "service": "deepl",
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "alert_needed": True
            }
    
    async def check_baml_health(self) -> Dict[str, Any]:
        """Check BAML translation service health"""
        try:
            from baml_client import b
            # Simple health check by testing a small translation
            test_result = await b.TranslateText("Hello", "PT")
            
            return {
                "service": "baml",
                "timestamp": datetime.now().isoformat(),
                "healthy": True,
                "response_time": 0  # Could add timing here
            }
            
        except Exception as e:
            logger.error(f"BAML health check failed: {e}")
            return {
                "service": "baml",
                "timestamp": datetime.now().isoformat(),
                "healthy": False,
                "error": str(e)
            }
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get overall translation system health"""
        deepl_status = await self.check_deepl_quota()
        baml_status = await self.check_baml_health()
        
        # Determine overall health
        deepl_healthy = not deepl_status.get("quota_exceeded", True)
        baml_healthy = baml_status.get("healthy", False)
        
        # DeepL is primary, so if it's healthy, system is healthy
        # If DeepL fails but BAML is healthy, system is still functional
        overall_healthy = deepl_healthy or baml_healthy
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_healthy": overall_healthy,
            "primary_service": "deepl",
            "fallback_service": "baml",
            "services": {
                "deepl": deepl_status,
                "baml": baml_status
            },
            "recommendations": self._generate_recommendations(deepl_status, baml_status)
        }
    
    def _generate_recommendations(self, deepl_status: Dict, baml_status: Dict) -> list:
        """Generate recommendations based on service status"""
        recommendations = []
        
        # DeepL recommendations (primary service)
        if deepl_status.get("quota_exceeded"):
            recommendations.append({
                "service": "deepl",
                "type": "critical",
                "message": "DeepL quota exceeded. System is using BAML fallback.",
                "action": "monitor_baml_usage"
            })
        
        usage_percentage = deepl_status.get("usage_percentage", 0)
        if usage_percentage >= 90:
            recommendations.append({
                "service": "deepl",
                "type": "warning",
                "message": f"DeepL usage at {usage_percentage:.1f}%. System will fall back to BAML soon.",
                "action": "prepare_baml_fallback"
            })
        elif usage_percentage >= 75:
            recommendations.append({
                "service": "deepl",
                "type": "info",
                "message": f"DeepL usage at {usage_percentage:.1f}%. Monitor closely.",
                "action": "track_usage"
            })
        
        # BAML recommendations (fallback service)
        if not baml_status.get("healthy"):
            recommendations.append({
                "service": "baml",
                "type": "critical",
                "message": "BAML fallback service unavailable. Translation capacity reduced.",
                "action": "investigate_baml_issues"
            })
        else:
            # If DeepL is having issues but BAML is healthy, recommend monitoring BAML usage
            if deepl_status.get("quota_exceeded") or usage_percentage >= 90:
                recommendations.append({
                    "service": "baml",
                    "type": "info",
                    "message": "BAML is healthy and serving as fallback. Monitor BAML usage.",
                    "action": "monitor_baml_usage"
                })
        
        return recommendations
    
    async def save_metrics(self, metrics: Dict[str, Any]):
        """Save metrics to file for historical tracking"""
        try:
            # Load existing metrics
            historical_data = []
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    historical_data = json.load(f)
            
            # Add new metrics
            historical_data.append(metrics)
            
            # Keep only last 1000 entries
            if len(historical_data) > 1000:
                historical_data = historical_data[-1000:]
            
            # Save updated metrics
            with open(self.metrics_file, 'w') as f:
                json.dump(historical_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
    
    async def start_monitoring(self):
        """Start continuous monitoring in background"""
        while True:
            try:
                health = await self.get_system_health()
                await self.save_metrics(health)
                
                # Log alerts if needed
                for service_status in health["services"].values():
                    if service_status.get("alert_needed"):
                        logger.warning(f"Translation service alert: {service_status}")
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.check_interval)

# Global monitor instance
monitor = TranslationMonitor()

# Utility functions for external use
async def get_translation_health() -> Dict[str, Any]:
    """Get current translation system health"""
    return await monitor.get_system_health()

async def get_deepl_quota_status() -> Dict[str, Any]:
    """Get DeepL quota status (primary service)"""
    return await monitor.check_deepl_quota()

async def get_baml_health() -> Dict[str, Any]:
    """Get BAML health status (fallback service)"""
    return await monitor.check_baml_health()

def get_historical_metrics() -> list:
    """Get historical metrics from file"""
    try:
        if monitor.metrics_file.exists():
            with open(monitor.metrics_file, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load historical metrics: {e}")
    return []