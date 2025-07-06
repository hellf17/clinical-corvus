from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
import logging
from typing import Optional
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

# Dependency for logging requests
async def log_translation_request(request: TranslationRequest):
    text_preview = request.input[:50] + "..." if len(request.input) > 50 else request.input
    logger.info(f"Translation request received: {text_preview}")
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
        logger.info(f"Successfully translated {len(payload.input)} characters to English")
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
        logger.info(f"Successfully translated {len(payload.input)} characters to Portuguese")
        return {"translated_text": translated, "source": "BAML"}
    except Exception as e:
        logger.error(f"Error in TranslateToPortuguese endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

# Health check endpoint
@router.get(
    "/health",
    summary="Translation Service Health Check",
    description="Verifies that the translation service is operational"
)
async def health_check():
    try:
        # Translate a simple test phrase to verify service is working
        test_result = await translate("Hello world", target_lang="PT")
        return {
            "status": "healthy",
            "message": "Translation service is operational",
            "test_translation_successful": bool(test_result)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": f"Translation service error: {str(e)}",
            "test_translation_successful": False
        }
