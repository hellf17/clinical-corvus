# backend-api/routers/research.py
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from services.translator_service import translate_with_fallback
from typing import List, Optional, Dict, Any, Tuple
import logging
from pydantic import BaseModel
import time

# Importar o cliente BAML e os tipos gerados
from baml_client import b
from baml_client.types import (
    ResearchTaskInput, 
    FormulatedSearchStrategyOutput, 
    RawSearchResultItem, 
    SynthesizedResearchOutput, 
    SearchParameters, 
    ResearchSourceType,
    StudyTypeFilter,
    PICOQuestion,
    PDFAnalysisInput,
    PDFAnalysisOutput,
    ClinicalScenarioInput,
    PICOFormulationOutput,
    ResearchMetrics,
    # Novos tipos para o pipeline de análise de evidências
    EvidenceAnalysisData,
    EvidenceAppraisalOutput as GradeEvidenceAppraisalOutput,
    GradeLevel,
    RecommendationStrength,
    AssessmentValue,
    QualityFactor,
    BiasAnalysis
)

# Importar os serviços unificados
from models.research_models import RawSearchResultItemPydantic, calculate_relevance_score
from services.unified_pubmed_service import unified_pubmed_service, UnifiedSearchResult
from services.unified_metrics_service import unified_metrics_service
from services.pdf_service import pdf_service
from services.simple_autonomous_research import SimpleAutonomousResearchService
from utils.research_result_converters import convert_unified_to_baml_search_result, convert_single_brave_item_to_baml

# Importar CiteSource services
from services.cite_source_service import (
    CiteSourceService, 
    CiteSourceReport, 
    process_with_cite_source,
    get_cite_source_service
)
from services.cite_source_visualization import (
    CiteSourceVisualizationService,
    generate_cite_source_report
)

# Importar o cliente Brave Search
from clients.brave_search_client import (
    search_brave_web, 
    search_medical_guidelines, 
    search_comprehensive_academic,
    search_cochrane_library,
    search_ncbi_sources,
    search_elite_journals,
    BraveSearchResponse, 
    calculate_web_source_impact_score, 
    assess_web_source_quality,
)

# Import the Google Scholar client
from clients.google_scholar_client import search_google_scholar_enhanced, ScholarSearchResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Research with Dr. Corvus"],
)

# --- Request/Response Models ---

class DeepResearchRequest(BaseModel):
    user_original_query: str
    pico_question: Optional[Dict[str, Optional[str]]] = None
    research_focus: Optional[str] = None
    target_audience: Optional[str] = None
    research_mode: Optional[str] = 'quick'  # 'quick' ou 'expanded'
    
class UnifiedEvidenceAnalysisRequest(BaseModel):
    paper_full_text: str
    clinical_question_PICO: Optional[str] = None

class PDFAnalysisRequest(BaseModel):
    analysis_focus: Optional[str] = None
    clinical_question: Optional[str] = None
    extraction_mode: Optional[str] = "balanced"  # fast, balanced, premium

class EvidenceAppraisalRequest(BaseModel):
    clinical_question_PICO: str
    evidence_summary_or_abstract: str
    study_type_if_known: Optional[str] = None

class PICOFormulationRequest(BaseModel):
    clinical_scenario: str
    additional_context: Optional[str] = None

class CiteSourceAnalysisRequest(BaseModel):
    search_results: List[Dict[str, Any]]
    query: str
    source_timing: Optional[Dict[str, float]] = None
    include_visualizations: bool = True

class CiteSourceTestRequest(BaseModel):
    query: str = "septic shock management"
    max_results_per_source: int = 10
    include_visualizations: bool = True

# --- Helper Functions ---

def convert_pydantic_to_baml_search_result(item: RawSearchResultItemPydantic) -> RawSearchResultItem:
    """Converte RawSearchResultItemPydantic para RawSearchResultItem do BAML"""
    
    pydantic_source_str = item.source.upper() if item.source else ""
    baml_source = ResearchSourceType.WEB_SEARCH_BRAVE  # Default
    academic_source_name_baml = None

    if pydantic_source_str == "PUBMED":
        baml_source = ResearchSourceType.PUBMED
    elif pydantic_source_str == "ACADEMIC_DATABASE":
        if item.academic_source:
            academic_src_lower = item.academic_source.lower()
            academic_source_name_baml = item.academic_source # Pass the specific academic source
            if "google_scholar" in academic_src_lower:
                baml_source = ResearchSourceType.ACADEMIC_GOOGLE_SCHOLAR
            elif "cochrane" in academic_src_lower:
                baml_source = ResearchSourceType.COCHRANE 
            elif academic_src_lower.startswith("ncbi"):
                baml_source = ResearchSourceType.ACADEMIC_NCBI
            elif academic_src_lower.startswith("elite_journal"):
                baml_source = ResearchSourceType.ACADEMIC_ELITE_JOURNAL
            else: 
                baml_source = ResearchSourceType.ACADEMIC_DATABASE_GENERAL
        else: 
            baml_source = ResearchSourceType.ACADEMIC_DATABASE_GENERAL
            academic_source_name_baml = "general_academic" 
    elif pydantic_source_str == "CLINICAL_GUIDELINES":
        baml_source = ResearchSourceType.GUIDELINE_RESOURCE
        academic_source_name_baml = item.source_authority or "guideline_source"

    return RawSearchResultItem(
        source=baml_source,
        title=item.title,
        url=item.url,
        snippet_or_abstract=item.snippet_or_abstract,
        publication_date=item.publication_date,
        authors=item.authors,
        journal=item.journal,
        pmid=item.pmid,
        doi=item.doi,
        study_type=item.study_type,
        citation_count=item.citation_count,
        relevance_score=getattr(item, 'relevance_score', None),
        composite_impact_score=getattr(item, 'composite_impact_score', None),
        academic_source_name=academic_source_name_baml,
        synthesis_relevance_score=getattr(item, 'relevance_score', None) if hasattr(item, 'relevance_score') else None
    )

# Function moved to utils.research_result_converters.py

def map_study_type_filter_to_pubmed_filter(study_filter: StudyTypeFilter) -> Optional[str]:
    """Mapeia filtros de tipo de estudo para filtros do PubMed"""
    filter_mapping = {
        StudyTypeFilter.SYSTEMATIC_REVIEW: "systematic review[Filter] OR meta-analysis[Filter]",
        StudyTypeFilter.RANDOMIZED_CONTROLLED_TRIAL: "randomized controlled trial[Filter]",
        StudyTypeFilter.COHORT_STUDY: "cohort studies[Filter]",
        StudyTypeFilter.CASE_CONTROL: "case-control studies[Filter]",
        StudyTypeFilter.CLINICAL_TRIAL: "clinical trial[Filter]",
        StudyTypeFilter.REVIEW: "review[Filter]",
        StudyTypeFilter.ALL: None
    }
    return filter_mapping.get(study_filter)

