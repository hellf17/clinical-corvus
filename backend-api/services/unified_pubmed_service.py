"""
Unified PubMed Service
Integrates with the unified metrics service to provide comprehensive bibliometric analysis
Eliminates duplication and provides a single, clean interface for PubMed searches
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import xml.etree.ElementTree as ET
import re

# Import the unified metrics service
from .unified_metrics_service import unified_metrics_service, UnifiedMetrics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UnifiedSearchResult:
    """Unified search result with comprehensive metrics"""
    # Basic article information
    pmid: str
    title: str
    abstract: str
    authors: List[str]
    journal: str
    publication_date: str
    doi: Optional[str] = None
    
    # Unified metrics
    unified_metrics: Optional[Dict[str, Any]] = None
    composite_impact_score: Optional[float] = None
    impact_classification: Optional[str] = None
    citation_consensus: Optional[Dict[str, int]] = None
    
    # Quality indicators
    is_clinical: Optional[bool] = None
    highly_cited: Optional[bool] = None
    has_ai_summary: Optional[bool] = None
    ai_summary: Optional[str] = None
    
    # Individual source metrics for transparency
    altmetric_score: Optional[float] = None
    rcr_score: Optional[float] = None
    nih_percentile: Optional[float] = None
    semantic_scholar_citations: Optional[int] = None
    opencitations_citations: Optional[int] = None
    web_of_science_citations: Optional[int] = None
    influential_citations: Optional[int] = None
    
    # Relevance scoring
    query_relevance_score: Optional[float] = None
    journal_impact_score: Optional[float] = None
    recency_score: Optional[float] = None
    final_relevance_score: Optional[float] = None

class UnifiedPubMedService:
    """Unified PubMed service with comprehensive bibliometric integration"""
    
    def __init__(self, session: Optional[aiohttp.ClientSession] = None):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        self._session = session
        self._owns_session = session is None
        
        # High-impact journals for scoring
        self.high_impact_journals = {
            'nature', 'science', 'cell', 'lancet', 'new england journal of medicine',
            'jama', 'bmj', 'plos medicine', 'nature medicine', 'nature genetics',
            'nature biotechnology', 'nature immunology', 'immunity', 'cancer cell',
            'molecular cell', 'developmental cell', 'current biology', 'neuron'
        }
        
        self.medium_impact_journals = {
            'plos one', 'scientific reports', 'bmc', 'frontiers', 'journal of clinical medicine',
            'elife', 'embo journal', 'proceedings of the national academy of sciences',
            'journal of biological chemistry', 'nucleic acids research'
        }
        
    async def __aenter__(self):
        """Async context manager entry"""
        if self._owns_session or self._session is None:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={'User-Agent': 'Clinical-Helper-Unified/2.1 (Research Tool)'}
            )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._owns_session and self._session and not self._session.closed:
            await self._session.close()

    @property
    def session(self) -> aiohttp.ClientSession:
        """Provides access to the client session, raising an error if not available."""
        if not self._session:
            raise RuntimeError("Session not initialized. Use 'async with' to manage the service lifecycle.")
        return self._session

    def _calculate_query_relevance_score(self, result: UnifiedSearchResult, query: str) -> float:
        """Calculate relevance score based on query match"""
        try:
            query_terms = [term.lower().strip() for term in query.split() if len(term.strip()) > 2]
            title_lower = result.title.lower()
            abstract_lower = result.abstract.lower() if result.abstract else ""
            
            if not query_terms:
                return 0.5
            
            # Title matches (weighted heavily)
            title_matches = sum(1 for term in query_terms if term in title_lower)
            title_score = (title_matches / len(query_terms)) * 0.7
            
            # Abstract matches
            abstract_matches = sum(1 for term in query_terms if term in abstract_lower)
            abstract_score = (abstract_matches / len(query_terms)) * 0.3
            
            # Bonus for exact phrase matches
            query_lower = query.lower()
            phrase_bonus = 0.0
            if query_lower in title_lower:
                phrase_bonus += 0.2
            elif query_lower in abstract_lower:
                phrase_bonus += 0.1
            
            return min(1.0, title_score + abstract_score + phrase_bonus)
        except Exception as e:
            logger.warning(f"Error calculating query relevance score: {e}")
            return 0.5

    def _calculate_journal_impact_score(self, result: UnifiedSearchResult) -> float:
        """Calculate journal impact score"""
        try:
            journal_lower = result.journal.lower() if result.journal else ""
            
            # Check for high-impact journals
            if any(journal in journal_lower for journal in self.high_impact_journals):
                return 1.0
            elif any(journal in journal_lower for journal in self.medium_impact_journals):
                return 0.7
            else:
                return 0.4
                
        except Exception as e:
            logger.warning(f"Error calculating journal impact score: {e}")
            return 0.5

    def _calculate_recency_score(self, result: UnifiedSearchResult) -> float:
        """Calculate recency score based on publication date"""
        try:
            if not result.publication_date:
                return 0.3
            
            pub_year = int(result.publication_date[:4])
            current_year = datetime.now().year
            years_old = current_year - pub_year
            
            if years_old <= 1:
                return 1.0
            elif years_old <= 2:
                return 0.9
            elif years_old <= 3:
                return 0.8
            elif years_old <= 5:
                return 0.6
            elif years_old <= 10:
                return 0.4
            else:
                return 0.2
                
        except (ValueError, TypeError):
            return 0.3

    def _calculate_final_relevance_score(self, result: UnifiedSearchResult) -> float:
        """Calculate final relevance score combining all factors"""
        try:
            # Base scores
            query_score = result.query_relevance_score or 0.0
            journal_score = result.journal_impact_score or 0.0
            recency_score = result.recency_score or 0.0
            impact_score = result.composite_impact_score or 0.0
            
            # Weights for different components
            query_weight = 0.35      # 35% - Query relevance
            impact_weight = 0.30     # 30% - Bibliometric impact
            journal_weight = 0.20    # 20% - Journal quality
            recency_weight = 0.15    # 15% - Publication recency
            
            final_score = (
                query_score * query_weight +
                impact_score * impact_weight +
                journal_score * journal_weight +
                recency_score * recency_weight
            )
            
            # Quality bonuses
            bonus = 0.0
            
            if result.is_clinical:
                bonus += 0.05  # Clinical relevance bonus
            
            if result.highly_cited:
                bonus += 0.05  # Highly cited bonus
            
            if result.has_ai_summary:
                bonus += 0.02  # AI summary bonus
            
            if result.citation_consensus and len(result.citation_consensus) >= 3:
                bonus += 0.03  # Multi-source consensus bonus
            
            return min(1.0, final_score + bonus)
            
        except Exception as e:
            logger.warning(f"Error calculating final relevance score: {e}")
            return result.query_relevance_score or 0.5

    async def _enrich_results_with_metrics(self, results: List[UnifiedSearchResult], query: str) -> List[UnifiedSearchResult]:
        """Enrich search results with unified metrics"""
        logger.info(f"Enriching {len(results)} results with unified metrics")
        
        async with unified_metrics_service as service:
            batch_size = 5
            enriched_results = []
            
            for i in range(0, len(results), batch_size):
                batch = results[i:i + batch_size]
                
                tasks = []
                for result in batch:
                    task = service.get_unified_metrics(
                        pmid=result.pmid,
                        doi=result.doi,
                        title=result.title
                    )
                    tasks.append((result, task))
                
                for result, task in tasks:
                    try:
                        unified_metrics = await task
                        
                        result.unified_metrics = service.get_metrics_summary(unified_metrics)
                        result.composite_impact_score = unified_metrics.composite_impact_score
                        result.impact_classification = unified_metrics.impact_classification
                        result.citation_consensus = unified_metrics.citation_consensus
                        result.is_clinical = unified_metrics.is_clinical
                        result.highly_cited = unified_metrics.highly_cited
                        result.has_ai_summary = unified_metrics.has_ai_summary
                        
                        result.query_relevance_score = self._calculate_query_relevance_score(result, query)
                        result.journal_impact_score = self._calculate_journal_impact_score(result)
                        result.recency_score = self._calculate_recency_score(result)
                        
                        result.final_relevance_score = self._calculate_final_relevance_score(result)

                        enriched_results.append(result)
                        
                    except Exception as e:
                        logger.warning(f"Failed to enrich PMID {result.pmid} with metrics: {e}")
                        enriched_results.append(result)
                        
            return enriched_results

    def _apply_default_language_filter(self, query: str) -> str:
        """Ensure PubMed query includes a language filter. Defaults to English if none provided.

        PubMed supports language filters using the syntax "english[lang]" or "portuguese[lang]" etc.
        If the query already contains an explicit "[lang]" filter we leave it unchanged. Otherwise we
        append an English language filter so that the API preferentially returns English articles.
        """
        # Very cheap check – only add filter if pattern "[lang]" is absent (case-insensitive).
        query_lower = query.lower()
        # Check for existing language filters like "english[lang]" or "french[language]"
        if "[lang]" not in query_lower and "[language]" not in query_lower:
            # Parenthesise the original query to maintain precedence.
            return f"({query}) AND english[lang]"
        return query

    async def search_unified(self, query: str, max_results: int = 20) -> List[UnifiedSearchResult]:
        """
        Performs a unified search on PubMed, enriches with metrics, and returns sorted results.
        Automatically applies an English language filter when no explicit language filter is present in
        the incoming query to prioritise international literature.
        """
        # Apply default language filter if needed
        query_with_lang = self._apply_default_language_filter(query)

        logger.info(
            f"Starting unified PubMed search for: '{query_with_lang}' (original: '{query}', max_results: {max_results})"
        )
        
        try:
            pmids = await self._search_pubmed_for_pmids(query_with_lang, max_results)
            if not pmids:
                logger.info("No results found in PubMed search (PMIDs list is empty after parsing XML)")
                return []
            
            logger.info(f"Found {len(pmids)} PMIDs. Fetching details...")

            article_details = await self._fetch_article_details(pmids)
            logger.info(f"Fetched details for {len(article_details)} articles.")
            
            enriched_results = await self._enrich_results_with_metrics(article_details, query)
            logger.info(f"Enriched {len(enriched_results)} articles with metrics.")
            
            sorted_results = sorted(
                enriched_results, 
                key=lambda x: x.final_relevance_score or 0.0, 
                reverse=True
            )
            
            logger.info("Unified search completed successfully.")
            return sorted_results
            
        except aiohttp.ClientError as e:
            logger.error(f"Network error in unified PubMed search: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Error in unified PubMed search: {e}", exc_info=True)
            return []
            
    async def _search_pubmed_for_pmids(self, query: str, max_results: int) -> List[str]:
        """Search PubMed and return a list of PMIDs."""
        search_url = f"{self.base_url}esearch.fcgi"
        params = {'db': 'pubmed', 'term': query, 'retmax': max_results, 'retmode': 'xml', 'sort': 'relevance'}
        logger.info(f"PubMed eSearch params: {params}")
        
        async with self.session.get(search_url, params=params) as response:
            response.raise_for_status()
            text = await response.text()
            logger.info(f"PubMed eSearch status: {response.status}, Response text: {text[:200]}...")
            root = ET.fromstring(text)
            id_list_element = root.find('IdList')
            if id_list_element is None: return []
            return [id_element.text for id_element in id_list_element if id_element.text]

    async def _fetch_article_details(self, pmids: List[str]) -> List[UnifiedSearchResult]:
        """Fetch detailed article information for a list of PMIDs."""
        if not pmids: return []
        fetch_url = f"{self.base_url}efetch.fcgi"
        params = {'db': 'pubmed', 'id': ",".join(pmids), 'retmode': 'xml'}
        
        async with self.session.get(fetch_url, params=params) as response:
            response.raise_for_status()
            text = await response.text()
            root = ET.fromstring(text)
            articles = []
            for article_element in root.findall('.//PubmedArticle'):
                try:
                    parsed_article = self._parse_article_xml(article_element)
                    if parsed_article: articles.append(parsed_article)
                except Exception as e:
                    logger.warning(f"Error parsing article XML: {e}")
            return articles

    def _parse_article_xml(self, article_element: ET.Element) -> Optional[UnifiedSearchResult]:
        """Parse XML for a single article to extract details."""
        medline_citation = article_element.find('MedlineCitation')
        if medline_citation is None: return None
        pmid_element = medline_citation.find('PMID')
        if pmid_element is None or pmid_element.text is None: return None
        pmid = pmid_element.text
        article = medline_citation.find('Article')
        if article is None: return None
        title = "".join(article.find('ArticleTitle').itertext()) if article.find('ArticleTitle') is not None else "No title"
        abstract_element = article.find('Abstract/AbstractText')
        abstract = "".join(abstract_element.itertext()) if abstract_element is not None else ""
        author_list_element = article.find('AuthorList')
        authors = []
        if author_list_element is not None:
            for author_element in author_list_element.findall('Author'):
                last_name = author_element.find('LastName')
                initials = author_element.find('Initials')
                if last_name is not None and initials is not None:
                    authors.append(f"{last_name.text} {initials.text}")
        journal_element = article.find('Journal')
        journal = journal_element.find('Title').text if journal_element is not None and journal_element.find('Title') is not None else "N/A"
        journal_issue = journal_element.find('JournalIssue') if journal_element is not None else None
        pub_date_element = journal_issue.find('PubDate') if journal_issue is not None else None
        publication_date = "N/A"
        if pub_date_element is not None:
            year = pub_date_element.find('Year')
            month = pub_date_element.find('Month')
            day = pub_date_element.find('Day')
            if year is not None:
                publication_date = year.text
                if month is not None: publication_date += f"-{month.text}"
                if day is not None: publication_date += f"-{day.text}"
        doi_element = article.find("ELocationID[@EIdType='doi']")
        doi = doi_element.text if doi_element is not None else None
        return UnifiedSearchResult(pmid=pmid, title=title, abstract=abstract, authors=authors, journal=journal, publication_date=publication_date, doi=doi)

    def get_search_summary(self, results: List[UnifiedSearchResult]) -> Dict[str, Any]:
        """Generates a summary of the search results."""
        if not results: return {"total_results": 0}
        total_results = len(results)
        avg_impact_score = sum(r.composite_impact_score for r in results if r.composite_impact_score) / total_results
        avg_relevance_score = sum(r.final_relevance_score for r in results if r.final_relevance_score) / total_results
        impact_distribution = {}
        for r in results:
            if r.impact_classification:
                impact_distribution[r.impact_classification] = impact_distribution.get(r.impact_classification, 0) + 1
        top_3_results = [{"title": r.title, "journal": r.journal, "relevance": r.final_relevance_score, "impact": r.composite_impact_score} for r in results[:3]]
        return {"total_results": total_results, "average_impact_score": round(avg_impact_score, 3), "average_relevance_score": round(avg_relevance_score, 3), "impact_distribution": impact_distribution, "top_results": top_3_results}

# Singleton instance for easy import and use
unified_pubmed_service = UnifiedPubMedService() 