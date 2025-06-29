"""
Helper service for synthesis with robust fallback parsing.
"""

import json
import logging
import re
from typing import List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import asdict

from baml_client import b
from baml_client.types import (
    SynthesizedResearchOutput,
    RawSearchResultItem,
    EvidenceTheme,
    ResearchMetrics,
    CiteSourceMetrics,
    FormulatedSearchStrategyOutput # Added for filter transparency
)
from typing import Optional # Ensure Optional is imported

# Adicionado para obter as configurações com a chave de API
from config import get_settings

logger = logging.getLogger(__name__)

def calculate_research_metrics(
    search_results: List[RawSearchResultItem],
    search_duration: float = 0.0,
    cite_source_report = None,  # Existing optional CiteSource report
    formulated_strategy: Optional[FormulatedSearchStrategyOutput] = None # New parameter for filter transparency
) -> ResearchMetrics:
    """
    Calculate comprehensive research metrics for transparency.
    Enhanced to provide more realistic estimates of analysis depth.
    """
    # Count different types of studies
    systematic_reviews = 0
    meta_analyses = 0
    rct_count = 0
    cohort_studies = 0
    case_control_studies = 0
    guidelines_count = 0
    recent_studies = 0
    high_impact_studies = 0
    
    # Track sources and journals
    sources = set()
    journals = set()
    
    # Current date for recent studies calculation
    current_year = datetime.now().year
    cutoff_year = current_year - 3

    # Initialize filter-related metrics
    quality_filters_applied_list: List[str] = []
    language_filters_applied_list: List[str] = []
    date_range_parts: List[str] = [] # Collect parts for date_range_searched
    search_strategy_summary_str: Optional[str] = None
    final_date_range_searched: Optional[str] = None

    # Process formulated_strategy for filter transparency fields
    if formulated_strategy:
        if formulated_strategy.search_rationale:
            search_strategy_summary_str = formulated_strategy.search_rationale
        # else: # Keep it None if no rationale, or provide a default if desired
            # search_strategy_summary_str = "Search strategy executed based on formulated parameters."

        temp_quality_filters = set()
        temp_language_filters = set()
        temp_date_ranges_descriptive = set() # Store descriptive strings like "Last X years"

        for param in formulated_strategy.search_parameters_list:
            if param.language_filter:
                temp_language_filters.add(param.language_filter)
            
            # Check if study_type_filter exists and has a 'value' attribute (for enums)
            if param.study_type_filter and hasattr(param.study_type_filter, 'value') and param.study_type_filter.value != "ALL":
                temp_quality_filters.add(str(param.study_type_filter.value))
            elif param.study_type_filter and not hasattr(param.study_type_filter, 'value') and str(param.study_type_filter) != "ALL": # Fallback for simple string enums if .value is not present
                 temp_quality_filters.add(str(param.study_type_filter))
            
            if param.date_range_years is not None:
                temp_date_ranges_descriptive.add(f"Last {param.date_range_years} years")

        quality_filters_applied_list = sorted(list(temp_quality_filters))
        language_filters_applied_list = sorted(list(temp_language_filters))
        
        if temp_date_ranges_descriptive:
            date_range_parts = sorted(list(temp_date_ranges_descriptive))
        
        # Construct a summary of applied filters to append to the rationale
        filter_summaries = []
        if language_filters_applied_list:
            filter_summaries.append(f"Languages: {', '.join(language_filters_applied_list)}")
        if quality_filters_applied_list:
            filter_summaries.append(f"Study Types: {', '.join(quality_filters_applied_list)}")
        if date_range_parts:
            filter_summaries.append(f"Date Ranges: {', '.join(date_range_parts)}")
        
        if filter_summaries:
            filters_text = " Filters applied: " + "; ".join(filter_summaries) + "."
            if search_strategy_summary_str:
                search_strategy_summary_str += filters_text
            else:
                # If no initial rationale, just use the filter summary
                search_strategy_summary_str = filters_text.strip() # Remove leading space

    if date_range_parts:
        final_date_range_searched = "; ".join(date_range_parts)
    
    # Analyze each search result for detailed metrics
    for result in search_results:
        # Count study types with enhanced categorization
        if result.study_type:
            study_type_lower = result.study_type.lower()
            if "systematic review" in study_type_lower or "systematic-review" in study_type_lower:
                systematic_reviews += 1
            elif "meta-analysis" in study_type_lower or "meta analysis" in study_type_lower:
                meta_analyses += 1
            elif any(term in study_type_lower for term in ["randomized", "rct", "clinical trial"]):
                rct_count += 1
            elif "cohort" in study_type_lower:
                cohort_studies += 1
            elif "case-control" in study_type_lower or "case control" in study_type_lower:
                case_control_studies += 1
            elif any(term in study_type_lower for term in ["guideline", "consensus", "recommendation"]):
                guidelines_count += 1
        
        # Track sources
        if result.source:
            sources.add(str(result.source))
        
        # Track journals
        if result.journal:
            journals.add(result.journal)
            
        # Check if study is recent
        if result.publication_date:
            try:
                # Try to extract year from publication date
                if isinstance(result.publication_date, str):
                    # Common date formats
                    for date_format in ["%Y-%m-%d", "%Y", "%B %Y", "%Y-%m"]:
                        try:
                            pub_date = datetime.strptime(result.publication_date, date_format)
                            if pub_date.year >= cutoff_year:
                                recent_studies += 1
                            break
                        except ValueError:
                            continue
                elif hasattr(result.publication_date, 'year'):
                    if result.publication_date.year >= cutoff_year:
                        recent_studies += 1
            except:
                pass  # Skip if date parsing fails
        
        # Assess high impact (based on journal, citation count, or source authority)
        is_high_impact = False
        
        # High-impact journals
        if result.journal:
            high_impact_journals = [
                "new england journal of medicine", "nejm", "lancet", "jama", 
                "bmj", "nature", "science", "cell", "nature medicine",
                "cochrane database", "cochrane library", "plos medicine"
            ]
            if any(journal.lower() in result.journal.lower() for journal in high_impact_journals):
                is_high_impact = True
        
        # High citation count
        if result.citation_count and result.citation_count > 100:
            is_high_impact = True
            
        # Systematic reviews and meta-analyses are generally high impact
        if systematic_reviews > 0 or meta_analyses > 0:
            is_high_impact = True
            
        if is_high_impact:
            high_impact_studies += 1
    
    # Calculate realistic analysis depth
    total_sources = len(search_results)
    
    # Estimate thorough analysis based on source count and quality
    if total_sources >= 25:
        estimated_thorough_analysis = min(25, total_sources)  # Cap at 25 for realistic analysis
    elif total_sources >= 15:
        estimated_thorough_analysis = min(20, total_sources)  # Analyze most if good number available
    elif total_sources >= 10:
        estimated_thorough_analysis = min(15, total_sources)  # Analyze all if moderate number
    else:
        estimated_thorough_analysis = total_sources  # Analyze all if few sources
    
    # Adjust based on quality (prioritize high-impact sources)
    quality_adjustment = min(1.2, 1 + (high_impact_studies / max(total_sources, 1)) * 0.5)
    estimated_thorough_analysis = int(estimated_thorough_analysis * quality_adjustment)
    
    # Convert CiteSourceReport to CiteSourceMetrics if present
    cite_source_metrics = None
    if cite_source_report:
        cite_source_metrics = _convert_cite_source_to_baml_metrics(cite_source_report)
    
    # Calculate quality_score_avg as avg_relevance_score (average of all non-null relevance_score fields)
    relevance_scores = [getattr(r, 'relevance_score', None) for r in search_results if getattr(r, 'relevance_score', None) is not None]
    avg_relevance_score = sum(relevance_scores) / len(relevance_scores) if relevance_scores else None
    final_quality_score_avg = avg_relevance_score if avg_relevance_score is not None and avg_relevance_score > 0 else None

    # Create comprehensive metrics with all required fields
    # Calculate articles_by_source
    articles_by_source = {}
    for result in search_results:
        src = str(getattr(result, 'source', 'Unknown'))
        articles_by_source[src] = articles_by_source.get(src, 0) + 1

    # Calculate search_queries_executed
    search_queries_executed = 0
    if formulated_strategy and hasattr(formulated_strategy, 'search_parameters_list'):
        search_queries_executed = len(formulated_strategy.search_parameters_list)

    # meta_analysis_count and guideline_count
    meta_analysis_count = meta_analyses
    guideline_count = guidelines_count

    # diversity_score_avg and recency_score_avg from cite_source_metrics if available
    diversity_score_avg = None
    recency_score_avg = None
    if cite_source_metrics:
        diversity_score_avg = getattr(cite_source_metrics, 'diversity_score', None)
        recency_score_avg = getattr(cite_source_metrics, 'recency_score', None)

    # Defensive defaults for all fields
    return ResearchMetrics(
        total_articles_analyzed=estimated_thorough_analysis or 0,
        sources_consulted=list(sources) if sources else ["PubMed", "Europe PMC", "Lens.org"],
        search_duration_seconds=search_duration / 1000.0 if search_duration > 0 else 0.0,
        unique_journals_found=len(journals),
        high_impact_studies_count=high_impact_studies,
        recent_studies_count=recent_studies,
        systematic_reviews_count=systematic_reviews,
        rct_count=rct_count,
        meta_analysis_count=meta_analysis_count,
        guideline_count=guideline_count,
        articles_by_source=articles_by_source,
        search_queries_executed=search_queries_executed,
        diversity_score_avg=diversity_score_avg,
        recency_score_avg=recency_score_avg,
        cite_source_metrics=cite_source_metrics,
        # New filter transparency fields from BAML schema
        quality_filters_applied=quality_filters_applied_list,
        date_range_searched=final_date_range_searched if final_date_range_searched is not None else "",
        language_filters_applied=language_filters_applied_list,
        search_strategy_summary=search_strategy_summary_str,
        quality_score_avg=final_quality_score_avg,
        evidence_quality_assessment=None,
        research_gaps_identified=None
    )