import logging
from services.unified_pubmed_service import UnifiedSearchResult # Corrected import path

# ResearchSourceType and RawSearchResultItem are imported from baml_client.types at the top of the file.

logger = logging.getLogger(__name__)

# Function moved to utils.research_result_converters.py

def get_journal_metrics(journal_name: str) -> Dict[str, Any]:
    """Get journal metrics - simplified version for compatibility"""
    # This is a simplified version to maintain compatibility
    # In the unified architecture, this information comes from the unified metrics
    journal_lower = journal_name.lower() if journal_name else ""
    
    # High-impact journals
    high_impact_journals = {
        'nature', 'science', 'cell', 'lancet', 'new england journal of medicine',
        'jama', 'bmj', 'plos medicine', 'nature medicine'
    }
    
    # Medium-impact journals
    medium_impact_journals = {
        'plos one', 'scientific reports', 'bmc', 'frontiers'
    }
    
    if any(journal in journal_lower for journal in high_impact_journals):
        return {"impact_factor": 25.0, "tier": 1, "category": "Elite"}
    elif any(journal in journal_lower for journal in medium_impact_journals):
        return {"impact_factor": 5.0, "tier": 3, "category": "Medium"}
    else:
        return {"impact_factor": 2.0, "tier": 4, "category": "Standard"}

async def search_pubmed(query: str, max_results: int = 10, study_type_filter: Optional[str] = None, date_range_years: Optional[int] = None) -> List[RawSearchResultItemPydantic]:
    """
    Unified search function that uses the new unified architecture
    """
    try:
        # Use the unified PubMed service for enhanced search
        async with unified_pubmed_service as service:
            unified_results = await service.search_unified(query, max_results)
            
            # Convert unified results to the expected format
            converted_results = []
            for result in unified_results:
                # Convert UnifiedSearchResult to RawSearchResultItemPydantic
                converted = RawSearchResultItemPydantic(
                    source="PUBMED",
                    title=result.title,
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{result.pmid}/",
                    snippet_or_abstract=result.abstract,
                    publication_date=result.publication_date,
                    authors=result.authors,
                    journal=result.journal,
                    pmid=result.pmid,
                    doi=result.doi,
                    study_type=None,  # Can be enhanced later
                    citation_count=result.semantic_scholar_citations or result.opencitations_citations
                )
                
                # Add enhanced metrics as attributes for compatibility
                converted.relevance_score = result.final_relevance_score
                converted.composite_impact_score = result.composite_impact_score
                converted.impact_classification = result.impact_classification
                
                converted_results.append(converted)
            
            logger.info(f"Unified search returned {len(converted_results)} results")
            return converted_results
            
    except Exception as e:
        logger.error(f"Error in unified search: {e}")
        return error

@router.post("/autonomous", response_model=SynthesizedResearchOutput)
async def perform_autonomous_deep_research(request: DeepResearchRequest):
    """
    Realiza pesquisa profunda AUTÔNOMA usando o serviço completo com Langroid
    onde o Dr. Corvus decide quais ferramentas usar e adapta a estratégia baseada nos resultados.
    
    Suporta dois modos:
    - research_mode == 'quick': Pesquisa otimizada (1-2 min)  
    - research_mode == 'expanded': Análise mais profunda (3-5 min)
    """
    try:
        # IMPORTANTE: Usar o serviço autônomo COMPLETO em vez do simplificado
        from services.autonomous_research_service import conduct_autonomous_research
        
        # Converter PICO question se fornecida
        pico_question = None
        if request.pico_question:
            pico_question = PICOQuestion(
                patient_population=request.pico_question.get("population"),
                intervention=request.pico_question.get("intervention"),
                comparison=request.pico_question.get("comparison"),
                outcome=request.pico_question.get("outcome"),
                time_frame=request.pico_question.get("time_frame"),
                study_type=request.pico_question.get("study_type")
            )

        # Preparar input para pesquisa autônoma COMPLETA
        research_input = ResearchTaskInput(
            user_original_query=request.user_original_query,
            pico_question=pico_question,
            research_focus=request.research_focus,
            target_audience=request.target_audience
        )
        
        # Detectar modo de pesquisa do request
        research_mode = request.research_mode or 'quick'
        logger.info(f"🤖 Iniciando pesquisa autônoma COMPLETA (modo: {research_mode}) para: {request.user_original_query}")
        
        # Ajustar parâmetros baseado no modo
        max_turns = 20 if research_mode == 'expanded' else 15
        
        # Executar pesquisa autônoma COMPLETA com Langroid
        result = await conduct_autonomous_research(research_input, max_turns=max_turns)
        
        # Adicionar informação sobre o modo usado
        result.disclaimer += f" (Modo: {research_mode})"
        
        logger.info("✅ Pesquisa autônoma COMPLETA concluída")
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro na pesquisa autônoma COMPLETA: {e}")
        
        # Fallback para o serviço simplificado se o completo falhar
        try:
            logger.info("🔄 Tentando fallback para serviço simplificado...")
            from services.simple_autonomous_research import conduct_simple_autonomous_research
            
            result = await conduct_simple_autonomous_research(research_input)
            result.disclaimer += f" NOTA: Usado serviço de fallback simplificado devido a erro no serviço completo. (Modo: {research_mode})"
            
            logger.info("✅ Pesquisa autônoma simplificada (fallback) concluída")
            return result
            
        except Exception as fallback_error:
            logger.error(f"❌ Erro também no fallback simplificado: {fallback_error}")
            raise HTTPException(status_code=500, detail=f"Erro na pesquisa autônoma: {str(e)}")

