"""
Observability Service

This service provides basic observability and metrics collection for the MVP agent,
including latency, error rates, and agent-specific counters.
"""

import logging
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ObservabilityService:
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "agent_requests": 0,
            "agent_errors": 0,
            "agent_latency": [],
            "agent_latency_avg": 0,
            "agent_requests_by_type": {},
            "agent_errors_by_type": {},
        }

    def track_request(self, agent_type: str):
        self.metrics["agent_requests"] += 1
        self.metrics["agent_requests_by_type"][agent_type] = (
            self.metrics["agent_requests_by_type"].get(agent_type, 0) + 1
        )
        logger.info(f"Request tracked for agent: {agent_type}")

    def track_error(self, agent_type: str):
        self.metrics["agent_errors"] += 1
        self.metrics["agent_errors_by_type"][agent_type] = (
            self.metrics["agent_errors_by_type"].get(agent_type, 0) + 1
        )
        logger.error(f"Error tracked for agent: {agent_type}")

    def track_latency(self, latency: float):
        self.metrics["agent_latency"].append(latency)
        # Keep last 100 latency values for avg calculation
        if len(self.metrics["agent_latency"]) > 100:
            self.metrics["agent_latency"] = self.metrics["agent_latency"][-100:]
        
        self.metrics["agent_latency_avg"] = sum(self.metrics["agent_latency"]) / len(
            self.metrics["agent_latency"]
        )

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics

    def reset_metrics(self):
        self.__init__()
        logger.info("Metrics have been reset.")

# Global instance for reuse
observability_service = ObservabilityService()

# Decorator for tracking agent execution time
def track_agent_performance(agent_type: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            observability_service.track_request(agent_type)
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                observability_service.track_error(agent_type)
                raise e
            finally:
                latency = time.time() - start_time
                observability_service.track_latency(latency)
        return wrapper
    return decorator
