"""
Enhanced Google Scholar client using the scholarly library for robust academic search.

This client provides structured access to Google Scholar data with better reliability
and more detailed publication information than web scraping.
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any, Union
from datetime import datetime, timedelta
import re
from pydantic import BaseModel

try:
    from scholarly import scholarly, ProxyGenerator
    SCHOLARLY_AVAILABLE = True
except ImportError:
    SCHOLARLY_AVAILABLE = False
    scholarly = None
    ProxyGenerator = None

logger = logging.getLogger(__name__)

class ScholarPublication(BaseModel):
    """Publication result from Google Scholar."""
    title: str
    authors: List[str]
    year: Optional[int] = None
    citation_count: Optional[int] = None
    journal: Optional[str] = None
    abstract: Optional[str] = None
    url: Optional[str] = None
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    scholar_id: Optional[str] = None
    relevance_score: Optional[float] = None

class ScholarSearchResponse(BaseModel):
    """Response from Google Scholar search."""
    query: str
    publications: List[ScholarPublication]
    total_found: int
    search_time: Optional[float] = None
    error: Optional[str] = None

class GoogleScholarClient:
    """Enhanced Google Scholar client using scholarly library."""
    
    def __init__(self):
        if not SCHOLARLY_AVAILABLE:
            logger.error("Scholarly library not available. Install with: pip install scholarly")
            self.available = False
            return
            
        self.available = True
        self._setup_proxy_if_needed()
        
        # Configure scholarly settings for better reliability
        self._configure_scholarly()
        
        logger.info("Google Scholar client initialized with scholarly library")
    
    def _setup_proxy_if_needed(self):
        """Setup proxy configuration if needed for Scholar access."""
        try:
            # For production, you might want to configure proxies
            # pg = ProxyGenerator()
            # success = pg.FreeProxies()
            # if success:
            #     scholarly.use_proxy(pg)
            #     logger.info("Proxy configured for Google Scholar")
            pass
        except Exception as e:
            logger.warning(f"Could not setup proxy for Scholar: {e}")
    
    def _configure_scholarly(self):
        """Configure scholarly library settings."""
        try:
            # Set a common user-agent to make requests look more like a regular browser
            # This is a basic step; more advanced proxy/user-agent rotation might be needed for heavy use
            if scholarly:
                scholarly.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
                logger.info(f"Scholarly user-agent set to: {scholarly.USER_AGENT}")
        except Exception as e:
            logger.warning(f"Could not configure scholarly user-agent: {e}")
    
    async def search_publications(
        self,
        query: str,
        max_results: int = 10,
        sort_by_citations: bool = True,
        year_from: Optional[int] = None,
        include_abstracts: bool = True
    ) -> ScholarSearchResponse:
        """
        Search for publications on Google Scholar.
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            sort_by_citations: Whether to sort by citation count
            year_from: Only include papers from this year onwards
            include_abstracts: Whether to fetch full abstracts (slower)
            
        Returns:
            ScholarSearchResponse with publication data
        """
        if not self.available:
            logger.warning("Scholarly library is not available. Returning empty results.")
            return ScholarSearchResponse(
                query=query,
                publications=[],
                total_found=0,
                error="Scholarly library not available or not installed."
            )
        
        start_time = datetime.now()
        publications = []
        search_error = None
        optimized_query_for_log = query # Default for logging if optimization fails
        
        try:
            # Optimize query for medical/clinical research
            optimized_query = self._optimize_medical_query(query)
            optimized_query_for_log = optimized_query
            logger.info(f"Searching Google Scholar with optimized query: {optimized_query}")
            
            # Run the scholarly search in a thread to avoid blocking
            search_results_iterator = await asyncio.get_event_loop().run_in_executor(
                None, self._perform_search_iterator, optimized_query # Changed to iterator
            )

            if search_results_iterator is None: # Happens if _perform_search_iterator had an early error
                raise Exception("Scholarly search iterator failed to initialize.")
            
            # Process results from iterator
            processed_count = 0
            for pub_data in search_results_iterator:
                if processed_count >= max_results:
                    logger.info(f"Reached max_results ({max_results}) for scholarly search.")
                    break
                try:
                    publication = await self._extract_publication_data(
                        pub_data, include_abstracts, year_from
                    )
                    if publication:
                        publication.relevance_score = self._calculate_relevance_score(
                            publication, query
                        )
                        publications.append(publication)
                        processed_count += 1
                except Exception as e:
                    logger.warning(f"Error processing a scholarly publication item: {e}")
                    continue # Continue with the next item
            
            search_time = (datetime.now() - start_time).total_seconds()
            
            if not publications and not search_error:
                search_error = "No publications found or processed successfully from scholarly library."
                if processed_count == 0 and max_results > 0:
                    logger.warning(search_error)

            logger.info(f"Scholarly search: Found {len(publications)} relevant publications in {search_time:.2f}s. Processed attempts: {processed_count}")
            
        except Exception as e:
            search_error = f"Scholarly search error: {str(e)}"
            logger.error(f"Error in Google Scholar search using scholarly for query '{optimized_query_for_log}': {e}", exc_info=True)
            # Ensure publications list is empty on error
            publications = []
        
        return ScholarSearchResponse(
            query=optimized_query_for_log,
            publications=publications,
            total_found=len(publications),
            search_time=(datetime.now() - start_time).total_seconds() if 'start_time' in locals() else None,
            error=search_error
        )
    
    def _perform_search_iterator(self, query: str) -> Optional[Any]: # Returns an iterator or None
        """Perform the actual scholarly search (runs in thread), returns an iterator."""
        try:
            logger.debug(f"Scholarly: Initiating search_pubs for query: {query}")
            # search_pubs itself returns a generator
            search_query_iterator = scholarly.search_pubs(query)
            return search_query_iterator
        except Exception as e:
            # This is a critical point; if scholarly itself fails (e.g., due to network, captcha), log it well.
            logger.error(f"Scholarly: scholarly.search_pubs('{query}') failed critically: {e}", exc_info=True)
            return None # Indicate failure to get iterator
    
    async def _extract_publication_data(
        self, 
        pub_data: Dict, 
        include_abstracts: bool = True,
        year_from: Optional[int] = None
    ) -> Optional[ScholarPublication]:
        """Extract and structure publication data."""
        try:
            bib = pub_data.get('bib', {})
            
            # Extract basic information
            title = bib.get('title', '').strip()
            if not title:
                return None
            
            authors = bib.get('author', [])
            if isinstance(authors, str):
                authors = [authors]
            
            # Extract year and filter if needed
            year = None
            pub_year = bib.get('pub_year')
            if pub_year:
                try:
                    year = int(pub_year)
                    if year_from and year < year_from:
                        return None  # Skip old publications
                except (ValueError, TypeError):
                    pass
            
            # Extract other metadata
            journal = bib.get('venue', '') or bib.get('journal', '')
            citation_count = pub_data.get('num_citations', 0)
            
            # Extract URLs
            pub_url = pub_data.get('pub_url')
            pdf_url = pub_data.get('eprint_url')
            
            # Extract abstract if requested
            abstract = bib.get('abstract', '') if include_abstracts else None
            
            # Extract DOI/PMID if available
            doi = self._extract_doi_from_text(str(pub_data))
            pmid = self._extract_pmid_from_text(str(pub_data))
            
            # Create publication object
            publication = ScholarPublication(
                title=title,
                authors=authors,
                year=year,
                citation_count=citation_count,
                journal=journal,
                abstract=abstract,
                url=pub_url,
                pdf_url=pdf_url,
                doi=doi,
                pmid=pmid,
                scholar_id=pub_data.get('url_scholarbib', '')
            )
            
            return publication
            
        except Exception as e:
            logger.warning(f"Error extracting publication data: {e}")
            return None
    
    def _optimize_medical_query(self, query: str) -> str:
        """Optimize query for medical/clinical research."""
        # Add medical context if not present
        medical_terms = [
            'clinical', 'medical', 'treatment', 'therapy', 'diagnosis',
            'patient', 'healthcare', 'medicine', 'therapeutic'
        ]
        
        query_lower = query.lower()
        has_medical_context = any(term in query_lower for term in medical_terms)
        
        if not has_medical_context:
            # Add general medical context
            query = f"{query} clinical medical"
        
        # Add publication type preferences
        query += " (systematic review OR meta-analysis OR clinical trial OR randomized controlled trial)"
        
        return query
    
    def _calculate_relevance_score(self, publication: ScholarPublication, original_query: str) -> float:
        """Calculate relevance score for publication."""
        score = 0.0
        query_terms = set(original_query.lower().split())
        
        # Title relevance (40% weight)
        if publication.title:
            title_terms = set(publication.title.lower().split())
            title_overlap = len(query_terms.intersection(title_terms)) / len(query_terms) if query_terms else 0
            score += title_overlap * 0.3
        
        # Citation count (30% weight) - normalized
        if publication.citation_count:
            # Normalize citation count (log scale)
            import math
            citation_score = min(math.log10(publication.citation_count + 1) / 3, 1.0)
            score += citation_score * 0.2
        
        # Recency (20% weight)
        if publication.year:
            current_year = datetime.now().year
            years_ago = current_year - publication.year
            recency_score = max(0, 1 - (years_ago / 10))  # Decay over 10 years
            score += recency_score * 0.1
        
        # Abstract relevance (10% weight)
        if publication.abstract:
            abstract_terms = set(publication.abstract.lower().split())
            abstract_overlap = len(query_terms.intersection(abstract_terms)) / len(query_terms) if query_terms else 0
            score += abstract_overlap * 0.4
        
        return min(score, 1.0)
    
    def _extract_doi_from_text(self, text: str) -> Optional[str]:
        """Extract DOI from text if present."""
        doi_pattern = r'10\.\d{4,}/[^\s]+'
        match = re.search(doi_pattern, text)
        return match.group(0) if match else None
    
    def _extract_pmid_from_text(self, text: str) -> Optional[str]:
        """Extract PMID from text if present."""
        pmid_pattern = r'PMID:?\s*(\d+)'
        match = re.search(pmid_pattern, text, re.IGNORECASE)
        return match.group(1) if match else None
    
    async def search_authors(self, author_name: str, max_results: int = 5) -> List[Dict]:
        """Search for authors on Google Scholar."""
        if not self.available:
            return []
        
        try:
            search_results = await asyncio.get_event_loop().run_in_executor(
                None, lambda: list(scholarly.search_author(author_name))[:max_results]
            )
            return search_results
        except Exception as e:
            logger.error(f"Error searching authors: {e}")
            return []
    
    async def get_author_publications(self, author_id: str, max_results: int = 10) -> List[ScholarPublication]:
        """Get publications for a specific author."""
        if not self.available:
            return []
        
        try:
            author = await asyncio.get_event_loop().run_in_executor(
                None, lambda: scholarly.search_author_id(author_id)
            )
            
            filled_author = await asyncio.get_event_loop().run_in_executor(
                None, lambda: scholarly.fill(author)
            )
            
            publications = []
            for pub_data in filled_author.get('publications', [])[:max_results]:
                publication = await self._extract_publication_data(pub_data, include_abstracts=False)
                if publication:
                    publications.append(publication)
            
            return publications
            
        except Exception as e:
            logger.error(f"Error getting author publications: {e}")
            return []

# Global client instance
_scholar_client = None

async def get_google_scholar_client() -> GoogleScholarClient:
    """Get singleton Google Scholar client."""
    global _scholar_client
    if _scholar_client is None:
        _scholar_client = GoogleScholarClient()
    return _scholar_client

async def search_google_scholar_enhanced(
    query: str,
    max_results: int = 10,
    sort_by_citations: bool = True,
    year_from: Optional[int] = None,
    include_abstracts: bool = True
) -> ScholarSearchResponse:
    """
    Enhanced Google Scholar search using scholarly library.
    
    Args:
        query: Search query
        max_results: Maximum results to return
        sort_by_citations: Sort by citation count
        year_from: Only include papers from this year onwards
        include_abstracts: Whether to fetch abstracts
        
    Returns:
        ScholarSearchResponse with structured publication data
    """
    client = await get_google_scholar_client()
    return await client.search_publications(
        query=query,
        max_results=max_results,
        sort_by_citations=sort_by_citations,
        year_from=year_from,
        include_abstracts=include_abstracts
    ) 