@router.post("/quick-search", response_model=SynthesizedResearchOutput)
async def perform_quick_research(request: DeepResearchRequest):
    """
    Performs research using SimpleAutonomousResearchService, driven by user-selected mode ('quick' or 'comprehensive').
    """
    if request.research_mode == 'expanded':  # Frontend might send 'expanded' for comprehensive
        service_mode = 'comprehensive'
    elif request.research_mode == 'comprehensive':
        service_mode = 'comprehensive'
    else:  # Default to 'quick' for 'quick' or any other value
        service_mode = 'quick'

    logger.info(f"⚡ Received request for /quick-search with query: '{request.user_original_query}', requested mode: '{request.research_mode}', resolved service_mode: '{service_mode}'")

    pico_input = PICOQuestion(**request.pico_question) if request.pico_question else None

    research_input_baml = ResearchTaskInput(
        user_original_query=request.user_original_query,
        pico_question=pico_input,
        research_focus=request.research_focus,
        target_audience=request.target_audience,
        research_mode=service_mode  # Pass the determined service_mode to BAML/Service
    )

    try:
        # Instantiate the service with the determined research_mode
        research_service = SimpleAutonomousResearchService(research_mode=service_mode)
        async with research_service as service:
            result = await service.conduct_autonomous_research(research_input_baml)
        logger.info(f"✅ Research via /quick-search completed (mode: {service_mode}) for query: '{request.user_original_query}'")
        return result
    except Exception as e:
        logger.error(f"❌ Error during research via /quick-search (mode: {service_mode}) for query '{request.user_original_query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during the research process: {str(e)}")

@router.post("/formulate-pico", response_model=PICOFormulationOutput)
async def formulate_pico_question(request: PICOFormulationRequest):
    """
    Formule uma questão PICO estruturada a partir de um cenário clínico
    """
    try:
        # Preparar input para formulação PICO
        scenario_input = ClinicalScenarioInput(
            clinical_scenario=request.clinical_scenario,
            additional_context=request.additional_context
        )
        
        # Formular com BAML
        logger.info("Formulando questão PICO com Dr. Corvus")
        pico_output: PICOFormulationOutput = await b.FormulateEvidenceBasedPICOQuestion(scenario_input)
        
        logger.info("Formulação PICO concluída")
        return pico_output
        
    except Exception as e:
        logger.error(f"Erro na formulação PICO: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na formulação PICO: {str(e)}")

@router.get("/search-strategy")
async def formulate_search_strategy(
    query: str,
    research_focus: Optional[str] = None,
    target_audience: Optional[str] = None
) -> FormulatedSearchStrategyOutput:
    """
    Apenas formula uma estratégia de busca sem executar a pesquisa
    """
    try:
        research_input = ResearchTaskInput(
            user_original_query=query,
            research_focus=research_focus,
            target_audience=target_audience
        )
        
        logger.info(f"Formulando estratégia de busca para: {query}")
        strategy_output: FormulatedSearchStrategyOutput = await b.FormulateDeepResearchStrategy(research_input)
        
        return strategy_output
        
    except Exception as e:
        logger.error(f"Erro ao formular estratégia: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao formular estratégia: {str(e)}")


# === TRANSLATION HELPERS FOR RESEARCH OUTPUTS ===
async def _translate_pdf_analysis_output(output: PDFAnalysisOutput, target_lang="PT") -> PDFAnalysisOutput:
    """
    Translates the user-facing fields of a PDFAnalysisOutput object using BAML as primary service.
    """
    if not output:
        return output

    logger.info(f"🌐 Starting translation of PDF analysis output to {target_lang}")
    
    try:
        # _translate_field can handle nested Pydantic models recursively
        translated_output = await _translate_field(output, target_lang, "PDFAnalysisOutput")
        
        # Verify translation was successful by checking a key field
        if hasattr(translated_output, 'key_findings') and translated_output.key_findings:
            if translated_output.key_findings == output.key_findings and target_lang == "PT":
                logger.warning("PDF analysis translation may have failed - key_findings unchanged")
                
        logger.info(f"✅ PDF analysis translation completed successfully")
        return translated_output
    except Exception as e:
        logger.error(f"❌ Failed to translate PDFAnalysisOutput: {e}", exc_info=True)
        return output

# Enhanced appraisal translation function removed (deprecated)

async def _translate_pico_formulation_output(output: PICOFormulationOutput, target_lang="PT") -> PICOFormulationOutput:
    """
    Translates the user-facing fields of a PICOFormulationOutput object, keeping search terms in English.
    Uses BAML as primary translation service with DeepL fallback.
    """
    if not output:
        return output
        
    logger.info(f"🌐 Starting translation of PICO formulation output to {target_lang}")
    
    try:
        # Create a copy of the output to modify
        from copy import deepcopy
        output_copy = deepcopy(output)
        
        # Store search terms and strategies before translation
        search_terms = output_copy.search_terms_suggestions if hasattr(output_copy, 'search_terms_suggestions') else None
        boolean_strategies = output_copy.boolean_search_strategies if hasattr(output_copy, 'boolean_search_strategies') else None
        
        # Translate the main output
        translated_output = await _translate_field(output_copy, target_lang, "PICOFormulationOutput")
        
        # Keep search terms and strategies in English for database queries
        if search_terms:
            translated_output.search_terms_suggestions = search_terms
        if boolean_strategies:
            translated_output.boolean_search_strategies = boolean_strategies
            
        # Verify translation was successful by checking a key field
        if hasattr(translated_output, 'formulated_question') and translated_output.formulated_question:
            if translated_output.formulated_question == output.formulated_question and target_lang == "PT":
                logger.warning("PICO formulation translation may have failed - formulated_question unchanged")
                # Try direct translation of formulated_question as fallback
                try:
                    if output.formulated_question:
                        translated_question = await translate_with_fallback(output.formulated_question, target_lang=target_lang)
                        if translated_question:
                            translated_output.formulated_question = translated_question
                except Exception as retry_error:
                    logger.error(f"Retry translation of formulated_question also failed: {retry_error}")
        
        logger.info(f"✅ PICO formulation translation completed successfully")
        return translated_output
    except Exception as e:
        logger.error(f"❌ Failed to translate PICOFormulationOutput: {e}", exc_info=True)
        return output

