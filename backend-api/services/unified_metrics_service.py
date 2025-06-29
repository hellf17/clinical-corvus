"""
Unified Bibliometric Metrics Service
Consolidates all bibliometric APIs: Altmetric, iCite, Web of Science, OpenCitations, Semantic Scholar
Eliminates duplication and provides a single, comprehensive interface
"""

import asyncio
import aiohttp
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import os
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AltmetricData:
    """Data from Altmetric API"""
    score: Optional[float] = None
    social_mentions: Optional[int] = None
    news_mentions: Optional[int] = None
    policy_citations: Optional[int] = None
    wikipedia_citations: Optional[int] = None
    mendeley_readers: Optional[int] = None
    percentile: Optional[float] = None
    context_percentile: Optional[float] = None

@dataclass
class ICiteData:
    """Data from NIH iCite API"""
    rcr: Optional[float] = None
    nih_percentile: Optional[float] = None
    citation_count: Optional[int] = None
    apt_score: Optional[float] = None
    is_clinical: Optional[bool] = None
    is_research_article: Optional[bool] = None

@dataclass
class WebOfScienceData:
    """Data from Web of Science API"""
    times_cited: Optional[int] = None
    highly_cited: Optional[bool] = None
    hot_paper: Optional[bool] = None
    journal_impact_factor: Optional[float] = None
    category_percentile: Optional[float] = None

@dataclass
class OpenCitationsData:
    """Data from OpenCitations API"""
    citation_count: Optional[int] = None
    reference_count: Optional[int] = None
    citing_papers: Optional[List[str]] = None
    referenced_papers: Optional[List[str]] = None
    venue_citation_count: Optional[int] = None
    self_citations: Optional[int] = None
    
@dataclass
class SemanticScholarData:
    """Data from Semantic Scholar API"""
    citation_count: Optional[int] = None
    reference_count: Optional[int] = None
    influential_citation_count: Optional[int] = None
    paper_id: Optional[str] = None
    venue: Optional[str] = None
    year: Optional[int] = None
    authors: Optional[List[str]] = None
    embedding: Optional[List[float]] = None
    tldr: Optional[str] = None

@dataclass
class GoogleScholarAnalysis:
    """Analysis of Google Scholar integration possibilities"""
    availability_note: str
    recommended_alternative: str = "Semantic Scholar"
    limitations: List[str] = None

@dataclass
class UnifiedMetrics:
    """Unified metrics from all bibliometric sources"""
    # Basic identifiers
    pmid: Optional[str] = None
    doi: Optional[str] = None
    title: Optional[str] = None
    
    # Source data
    altmetric: Optional[AltmetricData] = None
    icite: Optional[ICiteData] = None
    web_of_science: Optional[WebOfScienceData] = None
    opencitations: Optional[OpenCitationsData] = None
    semantic_scholar: Optional[SemanticScholarData] = None
    google_scholar_analysis: Optional[GoogleScholarAnalysis] = None
    
    # Computed metrics
    composite_impact_score: Optional[float] = None
    impact_classification: Optional[str] = None
    data_sources_count: Optional[int] = None
    citation_consensus: Optional[Dict[str, int]] = None
    
    # Quality indicators
    is_clinical: Optional[bool] = None
    highly_cited: Optional[bool] = None
    has_ai_summary: Optional[bool] = None
    
    # Metadata
    last_updated: Optional[str] = None
    api_response_times: Optional[Dict[str, float]] = None