def _convert_cite_source_to_baml_metrics(cite_source_report) -> "CiteSourceMetrics":
    """
    Convert CiteSourceReport to BAML CiteSourceMetrics format.
    """
    from baml_client.types import CiteSourceMetrics
    
    if not cite_source_report:
        return None
    
    # Extract quality assessment
    quality = cite_source_report.quality_assessment
    dedup = cite_source_report.deduplication_result
    
    # Find best performing source
    best_source = "Unknown"
    if cite_source_report.source_metrics:
        best_performing = max(cite_source_report.source_metrics, key=lambda x: x.quality_score, default=None)
        if best_performing:
            best_source = best_performing.source_name
    
    # Generate key insights
    key_insights = []
    
    # Deduplication insights
    dedup_rate = dedup.removed_duplicates / max(dedup.original_count, 1)
    if dedup_rate > 0.3:
        key_insights.append(f"Alta taxa de duplicação ({dedup_rate:.1%}) entre fontes")
    elif dedup_rate < 0.1:
        key_insights.append(f"Baixa duplicação ({dedup_rate:.1%}) - boa diversidade de fontes")
    
    # Quality insights
    if quality.overall_score > 0.8:
        key_insights.append("Excelente qualidade geral da pesquisa")
    elif quality.overall_score < 0.5:
        key_insights.append("Qualidade da pesquisa pode ser melhorada")
    
    # Coverage insights
    if quality.coverage_score > 0.8:
        key_insights.append("Boa cobertura de múltiplas fontes")
    elif quality.coverage_score < 0.5:
        key_insights.append("Cobertura limitada - considerar fontes adicionais")
    
    # Recent publications insight
    if quality.recency_score > 0.7:
        key_insights.append("Boa cobertura de publicações recentes")
    elif quality.recency_score < 0.3:
        key_insights.append("Limitada cobertura de estudos recentes")
    
    return CiteSourceMetrics(
        total_sources_consulted=cite_source_report.total_sources_used,
        original_results_count=dedup.original_count,
        deduplicated_results_count=dedup.deduplicated_count,
        deduplication_rate=dedup_rate,
        overall_quality_score=quality.overall_score,
        coverage_score=quality.coverage_score,
        diversity_score=quality.diversity_score,
        recency_score=quality.recency_score,
        impact_score=quality.impact_score,
        source_balance_score=quality.source_balance_score,
        best_performing_source=best_source,
        processing_time_ms=cite_source_report.processing_time_ms,
        key_quality_insights=key_insights
    )

