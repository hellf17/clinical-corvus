import os
import aiohttp
import logging

logger = logging.getLogger(__name__)

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
if not DEEPL_API_KEY:
    logger.warning("DEEPL_API_KEY not found in environment variables. DeepL translation will fail.")

# Use the free API endpoint if it's the free key, otherwise use the pro endpoint
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate" if DEEPL_API_KEY and ":fx" in DEEPL_API_KEY else "https://api.deepl.com/v2/translate"

async def translate_text_deepl(text: str, target_lang: str = "EN-US") -> str | None:
    """
    Translates text to the target language using the DeepL API.

    Args:
        text: The text to translate.
        target_lang: The target language code (e.g., 'EN-US' for English).

    Returns:
        The translated text, or None if translation fails.
    """
    if not DEEPL_API_KEY:
        logger.error("Cannot translate with DeepL: DEEPL_API_KEY is not set.")
        return None

    headers = {
        "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "text": [text],
        "target_lang": target_lang,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(DEEPL_API_URL, headers=headers, json=payload) as response:
                response.raise_for_status()
                result = await response.json()
                if result.get("translations") and len(result["translations"]) > 0:
                    translated = result["translations"][0]["text"]
                    logger.info(f"Successfully translated text using DeepL.")
                    return translated
                else:
                    logger.warning("DeepL translation response did not contain translations.")
                    return None
    except aiohttp.ClientError as e:
        logger.error(f"Error during DeepL API call: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred in DeepL translation: {e}")
        return None 