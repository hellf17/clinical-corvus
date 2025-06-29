"""
Cliente para ferramentas MCP que podem ser chamadas diretamente pelo backend.

Este módulo extrai a lógica de ferramentas do `mcp_server.py` para que possam ser
reutilizadas de forma limpa, sem dependências circulares ou chamadas HTTP desnecessárias.
"""

import os
import logging
import aiohttp
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Carregar chaves de API diretamente
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY", "")
if not BRAVE_API_KEY:
    logger.warning("⚠️ BRAVE_API_KEY não está configurada. A busca na web não funcionará.")

BRAVE_SEARCH_BASE_URL = "https://api.search.brave.com/res"
BRAVE_WEB_SEARCH_URL = f"{BRAVE_SEARCH_BASE_URL}/v1/web/search"


async def async_brave_web_search(
    query: str, count: int = 10, offset: int = 0, search_lang: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Executa uma busca assíncrona na web usando a API do Brave.
    """
    if not BRAVE_API_KEY:
        logger.error("Brave API key não fornecida.")
        return None

    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {"q": query, "count": count, "offset": offset}
    if search_lang:
        params["search_lang"] = search_lang

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(BRAVE_WEB_SEARCH_URL, headers=headers, params=params) as response:
                response.raise_for_status()
                return await response.json()
    except aiohttp.ClientError as e:
        logger.error(f"Erro na chamada da API do Brave: {e}")
        return None
    except Exception as e:
        logger.error(f"Erro inesperado durante a busca do Brave: {e}")
        return None


async def async_lookup_guidelines(query: str, count: int = 5) -> Optional[List[Dict[str, Any]]]:
    """Looks up clinical guidelines using Brave Search and filters for relevant results."""
    if not BRAVE_API_KEY:
        logger.warning("BRAVE_API_KEY not configured. Cannot perform guideline lookup.")
        return None

    search_query = f"clinical guidelines for {query} medical treatment OR protocolo clínico para {query} OR diretriz terapêutica para {query}"
    logger.info(f"Looking up guidelines with query: {search_query}")

    try:
        brave_response = await async_brave_web_search(query=search_query, count=count)

        if not brave_response or "web" not in brave_response or not brave_response["web"].get("results"):
            logger.info(f"No web results found from Brave Search for guidelines query: {search_query}")
            return []

        raw_results = brave_response["web"]["results"]
        found_guidelines: List[Dict[str, Any]] = []
        
        guideline_keywords = [
            "guideline", "practice", "consensus", "recommendation", 
            "treatment", "management", "protocolo clínico", "diretriz terapêutica",
            "clinical practice guideline", "evidence-based guideline"
        ]

        for result in raw_results:
            title = result.get("title", "").lower()
            description = result.get("description", "").lower()

            if any(keyword in title or keyword in description for keyword in guideline_keywords):
                publication_date_raw = result.get("page_age") # Brave sometimes provides 'page_age'
                publication_date_str = publication_date_raw if publication_date_raw else "Current"
                
                # Attempt to get a more specific source name from hostname
                source_name = result.get("profile", {}).get("name", "Web Source")
                if source_name == "Web Source" and result.get("meta_url", {}).get("hostname"):
                    source_name = result.get("meta_url", {}).get("hostname")

                guideline_item = {
                    "title": result.get("title", "N/A"),
                    "url": result.get("url", "N/A"),
                    "snippet_or_abstract": result.get("description", "No summary available."),
                    "publication_date": publication_date_str,
                    "source_name": source_name,
                    "source_type": "GUIDELINE" # For clarity, though _convert_mcp_dict_to_baml_results hardcodes it
                }
                found_guidelines.append(guideline_item)
        
        logger.info(f"Found {len(found_guidelines)} potential guidelines for query: '{query}' after filtering.")
        return found_guidelines

    except Exception as e:
        logger.error(f"Error during guideline lookup for '{query}': {e}", exc_info=True)
        return None

# Exemplo de como usar (para teste local, se necessário):
# async def main():