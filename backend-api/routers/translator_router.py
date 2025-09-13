from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
import logging
from typing import Optional, List
from services.translator_service import translate

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(tags=["Translation"])



class TranslationHealthResponse(BaseModel):
    status: str
    message: str
    test_translation_successful: bool
    cache_size: int = 0
    baml_available: bool = False
    deepl_available: bool = False
    primary_service: str = "deepl"  # Indicates which service is primary
    fallback_service: str = "baml"  # Indicates which service is fallback



# Background task to warm up translation services
async def _warm_up_translation_services():
    """Warm up translation services by making a test request"""
    try:
        await translate("Hello world", target_lang="PT")
        await translate("Olá mundo", target_lang="EN")
        logger.info("Translation services warmed up successfully")
    except Exception as e:
        logger.error(f"Failed to warm up translation services: {e}")

@router.post(
    "/warmup",
    summary="Warm up Translation Services",
    description="Initializes translation services to reduce latency for subsequent requests"
)
async def warmup_translation_services(background_tasks: BackgroundTasks):
    """Trigger warm-up of translation services in the background"""
    background_tasks.add_task(_warm_up_translation_services)
    return {"status": "warming up", "message": "Translation services are being initialized in the background"}

# Health check endpoint
@router.get(
    "/health",
    response_model=TranslationHealthResponse,
    summary="Translation Service Health Check",
    description="Verifies that the translation service is operational"
)
async def health_check():
    from services.translator_service import translation_cache
    
    health_response = {
        "status": "unknown",
        "message": "Translation service status check in progress",
        "test_translation_successful": False,
        "cache_size": len(translation_cache),
        "baml_available": False,
        "deepl_available": False,
        "primary_service": "deepl",
        "fallback_service": "baml"
    }
    
    try:
        # Try a simple test translation
        test_result = await translate("Hello world", target_lang="PT")
        health_response["test_translation_successful"] = bool(test_result and test_result != "Hello world")
        
        # Check BAML availability
        try:
            import httpx
            from services.translator_service import BAML_TRANSLATOR_URL
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BAML_TRANSLATOR_URL}/health",
                    timeout=5
                )
                health_response["baml_available"] = response.status_code == 200
        except:
            health_response["baml_available"] = False
            
        # Check DeepL availability (indirectly)
        try:
            from clients.deepl_client import DEEPL_API_KEY
            health_response["deepl_available"] = bool(DEEPL_API_KEY)
        except:
            health_response["deepl_available"] = False
            
        # Set final status
        if health_response["test_translation_successful"]:
            health_response["status"] = "healthy"
            health_response["message"] = "Translation service is operational"
        else:
            health_response["status"] = "degraded"
            health_response["message"] = "Translation test failed but service is responding"
            
        return health_response
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": f"Translation service error: {str(e)}",
            "test_translation_successful": False,
            "cache_size": len(translation_cache),
            "baml_available": False,
            "deepl_available": False,
            "primary_service": "deepl",
            "fallback_service": "baml"
        }