async def synthesize_with_fallback(
    original_query: str, 
    search_results: List[RawSearchResultItem],
    search_duration: float = 0.0,
    cite_source_report = None,
    formulated_strategy: Optional[FormulatedSearchStrategyOutput] = None # New parameter
) -> SynthesizedResearchOutput:
    """
    Robust synthesis with multiple fallback strategies.
    API key is expected to be set globally in main.py.
    """

    # Data Cleaning: Ensure authors is a list to prevent downstream errors
    for result in search_results:
        if result.authors is None:
            result.authors = []

    # Keep a reference to the original full list of search results for metrics calculation
    original_search_results_for_metrics = list(search_results) # Create a shallow copy

    # Optimize search_results for LLM synthesis: Sort by relevance and limit count
    MAX_SEARCH_RESULTS_FOR_SYNTHESIS = 25 # TODO: Adjust based on research mode
    logger.info(f"Original number of search results for synthesis: {len(search_results)}")

    # Sort by relevance_score (descending), treating None as 0 (lowest relevance)
    # Ensure relevance_score exists and is float for sorting, default to 0.0 if not
    search_results.sort(key=lambda x: x.relevance_score if isinstance(x.relevance_score, float) else 0.0, reverse=True)

    if len(search_results) > MAX_SEARCH_RESULTS_FOR_SYNTHESIS:
        search_results = search_results[:MAX_SEARCH_RESULTS_FOR_SYNTHESIS]
        logger.info(f"Sliced search results to top {len(search_results)} most relevant items for synthesis.")
    else:
        logger.info(f"Using all {len(search_results)} search results for synthesis (within limit of {MAX_SEARCH_RESULTS_FOR_SYNTHESIS}).")
    
    # Primary Strategy: Use the robust, typed BAML function
    try:
        logger.info("🎯 Primary Strategy: Calling robust SynthesizeDeepResearch function...")
        synthesis_from_baml = await b.SynthesizeDeepResearch(
            original_query=original_query,
            search_results=search_results # Now sorted and sliced
        )

        # Calculate metrics based on initial inputs and strategy
        calculated_metrics = calculate_research_metrics(
            search_results=original_search_results_for_metrics, # Use the original, full list for metrics
            search_duration=search_duration,
            cite_source_report=cite_source_report,
            formulated_strategy=formulated_strategy
        )

        # Merge metrics: Start with calculated, then overlay with BAML's qualitative fields if they exist
        final_metrics = calculated_metrics # This already has None for qualitative fields

        if synthesis_from_baml.research_metrics: # If BAML provided any metrics object
            baml_metrics = synthesis_from_baml.research_metrics
            if baml_metrics.evidence_quality_assessment:
                final_metrics.evidence_quality_assessment = baml_metrics.evidence_quality_assessment
            if baml_metrics.research_gaps_identified: # Assuming it's a list
                final_metrics.research_gaps_identified = baml_metrics.research_gaps_identified
            # Add any other fields that are EXCLUSIVELY populated by the LLM/BAML
            # For example, if LLM provides a specific 'llm_confidence_score' in ResearchMetrics
            # if hasattr(baml_metrics, 'llm_confidence_score') and baml_metrics.llm_confidence_score:
            #     final_metrics.llm_confidence_score = baml_metrics.llm_confidence_score

        synthesis_from_baml.research_metrics = final_metrics
        
        apply_reference_normalization(synthesis_from_baml)
        enforce_required_strings(synthesis_from_baml)
        logger.debug(f"Normalized relevant_references (Primary): {synthesis_from_baml.relevant_references}")
        logger.info("✅ Primary Strategy Succeeded: Received typed output from BAML.")
        return synthesis_from_baml
    except Exception as e_primary:
        logger.error(f"Primary synthesis strategy (SynthesizeDeepResearch) failed: {e_primary}. Attempting Fallback 1 (Simple)...")
        
        try:
            logger.info("🎯 Fallback Strategy 1: Calling SynthesizeDeepResearchSimple function...")
            synthesis_from_baml = await b.SynthesizeDeepResearchSimple(
                original_query=original_query,
                search_results=search_results # Already sorted and sliced
            )

            calculated_metrics = calculate_research_metrics(
                search_results=original_search_results_for_metrics,
                search_duration=search_duration,
                cite_source_report=cite_source_report,
                formulated_strategy=formulated_strategy
            )

            final_metrics = calculated_metrics
            if synthesis_from_baml.research_metrics:
                baml_metrics = synthesis_from_baml.research_metrics
                if baml_metrics.evidence_quality_assessment:
                    final_metrics.evidence_quality_assessment = baml_metrics.evidence_quality_assessment
                if baml_metrics.research_gaps_identified:
                    final_metrics.research_gaps_identified = baml_metrics.research_gaps_identified
            
            synthesis_from_baml.research_metrics = final_metrics
            apply_reference_normalization(synthesis_from_baml)
            enforce_required_strings(synthesis_from_baml)
            logger.debug(f"Normalized relevant_references (Fallback Simple): {synthesis_from_baml.relevant_references}")
            logger.info("✅ Fallback Strategy 1 (Simple) Succeeded: Received typed output from BAML.")
            return synthesis_from_baml
        except Exception as e_simple:
            logger.error(f"Fallback Strategy 1 (SynthesizeDeepResearchSimple) failed: {e_simple}. Attempting Fallback 2 (Minimal)...")
            
            try:
                logger.info("🎯 Fallback Strategy 2: Calling SynthesizeDeepResearchMinimal function...")
                synthesis_from_baml = await b.SynthesizeDeepResearchMinimal(
                    original_query=original_query,
                    search_results=search_results # Already sorted and sliced
                )

                calculated_metrics = calculate_research_metrics(
                    search_results=original_search_results_for_metrics,
                    search_duration=search_duration,
                    cite_source_report=cite_source_report,
                    formulated_strategy=formulated_strategy
                )

                final_metrics = calculated_metrics
                if synthesis_from_baml.research_metrics:
                    baml_metrics = synthesis_from_baml.research_metrics
                    if baml_metrics.evidence_quality_assessment:
                        final_metrics.evidence_quality_assessment = baml_metrics.evidence_quality_assessment
                    if baml_metrics.research_gaps_identified:
                        final_metrics.research_gaps_identified = baml_metrics.research_gaps_identified
                
                synthesis_from_baml.research_metrics = final_metrics
                apply_reference_normalization(synthesis_from_baml)
                enforce_required_strings(synthesis_from_baml)
                logger.debug(f"Normalized relevant_references (Fallback Minimal): {synthesis_from_baml.relevant_references}")
                logger.info("✅ Fallback Strategy 2 (Minimal) Succeeded: Received typed output from BAML.")
                return synthesis_from_baml
            except Exception as e_minimal:
                logger.error(f"Fallback Strategy 2 (SynthesizeDeepResearchMinimal) failed: {e_minimal}. Resorting to static fallback response.")
                # Final Static Fallback: Create a basic response if all BAML functions fail
                fallback = create_fallback_response(original_query, search_results) # search_results here are the sliced ones, which is fine for create_fallback_response
                
                # Calculate metrics for the fallback response
                calculated_metrics_for_fallback = calculate_research_metrics(
                    search_results=original_search_results_for_metrics, # Use original full list
                    search_duration=search_duration,
                    cite_source_report=cite_source_report,
                    formulated_strategy=formulated_strategy
                )
                fallback.research_metrics = calculated_metrics_for_fallback
                logger.info("✅ Static Fallback Strategy Utilized.")
                return fallback
    # The function should have returned from one of the try/except blocks or the final static fallback.
    # If execution reaches here, it's an unexpected state.
    logger.error("FATAL: Execution reached end of synthesize_with_fallback without returning. This should not happen.")
    # Return a minimal error-like structure
    error_fallback = create_fallback_response(original_query, []) # Empty results for error state
    # Ensure research_metrics is calculated even for this error state
    error_fallback.research_metrics = calculate_research_metrics(
        search_results=[], 
        search_duration=search_duration, 
        cite_source_report=cite_source_report, 
        formulated_strategy=formulated_strategy
    )
    error_fallback.executive_summary = "An unexpected error occurred during synthesis. Please try again."
    # Ensure all other essential fields of SynthesizedResearchOutput are present and are default values
    # to match the type hint, even in this dire error state.
    if not hasattr(error_fallback, 'key_findings_by_theme') or error_fallback.key_findings_by_theme is None:
        error_fallback.key_findings_by_theme = []
    if not hasattr(error_fallback, 'clinical_implications') or error_fallback.clinical_implications is None:
        error_fallback.clinical_implications = "No clinical implications could be generated due to an error."
    if not hasattr(error_fallback, 'professional_detailed_reasoning_cot') or error_fallback.professional_detailed_reasoning_cot is None:
        error_fallback.professional_detailed_reasoning_cot = "Reasoning process could not be completed due to an error."
    if not hasattr(error_fallback, 'relevant_references') or error_fallback.relevant_references is None:
        error_fallback.relevant_references = []
    if not hasattr(error_fallback, 'all_analyzed_references') or error_fallback.all_analyzed_references is None:
        error_fallback.all_analyzed_references = []
    if not hasattr(error_fallback, 'original_query') or error_fallback.original_query is None:
        error_fallback.original_query = original_query # Preserve the original query if possible

    return error_fallback

