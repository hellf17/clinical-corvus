from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
import logging
from typing import Optional, List
from services.translator_service import translate

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(tags=["Translation"])

# Define request/response models
class TranslationRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=10000, description="Text to translate")
    
    @validator('input')
    def input_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Input text cannot be empty")
        return v

class TranslationOutput(BaseModel):
    translated_text: str
    source: str = "BAML"  # Indicates which translation service was used

class BatchTranslationRequest(BaseModel):
    inputs: List[str] = Field(..., description="List of texts to translate")
    
    @validator('inputs')
    def inputs_not_empty(cls, v):
        if not v:
            raise ValueError("Input texts list cannot be empty")
        if len(v) > 50:
            raise ValueError("Maximum batch size is 50 texts")
        return v

class BatchTranslationOutput(BaseModel):
    translated_texts: List[str]
    source: str = "BAML"  # Indicates which translation service was used

class TranslationHealthResponse(BaseModel):
    status: str
    message: str
    test_translation_successful: bool
    cache_size: int = 0
    baml_available: bool = False
    deepl_available: bool = False

# Dependency for logging requests
async def log_translation_request(request: TranslationRequest):
    # Only log the first 50 characters to avoid excessive logging
    text_preview = request.input[:50] + "..." if len(request.input) > 50 else request.input
    # Use debug level instead of info to reduce log verbosity
    logger.debug(f"Translation request received: {text_preview}")
    return request

# Dependency for logging batch requests
async def log_batch_translation_request(request: BatchTranslationRequest):
    # Only log the count of items to avoid excessive logging
    logger.debug(f"Batch translation request received: {len(request.inputs)} items")
    return request

@router.post(
    "/TranslateToEnglish",
    response_model=TranslationOutput,
    summary="Translate text to English",
    description="Translates the provided text to English using BAML translation service."
)
async def translate_to_english(payload: TranslationRequest = Depends(log_translation_request)):
    try:
        translated = await translate(payload.input, target_lang="EN")
        return {"translated_text": translated, "source": "BAML"}
    except Exception as e:
        logger.error(f"Error in TranslateToEnglish endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post(
    "/TranslateToPortuguese",
    response_model=TranslationOutput,
    summary="Translate text to Portuguese",
    description="Translates the provided text to Portuguese using BAML translation service."
)
async def translate_to_portuguese(payload: TranslationRequest = Depends(log_translation_request)):
    try:
        translated = await translate(payload.input, target_lang="PT")
        return {"translated_text": translated, "source": "BAML"}
    except Exception as e:
        logger.error(f"Error in TranslateToPortuguese endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post(
    "/BatchTranslateToEnglish",
    response_model=BatchTranslationOutput,
    summary="Batch translate texts to English",
    description="Translates multiple texts to English in a single request for efficiency."
)
async def batch_translate_to_english(payload: BatchTranslationRequest = Depends(log_batch_translation_request)):
    try:
        translated = await translate(payload.inputs, target_lang="EN", field_name="batch_english")
        return {"translated_texts": translated, "source": "BAML"}
    except Exception as e:
        logger.error(f"Error in BatchTranslateToEnglish endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post(
    "/BatchTranslateToPortuguese",
    response_model=BatchTranslationOutput,
    summary="Batch translate texts to Portuguese",
    description="Translates multiple texts to Portuguese in a single request for efficiency."
)
async def batch_translate_to_portuguese(payload: BatchTranslationRequest = Depends(log_batch_translation_request)):
    try:
        translated = await translate(payload.inputs, target_lang="PT", field_name="batch_portuguese")
        return {"translated_texts": translated, "source": "BAML"}
    except Exception as e:
        logger.error(f"Error in BatchTranslateToPortuguese endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

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
        "deepl_available": False
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
            "deepl_available": False
        }
