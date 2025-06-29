"""
Shared research models for the Clinical Helper application.
This file contains data models used across multiple research services.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RawSearchResultItemPydantic(BaseModel):
    """
    Pydantic model for raw search result items.
    Compatible with the BAML RawSearchResultItem type.
    Always includes synthesis_relevance_score for frontend robustness.
    """
    source: str = "PUBMED"
    title: str
    url: Optional[str] = None
    snippet_or_abstract: str
    publication_date: Optional[str] = None
    authors: Optional[List[str]] = None
    journal: Optional[str] = None
    pmid: Optional[str] = None
    doi: Optional[str] = None
    study_type: Optional[str] = None
    citation_count: Optional[int] = None
    
    # Additional attributes for enhanced functionality
    relevance_score: Optional[float] = None
    composite_impact_score: Optional[float] = None
    impact_classification: Optional[str] = None
    source_quality_score: Optional[float] = None
    source_tier: Optional[int] = None
    source_authority: Optional[str] = None
    academic_source: Optional[str] = None
    # Field required by frontend for robust display
    synthesis_relevance_score: Optional[float] = None


class SearchSummary(BaseModel):
    """Summary of search results with metrics"""
    total_results: int
    pubmed_results: int = 0
    web_results: int = 0
    average_relevance_score: Optional[float] = None
    high_impact_count: int = 0
    elite_journal_count: int = 0
    search_strategy_used: Optional[str] = None
    execution_time_seconds: Optional[float] = None

class ResearchMetrics(BaseModel):
    """Metrics for research quality and impact"""
    composite_impact_score: Optional[float] = None
    impact_classification: Optional[str] = None
    citation_consensus: Optional[dict] = None
    journal_impact_factor: Optional[float] = None
    journal_tier: Optional[int] = None
    is_clinical: Optional[bool] = None
    highly_cited: Optional[bool] = None
    has_ai_summary: Optional[bool] = None

# --- Helper Functions ---

def calculate_relevance_score(article: RawSearchResultItemPydantic, original_query: str) -> float:
    """
    Calculate relevance score based on multiple factors
    Score range: 0.0 to 1.0 (higher is more relevant)
    """
    score = 0.0
    query_terms = [term.lower().strip() for term in original_query.split() if len(term) > 2]
    
    if not query_terms:
        return 0.0
    
    # Text for analysis
    title_text = article.title.lower()
    abstract_text = article.snippet_or_abstract.lower()
    
    # 1. Title relevance (40% weight)
    title_matches = sum(1 for term in query_terms if term in title_text)
    title_score = (title_matches / len(query_terms)) * 0.4
    score += title_score
    
    # 2. Abstract relevance (30% weight)
    abstract_matches = sum(1 for term in query_terms if term in abstract_text)
    abstract_score = (abstract_matches / len(query_terms)) * 0.3
    score += abstract_score
    
    # 3. Study quality bonus (15% weight)
    if article.study_type:
        quality_scores = {
            "systematic review": 0.15,
            "meta-analysis": 0.15,
            "randomized controlled trial": 0.12,
            "clinical trial": 0.10,
            "cohort study": 0.08,
            "case-control study": 0.06,
            "cross-sectional study": 0.04,
            "case report": 0.02
        }
        study_type_lower = article.study_type.lower()
        for study_type, bonus in quality_scores.items():
            if study_type in study_type_lower:
                score += bonus
                break
    
    # 4. Recency bonus (10% weight)
    if article.publication_date:
        try:
            pub_year = int(article.publication_date.split('-')[0])
            current_year = datetime.now().year
            years_old = current_year - pub_year
            
            if years_old <= 2:
                score += 0.10  # Very recent
            elif years_old <= 5:
                score += 0.07  # Recent
            elif years_old <= 10:
                score += 0.03  # Moderately recent
            # No bonus for older studies
        except (ValueError, IndexError):
            pass
    
    # 5. Journal quality indicator (5% weight)
    if article.journal:
        # High-impact journals (simplified list)
        high_impact_journals = [
            "new england journal of medicine", "lancet", "jama", "nature", "science",
            "cell", "nature medicine", "critical care medicine", "intensive care medicine",
            "chest", "american journal of respiratory and critical care medicine"
        ]
        journal_lower = article.journal.lower()
        if any(hq_journal in journal_lower for hq_journal in high_impact_journals):
            score += 0.05
    
    return min(score, 1.0)

def filter_by_relevance(articles: List[RawSearchResultItemPydantic], original_query: str, min_relevance: float = 0.3) -> List[RawSearchResultItemPydantic]:
    """
    Filter articles by relevance score and sort by relevance
    """
    scored_articles = []
    
    for article in articles:
        relevance_score = calculate_relevance_score(article, original_query)
        
        if relevance_score >= min_relevance:
            scored_articles.append((article, relevance_score))
            logger.debug(f"Article '{article.title[:50]}...' - Relevance: {relevance_score:.3f}")
        else:
            logger.debug(f"Filtered out low-relevance article: '{article.title[:50]}...' - Relevance: {relevance_score:.3f}")
    
    # Sort by relevance score (highest first)
    scored_articles.sort(key=lambda x: x[1], reverse=True)
    
    # Extract articles only
    filtered_articles = [article for article, score in scored_articles]
    
    logger.info(f"Filtered {len(articles)} articles to {len(filtered_articles)} relevant ones (min_relevance={min_relevance})")
    return filtered_articles 