def enforce_required_strings(synthesis):
    """Ensure all required string fields are non-null strings."""
    required_fields = [
        "professional_detailed_reasoning_cot",
        "executive_summary",
        "evidence_quality_assessment",
    ]
    for field in required_fields:
        if not hasattr(synthesis, field) or getattr(synthesis, field) is None:
            setattr(synthesis, field, "")
    # Also ensure research_metrics is not None if required
    if hasattr(synthesis, "research_metrics") and synthesis.research_metrics is None:
        synthesis.research_metrics = ""

def normalize_reference(ref: RawSearchResultItem, idx: int = 0) -> RawSearchResultItem:
    """
    Normalizes a RawSearchResultItem to ensure all BAML-required fields are present and correctly typed.
    """
    norm_title = ref.title if ref.title is not None and str(ref.title).strip() != "" else "No title available"
    norm_source = ref.source if ref.source is not None and str(ref.source).strip() != "" else "Unknown source"
    norm_url = ref.url if ref.url is not None and str(ref.url).strip() != "" else "N/A"
    norm_snippet = (
        ref.snippet_or_abstract[:1000] if ref.snippet_or_abstract is not None and str(ref.snippet_or_abstract).strip() != "" else "No abstract available"
    )

    norm_authors = ref.authors if ref.authors is not None else []
    norm_authors = [str(author) for author in norm_authors if author is not None and str(author).strip() != ""]
    if not norm_authors:
        norm_authors = ["Unknown author"]

    def to_int_or_none(val: Any) -> Optional[int]:
        if val is None: return None
        try: return int(val)
        except (ValueError, TypeError): return None

    def to_float_or_none(val: Any) -> Optional[float]:
        if val is None: return None
        try: return float(val)
        except (ValueError, TypeError): return None

    norm_citation_count = to_int_or_none(getattr(ref, 'citation_count', None))
    norm_composite_impact_score = to_float_or_none(getattr(ref, 'composite_impact_score', None))

    # BAML-required fields
    norm_journal = ref.journal if ref.journal is not None and str(ref.journal).strip() != "" else "Unknown journal"
    norm_year = None
    # Try to extract year from publication_date
    pub_date = getattr(ref, 'publication_date', None)
    if pub_date is not None:
        if isinstance(pub_date, str):
            import re
            m = re.search(r"(\d{4})", pub_date)
            if m:
                norm_year = m.group(1)
        elif hasattr(pub_date, 'year'):
            norm_year = str(pub_date.year)
    if norm_year is None:
        from datetime import datetime
        norm_year = str(datetime.now().year)

    norm_doi = ref.doi if ref.doi is not None and str(ref.doi).strip() != "" else "N/A"
    norm_pmid = ref.pmid if ref.pmid is not None and str(ref.pmid).strip() != "" else "N/A"
    norm_study_type = ref.study_type if ref.study_type is not None and str(ref.study_type).strip() != "" else "Unknown"
    # reference_id: use pmid, doi, or fallback to index
    if hasattr(ref, 'reference_id') and ref.reference_id and str(ref.reference_id).strip() != "":
        norm_reference_id = str(ref.reference_id)
    elif norm_pmid != "N/A":
        norm_reference_id = f"pmid-{norm_pmid}"
    elif norm_doi != "N/A":
        norm_reference_id = f"doi-{norm_doi}"
    else:
        norm_reference_id = f"ref-{idx}"
    # relevance_score: always a float 0.0-1.0
    norm_relevance_score = to_float_or_none(getattr(ref, 'relevance_score', None))
    if norm_relevance_score is None or not (0.0 <= norm_relevance_score <= 1.0):
        norm_relevance_score = 0.5

    return RawSearchResultItem(
        reference_id=norm_reference_id,
        title=norm_title,
        authors=norm_authors,
        journal=norm_journal,
        year=norm_year,
        doi=norm_doi,
        pmid=norm_pmid,
        url=norm_url,
        study_type=norm_study_type,
        snippet_or_abstract=norm_snippet,
        relevance_score=norm_relevance_score,
        source=norm_source,
        citation_count=norm_citation_count,
        composite_impact_score=norm_composite_impact_score,
        publication_date=pub_date,
        academic_source_name=getattr(ref, 'academic_source_name', None)
    )