async def _translate_field(field, target_lang="PT", field_name=None):
    """
    Flattens all translatable strings in the structure, batch translates them using BAML as primary service,
    and reconstructs the structure.
    """
    import collections.abc
    try:
        # Helper to flatten all strings and record their paths
        def flatten(obj, path_prefix=None):
            items = []
            if isinstance(obj, str):
                # Skip empty strings, numeric strings, and all-uppercase strings (likely codes)
                if obj and obj.strip() and not obj.isnumeric() and not (obj.isupper() and len(obj) < 10):
                    items.append((path_prefix, obj))
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    items.extend(flatten(v, f"{path_prefix}[{i}]" if path_prefix else f"[{i}]"))
            elif isinstance(obj, dict):
                for k, v in obj.items():
                    items.extend(flatten(v, f"{path_prefix}.{k}" if path_prefix else k))
            else:
                # For pydantic/BaseModel, try to flatten its dict
                if hasattr(obj, 'model_dump'):
                    items.extend(flatten(obj.model_dump(), path_prefix))
            return items

        # Helper to set value by path
        def set_by_path(obj, path, value):
            if path is None:
                return value
            parts = []
            buf = ''
            i = 0
            while i < len(path):
                if path[i] == '[':
                    if buf:
                        parts.append(buf)
                        buf = ''
                    j = i+1
                    while j < len(path) and path[j] != ']':
                        j += 1
                    parts.append(int(path[i+1:j]))
                    i = j
                elif path[i] == '.':
                    if buf:
                        parts.append(buf)
                        buf = ''
                else:
                    buf += path[i]
                i += 1
            if buf:
                parts.append(buf)
            # Now walk and set
            cur = obj
            for idx, part in enumerate(parts[:-1]):
                if isinstance(part, int):
                    while len(cur) <= part:
                        cur.append(None)
                    if cur[part] is None:
                        # Guess next type
                        if isinstance(parts[idx+1], int):
                            cur[part] = []
                        else:
                            cur[part] = {}
                    cur = cur[part]
                else:
                    if part not in cur or cur[part] is None:
                        if isinstance(parts[idx+1], int):
                            cur[part] = []
                        else:
                            cur[part] = {}
                    cur = cur[part]
            last = parts[-1]
            if isinstance(last, int):
                while len(cur) <= last:
                    cur.append(None)
                cur[last] = value
            else:
                cur[last] = value
            return obj

        # Flatten all strings
        flattened = flatten(field)
        if not flattened:
            return field
        paths, strings = zip(*flattened)
        
        # Skip translation if all strings are very short (likely codes or non-translatable content)
        if all(len(s) < 5 for s in strings):
            logger.info(f"Skipping translation for field {field_name}: all strings too short")
            return field
            
        # Batch translate with better error handling
        try:
            translated = await translate_with_fallback(list(strings), target_lang)
            if not translated or len(translated) != len(strings):
                logger.warning(f"Translation returned incomplete results for field: {field_name}")
                return field
        except Exception as e:
            logger.error(f"Translation failed for field batch: {field_name or 'unknown'} | Error: {e}")
            return field
            
        # Reconstruct
        def reconstruct(obj):
            if isinstance(obj, str):
                # Find its path in flattened
                try:
                    idx = flattened.index((None, obj))
                except ValueError:
                    idx = None
                if idx is not None:
                    return translated[idx]
                return obj
            elif isinstance(obj, list):
                return [reconstruct(v) for v in obj]
            elif isinstance(obj, dict):
                return {k: reconstruct(v) for k, v in obj.items()}
            else:
                if hasattr(obj, 'model_dump'):
                    # Try to reconstruct from dict and re-instantiate
                    model_cls = type(obj)
                    new_dict = reconstruct(obj.model_dump())
                    return model_cls(**new_dict)
                return obj
                
        # For paths, reconstruct by setting translated values by path
        # Build a mutable base structure
        import copy
        if hasattr(field, 'model_dump'):
            base = field.model_dump()
            is_model = True
        else:
            base = copy.deepcopy(field)
            is_model = False
        for p, v, t in zip(paths, strings, translated):
            set_by_path(base, p, t)
        if is_model:
            return type(field)(**base)
        return base
    except Exception as e:
        logger.error(f"Translation failed for field: {field_name or 'unknown'} | Error: {e}")
        return field  # Fallback to original

async def _translate_synthesized_output(output: SynthesizedResearchOutput, target_lang="PT") -> SynthesizedResearchOutput:
    """
    Translates all user-facing fields of the SynthesizedResearchOutput in a single batch.
    Uses BAML as primary translation service with DeepL fallback.
    Handles nested objects, arrays, and maintains the original structure.
    """
    if not output:
        return output

    logger.info(f"🌐 Starting batch translation of research output to {target_lang}")
    
    try:
        # Convert the output to a dictionary for batch processing
        output_dict = output.model_dump() if hasattr(output, 'model_dump') else dict(output)
        
        # Use _translate_field to handle the entire structure with a single batch translation
        translated_output = await _translate_field(output_dict, target_lang, "synthesized_research_output")
        
        # Verify translation success by checking a key field
        if translated_output.get('executive_summary') == output_dict.get('executive_summary') and target_lang == "PT":
            logger.warning("Research output translation may have failed - executive_summary unchanged")
            # Try again with smaller batches if the full batch failed
            try:
                logger.info("Attempting translation with smaller batches")
                # Translate executive_summary separately
                if 'executive_summary' in output_dict and output_dict['executive_summary']:
                    translated_summary = await translate_with_fallback(output_dict['executive_summary'], target_lang=target_lang)
                    if translated_summary:
                        translated_output['executive_summary'] = translated_summary
            except Exception as retry_error:
                logger.error(f"Retry translation also failed: {retry_error}")
        
        # Convert back to the original model type
        if hasattr(output, 'model_validate'):
            return type(output).model_validate(translated_output)
        return type(output)(**translated_output)
        
    except Exception as e:
        logger.error(f"❌ Error during batch translation of research output: {str(e)}", exc_info=True)
        # Return original output if translation fails
        return output

# === TRANSLATED ENDPOINTS ===
@router.post("/quick-search-translated", response_model=SynthesizedResearchOutput)
async def perform_quick_research_translated(request: DeepResearchRequest):
    """
    Same as /quick-search, but translates all user-facing fields in the response to Portuguese before returning.
    """
    if request.research_mode == 'expanded':
        service_mode = 'comprehensive'
    elif request.research_mode == 'comprehensive':
        service_mode = 'comprehensive'
    else:
        service_mode = 'quick'
    logger.info(f"⚡ [TRANSLATED] Received request for /quick-search-translated with query: '{request.user_original_query}', requested mode: '{request.research_mode}', resolved service_mode: '{service_mode}'")
    pico_input = PICOQuestion(**request.pico_question) if request.pico_question else None
    research_input_baml = ResearchTaskInput(
        user_original_query=request.user_original_query,
        pico_question=pico_input,
        research_focus=request.research_focus,
        target_audience=request.target_audience,
        research_mode=service_mode
    )
    try:
        research_service = SimpleAutonomousResearchService(research_mode=service_mode)
        async with research_service as service:
            result = await service.conduct_autonomous_research(research_input_baml)
        logger.info(f"✅ Research via /quick-search-translated completed (mode: {service_mode}) for query: '{request.user_original_query}'")
        translated_result = await _translate_synthesized_output(result, target_lang="PT")
        return translated_result
    except Exception as e:
        logger.error(f"❌ Error during research via /quick-search-translated (mode: {service_mode}) for query '{request.user_original_query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during the translated research process: {str(e)}")

