import logging
from typing import Literal, List, Union
from clients.deepl_client import translate_text_deepl
import httpx
import os
import asyncio

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
BAML_TRANSLATOR_URL = os.getenv("BAML_TRANSLATOR_URL", "http://localhost:8000/api/translate")  # Change as needed

# --- MAIN TRANSLATION SERVICE ---

async def translate(text: Union[str, List[str]], target_lang: Literal["EN", "PT"] = "EN", field_name: str = None) -> Union[str, List[str]]:
    """    
    Translate text using DeepL as primary, fall back to BAML if DeepL fails.
    Can handle either a single string or a list of strings.
    target_lang: "EN" for English, "PT" for Portuguese (Brazilian)
    field_name: Optional name of the field being translated (for better logging)
    Returns translated text (or list of translated texts), or raises Exception if all fail.
    """
    # Handle batch translation if text is a list
    if isinstance(text, list):
        return await translate_batch(text, target_lang, field_name)
        
    # Single text translation
    """
    Translate text using DeepL as primary, fall back to BAML if DeepL fails.
    target_lang: "EN" for English, "PT" for Portuguese (Brazilian)
    field_name: Optional name of the field being translated (for better logging)
    Returns translated text, or raises Exception if all fail.
    """
    deepl_target = "EN-US" if target_lang == "EN" else "PT-BR"
    # Truncate text for logging purposes
    log_text = text[:50] + "..." if text and len(text) > 50 else text
    
    # 1. Try DeepL
    try:
        translated = await translate_text_deepl(text, target_lang=deepl_target)
        if translated:
            field_info = f" field: {field_name}" if field_name else ""
            logger.info(f"DeepL translation succeeded: {target_lang}{field_info} | Text: {log_text}")
            return translated
        logger.warning(f"DeepL returned None for {field_name or 'unknown field'}, will try BAML fallback.")
    except Exception as e:
        logger.warning(f"DeepL translation failed: {e}, will try BAML fallback.")

    # 2. Fallback to BAML
    try:
        baml_func = "TranslateToEnglish" if target_lang == "EN" else "TranslateToPortuguese"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BAML_TRANSLATOR_URL}/{baml_func}",
                json={"input": text},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            translated = data.get("translated_text") or data.get("result", {}).get("translated_text")
            if not translated:
                raise Exception(f"BAML fallback did not return translated_text: {data}")
            field_info = f" field: {field_name}" if field_name else ""
            logger.info(f"BAML fallback translation succeeded: {target_lang}{field_info} | Text: {log_text}")
            return translated
    except Exception as e:
        logger.error(f"Both DeepL and BAML translation failed: {e}")
        raise Exception(f"Translation failed for target_lang={target_lang}: {e}")


async def translate_batch(texts: List[str], target_lang: Literal["EN", "PT"] = "EN", field_name: str = None) -> List[str]:
    """
    Translate a batch of texts, handling each text individually to ensure reliability.
    This is more robust than sending the entire batch at once to DeepL.
    """
    if not texts:
        return []
        
    # Process each text individually to avoid DeepL API limitations
    tasks = [translate(text, target_lang, f"{field_name}[{i}]" if field_name else None) 
             for i, text in enumerate(texts)]
    
    # Wait for all translations to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Check for any exceptions and raise the first one found
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            # Log the specific item that failed
            log_text = texts[i][:75] + '...' if len(texts[i]) > 75 else texts[i]
            logger.error(f"Error translating batch item {i} ('{log_text}'): {result}")
            # Raise the exception to prevent silent failure. This will bubble up to the endpoint.
            raise result

    return results
