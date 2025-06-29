import logging
from typing import List, Optional
from baml_client.types import RawSearchResultItem, ResearchSourceType
from services.unified_pubmed_service import UnifiedSearchResult
from clients.brave_search_client import BraveSearchResponse

logger = logging.getLogger(__name__)

def convert_unified_to_baml_search_result(item: UnifiedSearchResult) -> Optional[RawSearchResultItem]:
    """Converte UnifiedSearchResult para RawSearchResultItem do BAML, com robustez."""
    try:
        title = item.title
        if title is None:
            logger.warning(f"UnifiedSearchResult item (PMID: {item.pmid if item.pmid else 'N/A'}) has no title. Using default: 'Title not available'.")
            title = "Title not available"

        url = f"https://pubmed.ncbi.nlm.nih.gov/{item.pmid}/" if item.pmid else None
        authors_list = None
        if isinstance(item.authors, list):
            if len(item.authors) > 3:
                authors_list = item.authors[:3] + ["et al."]
            else:
                authors_list = item.authors
        elif item.authors is not None: # Handle cases where it might be a string or other non-list type unexpectedly
            logger.warning(f"Authors field for PMID {item.pmid if item.pmid else 'N/A'} is not a list: {item.authors}. Setting authors to None.")

        citation_count = item.semantic_scholar_citations or item.opencitations_citations
        if citation_count is not None and not isinstance(citation_count, int):
            try:
                citation_count = int(citation_count)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert citation_count '{citation_count}' to int for PMID {item.pmid if item.pmid else 'N/A'}. Setting to None.")
                citation_count = None

        logger.info(f"Attempting RawSearchResultItem creation for PMID {item.pmid if item.pmid else 'N/A'}:")
        logger.info(f"  source: {ResearchSourceType.PUBMED}")
        logger.info(f"  title: '{title}'")
        logger.info(f"  url: '{url}'")
        logger.info(f"  snippet_or_abstract: '{item.abstract[:100] if item.abstract else None}... (truncated)'")
        logger.info(f"  publication_date: '{item.publication_date}'")
        logger.info(f"  authors: {authors_list}")
        logger.info(f"  journal: '{item.journal}'")
        logger.info(f"  pmid: '{item.pmid}'")
        logger.info(f"  doi: '{item.doi}'")
        logger.info(f"  study_type: None")
        logger.info(f"  citation_count: {citation_count}")

        baml_item = RawSearchResultItem(
            source=ResearchSourceType.PUBMED,
            title=title,
            url=url,
            snippet_or_abstract=item.abstract,
            publication_date=item.publication_date,
            authors=authors_list,
            journal=item.journal,
            pmid=item.pmid,
            doi=item.doi,
            study_type=None,
            citation_count=citation_count,
            synthesis_relevance_score=getattr(item, 'final_relevance_score', None) if hasattr(item, 'final_relevance_score') else None
        )
        logger.debug(f"Successfully converted UnifiedSearchResult (PMID: {item.pmid if item.pmid else 'N/A'}) to BAML RawSearchResultItem.")
        return baml_item
    except Exception as e:
        pmid_for_log = getattr(item, 'pmid', 'PMID_UNAVAILABLE')
        logger.error(f"Error converting UnifiedSearchResult (PMID: {pmid_for_log}) to BAML RawSearchResultItem: {e}", exc_info=True)
        return None

from typing import Dict, Any, Optional # Added Optional

def convert_single_brave_item_to_baml(brave_item: Dict[str, Any]) -> Optional[RawSearchResultItem]:
    """Converte um único item de resultado do Brave Search (dicionário) para RawSearchResultItem do BAML."""
    # Ensure essential fields like URL and title are present
    if not brave_item.get("url") or not brave_item.get("title"):
        # logger.warning(f"Brave item missing URL or title: {brave_item.get('url', 'N/A')}") # Consider adding logging if needed
        return None

    # Map Brave item fields to RawSearchResultItem fields
    # Adjust keys based on the actual structure of an individual Brave search result item.
    # Common keys: 'title', 'url', 'description'. For date, it might be 'page_age', 'publishedDate', 'last_modified', etc.
    return RawSearchResultItem(
        source=ResearchSourceType.WEB_SEARCH_BRAVE,
        title=str(brave_item.get("title", "")), # Ensure string
        url=str(brave_item.get("url", "")),     # Ensure string
        snippet_or_abstract=str(brave_item.get("description") or brave_item.get("snippet", "")), # Try 'description' then 'snippet'
        publication_date=str(brave_item.get("page_age") or brave_item.get("publishedDate") or brave_item.get("last_modified", "")), # Try a few common date fields
        authors=None,  # Brave results typically don't provide structured authors
        journal=None,  # Not applicable for general web results
        pmid=None,
        doi=None,
        study_type=None,  # Not typically available
        citation_count=None,
        synthesis_relevance_score=None  # Brave results do not have a relevance score
    )