def apply_reference_normalization(synthesis):
    """Apply normalization to all references in the synthesis output."""
    if hasattr(synthesis, "relevant_references") and synthesis.relevant_references:
        synthesis.relevant_references = [normalize_reference(ref) for ref in synthesis.relevant_references]
    if hasattr(synthesis, "all_analyzed_references") and synthesis.all_analyzed_references:
        synthesis.all_analyzed_references = [normalize_reference(ref) for ref in synthesis.all_analyzed_references]


def clean_json_string(json_string: str) -> str:
    """
    Clean JSON string by removing markdown formatting and other issues.
    """
    # Remove markdown code blocks
    json_string = re.sub(r'```json\s*', '', json_string)
    json_string = re.sub(r'```\s*$', '', json_string)
    json_string = re.sub(r'^```\s*', '', json_string)
    
    # Remove any leading/trailing whitespace
    json_string = json_string.strip()
    
    # Ensure it starts with { and ends with }
    if not json_string.startswith('{'):
        # Find the first {
        start_idx = json_string.find('{')
        if start_idx != -1:
            json_string = json_string[start_idx:]
    
    if not json_string.endswith('}'):
        # Find the last }
        end_idx = json_string.rfind('}')
        if end_idx != -1:
            json_string = json_string[:end_idx + 1]
    
    return json_string

