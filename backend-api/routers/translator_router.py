from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from typing import Optional
from services.translator_service import translate

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(prefix="/translate", tags=["Translation"])

# Define request/response models
class TranslationRequest(BaseModel):
    input: str

class TranslationOutput(BaseModel):
    translated_text: str

@router.post(
    "/TranslateToEnglish",
    response_model=TranslationOutput,
    summary="Translate text to English",
    description="Translates the provided text to English using BAML translation service."
)
async def translate_to_english(payload: TranslationRequest):
    try:
        translated = await translate(payload.input, target_lang="EN")
        return {"translated_text": translated}
    except Exception as e:
        logger.error(f"Error in TranslateToEnglish endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@router.post(
    "/TranslateToPortuguese",
    response_model=TranslationOutput,
    summary="Translate text to Portuguese",
    description="Translates the provided text to Portuguese using BAML translation service."
)
async def translate_to_portuguese(payload: TranslationRequest):
    try:
        translated = await translate(payload.input, target_lang="PT")
        return {"translated_text": translated}
    except Exception as e:
        logger.error(f"Error in TranslateToPortuguese endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")