class UnifiedMetricsService:
    """Unified service for all bibliometric metrics - eliminates duplication"""
    
    def __init__(self):
        self.session = None
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour cache
        
        # API configurations
        self.altmetric_api_key = os.getenv('ALTMETRIC_API_KEY')
        self.wos_api_key = os.getenv('WOS_API_KEY')
        self.semantic_scholar_api_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY')
        self.opencitations_access_token = os.getenv('OPENCITATIONS_ACCESS_TOKEN')
        
        # Unified rate limiting (requests per second)
        self.rate_limits = {
            'altmetric': 2.0,
            'icite': 5.0,
            'wos': 1.0,
            'opencitations': 3.0,
            'semantic_scholar': 1.0
        }
        
        self.last_request_times = {api: 0 for api in self.rate_limits.keys()}
        
        # API endpoints
        self.endpoints = {
            'altmetric': 'https://api.altmetric.com/v1',
            'icite': 'https://icite.od.nih.gov/api/pubs',
            'wos': 'https://api.clarivate.com/apis/wos-starter/v1',
            'opencitations_index': 'https://opencitations.net/index/api/v2',
            'semantic_scholar': 'https://api.semanticscholar.org/graph/v1'
        }

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={'User-Agent': 'Clinical-Helper/2.0 (Unified Research Tool)'}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    def _get_cache_key(self, identifier: str, api_name: str) -> str:
        """Generate cache key for identifier and API"""
        return hashlib.md5(f"{api_name}:{identifier}".encode()).hexdigest()

    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Check if cache entry is still valid"""
        if not cache_entry:
            return False
        
        cached_time = datetime.fromisoformat(cache_entry.get('timestamp', ''))
        return datetime.now() - cached_time < timedelta(seconds=self.cache_ttl)

    async def _rate_limit(self, api_name: str):
        """Unified rate limiting for all APIs"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_times[api_name]
        min_interval = 1.0 / self.rate_limits[api_name]
        
        if time_since_last < min_interval:
            sleep_time = min_interval - time_since_last
            await asyncio.sleep(sleep_time)
        
        self.last_request_times[api_name] = time.time()

    async def _fetch_altmetric_data(self, doi: str = None, pmid: str = None) -> Optional[AltmetricData]:
        """Fetch data from Altmetric API"""
        try:
            await self._rate_limit('altmetric')
            
            identifier = doi if doi else pmid
            id_type = 'doi' if doi else 'pmid'
            
            if not identifier:
                return None
            
            cache_key = self._get_cache_key(identifier, 'altmetric')
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info(f"Using cached Altmetric data for {identifier}")
                return AltmetricData(**self.cache[cache_key]['data'])
            
            url = f"{self.endpoints['altmetric']}/{id_type}/{identifier}"
            headers = {}
            if self.altmetric_api_key:
                headers['Authorization'] = f"Bearer {self.altmetric_api_key}"
            
            start_time = time.time()
            async with self.session.get(url, headers=headers) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    altmetric_data = AltmetricData(
                        score=data.get('score'),
                        social_mentions=data.get('cited_by_tweeters_count', 0) + 
                                      data.get('cited_by_fbwalls_count', 0) + 
                                      data.get('cited_by_gplus_count', 0),
                        news_mentions=data.get('cited_by_msm_count', 0),
                        policy_citations=data.get('cited_by_policies_count', 0),
                        wikipedia_citations=data.get('cited_by_wikipedia_count', 0),
                        mendeley_readers=data.get('cited_by_rdts_count', 0),
                        percentile=data.get('context', {}).get('all', {}).get('pct'),
                        context_percentile=data.get('context', {}).get('journal', {}).get('pct')
                    )
                    
                    self.cache[cache_key] = {
                        'data': asdict(altmetric_data),
                        'timestamp': datetime.now().isoformat(),
                        'response_time': response_time
                    }
                    
                    logger.info(f"Fetched Altmetric data for {identifier} (score: {altmetric_data.score})")
                    return altmetric_data
                
                elif response.status == 404:
                    logger.info(f"No Altmetric data found for {identifier}")
                    return None
                else:
                    logger.warning(f"Altmetric API error {response.status} for {identifier}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching Altmetric data for {identifier}: {e}")
            return None

    async def _fetch_icite_data(self, pmid: str) -> Optional[ICiteData]:
        """Fetch data from NIH iCite API"""
        try:
            await self._rate_limit('icite')
            
            if not pmid:
                return None
            
            cache_key = self._get_cache_key(pmid, 'icite')
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info(f"Using cached iCite data for {pmid}")
                return ICiteData(**self.cache[cache_key]['data'])
            
            url = f"{self.endpoints['icite']}?pmids={pmid}"
            
            start_time = time.time()
            async with self.session.get(url) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    if data.get('data') and len(data['data']) > 0:
                        pub_data = data['data'][0]
                        
                        icite_data = ICiteData(
                            rcr=pub_data.get('relative_citation_ratio'),
                            nih_percentile=pub_data.get('nih_percentile'),
                            citation_count=pub_data.get('citation_count'),
                            apt_score=pub_data.get('apt'),
                            is_clinical=pub_data.get('is_clinical') == 'Yes',
                            is_research_article=pub_data.get('is_research_article') == 'Yes'
                        )
                        
                        self.cache[cache_key] = {
                            'data': asdict(icite_data),
                            'timestamp': datetime.now().isoformat(),
                            'response_time': response_time
                        }
                        
                        logger.info(f"Fetched iCite data for {pmid} (RCR: {icite_data.rcr})")
                        return icite_data
                    else:
                        logger.info(f"No iCite data found for {pmid}")
                        return None
                else:
                    logger.warning(f"iCite API error {response.status} for {pmid}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching iCite data for {pmid}: {e}")
            return None

    async def _fetch_wos_data(self, doi: str) -> Optional[WebOfScienceData]:
        """Fetch data from Web of Science API"""
        try:
            await self._rate_limit('wos')
            
            if not doi or not self.wos_api_key:
                return None
            
            cache_key = self._get_cache_key(doi, 'wos')
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info(f"Using cached WoS data for {doi}")
                return WebOfScienceData(**self.cache[cache_key]['data'])
            
            url = f"{self.endpoints['wos']}/documents"
            headers = {
                'X-ApiKey': self.wos_api_key,
                'Content-Type': 'application/json'
            }
            
            params = {
                'q': f'DO="{doi}"',
                'limit': 1
            }
            
            start_time = time.time()
            async with self.session.get(url, headers=headers, params=params) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    if data.get('hits') and len(data['hits']) > 0:
                        doc = data['hits'][0]
                        
                        wos_data = WebOfScienceData(
                            times_cited=doc.get('times_cited'),
                            highly_cited=doc.get('highly_cited_paper', False),
                            hot_paper=doc.get('hot_paper', False),
                            journal_impact_factor=doc.get('journal', {}).get('impact_factor'),
                            category_percentile=doc.get('category_percentile')
                        )
                        
                        self.cache[cache_key] = {
                            'data': asdict(wos_data),
                            'timestamp': datetime.now().isoformat(),
                            'response_time': response_time
                        }
                        
                        logger.info(f"Fetched WoS data for {doi} (citations: {wos_data.times_cited})")
                        return wos_data
                    else:
                        logger.info(f"No WoS data found for {doi}")
                        return None
                else:
                    logger.warning(f"WoS API error {response.status} for {doi}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching WoS data for {doi}: {e}")
            return None

    async def _fetch_opencitations_data(self, doi: str = None, pmid: str = None) -> Optional[OpenCitationsData]:
        """Fetch data from OpenCitations API"""
        try:
            await self._rate_limit('opencitations')
            
            identifier = doi if doi else pmid
            id_type = 'doi' if doi else 'pmid'
            
            if not identifier:
                return None
            
            cache_key = self._get_cache_key(identifier, 'opencitations')
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info(f"Using cached OpenCitations data for {identifier}")
                return OpenCitationsData(**self.cache[cache_key]['data'])
            
            oc_identifier = f"{id_type}:{identifier}"
            
            headers = {}
            if self.opencitations_access_token:
                headers['authorization'] = self.opencitations_access_token
            
            start_time = time.time()
            
            # Fetch citation and reference counts in parallel
            citation_task = self._fetch_oc_count('citation-count', oc_identifier, headers)
            reference_task = self._fetch_oc_count('reference-count', oc_identifier, headers)
            
            citation_count, reference_count = await asyncio.gather(
                citation_task, reference_task, return_exceptions=True
            )
            
            response_time = time.time() - start_time
            
            # Handle exceptions
            if isinstance(citation_count, Exception):
                citation_count = None
            if isinstance(reference_count, Exception):
                reference_count = None
            
            if citation_count is not None or reference_count is not None:
                oc_data = OpenCitationsData(
                    citation_count=citation_count,
                    reference_count=reference_count
                )
                
                self.cache[cache_key] = {
                    'data': asdict(oc_data),
                    'timestamp': datetime.now().isoformat(),
                    'response_time': response_time
                }
                
                logger.info(f"Fetched OpenCitations data for {identifier} (citations: {citation_count}, references: {reference_count})")
                return oc_data
            else:
                logger.info(f"No OpenCitations data found for {identifier}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching OpenCitations data for {identifier}: {e}")
            return None

    async def _fetch_oc_count(self, count_type: str, identifier: str, headers: Dict) -> Optional[int]:
        """Helper method to fetch count from OpenCitations"""
        try:
            url = f"{self.endpoints['opencitations_index']}/{count_type}/{identifier}"
            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    if data and len(data) > 0:
                        return int(data[0].get('count', 0))
            return None
        except Exception as e:
            logger.warning(f"Error fetching {count_type} from OpenCitations: {e}")
            return None

    async def _fetch_semantic_scholar_data(self, doi: str = None, title: str = None) -> Optional[SemanticScholarData]:
        """Fetch data from Semantic Scholar API"""
        try:
            await self._rate_limit('semantic_scholar')
            
            if not doi and not title:
                return None
            
            identifier = doi if doi else title
            
            cache_key = self._get_cache_key(identifier, 'semantic_scholar')
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info(f"Using cached Semantic Scholar data for {identifier}")
                return SemanticScholarData(**self.cache[cache_key]['data'])
            
            headers = {}
            if self.semantic_scholar_api_key:
                headers['x-api-key'] = self.semantic_scholar_api_key
            
            start_time = time.time()
            
            if doi:
                url = f"{self.endpoints['semantic_scholar']}/paper/{doi}"
                params = {
                    'fields': 'paperId,title,year,authors,citationCount,referenceCount,influentialCitationCount,venue,tldr'
                }
            else:
                url = f"{self.endpoints['semantic_scholar']}/paper/search"
                params = {
                    'query': title,
                    'limit': 1,
                    'fields': 'paperId,title,year,authors,citationCount,referenceCount,influentialCitationCount,venue,tldr'
                }
            
            async with self.session.get(url, headers=headers, params=params) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    paper_data = None
                    if 'data' in data and len(data['data']) > 0:
                        paper_data = data['data'][0]
                    elif 'paperId' in data:
                        paper_data = data
                    
                    if paper_data:
                        authors = []
                        if paper_data.get('authors'):
                            authors = [author.get('name', '') for author in paper_data['authors']]
                        
                        ss_data = SemanticScholarData(
                            citation_count=paper_data.get('citationCount'),
                            reference_count=paper_data.get('referenceCount'),
                            influential_citation_count=paper_data.get('influentialCitationCount'),
                            paper_id=paper_data.get('paperId'),
                            venue=paper_data.get('venue'),
                            year=paper_data.get('year'),
                            authors=authors,
                            tldr=paper_data.get('tldr', {}).get('text') if paper_data.get('tldr') else None
                        )
                        
                        self.cache[cache_key] = {
                            'data': asdict(ss_data),
                            'timestamp': datetime.now().isoformat(),
                            'response_time': response_time
                        }
                        
                        logger.info(f"Fetched Semantic Scholar data for {identifier} (citations: {ss_data.citation_count})")
                        return ss_data
                    else:
                        logger.info(f"No Semantic Scholar data found for {identifier}")
                        return None
                else:
                    logger.warning(f"Semantic Scholar API error {response.status} for {identifier}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching Semantic Scholar data for {identifier}: {e}")
            return None

    def _get_google_scholar_analysis(self) -> GoogleScholarAnalysis:
        """Get analysis of Google Scholar integration possibilities"""
        return GoogleScholarAnalysis(
            availability_note=(
                "Google Scholar integration available via 'scholarly' library but with significant limitations: "
                "No official API, very strict rate limits (20-100 queries/day), high IP blocking risk, "
                "requires proxy management. Not recommended for production systems."
            ),
            recommended_alternative="Semantic Scholar",
            limitations=[
                "No official API - relies on web scraping",
                "Very strict rate limits (20-100 queries/day)",
                "High risk of IP blocking",
                "Requires careful proxy management",
                "Unreliable for production use"
            ]
        )

    def _calculate_citation_consensus(self, metrics: UnifiedMetrics) -> Dict[str, int]:
        """Calculate citation consensus across all sources"""
        citations = {}
        
        if metrics.icite and metrics.icite.citation_count is not None:
            citations['icite'] = metrics.icite.citation_count
        
        if metrics.web_of_science and metrics.web_of_science.times_cited is not None:
            citations['web_of_science'] = metrics.web_of_science.times_cited
        
        if metrics.opencitations and metrics.opencitations.citation_count is not None:
            citations['opencitations'] = metrics.opencitations.citation_count
        
        if metrics.semantic_scholar and metrics.semantic_scholar.citation_count is not None:
            citations['semantic_scholar'] = metrics.semantic_scholar.citation_count
        
        return citations

    def _calculate_unified_composite_score(self, metrics: UnifiedMetrics) -> Tuple[float, str]:
        """Calculate unified composite impact score"""
        try:
            score_components = []
            weights = []
            
            # RCR Percentile (25% weight)
            if metrics.icite and metrics.icite.nih_percentile is not None:
                score_components.append(metrics.icite.nih_percentile / 100.0)
                weights.append(0.25)
            
            # Citation consensus (25% weight)
            citation_consensus = self._calculate_citation_consensus(metrics)
            if citation_consensus:
                avg_citations = sum(citation_consensus.values()) / len(citation_consensus)
                citation_score = min(1.0, (avg_citations + 1) / 1000.0)
                score_components.append(citation_score)
                weights.append(0.25)
            
            # Semantic Scholar influential citations (15% weight)
            if (metrics.semantic_scholar and 
                metrics.semantic_scholar.influential_citation_count is not None and
                metrics.semantic_scholar.citation_count is not None and
                metrics.semantic_scholar.citation_count > 0):
                
                influence_ratio = (metrics.semantic_scholar.influential_citation_count / 
                                 metrics.semantic_scholar.citation_count)
                score_components.append(min(1.0, influence_ratio * 2))
                weights.append(0.15)
            
            # Altmetric attention (15% weight)
            if metrics.altmetric and metrics.altmetric.percentile is not None:
                score_components.append(metrics.altmetric.percentile / 100.0)
                weights.append(0.15)
            
            # Journal Impact Factor (10% weight)
            if metrics.web_of_science and metrics.web_of_science.journal_impact_factor:
                if_score = min(1.0, metrics.web_of_science.journal_impact_factor / 20.0)
                score_components.append(if_score)
                weights.append(0.10)
            
            # Quality indicators (10% weight)
            quality_score = 0.0
            quality_indicators = 0
            
            if metrics.web_of_science:
                if metrics.web_of_science.highly_cited:
                    quality_score += 0.4
                    quality_indicators += 1
                if metrics.web_of_science.hot_paper:
                    quality_score += 0.3
                    quality_indicators += 1
            
            if metrics.icite and metrics.icite.is_research_article:
                quality_score += 0.3
                quality_indicators += 1
            
            if quality_indicators > 0:
                score_components.append(quality_score)
                weights.append(0.10)
            
            # Calculate weighted average
            if not score_components:
                return 0.0, "Insufficient Data"
            
            weighted_score = sum(score * weight for score, weight in zip(score_components, weights))
            total_weight = sum(weights)
            
            composite_score = weighted_score / total_weight if total_weight > 0 else 0.0
            
            # Apply bonuses
            bonus = 0.0
            
            if len(citation_consensus) >= 3:
                bonus += 0.05  # Multi-source consensus
            
            if metrics.opencitations and metrics.opencitations.citation_count is not None:
                bonus += 0.03  # OpenCitations coverage
            
            if metrics.semantic_scholar and metrics.semantic_scholar.tldr:
                bonus += 0.02  # AI summary available
            
            if (metrics.icite and metrics.icite.is_clinical and 
                metrics.icite.apt_score and metrics.icite.apt_score > 0.5):
                bonus += 0.05  # Clinical relevance
            
            final_score = min(1.0, composite_score + bonus)
            
            # Enhanced classification
            if final_score >= 0.95:
                classification = "Exceptional Impact (Top 5%)"
            elif final_score >= 0.9:
                classification = "Exceptional Impact"
            elif final_score >= 0.8:
                classification = "Very High Impact"
            elif final_score >= 0.7:
                classification = "High Impact"
            elif final_score >= 0.6:
                classification = "Above Average Impact"
            elif final_score >= 0.4:
                classification = "Average Impact"
            elif final_score >= 0.2:
                classification = "Below Average Impact"
            else:
                classification = "Low Impact"
            
            return final_score, classification
            
        except Exception as e:
            logger.error(f"Error calculating unified composite score: {e}")
            return 0.0, "Calculation Error"

    async def get_unified_metrics(self, pmid: str = None, doi: str = None, title: str = None) -> UnifiedMetrics:
        """Get unified metrics from all bibliometric sources"""
        start_time = time.time()
        response_times = {}
        
        logger.info(f"Fetching unified metrics for PMID: {pmid}, DOI: {doi}, Title: {title}")
        
        # Create parallel tasks for all APIs
        tasks = []
        
        if doi or pmid:
            tasks.append(('altmetric', self._fetch_altmetric_data(doi, pmid)))
        
        if pmid:
            tasks.append(('icite', self._fetch_icite_data(pmid)))
        
        if doi:
            tasks.append(('wos', self._fetch_wos_data(doi)))
        
        if doi or pmid:
            tasks.append(('opencitations', self._fetch_opencitations_data(doi, pmid)))
        
        if doi or title:
            tasks.append(('semantic_scholar', self._fetch_semantic_scholar_data(doi, title)))
        
        # Execute all API calls in parallel
        results = {}
        if tasks:
            api_results = await asyncio.gather(*[task[1] for task in tasks], return_exceptions=True)
            
            for i, (api_name, result) in enumerate(zip([task[0] for task in tasks], api_results)):
                if isinstance(result, Exception):
                    logger.error(f"Error in {api_name} API: {result}")
                    results[api_name] = None
                else:
                    results[api_name] = result
        
        # Count data sources
        data_sources_count = sum(1 for result in results.values() if result is not None)
        
        # Create unified metrics object
        metrics = UnifiedMetrics(
            pmid=pmid,
            doi=doi,
            title=title,
            altmetric=results.get('altmetric'),
            icite=results.get('icite'),
            web_of_science=results.get('wos'),
            opencitations=results.get('opencitations'),
            semantic_scholar=results.get('semantic_scholar'),
            google_scholar_analysis=self._get_google_scholar_analysis(),
            data_sources_count=data_sources_count,
            last_updated=datetime.now().isoformat(),
            api_response_times=response_times
        )
        
        # Calculate citation consensus
        citation_consensus = self._calculate_citation_consensus(metrics)
        metrics.citation_consensus = citation_consensus
        
        # Calculate unified composite score
        composite_score, classification = self._calculate_unified_composite_score(metrics)
        metrics.composite_impact_score = composite_score
        metrics.impact_classification = classification
        
        # Set quality indicators
        metrics.is_clinical = metrics.icite.is_clinical if metrics.icite else None
        metrics.highly_cited = metrics.web_of_science.highly_cited if metrics.web_of_science else None
        metrics.has_ai_summary = bool(metrics.semantic_scholar.tldr) if metrics.semantic_scholar else None
        
        total_time = time.time() - start_time
        logger.info(f"Unified metrics completed in {total_time:.2f}s. "
                   f"Score: {composite_score:.3f} ({classification}). "
                   f"Data sources: {data_sources_count}")
        
        return metrics

    def get_metrics_summary(self, metrics: UnifiedMetrics) -> Dict[str, Any]:
        """Get comprehensive summary of unified metrics"""
        summary = {
            'composite_score': metrics.composite_impact_score,
            'impact_classification': metrics.impact_classification,
            'data_sources': metrics.data_sources_count,
            'citation_consensus': metrics.citation_consensus,
            'last_updated': metrics.last_updated,
            'quality_indicators': {
                'is_clinical': metrics.is_clinical,
                'highly_cited': metrics.highly_cited,
                'has_ai_summary': metrics.has_ai_summary
            }
        }
        
        # Add metrics from each source
        if metrics.altmetric:
            summary['altmetric'] = {
                'score': metrics.altmetric.score,
                'social_mentions': metrics.altmetric.social_mentions,
                'percentile': metrics.altmetric.percentile
            }
        
        if metrics.icite:
            summary['icite'] = {
                'rcr': metrics.icite.rcr,
                'nih_percentile': metrics.icite.nih_percentile,
                'citation_count': metrics.icite.citation_count,
                'apt_score': metrics.icite.apt_score
            }
        
        if metrics.web_of_science:
            summary['web_of_science'] = {
                'times_cited': metrics.web_of_science.times_cited,
                'journal_impact_factor': metrics.web_of_science.journal_impact_factor,
                'highly_cited': metrics.web_of_science.highly_cited
            }
        
        if metrics.opencitations:
            summary['opencitations'] = {
                'citation_count': metrics.opencitations.citation_count,
                'reference_count': metrics.opencitations.reference_count
            }
        
        if metrics.semantic_scholar:
            summary['semantic_scholar'] = {
                'citation_count': metrics.semantic_scholar.citation_count,
                'influential_citation_count': metrics.semantic_scholar.influential_citation_count,
                'venue': metrics.semantic_scholar.venue,
                'tldr': metrics.semantic_scholar.tldr
            }
        
        if metrics.google_scholar_analysis:
            summary['google_scholar_analysis'] = {
                'availability_note': metrics.google_scholar_analysis.availability_note,
                'recommended_alternative': metrics.google_scholar_analysis.recommended_alternative
            }
        
        return summary

# Global unified instance
unified_metrics_service = UnifiedMetricsService() 