def ensure_required_fields(data: Dict[str, Any], original_query: str) -> Dict[str, Any]:
    """
    Ensure all required fields are present in the data.
    """
    
    # Ensure original_query exists
    if "original_query" not in data:
        data["original_query"] = original_query
    
    # Ensure other critical fields have defaults
    if "executive_summary" not in data:
        data["executive_summary"] = "Resumo executivo da pesquisa realizada."
    
    if "key_findings_by_theme" not in data:
        data["key_findings_by_theme"] = []
    
    if "evidence_quality_assessment" not in data:
        data["evidence_quality_assessment"] = "Avaliação da qualidade da evidência."
    
    if "clinical_implications" not in data:
        data["clinical_implications"] = []
    
    if "research_gaps_identified" not in data:
        data["research_gaps_identified"] = []
    
    if "relevant_references" not in data:
        data["relevant_references"] = []
    
    return data

def create_synthesis_from_dict(
    data: Dict[str, Any], 
    search_results: List[RawSearchResultItem]
) -> SynthesizedResearchOutput:
    """
    Create SynthesizedResearchOutput from dictionary data.
    """
    # Convert themes
    themes = []
    for theme_data in data.get("key_findings_by_theme", []):
        if isinstance(theme_data, dict):
            theme = EvidenceTheme(
                theme_name=theme_data.get("theme_name", "Tema"),
                key_findings=theme_data.get("key_findings", []),
                strength_of_evidence=theme_data.get("strength_of_evidence", "Moderada"),
                supporting_studies_count=theme_data.get("supporting_studies_count", 1)
            )
            themes.append(theme)
    
    # Use original search results as references
    references = search_results  # Use all search_results
    
    return SynthesizedResearchOutput(
        original_query=data.get("original_query", ""),
        executive_summary=data.get("executive_summary", ""),
        detailed_results=data.get("detailed_results"),
        key_findings_by_theme=themes,
        evidence_quality_assessment=data.get("evidence_quality_assessment", ""),
        clinical_implications=data.get("clinical_implications", []),
        research_gaps_identified=data.get("research_gaps_identified", []),
        relevant_references=references,
        research_metrics=data.get("research_metrics", None)
    )