@router.post("/formulate-pico-translated", response_model=PICOFormulationOutput)
async def formulate_pico_question_translated(request: PICOFormulationRequest):
    """
    Formulates a structured PICO question from a clinical scenario and returns it translated.
    """
    try:
        pico_output = await formulate_pico_question(request)
        logger.info(f"Translating PICO formulation for: {request.clinical_scenario[:50]}...")
        translated_output = await _translate_pico_formulation_output(pico_output, target_lang="PT")
        logger.info("✅ Translation of PICO formulation complete.")
        return translated_output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na formulação PICO traduzida: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na formulação PICO traduzida: {str(e)}")


@router.post("/unified-evidence-analysis-translated", response_model=GradeEvidenceAppraisalOutput)
async def unified_evidence_analysis_translated(request: UnifiedEvidenceAnalysisRequest):
    """
    Performs unified evidence analysis and returns the results translated to Portuguese.
    """
    try:
        # Call the original endpoint
        evidence_analysis = await unified_evidence_analysis(request)
        
        # Translate the results
        logger.info(f"Translating unified evidence analysis results to Portuguese")
        translated_output = await _translate_enhanced_appraisal_output(evidence_analysis, target_lang="PT")
        logger.info(f"✅ Translation of unified evidence analysis complete")
        
        return translated_output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro na análise unificada de evidências traduzida: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na análise unificada de evidências traduzida: {str(e)}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint that provides system status and capabilities.
    
    Returns:
        dict: System status, versions, and available features
    """
    try:
        # Import the BAML client to test connectivity
        from baml_client import b
        baml_status = "healthy"
    except ImportError as e:
        baml_status = f"error: {str(e)}"
    
    # Test scholarly library availability
    try:
        from scholarly import scholarly
        scholarly_status = "available"
    except ImportError:
        scholarly_status = "not available"
    
    return {
        "status": "healthy",
        "version": "7.0 (Comprehensive Academic Search with Enhanced Google Scholar)",
        "api_version": "v6.0",
        "baml_client": baml_status,
        "scholarly_library": scholarly_status,
        "capabilities": [
            "deep_research_with_pubmed_integration",
            "autonomous_research_orchestration", 
            "pdf_document_analysis",
            "evidence_appraisal_assistance",
            "pico_question_formulation",
            "comprehensive_academic_database_search",
            "enhanced_google_scholar_search",
            "cochrane_library_search",
            "ncbi_sources_search",
            "elite_medical_journals_search",
            "advanced_search_strategy_formulation",
            "multilingual_synthesis_with_impact_factor_analysis"
        ],
        "search_sources": {
            "primary_databases": ["PubMed", "Google Scholar Enhanced", "Cochrane Library"],
            "academic_sources": ["NCBI Bookshelf", "PMC", "ScienceDirect", "medRxiv"],
            "elite_journals": ["NEJM", "Lancet", "JAMA", "BMJ", "Nature", "Science"],
            "guidelines": ["WHO", "CDC", "NIH", "Medical Societies"]
        },
        "quality_metrics": {
            "min_relevance_score": 0.25,
            "academic_score_threshold": 0.4,
            "impact_factor_weighting": True,
            "temporal_prioritization": "Last 3-5 years preferred"
        }
    }

@router.get("/test-enhanced-scholar")
async def test_enhanced_google_scholar(
    query: str = "diabetes treatment guidelines",
    max_results: int = 5,
    recent_years_only: bool = True
):
    """
    Test the enhanced Google Scholar search using the scholarly library.
    
    This endpoint specifically tests the new scholarly library integration
    which provides structured access to Google Scholar data with citation counts,
    abstracts, and detailed publication information.
    """
    try:
        # Test the enhanced Google Scholar client directly
        year_from = 2020 if recent_years_only else None
        
        logger.info(f"Testing enhanced Google Scholar search: {query}")
        
        scholar_response = await search_google_scholar_enhanced(
            query=query,
            max_results=max_results,
            sort_by_citations=True,
            year_from=year_from,
            include_abstracts=True
        )
        
        # Also test the integrated version through brave_search_client
        integrated_response = await search_google_scholar(query, max_results, recent_years_only)
        
        return {
            "test_status": "success",
            "query_tested": query,
            "enhanced_scholar_direct": {
                "total_publications": scholar_response.total_found,
                "search_time": scholar_response.search_time,
                "error": scholar_response.error,
                "sample_publications": [
                    {
                        "title": pub.title,
                        "authors": pub.authors[:3],  # First 3 authors
                        "year": pub.year,
                        "journal": pub.journal,
                        "citation_count": pub.citation_count,
                        "relevance_score": pub.relevance_score,
                        "has_abstract": bool(pub.abstract),
                        "has_pdf": bool(pub.pdf_url),
                        "doi": pub.doi,
                        "pmid": pub.pmid
                    }
                    for pub in scholar_response.publications[:3]  # Show first 3
                ]
            },
            "integrated_brave_search": {
                "total_results": integrated_response.total_results,
                "sample_results": [
                    {
                        "title": result.title,
                        "source": result.source,
                        "has_url": bool(result.url),
                        "description_length": len(result.description) if result.description else 0
                    }
                    for result in integrated_response.results[:3]  # Show first 3
                ]
            },
            "comparison": {
                "enhanced_vs_basic": f"Enhanced returned {scholar_response.total_found} vs Basic returned {integrated_response.total_results}",
                "source_quality": "Enhanced provides structured data with citations, DOIs, and abstracts"
            }
        }
        
    except Exception as e:
        logger.error(f"Enhanced Google Scholar test failed: {e}", exc_info=True)
        return {
            "test_status": "error",
            "error": str(e),
            "query_tested": query,
            "recommendation": "Check scholarly library installation: pip install scholarly"
        }

@router.get("/test-academic-search")
async def test_academic_search(
    query: str = "diabetes treatment guidelines",
    prioritize_quality: bool = True,
    max_results: int = 15
):
    """Test endpoint for comprehensive academic search functionality"""
    try:
        logger.info(f"Testing comprehensive academic search with query: {query}")
        
        # Test comprehensive academic search
        academic_response = await search_comprehensive_academic(
            query=query,
            max_total_results=max_results,
            prioritize_quality=prioritize_quality
        )
        
        # Analyze source distribution
        source_breakdown = {}
        quality_breakdown = {"tier_1": 0, "tier_2": 0, "tier_3": 0, "tier_4+": 0}
        
        for result in academic_response.results:
            source = result.source
            source_breakdown[source] = source_breakdown.get(source, 0) + 1
            
            # Assess quality tier
            source_quality = assess_web_source_quality(result.url, result.title, result.description)
            tier = source_quality["tier"]
            if tier == 1:
                quality_breakdown["tier_1"] += 1
            elif tier == 2:
                quality_breakdown["tier_2"] += 1
            elif tier == 3:
                quality_breakdown["tier_3"] += 1
            else:
                quality_breakdown["tier_4+"] += 1
        
        return {
            "success": True,
            "query": query,
            "total_results": academic_response.total_results,
            "source_distribution": source_breakdown,
            "quality_distribution": quality_breakdown,
            "sample_results": [
                {
                    "title": result.title,
                    "url": result.url,
                    "source": result.source,
                    "description": result.description[:150] + "..." if len(result.description) > 150 else result.description,
                    "quality_assessment": assess_web_source_quality(result.url, result.title, result.description)
                }
                for result in academic_response.results[:5]  # Top 5 for testing
            ]
        }
        
    except Exception as e:
        logger.error(f"Error in academic search test: {e}")
        return {
            "success": False,
            "error": str(e),
            "query": query
        }

@router.get("/test-brave-search")
async def test_brave_search(query: str = "diabetes treatment guidelines"):
    """Endpoint de teste para verificar a integração com Brave Search"""
    try:
        logger.info(f"Testando busca Brave com query: {query}")
        
        # Testar busca no Brave Search
        brave_response = await search_brave_web(query=query, count=3, offset=0)
        
        return {
            "success": True,
            "query": query,
            "total_results": brave_response.total_results,
            "results_count": len(brave_response.results),
            "error": brave_response.error,
            "sample_results": [
                {
                    "title": result.title,
                    "url": result.url,
                    "source": result.source,
                    "description": result.description[:100] + "..." if len(result.description) > 100 else result.description
                }
                for result in brave_response.results[:2]  # Apenas 2 primeiros para teste
            ]
        }
        
    except Exception as e:
        logger.error(f"Erro no teste Brave Search: {e}")
        return {
            "success": False,
            "error": str(e),
            "query": query
        }

@router.post("/cite-source-analysis", response_model=Dict[str, Any])
async def cite_source_analysis(request: CiteSourceAnalysisRequest):
    """
    Analisa uma lista de resultados de pesquisa com CiteSource e gera relatório completo
    """
    try:
        logger.info(f"📊 Iniciando análise CiteSource para: {request.query}")
        
        # Converter resultados para RawSearchResultItem
        search_results = []
        for result_dict in request.search_results:
            # Converter dict para RawSearchResultItem
            search_result = RawSearchResultItem(
                source=ResearchSourceType.WEB_SEARCH_BRAVE,  # Default, será detectado pelo dict
                title=result_dict.get("title", ""),
                url=result_dict.get("url", ""),
                snippet_or_abstract=result_dict.get("snippet_or_abstract", ""),
                publication_date=result_dict.get("publication_date"),
                authors=result_dict.get("authors"),
                journal=result_dict.get("journal"),
                pmid=result_dict.get("pmid"),
                doi=result_dict.get("doi"),
                study_type=result_dict.get("study_type"),
                citation_count=result_dict.get("citation_count")
            )
            search_results.append(search_result)
        
        # Processar com CiteSource
        deduplicated_results, cite_source_report = await process_with_cite_source(
            search_results, 
            request.query, 
            request.source_timing
        )
        
        # Gerar relatório de visualização se solicitado
        if request.include_visualizations:
            comprehensive_report = await generate_cite_source_report(
                cite_source_report=cite_source_report,
                include_visualizations=True
            )
            
            return {
                "cite_source_report": cite_source_report.dict(),
                "deduplicated_results": [result.dict() for result in deduplicated_results],
                "visualization_report": comprehensive_report
            }
        else:
            return {
                "cite_source_report": cite_source_report.dict(),
                "deduplicated_results": [result.dict() for result in deduplicated_results]
            }
            
    except Exception as e:
        logger.error(f"❌ Erro na análise CiteSource: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na análise CiteSource: {str(e)}")


@router.post("/unified-evidence-analysis", response_model=GradeEvidenceAppraisalOutput)
async def unified_evidence_analysis(request: UnifiedEvidenceAnalysisRequest):
    """
    Endpoint unificado para análise de evidências médicas usando o pipeline de duas etapas:
    1. Extração de fatos (AnalyzeMedicalPaper)
    2. Avaliação crítica (GenerateEvidenceAppraisal)
    """
    try:
        logger.info(f"🔬 Iniciando análise unificada de evidências")
        
        # Extrair dados do request
        paper_full_text = request.paper_full_text
        clinical_question_PICO = request.clinical_question_PICO
        
        if not paper_full_text:
            raise HTTPException(status_code=400, detail="Texto do artigo não fornecido")
        
        # Etapa 1: Extração de fatos
        logger.info("📑 Etapa 1: Extraindo fatos do artigo")
        extracted_data = await b.AnalyzeMedicalPaper(
            paper_full_text=paper_full_text,
            clinical_question_PICO=clinical_question_PICO
        )
        
        # Etapa 2: Avaliação crítica
        logger.info("⚖️ Etapa 2: Realizando avaliação crítica")
        appraisal_result = await b.GenerateEvidenceAppraisal(
            extracted_data=extracted_data
        )
        
        logger.info("✅ Análise unificada de evidências concluída com sucesso")
        return appraisal_result
        
    except Exception as e:
        logger.error(f"❌ Erro na análise unificada de evidências: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


@router.post("/unified-evidence-analysis-from-pdf", response_model=GradeEvidenceAppraisalOutput)
async def unified_evidence_analysis_from_pdf(
    file: UploadFile = File(...),
    clinical_question: Optional[str] = Form(None),
    extraction_mode: Optional[str] = Form("balanced")
):
    """
    Analyzes a PDF document by extracting its text and running it through the
    unified evidence analysis pipeline.
    """
    try:
        logger.info(f"📄 Analyzing PDF and appraising: {file.filename}")

        # 1. Extract text from PDF
        file_content = await file.read()
        extraction_result = await pdf_service.extract_text_from_pdf(
            file_content,
            filename=file.filename,
            extraction_mode=extraction_mode
        )
        extracted_text = extraction_result.get("text")

        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF to perform analysis.")

        # 2. Call the unified evidence analysis logic with the extracted text
        logger.info(f"🔬 Passing extracted text to unified analysis pipeline.")
        analysis_request = UnifiedEvidenceAnalysisRequest(
            paper_full_text=extracted_text,
            clinical_question_PICO=clinical_question
        )

        # Call the existing function for text-based analysis
        appraisal_result = await unified_evidence_analysis(analysis_request)

        logger.info(f"✅ PDF analysis and appraisal completed for: {file.filename}")
        return appraisal_result

    except Exception as e:
        logger.error(f"❌ Error in PDF analysis and appraisal pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Error in PDF analysis pipeline: {str(e)}")


@router.post("/cite-source-comprehensive-test")
async def cite_source_comprehensive_test(request: CiteSourceTestRequest):
    """
    Executa um teste abrangente do CiteSource com busca real em múltiplas fontes
    """
    try:
        logger.info(f"🧪 Executando teste abrangente CiteSource para: {request.query}")
        
        start_time = time.time()
        all_results = []
        source_timing = {}
        
        # 1. Buscar no PubMed
        try:
            pubmed_start = time.time()
            pubmed_results = await unified_pubmed_service.search_articles(
                query=request.query,
                max_results=request.max_results_per_source
            )
            source_timing["pubmed"] = (time.time() - pubmed_start) * 1000
            
            for result in pubmed_results:
                all_results.append(convert_unified_to_baml_search_result(result))
                
            logger.info(f"✅ PubMed: {len(pubmed_results)} resultados")
        except Exception as e:
            logger.warning(f"⚠️ Erro no PubMed: {e}")
        
        # 2. Buscar em Academic Sources (Google Scholar, etc.)
        try:
            academic_start = time.time()
            academic_results = await search_comprehensive_academic(
                query=request.query,
                max_results=request.max_results_per_source,
                prioritize_quality=True
            )
            source_timing["academic"] = (time.time() - academic_start) * 1000
            
            all_results.extend(convert_pydantic_to_baml_search_result(r) for r in academic_results.results)
            logger.info(f"✅ Academic Sources: {len(academic_results.results)} resultados")
        except Exception as e:
            logger.warning(f"⚠️ Erro em Academic Sources: {e}")
        
        # 3. Buscar Guidelines
        try:
            guidelines_start = time.time()
            guidelines_results = await search_medical_guidelines(
                query=request.query,
                max_results=request.max_results_per_source
            )
            source_timing["guidelines"] = (time.time() - guidelines_start) * 1000
            
            all_results.extend(convert_brave_to_baml_search_result(guidelines_results))
            logger.info(f"✅ Guidelines: {len(guidelines_results.results)} resultados")
        except Exception as e:
            logger.warning(f"⚠️ Erro em Guidelines: {e}")
        
        # 4. Buscar Web Search (fontes gerais)
        try:
            web_start = time.time()
            web_results = await search_brave_web(
                query=f"{request.query} medical research",
                max_results=request.max_results_per_source
            )
            source_timing["web_search"] = (time.time() - web_start) * 1000
            
            all_results.extend(convert_brave_to_baml_search_result(web_results))
            logger.info(f"✅ Web Search: {len(web_results.results)} resultados")
        except Exception as e:
            logger.warning(f"⚠️ Erro em Web Search: {e}")
        
        total_search_time = (time.time() - start_time) * 1000
        logger.info(f"🔍 Busca completa: {len(all_results)} resultados de {len(source_timing)} fontes em {total_search_time:.0f}ms")
        
        # 5. Processar com CiteSource
        cite_source_start = time.time()
        deduplicated_results, cite_source_report = await process_with_cite_source(
            all_results, 
            request.query, 
            source_timing
        )
        cite_source_time = (time.time() - cite_source_start) * 1000
        
        # 6. Gerar relatório de visualização
        visualization_report = {}
        if request.include_visualizations:
            viz_start = time.time()
            visualization_report = await generate_cite_source_report(
                cite_source_report=cite_source_report,
                include_visualizations=True
            )
            viz_time = (time.time() - viz_start) * 1000
            logger.info(f"📊 Relatório de visualização gerado em {viz_time:.0f}ms")
        
        return {
            "test_metadata": {
                "query": request.query,
                "search_duration_seconds": total_search_time / 1000.0,
                "cite_source_processing_time_ms": cite_source_time,
                "original_results_count": len(all_results),
                "deduplicated_results_count": len(deduplicated_results),
                "sources_tested": list(source_timing.keys()),
                "duplicates_removed": cite_source_report.deduplication_result.removed_duplicates
            },
            "cite_source_report": cite_source_report.dict(),
            "deduplicated_results": [result.dict() for result in deduplicated_results],
            "source_performance": {
                "timing": source_timing,
                "source_metrics": [metric.dict() for metric in cite_source_report.source_metrics]
            },
            "visualization_report": visualization_report
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no teste abrangente CiteSource: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no teste CiteSource: {str(e)}")

@router.get("/cite-source-quick-demo")
async def cite_source_quick_demo(
    query: str = "septic shock arteriovenous CO2 gap",
    max_results: int = 20
):
    """
    Demo rápida do CiteSource com resultados simulados para demonstração
    """
    try:
        logger.info(f"🎯 Demo CiteSource para: {query}")
        
        # Gerar resultados simulados com duplicatas intencionais para demonstrar o CiteSource
        simulated_results = [
            # Artigo original
            RawSearchResultItem(
                source=ResearchSourceType.PUBMED,
                title="Arteriovenous Carbon Dioxide Gap in Septic Shock Management",
                url="https://pubmed.ncbi.nlm.nih.gov/12345678/",
                snippet_or_abstract="Study investigating the utility of arteriovenous CO2 gap as a marker of tissue hypoperfusion in septic shock patients...",
                publication_date="2023-03-15",
                authors=["Smith J", "Doe A", "Johnson B"],
                journal="Critical Care Medicine",
                pmid="12345678",
                doi="10.1097/CCM.0000000000001234",
                study_type="Randomized Controlled Trial",
                citation_count=45
            ),
            
            # Mesma citação de fonte diferente (teste de deduplicação por DOI)
            RawSearchResultItem(
                source=ResearchSourceType.LENS_SCHOLARLY,
                title="Arteriovenous Carbon Dioxide Gap in Septic Shock Management",
                url="https://lens.org/article/12345678",
                snippet_or_abstract="Study investigating the utility of arteriovenous CO2 gap as a marker of tissue hypoperfusion...",
                publication_date="2023-03-15",
                authors=["Smith J", "Doe A", "Johnson B"],
                journal="Critical Care Medicine",
                pmid="12345678",
                doi="10.1097/CCM.0000000000001234",  # Mesmo DOI
                study_type="Randomized Controlled Trial",
                citation_count=48  # Citation count ligeiramente diferente
            ),
            
            # Título similar mas estudo diferente (teste de similaridade)
            RawSearchResultItem(
                source=ResearchSourceType.EUROPE_PMC,
                title="Arteriovenous CO2 Gap as Marker in Shock Patients",
                url="https://europepmc.org/article/PMC7654321",
                snippet_or_abstract="Research on CO2 gap measurements in critically ill patients with shock...",
                publication_date="2023-05-20",
                authors=["Brown C", "White D", "Green E"],
                journal="Intensive Care Medicine",
                pmid="87654321",
                doi="10.1007/s00134-023-87654",
                study_type="Observational Study",
                citation_count=22
            ),
            
            # Guidelines
            RawSearchResultItem(
                source=ResearchSourceType.GUIDELINE_RESOURCE,
                title="Surviving Sepsis Campaign Guidelines 2024: Hemodynamic Monitoring",
                url="https://sccm.org/guidelines/sepsis-hemodynamics",
                snippet_or_abstract="Updated evidence-based guidelines for hemodynamic monitoring and management in sepsis...",
                publication_date="2024-01-01",
                authors=None,
                journal=None,
                pmid=None,
                doi=None,
                study_type="Clinical Guidelines",
                citation_count=None
            ),
            
            # Meta-análise de alta qualidade
            RawSearchResultItem(
                source=ResearchSourceType.PUBMED,
                title="Systematic Review of CO2 Gap in Shock: Meta-Analysis of 15 Studies",
                url="https://pubmed.ncbi.nlm.nih.gov/11223344/",
                snippet_or_abstract="Comprehensive meta-analysis examining the diagnostic and prognostic value of arteriovenous CO2 gap...",
                publication_date="2023-08-10",
                authors=["Garcia M", "Lopez P", "Martinez R"],
                journal="The Lancet",
                pmid="11223344",
                doi="10.1016/S0140-6736(23)01234-5",
                study_type="Systematic Review",
                citation_count=67
            ),
            
            # Preprint recente
            RawSearchResultItem(
                source=ResearchSourceType.PREPRINT,
                title="Novel Applications of CO2 Gap in Emergency Department Shock Recognition",
                url="https://medrxiv.org/content/10.1101/2024.02.001v1",
                snippet_or_abstract="Investigation of arteriovenous CO2 gap utility in emergency department triage...",
                publication_date="2024-02-01",
                authors=["Young K", "Elder S"],
                journal="medRxiv",
                pmid=None,
                doi="10.1101/2024.02.001",
                study_type="Research Article",
                citation_count=5
            )
        ]
        
        # Simular timing das fontes
        demo_source_timing = {
            "pubmed": 1200.0,
            "europe_pmc": 1800.0,
            "lens": 2100.0,
            "guidelines": 900.0,
            "preprint": 1500.0
        }
        
        # Processar com CiteSource
        deduplicated_results, cite_source_report = await process_with_cite_source(
            simulated_results, 
            query, 
            demo_source_timing
        )
        
        # Gerar relatório visual completo
        visualization_report = await generate_cite_source_report(
            cite_source_report=cite_source_report,
            include_visualizations=True
        )
        
        return {
            "demo_info": {
                "description": "Demo do CiteSource com resultados simulados",
                "query": query,
                "simulated_duplicates": "Inclui duplicatas intencionais para demonstrar deduplicação",
                "original_count": len(simulated_results),
                "deduplicated_count": len(deduplicated_results),
                "duplicates_removed": cite_source_report.deduplication_result.removed_duplicates
            },
            "cite_source_report": cite_source_report.dict(),
            "deduplicated_results": [result.dict() for result in deduplicated_results],
            "comprehensive_analysis": visualization_report
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na demo CiteSource: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na demo CiteSource: {str(e)}")

async def _translate_enhanced_appraisal_output(output: GradeEvidenceAppraisalOutput, target_lang="PT") -> GradeEvidenceAppraisalOutput:
    """
    Translates the user-facing fields of an EvidenceAppraisalOutput object using BAML as primary service.
    """
    if not output:
        return output
        
    logger.info(f"🌐 Starting translation of evidence appraisal output to {target_lang}")
    
    try:
        # _translate_field can handle nested Pydantic models recursively
        translated_output = await _translate_field(output, target_lang, "GradeEvidenceAppraisalOutput")
        
        # Verify translation was successful by checking a key field
        if hasattr(translated_output, 'summary') and translated_output.summary:
            if translated_output.summary == output.summary and target_lang == "PT":
                logger.warning("Evidence appraisal translation may have failed - summary unchanged")
                # Try direct translation of summary as fallback
                try:
                    if output.summary:
                        translated_summary = await translate_with_fallback(output.summary, target_lang=target_lang, field_name="summary")
                        if translated_summary:
                            translated_output.summary = translated_summary
                except Exception as retry_error:
                    logger.error(f"Retry translation of summary also failed: {retry_error}")
        
        logger.info(f"✅ Evidence appraisal translation completed successfully")
        return translated_output
    except Exception as e:
        logger.error(f"❌ Failed to translate EvidenceAppraisalOutput: {e}", exc_info=True)
        return output

@router.post("/unified-evidence-analysis-from-pdf-translated", response_model=GradeEvidenceAppraisalOutput)
async def unified_evidence_analysis_from_pdf_translated(
    file: UploadFile = File(...),
    clinical_question: Optional[str] = Form(None),
    extraction_mode: Optional[str] = Form("balanced")
):
    """
    Analyzes a PDF, appraises it, and returns the results translated to Portuguese.
    """
    try:
        from io import BytesIO
        from starlette.datastructures import UploadFile as StarletteUploadFile

        file_content = await file.read()
        
        # Recreate a file-like object for the internal call to avoid stream consumption issues
        temp_file = StarletteUploadFile(
            filename=file.filename,
            file=BytesIO(file_content)
        )

        # Call the non-translated PDF analysis endpoint
        analysis_output = await unified_evidence_analysis_from_pdf(
            file=temp_file,
            clinical_question=clinical_question,
            extraction_mode=extraction_mode
        )

        # Translate the results
        logger.info(f"Translating unified evidence analysis (from PDF) results to Portuguese")
        translated_output = await _translate_enhanced_appraisal_output(analysis_output, target_lang="PT")
        logger.info(f"✅ Translation of unified evidence analysis (from PDF) complete")

        return translated_output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in translated PDF analysis and appraisal endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error in translated PDF analysis and appraisal: {str(e)}")