def create_fallback_response(
    original_query: str, 
    search_results: List[RawSearchResultItem]
) -> SynthesizedResearchOutput:
    """
    Create a basic fallback response when all synthesis attempts fail.
    """
    return SynthesizedResearchOutput(
        original_query=original_query,
        executive_summary=f"Foram encontrados {len(search_results)} resultados relevantes para a pesquisa sobre '{original_query}'. Devido a limitações técnicas, não foi possível realizar uma síntese completa automatizada.",
        professional_detailed_reasoning_cot="Devido a limitações técnicas, uma análise detalhada e narrativa dos resultados não pôde ser gerada automaticamente. Recomenda-se a revisão manual das fontes listadas.",
        detailed_results="Devido a limitações técnicas, uma análise detalhada e narrativa dos resultados não pôde ser gerada automaticamente. Recomenda-se a revisão manual das fontes listadas.",
        key_findings_by_theme=[
            EvidenceTheme(
                theme_name="Resultados Encontrados",
                key_findings=[f"Total de {len(search_results)} fontes identificadas"],
                strength_of_evidence="Variável",
                supporting_studies_count=len(search_results)
            )
        ],
        evidence_quality_assessment="Não foi possível realizar avaliação automática da qualidade da evidência.",
        clinical_implications=["Recomenda-se revisão manual dos resultados encontrados."],
        research_gaps_identified=["Necessidade de síntese manual dos resultados."],
        relevant_references=search_results[:10],  # Top 10 results
        research_metrics=None
    ) 