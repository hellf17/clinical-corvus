"""
Serviço de Pesquisa Autônoma Simplificada.

Esta é uma versão simplificada que simula comportamento autônomo
sem depender do Langroid, usando apenas as ferramentas existentes.
"""

import asyncio
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse
import aiohttp
import os
from datetime import datetime
import time
import traceback

# Adicionado para obter as configurações com a chave de API
from config import get_settings

# Importar o dicionário de abreviações
from utils.medical_abbreviations import PORTUGUESE_MEDICAL_ABBREVIATIONS

# Importar tipos BAML
from baml_client.types import (
    FormulatedSearchStrategyOutput,
    RawSearchResultItem,
    ResearchMetrics,
    ResearchSourceType,
    ResearchTaskInput,
    SearchParameters,
    SynthesizedResearchOutput,
    CiteSourceMetrics as BamlCiteSourceMetrics,
    StudyTypeFilter,
)
# BAML client-specific generated types for function calls
from baml_client.types import ResearchTaskInput as ClientResearchTaskInput
from baml_client.types import PICOQuestion as ClientPICOQuestion

# Importar serviços e clientes
from models.research_models import RawSearchResultItemPydantic
from services.unified_pubmed_service import UnifiedPubMedService
from services.lens_scholar_service import LensScholarService
from services.europe_pmc_service import EuropePMCService
from services.cite_source_service import process_with_cite_source, CiteSourceService
from clients.brave_search_client import search_brave_web
from services.translator_service import translate
from clients.mcp_tools import async_brave_web_search, async_lookup_guidelines
from services.synthesis_helper_service import calculate_research_metrics
from baml_client import b
from services.synthesis_helper_service import (
    synthesize_with_fallback,
    calculate_research_metrics,
    _convert_cite_source_to_baml_metrics
)
from utils.research_result_converters import (
    convert_single_brave_item_to_baml,
    convert_unified_to_baml_search_result # Corrected to include only available converters
)
from clients.google_scholar_client import search_google_scholar_enhanced, ScholarSearchResponse, GoogleScholarClient
from clients.brave_search_client import BraveSearchClient, search_cochrane_library, search_ncbi_sources, search_elite_journals, search_comprehensive_academic

# Configurar o logger
logger = logging.getLogger(__name__)

def format_reference_for_frontend(ref, idx):
    """
    Ensures all required frontend fields are present and robustly typed.
    """
    # Parse year from publication_date
    year = None
    pub_date = getattr(ref, "publication_date", None)
    if pub_date:
        try:
            year = int(pub_date[:4])
        except Exception:
            year = None
    return {
        "reference_id": idx + 1,
        "title": getattr(ref, "title", "N/A"),
        "authors": getattr(ref, "authors", []) or [],
        "journal": getattr(ref, "journal", "N/A") or "N/A",
        "year": year,
        "doi": getattr(ref, "doi", None),
        "pmid": getattr(ref, "pmid", None),
        "url": getattr(ref, "url", None),
        "study_type": getattr(ref, "study_type", "N/A") or "N/A",
        "synthesis_relevance_score": (
            getattr(ref, "synthesis_relevance_score", None)
            if hasattr(ref, "synthesis_relevance_score")
            else getattr(ref, "relevance_score", None)
        )
    }

class SimpleAutonomousResearchService:
    MCP_CALL_DELAY_SECONDS = 2 # Delay in seconds between MCP calls
    TARGET_RESULT_COUNT_FOR_BREAK = 15 # Number of results after which to stop further search strategies (tune as needed)
    """
    Serviço que simula pesquisa autônoma usando lógica programática
    para decidir estratégias e executar múltiplas iterações.
    """
    # Whitelist of trusted domains for filtering search results
    TRUSTED_DOMAIN_WHITELIST = [
    # Core Medical Databases & Government Health Institutions
    "pubmed.ncbi.nlm.nih.gov",
    "ncbi.nlm.nih.gov",  # National Center for Biotechnology Information (includes PMC, Bookshelf)
    "clinicaltrials.gov", # ClinicalTrials.gov (US NIH)
    "cochranelibrary.com", # Cochrane Library (Systematic Reviews)
    "who.int", # World Health Organization
    "cdc.gov", # Centers for Disease Control and Prevention (US)
    "fda.gov", # U.S. Food and Drug Administration
    "ema.europa.eu", # European Medicines Agency
    "nice.org.uk", # National Institute for Health and Care Excellence (UK)
    "ahrq.gov", # Agency for Healthcare Research and Quality (US)
    "nih.gov", # NIH (National Institutes of Health)

    # Major General Medical Journals
    "thelancet.com", # The Lancet
    "nejm.org", # New England Journal of Medicine
    "jamanetwork.com", # JAMA Network (Journal of the American Medical Association)
    "bmj.com", # British Medical Journal
    "annals.org", # Annals of Internal Medicine
    
    # Major Scientific Publishers & Platforms
    "nature.com", # Nature Publishing Group
    "sciencemag.org", # Science Magazine (AAAS)
    "cell.com", # Cell Press
    "plos.org", # PLOS (Public Library of Science)
    "frontiersin.org", # Frontiers Media
    "academic.oup.com", # Oxford University Press journals
    "springer.com", # Springer Nature (includes BMC, Nature Research)
    "link.springer.com", # Specific Springer platform
    "wiley.com", # Wiley Online Library
    "onlinelibrary.wiley.com", # Specific Wiley platform
    "sciencedirect.com", # ScienceDirect (Elsevier)
    "elsevier.com", # Elsevier main site (might catch other relevant subdomains)
    "mdpi.com", # MDPI (Multidisciplinary Digital Publishing Institute - generally open access)
    "karger.com", # Karger Publishers
    "thieme-connect.com", # Thieme Connect
    "tandfonline.com", # Taylor & Francis Online
    "journals.lww.com", # Lippincott Williams & Wilkins (Wolters Kluwer)

    # Reputable Clinical Resources & Societies
    "sccm.org", # Society of Critical Care Medicine
    "emcrit.org", # EMCrit Project (Emergency Medicine & Critical Care)
    "uptodate.com", # UpToDate (Clinical decision support - subscription)
    "medscape.com", # Medscape (Medical news, education, and CME)
    "emedicine.medscape.com", # Medscape's clinical reference
    "atm.amegroups.org", # Annals of Translational Medicine (AME Publishing)
    "jacc.org", # Journal of the American College of Cardiology
    "frontiersin.org", # Frontiers in Medicine
    "professional.heart.org", # Heart.org
    "ahajournals.org", # American Heart Association
    "escardio.org", # European Society of Cardiology
    "practicalneurology.com", # Practical Neurology
    "acc.org", # American College of Cardiology
    "epocrates.com", # ePocrates

    # Regional & Specific Repositories
    "scielo.br", # SciELO Brazil (Scientific Electronic Library Online)
    "pesquisa.bvsalud.org", # Brazilian Virtual Health Library
    "bvsalud.org", # Brazilian Virtual Health Library
    "bvsalud.org.br", # Brazilian Virtual Health Library
    # Potentially add other SciELO regional sites if needed, e.g., scielo.org

    # Brazilian sites (use with caution, ensure quality for each specific one)
    "tadeclinicagem.com.br", # As per logs, verify quality if broadly applied

    # Consider adding specific renowned university domains if they host significant open research
    # e.g., "harvard.edu", "stanford.edu" - but be very specific with paths if possible or ensure it's a research subdomain
    ]

    # Blacklist of domains/keywords for low-quality or non-academic sources
    LOW_QUALITY_DOMAIN_BLACKLIST = [
        'blog', 'wordpress', 'jaleko.com.br', 'questoesemcardiologia.com',
        'pebmed.com.br', 'afya.com.br', 'ibsp.net.br',
        'medium.com', 'quora.com', 'facebook.com', 'linkedin.com', 'youtube.com',
        'twitter.com', 'instagram.com', 'wikihow.com', 'wikiversity.org',
        'slideshare.net', 'pt.slideshare.net', 'pt.wikipedia.org', 'wikipedia.org',
        'doctormultimedia.com', 'minhavida.com.br',
        'tjdft.jus.br', 'jusbrasil.com.br', 'minutosaudavel.com.br',
        'msdmanuals.com', 'msdmanuals.com/pt/profissional',
    ]

    def _normalize_domain(self, domain):
        """Removes 'www.' prefix if present and lowercases domain."""
        if domain is None:
            return None
        return domain.lower().lstrip('www.') if domain.lower().startswith('www.') else domain.lower()

    def _filter_low_quality_sources(self, results):
        """
        Filters out low-quality or non-academic sources from results based on blacklist (and optional whitelist).
        Logs each filtered-out result for traceability.
        """
        import urllib.parse
        filtered = []
        for item in results:
            url = getattr(item, 'url', None)
            if not url:
                self._log_filtered_result(item, reason='Missing URL')
                continue
            domain = self._extract_domain(url)
            normalized_domain = self._normalize_domain(domain)
            # Blacklist check
            if any(bad in url for bad in self.LOW_QUALITY_DOMAIN_BLACKLIST) or \
                (domain and any(bad in domain for bad in self.LOW_QUALITY_DOMAIN_BLACKLIST)):
                self._log_filtered_result(item, reason=f'Blacklisted domain/keyword ({domain})')
                continue
            # Whitelist enforcement – keep item only if its normalized domain matches whitelist
            if self.TRUSTED_DOMAIN_WHITELIST and normalized_domain not in self.TRUSTED_DOMAIN_WHITELIST:
                self._log_filtered_result(item, reason=f'Not in trusted whitelist ({normalized_domain})')
                continue
            filtered.append(item)
        return filtered

    def _extract_domain(self, url):
        """Extracts the domain from a URL."""
        import urllib.parse
        try:
            parsed = urllib.parse.urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return ''

    def _log_filtered_result(self, item, reason):
        url = getattr(item, 'url', None)
        title = getattr(item, 'title', '')
        logger.info(f"Filtered out result: URL='{url}' Title='{title}' | Reason: {reason}")

    def __init__(self, research_mode: str = "comprehensive", model_preset: Optional[str] = None, progress_callback: Optional[Any] = None):
        self.search_results: List[RawSearchResultItem] = []
        self.query_counts = {}
        self.error_counts = {}
        self.strategy_timings = {}
        self.search_iterations = 0
        self.source_timing: Dict[str, float] = {}
        # Quick wins: model preset knobs + progress callback + research trace holder
        self.model_preset = (model_preset or '').lower() if isinstance(model_preset, str) else None
        self.progress_callback = progress_callback
        self._trace: Dict[str, Any] = { 'plan': [], 'executions': [], 'citesource': {}, 'synthesis': {} }

        # Mode-specific settings
        self.research_mode = research_mode
        if self.research_mode == 'quick':
            logger.info("🚀 Initializing SimpleAutonomousResearchService in QUICK mode.")
            self.max_iterations = 5  # Limit to fewer strategies
            self.TARGET_RESULT_COUNT_FOR_BREAK = 15 # Stop after fewer results
            self.MCP_CALL_DELAY_SECONDS = 1.5 #Smaller delay
        elif self.research_mode == 'comprehensive': # comprehensive
            logger.info("🧠 Initializing SimpleAutonomousResearchService in COMPREHENSIVE mode.")
            self.max_iterations = 7 # Allow more strategies
            self.TARGET_RESULT_COUNT_FOR_BREAK = 25 # Aim for more results
            self.MCP_CALL_DELAY_SECONDS = 2 #Standard delay

        # Apply optional model preset tuning (adapter)
        if self.model_preset == 'fast':
            self.max_iterations = max(3, int(self.max_iterations * 0.7))
            self.TARGET_RESULT_COUNT_FOR_BREAK = max(10, int(self.TARGET_RESULT_COUNT_FOR_BREAK * 0.7))
            self.MCP_CALL_DELAY_SECONDS = max(1.0, self.MCP_CALL_DELAY_SECONDS * 0.7)
        elif self.model_preset == 'deep':
            self.max_iterations = int(self.max_iterations * 1.3)
            self.TARGET_RESULT_COUNT_FOR_BREAK = int(self.TARGET_RESULT_COUNT_FOR_BREAK * 1.3)
            # keep delay the same to avoid rate issues

    async def _emit(self, event: Dict[str, Any]):
        if self.progress_callback:
            try:
                await self.progress_callback(event)
            except Exception:
                pass

        # Service clients will be initialized in __aenter__
        self.session: Optional[aiohttp.ClientSession] = None
        self.pubmed_service: Optional[UnifiedPubMedService] = None
        self.lens_service: Optional[LensScholarService] = None
        self.europe_pmc_service: Optional[EuropePMCService] = None
        self.google_scholar_client: Optional[GoogleScholarClient] = None
        self.brave_client: Optional[BraveSearchClient] = None

    async def __aenter__(self):
        """Inicializa todos os clientes de serviço necessários."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=90),
            headers={'User-Agent': 'Clinical-Corvus-SimpleAutonomous/1.1'}
        )
        self.pubmed_service = UnifiedPubMedService(session=self.session)
        self.lens_service = LensScholarService()
        self.europe_pmc_service = EuropePMCService()
        self.google_scholar_client = GoogleScholarClient()
        self.brave_client = BraveSearchClient()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Fecha a sessão do cliente."""
        if self.session and not self.session.closed:
            await self.session.close()

    async def _analyze_and_generate_strategies(self, research_input: ResearchTaskInput) -> Optional[FormulatedSearchStrategyOutput]:
        """Analyzes the input and generates search strategies using BAML."""
        try:
            logger.info(f"Formulating search strategy for query: {research_input.user_original_query}")
            strategy_output = await b.FormulateDeepResearchStrategy(research_input)
            logger.info(f"BAML strategy formulation successful. Refined query: {strategy_output.refined_query_for_llm_synthesis if strategy_output else 'N/A'}")
            return strategy_output
        except Exception as e:
            logger.error(f"Error during BAML strategy formulation: {e}", exc_info=True)
            return None

    def _convert_mcp_dict_to_baml_results(self, mcp_results: List[Dict[str, Any]]) -> List[RawSearchResultItem]:
        """Converts a list of MCP (Brave) search result dictionaries to BAML RawSearchResultItem objects."""
        baml_results = []
        if not mcp_results:
            return baml_results
        for mcp_item in mcp_results:
            try:
                # Assuming convert_single_brave_item_to_baml handles individual item conversion and returns RawSearchResultItem
                converted_item = convert_single_brave_item_to_baml(mcp_item)
                if converted_item: # convert_single_brave_item_to_baml returns Optional[RawSearchResultItem]
                    baml_results.append(converted_item)
            except Exception as e:
                logger.warning(f"Failed to convert MCP item to BAML: {mcp_item.get('url', 'N/A')}. Error: {e}", exc_info=True)
        return baml_results

    def _create_error_result(self, research_input: ResearchTaskInput, error_msg: str, search_duration_seconds: float = 0.0, formulated_strategy: Optional[FormulatedSearchStrategyOutput] = None) -> SynthesizedResearchOutput:
        """Creates a structured error result for SynthesizedResearchOutput, ensuring Pydantic validation passes."""
        logger.error(f"Creating error result for query '{research_input.user_original_query if research_input else 'N/A'}': {error_msg}")
        
        # Use calculate_research_metrics to create default/error metrics
        # Ensure calculate_research_metrics is robust to empty/None inputs
        # Ensure all fields expected by ResearchMetrics are provided or handled if optional in calculate_research_metrics
        quality_filters_applied_val = research_input.quality_filters_applied if research_input and hasattr(research_input, 'quality_filters_applied') else []
        date_range_searched_val = research_input.date_range_searched if research_input and hasattr(research_input, 'date_range_searched') else None
        language_filters_applied_val = research_input.language_filters_applied if research_input and hasattr(research_input, 'language_filters_applied') else []

        error_metrics = calculate_research_metrics(
            search_results=[], # No results in case of error
            search_duration=search_duration_seconds,
            cite_source_report=None, # No CiteSource report in case of error
            formulated_strategy=formulated_strategy,
            quality_filters_applied=quality_filters_applied_val,
            date_range_searched=date_range_searched_val,
            language_filters_applied=language_filters_applied_val
        )

        return SynthesizedResearchOutput(
            original_query=research_input.user_original_query if research_input else "Query not available",
            executive_summary=f"An error occurred during the research process: {error_msg}",
            detailed_results="No detailed results available due to an error.",
            key_findings_by_theme=[{
                "theme_name": "Error",
                "key_findings": [f"The research could not be completed: {error_msg}"],
                "strength_of_evidence": "N/A",
                "supporting_studies_count": 0
            }],
            evidence_quality_assessment="Not applicable due to error.",
            clinical_implications=["Not applicable due to error."],
            research_gaps_identified=["Not applicable due to error."],
            relevant_references=[],
            search_strategy_used="Research process interrupted by error.",
            limitations=[f"The research process was halted due to an internal error: {error_msg}"],
            research_metrics=error_metrics,
            professional_detailed_reasoning_cot=f"Error: {error_msg}. No professional reasoning could be generated.", # Ensure this is a string
            llm_token_usage=None,
            llm_model_name=None,
            search_duration_seconds=search_duration_seconds,
            # Ensure all other optional fields are either None or a valid default if they became mandatory
            raw_search_results_for_references=None,
            synthesis_model_name=None,
            synthesis_prompt_tokens=None,
            synthesis_completion_tokens=None,
            synthesis_total_tokens=None,
            strategy_generation_model_name=None,
            strategy_generation_prompt_tokens=None,
            strategy_generation_completion_tokens=None,
            strategy_generation_total_tokens=None,
            final_search_query_generated_by_llm=None,
            final_synthesis_query_generated_by_llm=None,
            search_queries_generated_by_llm=None
        )

    async def _try_mcp_search(self, query: str, max_results: int = 15):
        """
        Fallback MCP search using Brave Web API. Appends valid results to self.search_results.
        """
        logger.info(f"[MCP Fallback] Starting MCP web search for query: {query}")
        try:
            # Call the async_brave_web_search client (already imported)
            brave_response = await async_brave_web_search(query=query, count=max_results)
            if not brave_response or "web" not in brave_response or not brave_response["web"].get("results"):
                logger.info(f"[MCP Fallback] No web results found from Brave Search for query: {query}")
                return
            raw_results = brave_response["web"]["results"]
            # Convert to RawSearchResultItem using the helper
            baml_results = self._convert_mcp_dict_to_baml_results(raw_results)
            logger.info(f"[MCP Fallback] Converted {len(baml_results)} MCP results to BAML format.")
            # Filter low-quality sources
            filtered_results = self._filter_low_quality_sources(baml_results)
            logger.info(f"[MCP Fallback] {len(filtered_results)} results after filtering low-quality sources.")
            self.search_results.extend(filtered_results)
        except Exception as e:
            logger.error(f"[MCP Fallback] Error during MCP search: {e}", exc_info=True)
        
    async def _translate_query_to_english(self, query: str) -> str:
        """
        Translates a query to English using BAML, with fallback to DeepL if configured,
        and ultimately to the original query if all else fails.
        """
        if not query or not query.strip():
            logger.debug("Query is empty, no translation needed.")
            return "" # Return empty if input is empty

        original_query_for_log = query[:100] # For cleaner logs
        logger.debug(f"Attempting to translate to English: '{original_query_for_log}...'" )

        # Attempt DeepL translation first if API key is configured
        settings = get_settings()
        if settings.deepl_api_key:
            try:
                translated_query_deepl = await translate(query, target_lang="EN")
                if translated_query_deepl and translated_query_deepl.strip():
                    logger.info(f"Query translated to English (DeepL): '{translated_query_deepl}' from '{original_query_for_log}...'" )
                    return translated_query_deepl
                else:
                    logger.warning(f"DeepL translation returned empty for '{original_query_for_log}...'. Trying BAML.")
            except Exception as e_deepl:
                logger.warning(f"DeepL translation failed for '{original_query_for_log}...': {e_deepl}. Trying BAML.", exc_info=False)

        # Fallback to BAML translation
        try:
            baml_translation_output = await b.TranslateToEnglish(query) # Assumed BAML function and input structure
            
            translated_query_baml = None
            if isinstance(baml_translation_output, str) and baml_translation_output.strip(): # If BAML returns a direct string
                translated_query_baml = baml_translation_output
            else: # Try common attribute names if it's an object
                translated_query_baml = getattr(baml_translation_output, 'translated_text', None)
                if not translated_query_baml:
                    translated_query_baml = getattr(baml_translation_output, 'translation', None)
            
            if translated_query_baml and translated_query_baml.strip():
                logger.info(f"Query translated to English (BAML): '{translated_query_baml}' from '{original_query_for_log}...'" )
                return translated_query_baml
            else:
                logger.warning(f"BAML translation to English returned empty or failed for '{original_query_for_log}...'. Using original query.")
                return query
        except Exception as e_baml:
            logger.error(f"Error during BAML translation to English for query '{original_query_for_log}...': {e_baml}. Using original query.", exc_info=True)
            return query

    def _expand_abbreviations(self, query: str) -> str:
        """
        Expande abreviações médicas na query usando o dicionário.
        """
        expanded_query = query  # Salvar a query original para comparação

        # Ordenar as chaves pela mais longa para evitar substituições parciais (ex: "AVC" vs "AVCI")
        # Adicionar word boundaries (\b) para garantir que apenas palavras completas sejam substituídas
        sorted_keys = sorted(PORTUGUESE_MEDICAL_ABBREVIATIONS.keys(), key=len, reverse=True)

        for abbrev in sorted_keys:
            # Usar regex para substituir a abreviação como uma palavra inteira, ignorando o caso
            # A chave pode conter caracteres que precisam ser escapados para regex
            pattern = r'\b' + re.escape(abbrev) + r'\b'

            # A expansão pode conter referências de grupo se tiver barras invertidas, então as escapamos
            # Corrected escaping for replacement content in re.sub
            expansion = PORTUGUESE_MEDICAL_ABBREVIATIONS[abbrev].replace('\\', r'\\\\')

            # Formatar a expansão para incluir a abreviação original
            replacement = f"{expansion} ({abbrev})"

            expanded_query = re.sub(pattern, replacement, expanded_query, flags=re.IGNORECASE)

        if expanded_query != query:
            logger.info(f"Query com abreviações expandidas: {expanded_query}")
        else:
            logger.info("Nenhuma abreviação médica encontrada para expansão na query.")

        return expanded_query

    def _expand_term_with_synonyms(self, term: str) -> str:
        """
        Expande um termo de busca com seus sinônimos do dicionário.
        Retorna uma string formatada para a query do PubMed (ex: "(termo OR sinonimo1 OR sinonimo2)")
        """
        if not term:
            return ""

        term_lower = term.lower().strip()
        synonyms = self.medical_synonym_dictionary.get(term_lower, [])

        original_term_formatted = f'"{term.strip()}"' if ' ' in term.strip() else term.strip()
        all_terms = {original_term_formatted}  

        for syn in synonyms:
            formatted_syn = f'"{syn}"' if ' ' in syn else syn
            all_terms.add(formatted_syn)

        # Convert set to list for joining. The order might change but for OR it's fine.
        all_terms_list = list(all_terms)

        # Junta com OR para a query do PubMed
        if len(all_terms_list) > 1:
            expanded_query_part = f"({ ' OR '.join(all_terms_list) })"
            logger.info(f"Termo '{term}' expandido para: {expanded_query_part}")
            return expanded_query_part
        elif all_terms_list:  # Handles the case of a single term (original term or one synonym)
            return all_terms_list[0]
        return ""  # Fallback if term was empty or somehow resulted in no terms

    def _conditionally_add_pubmed_filters(self, query: str) -> str:
        """
        Conditionally adds 'humans[MeSH]' and 'english[lang]' filters to a PubMed query
        if they are not already present. It checks for various forms of these filters.
        """
        original_query = query
        # Normalize query to lowercase for case-insensitive checking
        lower_query = query.lower()

        # Check for 'humans' filter (handles [MeSH], [mesh], [MeSH Major Topic], etc.)
        # This regex looks for 'humans' followed by any bracketed tag
        if not re.search(r'humans\s*\[[^\]]+\]', lower_query):
            query += " AND humans[MeSH]"

        # Check for language filter (handles [lang], [language], etc.)
        if not re.search(r'english\s*\[[^\]]+\]', lower_query) and 'lang:eng' not in lower_query:
            query += " AND english[lang]"

        if query != original_query:
            logger.info(f"Query after conditionally adding filters: {query}")
        else:
            logger.info("Query already contained necessary filters. No changes made.")

        return query

    async def _execute_tiered_pubmed_search(self, research_input: ResearchTaskInput, max_results: int) -> List[RawSearchResultItem]:
        pico = research_input.pico_question
        if not (
            pico and
            pico.patient and isinstance(pico.patient, str) and pico.patient.strip() and
            pico.intervention and isinstance(pico.intervention, str) and pico.intervention.strip()
        ):
            logger.warning(
                "Tiered PubMed search requires PICO with non-empty Patient and Intervention strings. Aborting. "
                f"Received PICO: Patient='{pico.patient if pico else None}', Intervention='{pico.intervention if pico else None}'"
            )
            return []

        # Translate the essential PICO elements (Patient and Intervention) to English
        logger.debug(f"PICO Patient (original): {pico.patient}")
        p_translated = await self._translate_query_to_english(pico.patient)
        logger.debug(f"PICO Patient (translated): {p_translated}")

        logger.debug(f"PICO Intervention (original): {pico.intervention}")
        i_translated = await self._translate_query_to_english(pico.intervention)
        logger.debug(f"PICO Intervention (translated): {i_translated}")
        
        # Construct a simple P+I query for the fallback
        pico_query = f'("{p_translated}") AND ("{i_translated}")'
        logger.info(f"PubMed (Tier 3 - PICO): Constructed simplified P+I query: {pico_query}")
        
        simplified_pico_query = await self._simplify_query_for_pubmed(pico_query, query_origin="PICO-based query")
        logger.info(f"PubMed (Tier 3 - PICO): Searching with simplified PICO query: {simplified_pico_query}")
        
        if simplified_pico_query and simplified_pico_query.strip():
            final_pico_query = self._conditionally_add_pubmed_filters(simplified_pico_query)
            logger.info(f"PICO PubMed (Tier 3): Constructed final PICO query: {final_pico_query}")
            await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS) # Tactical delay
            pico_results = await self.pubmed_service.search_unified(query=final_pico_query, max_results=max_results)
            if pico_results:
                logger.info(f"PICO PubMed (Tier 3) search successful with {len(pico_results)} results.")
                return pico_results
            else:
                logger.warning("PICO PubMed (Tier 3) search with simplified query yielded no results.")
        else:
            logger.warning("PICO PubMed (Tier 3): Simplified PICO query was empty or whitespace, or resulted in no core terms after processing.")
            return []

    async def _simplify_query_for_pubmed(self, complex_query: str, query_origin: str = "AI strategy") -> str:
        """
        Simplifies a complex PubMed query to its key concepts using BAML.
        """
        logger.info(f"Simplifying PubMed query from {query_origin}: '{complex_query[:100]}...'" )
        try:
            simplified_output = await b.ExtractPubMedKeywords(complex_query)
            simplified_query = simplified_output.simplified_query
            if simplified_query:
                logger.info(f"Query simplified to: '{simplified_query}'")
                return simplified_query
            else:
                logger.warning("BAML returned an empty simplified query. Using the original complex query.")
                return complex_query
        except Exception as e:
            logger.error(f"Failed to simplify PubMed query with BAML: {e}. Using the original complex query.", exc_info=True)
            return complex_query

    async def _execute_search_strategy(self, strategy_item: Dict[str, Any], research_input: ResearchTaskInput) -> List[RawSearchResultItem]:
        query_string = strategy_item.get("query")
        source_service_name = strategy_item.get("source_service")
        description = strategy_item.get("description", f"Executing strategy for {source_service_name}")
        if self.research_mode == "quick":
            max_results = strategy_item.get("max_results", 15)
        else:
            max_results = strategy_item.get("max_results", 25)

        logger.info(f"Executing search strategy: {description} with query '{query_string[:100]}' for source '{source_service_name}'")
        
        start_time_strategy = time.monotonic()
        baml_results: List[RawSearchResultItem] = []
        raw_items_count = 0

        try:
            self.query_counts[source_service_name] = self.query_counts.get(source_service_name, 0) + 1
            
            if source_service_name == "pubmed":
                if not self.pubmed_service: raise ConnectionError("PubMed service not initialized.")
                pubmed_raw_results = []
                # Use the max_results value directly without a hardcoded cap
                final_target_max_results = max_results
                pmid_set = set()

                # Tier 1: Broad PICO-based search (if available)
                pico = research_input.pico_question
                if pico and pico.patient and pico.intervention:
                    logger.info("PubMed Strategy: Attempting Broad PICO Search (P only, I only, then P AND I with filters)")
                    # P only
                    p_translated = await self._translate_query_to_english(pico.patient)
                    p_simplified = await self._simplify_query_for_pubmed(p_translated, "PICO Patient (Broad)")
                    if p_simplified:
                        results_p = await self.pubmed_service.search_unified(query=p_simplified, max_results=max_results // 2)
                        if results_p:
                            for r in results_p:
                                if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                    pubmed_raw_results.append(r)
                                    pmid_set.add(r.pmid)
                    # I only
                    i_translated = await self._translate_query_to_english(pico.intervention)
                    i_simplified = await self._simplify_query_for_pubmed(i_translated, "PICO Intervention (Broad)")
                    if i_simplified:
                        results_i = await self.pubmed_service.search_unified(query=i_simplified, max_results=max_results // 2)
                        if results_i:
                            for r in results_i:
                                if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                    pubmed_raw_results.append(r)
                                    pmid_set.add(r.pmid)
                    # If not enough, try P AND I with filters
                    if len(pubmed_raw_results) < final_target_max_results:
                        pi_query_str = f"({p_simplified}) AND ({i_simplified})"
                        pi_query_filtered = self._conditionally_add_pubmed_filters(pi_query_str)
                        results_pi = await self.pubmed_service.search_unified(query=pi_query_filtered, max_results=final_target_max_results)
                        if results_pi:
                            for r in results_pi:
                                if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                    pubmed_raw_results.append(r)
                                    pmid_set.add(r.pmid)

                # Tier 2: AI Strategy Query (if not enough from PICO)
                if len(pubmed_raw_results) < final_target_max_results:
                    ai_query_orig = strategy_item.get("query")
                    ai_query_english = await self._translate_query_to_english(ai_query_orig)
                    ai_query_simplified = await self._simplify_query_for_pubmed(ai_query_english, "AI Strategy Query")
                    if ai_query_simplified:
                        results_ai_broad = await self.pubmed_service.search_unified(query=ai_query_simplified, max_results=max_results)
                        if results_ai_broad:
                            for r in results_ai_broad:
                                if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                    pubmed_raw_results.append(r)
                                    pmid_set.add(r.pmid)
                        # If still not enough, try with filters
                        if len(pubmed_raw_results) < final_target_max_results:
                            ai_query_filtered = self._conditionally_add_pubmed_filters(ai_query_simplified)
                            results_ai_filtered = await self.pubmed_service.search_unified(query=ai_query_filtered, max_results=final_target_max_results)
                            if results_ai_filtered:
                                for r in results_ai_filtered:
                                    if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                        pubmed_raw_results.append(r)
                                        pmid_set.add(r.pmid)

                # Tier 3: User's Original Query (if still not enough)
                if len(pubmed_raw_results) < final_target_max_results:
                    user_query_orig = research_input.user_original_query
                    user_query_english = await self._translate_query_to_english(user_query_orig)
                    user_query_simplified = await self._simplify_query_for_pubmed(user_query_english, "User Original Query")
                    if user_query_simplified:
                        user_query_filtered = self._conditionally_add_pubmed_filters(user_query_simplified)
                        results_user = await self.pubmed_service.search_unified(query=user_query_filtered, max_results=final_target_max_results)
                        if results_user:
                            for r in results_user:
                                if getattr(r, 'pmid', None) and r.pmid not in pmid_set:
                                    pubmed_raw_results.append(r)
                                    pmid_set.add(r.pmid)

                # Cap results and sort by final_relevance_score if available
                pubmed_raw_results = sorted(pubmed_raw_results, key=lambda x: getattr(x, 'final_relevance_score', 0.0), reverse=True)
                pubmed_raw_results = pubmed_raw_results[:final_target_max_results]

                raw_items_count = len(pubmed_raw_results)
                if pubmed_raw_results:
                    logger.info(f"PubMed multi-tier search found {raw_items_count} results. Converting to BAML format.")
                    for item in pubmed_raw_results:
                        try:
                            converted_item = convert_unified_to_baml_search_result(item)
                            if converted_item:
                                baml_results.append(converted_item)
                            else:
                                pmid_for_log = getattr(item, 'pmid', 'PMID_UNAVAILABLE_IN_ITEM')
                                logger.warning(f"PubMed item (PMID: {pmid_for_log}) conversion returned None, skipping this item.")
                        except Exception as e:
                            pmid_for_log = getattr(item, 'pmid', 'PMID_UNAVAILABLE_IN_ITEM')
                            logger.error(f"Error during top-level conversion of PubMed item (PMID: {pmid_for_log}) to BAML: {e}", exc_info=True)
                else:
                    logger.warning("Strategy for 'pubmed' yielded no results or no convertible results after all tiers.")
            
            elif source_service_name == "lens":
                if not self.lens_service: raise ConnectionError("Lens service not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Lens Scholar call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                lens_raw_results = await self.lens_service.search_articles(query=query_string, size=max_results)
                raw_items_count = len(lens_raw_results) if lens_raw_results else 0
                if lens_raw_results:
                    for item_pydantic in lens_raw_results:
                        if isinstance(item_pydantic, RawSearchResultItemPydantic):
                            baml_results.append(self._convert_pydantic_to_baml_search_result(item_pydantic))
                        elif isinstance(item_pydantic, RawSearchResultItem):
                            baml_results.append(item_pydantic)
                        else:
                            logger.warning(f"Lens result item type {type(item_pydantic)} not directly convertible. Skipping.")

            elif source_service_name == "europe_pmc":
                if not self.europe_pmc_service: raise ConnectionError("EuropePMC service not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before EuropePMC call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                europe_pmc_raw_results = await self.europe_pmc_service.search_articles(query=query_string, page_size=max_results)
                raw_items_count = len(europe_pmc_raw_results) if europe_pmc_raw_results else 0
                if europe_pmc_raw_results:
                    for item_pydantic in europe_pmc_raw_results:
                        if isinstance(item_pydantic, RawSearchResultItemPydantic):
                            baml_results.append(self._convert_pydantic_to_baml_search_result(item_pydantic))
                        elif isinstance(item_pydantic, RawSearchResultItem):
                            baml_results.append(item_pydantic)
                        else:
                            logger.warning(f"EuropePMC result item type {type(item_pydantic)} not directly convertible. Skipping.")

            elif source_service_name == "brave":
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Brave Search call (strategy item).")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                brave_api_response = await async_brave_web_search(query=query_string, count=max_results, search_lang="en")
                if brave_api_response and "web" in brave_api_response and "results" in brave_api_response["web"]:
                    brave_raw_results = brave_api_response["web"]["results"]
                    raw_items_count = len(brave_raw_results)
                    baml_results.extend(self._convert_mcp_dict_to_baml_results(brave_raw_results))

            elif source_service_name == "guideline":
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Guideline lookup call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                guideline_raw_results = await async_lookup_guidelines(query=query_string, count=max_results)
                if guideline_raw_results:
                    raw_items_count = len(guideline_raw_results)
                    baml_results.extend(self._convert_mcp_dict_to_baml_results(guideline_raw_results))
            
            elif source_service_name == "google_scholar":
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Google Scholar call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                from clients.google_scholar_client import search_google_scholar_enhanced
                google_scholar_response = await search_google_scholar_enhanced(query=query_string, max_results=max_results)
                google_scholar_raw_results = google_scholar_response.publications if google_scholar_response else []
                raw_items_count = len(google_scholar_raw_results) if google_scholar_raw_results else 0
                if google_scholar_raw_results:
                    for item in google_scholar_raw_results:
                        baml_results.append(RawSearchResultItem(
                            source=ResearchSourceType.ACADEMIC_GOOGLE_SCHOLAR,
                            url=item.get('link'),
                            title=item.get('title'),
                            snippet_or_abstract=item.get('snippet'),
                            publication_date=item.get('publication_info', {}).get('year'),
                            authors=[author['name'] for author in item.get('authors', []) if 'name' in author],
                            journal=item.get('publication_info', {}).get('journal'),
                            citation_count=item.get('inline_links', {}).get('cited_by', {}).get('total')
                        ))

            elif source_service_name == "cochrane":
                if not self.brave_client: raise ConnectionError("Brave client not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Cochrane Library call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                cochrane_response = await search_cochrane_library(query=query_string, count=max_results, client=self.brave_client)
                raw_items_count = len(cochrane_response.results) if cochrane_response and cochrane_response.results else 0
                if cochrane_response and cochrane_response.results:
                    logger.info(f"Cochrane search found {raw_items_count} results. Converting to BAML format.")
                    for item in cochrane_response.results:
                        try:
                            converted_item = convert_brave_to_baml_search_result(item, query=query_string)
                            if converted_item:
                                baml_results.append(converted_item)
                        except Exception as e:
                            logger.error(f"Error converting Cochrane result to BAML: {e}", exc_info=True)
                else:
                    logger.warning("Strategy for 'cochrane' yielded no results.")

            elif source_service_name == "ncbi_sources":
                if not self.brave_client: raise ConnectionError("Brave client not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before NCBI Sources call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                ncbi_response = await search_ncbi_sources(query=query_string, count=max_results, client=self.brave_client)
                raw_items_count = len(ncbi_response.results) if ncbi_response and ncbi_response.results else 0
                if ncbi_response and ncbi_response.results:
                    logger.info(f"NCBI Sources search found {raw_items_count} results. Converting to BAML format.")
                    for item in ncbi_response.results:
                        try:
                            converted_item = convert_brave_to_baml_search_result(item, query=query_string)
                            if converted_item:
                                baml_results.append(converted_item)
                        except Exception as e:
                            logger.error(f"Error converting NCBI result to BAML: {e}", exc_info=True)
                else:
                    logger.warning("Strategy for 'ncbi_sources' yielded no results.")

            elif source_service_name == "elite_journals":
                if not self.brave_client: raise ConnectionError("Brave client not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Elite Journals call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                elite_response = await search_elite_journals(query=query_string, count=max_results, client=self.brave_client)
                raw_items_count = len(elite_response.results) if elite_response and elite_response.results else 0
                if elite_response and elite_response.results:
                    logger.info(f"Elite Journals search found {raw_items_count} results. Converting to BAML format.")
                    for item in elite_response.results:
                        try:
                            converted_item = convert_brave_to_baml_search_result(item, query=query_string)
                            if converted_item:
                                baml_results.append(converted_item)
                        except Exception as e:
                            logger.error(f"Error converting Elite Journal result to BAML: {e}", exc_info=True)
                else:
                    logger.warning("Strategy for 'elite_journals' yielded no results.")

            elif source_service_name == "comprehensive_academic":
                if not self.brave_client: raise ConnectionError("Brave client not initialized.")
                logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before Comprehensive Academic call.")
                await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                academic_response = await search_comprehensive_academic(query=query_string, max_total_results=max_results)
                raw_items_count = len(academic_response.results) if academic_response and academic_response.results else 0
                if academic_response and academic_response.results:
                    logger.info(f"Comprehensive Academic search found {raw_items_count} results. Converting to BAML format.")
                    for item in academic_response.results:
                        try:
                            converted_item = convert_brave_to_baml_search_result(item, query=query_string)
                            if converted_item:
                                baml_results.append(converted_item)
                        except Exception as e:
                            logger.error(f"Error converting Comprehensive Academic result to BAML: {e}", exc_info=True)
                else:
                    logger.warning("Strategy for 'comprehensive_academic' yielded no results.")

            else:
                logger.warning(f"Unknown source_service_name: {source_service_name} in _execute_search_strategy")
                self.error_counts[source_service_name] = self.error_counts.get(source_service_name, 0) + 1

            if baml_results:
                logger.info(f"Strategy for '{source_service_name}' fetched {raw_items_count} raw items, converted to {len(baml_results)} BAML items.")
            else:
                logger.info(f"Strategy for '{source_service_name}' yielded no results or no convertible results.")

        except Exception as e:
            logger.error(f"Error executing search strategy for {source_service_name}: {e}", exc_info=True)
            self.error_counts[source_service_name] = self.error_counts.get(source_service_name, 0) + 1

        end_time_strategy = time.monotonic()
        self.strategy_timings[description] = end_time_strategy - start_time_strategy

        return baml_results

    def _filter_by_trusted_domains(self, results: List[RawSearchResultItem]) -> List[RawSearchResultItem]:
        filtered_results = []
        if not self.TRUSTED_DOMAIN_WHITELIST:
            logger.warning("TRUSTED_DOMAIN_WHITELIST is empty. Skipping domain filtering.")
            return results
        
        logger.debug(f"Filtering {len(results)} results by TRUSTED_DOMAIN_WHITELIST ({len(self.TRUSTED_DOMAIN_WHITELIST)} domains).")
        for item in results:
            if not item.url:
                logger.debug(f"Item '{item.title}' has no URL, keeping it by default.")
                filtered_results.append(item)
                continue
            
            try:
                parsed_url = urlparse(item.url)
                domain = parsed_url.netloc.lower()
                # Remove 'www.' prefix if present
                original_domain_for_log = domain
                if domain.startswith('www.'):
                    domain = domain[4:]
                
                logger.debug(f"Checking URL: {item.url}, Original Netloc: '{original_domain_for_log}', Processed Domain: '{domain}'")
                if any(domain == trusted_domain or domain.endswith('.' + trusted_domain) for trusted_domain in self.TRUSTED_DOMAIN_WHITELIST):
                    logger.debug(f"Keeping item '{item.title}' (URL: {item.url}) - domain '{domain}' IS in whitelist.")
                    filtered_results.append(item)
                else:
                    logger.info(f"Filtering out item '{item.title}' (URL: {item.url}) - domain '{domain}' (from '{original_domain_for_log}') NOT in whitelist.")
            except Exception as e:
                logger.warning(f"Error parsing URL {item.url} for domain filtering: {e}. Keeping item by default.")
                filtered_results.append(item)
                
        logger.info(f"Domain filtering complete: {len(results)} initial -> {len(filtered_results)} final results.")
        return filtered_results

    async def conduct_autonomous_research(
        self, research_input: ResearchTaskInput, manual_strategies: Optional[List[Dict[str, Any]]] = None
    ) -> Any:  # TODO: Refine return type if possible
        formulated_strategy_output: Optional[FormulatedSearchStrategyOutput] = None
        synthesis: Optional[SynthesizedResearchOutput] = None
        start_time = time.time()

        # Initialize strategies and refined_synthesis_query before the try block
        strategies = []
        refined_synthesis_query = research_input.user_original_query

        try: # Main try block for the entire research process
            await self._emit({ 'type': 'start', 'query': research_input.user_original_query, 'mode': self.research_mode, 'preset': self.model_preset })
            try: # Inner try for strategy generation
                formulated_strategy_output = await self._analyze_and_generate_strategies(research_input)
            except Exception as e:
                logger.error(f"Error calling _analyze_and_generate_strategies: {e}", exc_info=True)
                # Proceed with no BAML strategies if generation fails

            if formulated_strategy_output:
                if formulated_strategy_output.search_parameters_list:
                    strategies_list_from_baml = formulated_strategy_output.search_parameters_list
                    
                    source_service_map = {
                        "PUBMED": "pubmed", "WEB_SEARCH_BRAVE": "brave",
                        "GUIDELINE_RESOURCE": "guideline", "COCHRANE": "cochrane",
                        "LENS_SCHOLAR": "lens", "EUROPE_PMC": "europe_pmc",
                        "ACADEMIC_GOOGLE_SCHOLAR": "google_scholar",
                        "ACADEMIC_NCBI": "ncbi_sources",
                        "ACADEMIC_ELITE_JOURNAL": "elite_journals",
                        "ACADEMIC_DATABASE_GENERAL": "comprehensive_academic"
                    }
                    for baml_strategy_param in strategies_list_from_baml:
                        # Ensure baml_strategy_param.source and baml_strategy_param.source.value are not None
                        if not baml_strategy_param.source or baml_strategy_param.source.value is None:
                            logger.warning(f"[Mapping] Invalid source in BAML strategy: {baml_strategy_param.model_dump_json(indent=2)}")
                            continue
                        orig_source_enum_val = str(baml_strategy_param.source.value).upper()
                        mapped_source_service = source_service_map.get(orig_source_enum_val)
                        if not mapped_source_service:
                            logger.warning(f"[Mapping] Unknown source: {baml_strategy_param.source} (value: {orig_source_enum_val}) in strategy: {baml_strategy_param.model_dump_json(indent=2)}")
                            continue
                        # Ignore Lens.org strategies for now
                        if mapped_source_service == "lens":
                            logger.info(f"Skipping Lens strategy as per current requirements: {baml_strategy_param.query_string}")
                            continue
                        strategies.append({
                            "query": baml_strategy_param.query_string,
                            "source_service": mapped_source_service,
                            "description": baml_strategy_param.rationale or f"Strategy for {orig_source_enum_val}",
                        })
                if formulated_strategy_output.refined_query_for_llm_synthesis:
                    refined_synthesis_query = formulated_strategy_output.refined_query_for_llm_synthesis
            else:
                logger.warning("Formulated strategy output was None or failed. Using fallback query and no BAML-defined search strategies.")

            # Merge optional user-specified strategies (user overrides first)
            if manual_strategies:
                try:
                    normalized_manual = []
                    for s in manual_strategies:
                        q = s.get('query') or s.get('query_string')
                        ss = s.get('source_service')
                        if not q or not ss:
                            continue
                        normalized_manual.append({
                            'query': q,
                            'source_service': ss,
                            'description': s.get('description', f"User strategy for {ss}")[:200],
                            'max_results': s.get('max_results')
                        })
                    if normalized_manual:
                        strategies = normalized_manual + strategies
                except Exception:
                    pass

            # Emit plan
            try:
                await self._emit({
                    'type': 'plan',
                    'strategies': [ { 'source': s.get('source_service'), 'query': s.get('query'), 'desc': s.get('description'), 'max_results': s.get('max_results') } for s in strategies ],
                    'refined_query': refined_synthesis_query
                })
            except Exception:
                pass
            # Save into trace
            try:
                self._trace['plan'] = [ { 'source': s.get('source_service'), 'query': s.get('query'), 'desc': s.get('description'), 'max_results': s.get('max_results') } for s in strategies ]
            except Exception:
                pass

            # Execute strategies
            # Limit strategies based on max_iterations set by research_mode
            if len(strategies) > self.max_iterations:
                logger.info(f"Research mode '{self.research_mode}': Limiting strategies from {len(strategies)} to {self.max_iterations}.")
                strategies = strategies[:self.max_iterations]

            for i, strategy_item in enumerate(strategies):
                if i > 0:
                    logger.info(f"Waiting for {self.MCP_CALL_DELAY_SECONDS}s before next strategy: {strategy_item.get('description', 'N/A')}")
                    await asyncio.sleep(self.MCP_CALL_DELAY_SECONDS)
                
                await self._emit({ 'type': 'strategy_start', 'source': strategy_item.get('source_service'), 'query': strategy_item.get('query'), 'desc': strategy_item.get('description') })
                strategy_specific_baml_results: List[RawSearchResultItem] = await self._execute_search_strategy(strategy_item, research_input)
                
                if strategy_specific_baml_results:
                    logger.info(f"Strategy '{strategy_item.get('description', 'N/A')}' ({strategy_item.get('source_service')}) yielded {len(strategy_specific_baml_results)} items.")
                    self.search_results.extend(strategy_specific_baml_results)
                    logger.info(f"Total accumulated BAML results: {len(self.search_results)}")
                else:
                    logger.info(f"Strategy '{strategy_item.get('description', 'N/A')}' ({strategy_item.get('source_service')}) yielded no items.")
                await self._emit({ 'type': 'strategy_end', 'source': strategy_item.get('source_service'), 'found': len(strategy_specific_baml_results) if strategy_specific_baml_results else 0, 'total_accumulated': len(self.search_results) })
                try:
                    self._trace['executions'].append({ 'source': strategy_item.get('source_service'), 'query': strategy_item.get('query'), 'found': len(strategy_specific_baml_results) if strategy_specific_baml_results else 0 })
                except Exception:
                    pass
                
                self.search_iterations += 1
                if len(self.search_results) >= self.TARGET_RESULT_COUNT_FOR_BREAK:
                    logger.info(f"Sufficient results ({len(self.search_results)}) after {self.search_iterations} BAML iterations. Stopping BAML strategies.")
                    break
            
            # Fallback MCP search if still insufficient
            if len(self.search_results) < self.TARGET_RESULT_COUNT_FOR_BREAK:
                logger.info(f"Insufficient results ({len(self.search_results)}) after BAML. Attempting complementary MCP search.")
                await self._try_mcp_search(research_input.user_original_query) # Assumes _try_mcp_search appends to self.search_results

            # Process results if any were found
            if self.search_results:
                logger.info(f"Processing {len(self.search_results)} accumulated results with CiteSource...")
                try:
                    await self._emit({ 'type': 'citesource_start', 'count': len(self.search_results) })
                except Exception:
                    pass
                # Ensure process_with_cite_source and other critical functions are defined and imported
                # from services.cite_source_service import process_with_cite_source (example)
                deduplicated_results, local_cite_source_report = await process_with_cite_source(
                    results=self.search_results,
                    query=research_input.user_original_query,
                    source_timing=self.source_timing
                )
                cite_source_report_for_metrics = local_cite_source_report # Save for metrics

                logger.info(f"CiteSource: {len(self.search_results)} initial -> {len(deduplicated_results)} deduplicated (removed {local_cite_source_report.deduplication_result.removed_duplicates} duplicates)")
                try:
                    await self._emit({ 'type': 'citesource_done', 'initial': len(self.search_results), 'deduplicated': len(deduplicated_results), 'removed_duplicates': getattr(local_cite_source_report.deduplication_result, 'removed_duplicates', None) })
                except Exception:
                    pass
                try:
                    self._trace['citesource'] = {
                        'initial': len(self.search_results),
                        'deduplicated': len(deduplicated_results),
                        'removed_duplicates': getattr(local_cite_source_report.deduplication_result, 'removed_duplicates', None)
                    }
                except Exception:
                    pass

                trusted_results = self._filter_by_trusted_domains(deduplicated_results)
                if len(trusted_results) < len(deduplicated_results):
                    logger.info(f"Filtered by trusted domains: {len(deduplicated_results)} -> {len(trusted_results)} results.")
            
                final_results_for_synthesis = trusted_results

                if final_results_for_synthesis:
                    logger.info(f"Proceeding to synthesis with {len(final_results_for_synthesis)} trusted results.")
                    if local_cite_source_report and local_cite_source_report.quality_assessment:
                        quality = local_cite_source_report.quality_assessment
                        logger.info(f"CiteSource Quality: Overall {quality.overall_score:.2f} (Coverage: {quality.coverage_score:.2f}, Diversity: {quality.diversity_score:.2f}, Impact: {quality.impact_score:.2f})")
                    
                    # Calculate search duration BEFORE synthesis
                    end_time_search_processing = time.time()
                    search_duration_seconds = round(end_time_search_processing - start_time, 2)
                    logger.info(f"Total search and processing (including CiteSource) duration: {search_duration_seconds} seconds.")
                    try:
                        await self._emit({ 'type': 'synthesis_start', 'count': len(final_results_for_synthesis) })
                    except Exception:
                        pass

                    # Ensure synthesize_with_fallback is defined and imported
                    # from services.baml_service import synthesize_with_fallback (example)
                    # Optimization: Create a payload for synthesis with only essential fields to save tokens.
                    # We are removing the 'content' field as the 'snippet' (abstract) is sufficient for synthesis.
                    synthesis_payload = []
                    for item in final_results_for_synthesis:
                        item_dict = item.model_dump()
                        item_dict['content'] = None  # Remove the large content field
                        synthesis_payload.append(RawSearchResultItem(**item_dict))

                    logger.info(f"Optimized synthesis payload by removing full 'content' from {len(synthesis_payload)} items.")

                    synthesis = await synthesize_with_fallback(
                        original_query=refined_synthesis_query,
                        search_results=synthesis_payload, # Use the optimized payload
                        cite_source_report=local_cite_source_report, 
                        search_duration=search_duration_seconds,
                        formulated_strategy=formulated_strategy_output
                    )

                    # Ensure professional_detailed_reasoning_cot is not None to prevent Pydantic validation errors
                    if synthesis and hasattr(synthesis, 'professional_detailed_reasoning_cot') and synthesis.professional_detailed_reasoning_cot is None:
                        logger.warning("Synthesized output had 'professional_detailed_reasoning_cot' as None. Setting to default string.")
                        synthesis.professional_detailed_reasoning_cot = "Detailed professional reasoning could not be generated for this synthesis."
                    elif not hasattr(synthesis, 'professional_detailed_reasoning_cot') and synthesis is not None:
                        # This case is less likely if SynthesizedResearchOutput is correctly typed, but as a safeguard:
                        logger.warning("'professional_detailed_reasoning_cot' attribute missing from synthesis object. Attempting to set default.")
                        try:
                            # This assignment might fail if the object doesn't allow arbitrary attribute setting,
                            # but it's worth trying if the field is unexpectedly missing.
                            # A more robust solution would involve ensuring the Pydantic model always has this field.
                            setattr(synthesis, 'professional_detailed_reasoning_cot', "Detailed professional reasoning attribute was missing and has been defaulted.")
                        except Exception as e_attr: # Catch broader exceptions if setattr fails
                            logger.error(f"Failed to set default 'professional_detailed_reasoning_cot' on synthesis object due to: {e_attr}")
                    # KAE-lite grounding metrics
                    try:
                        grounding = self._compute_grounding_metrics(synthesis, final_results_for_synthesis)
                        if hasattr(synthesis, 'research_metrics') and synthesis.research_metrics is not None:
                            rm = synthesis.research_metrics
                            csm = getattr(rm, 'cite_source_metrics', None)
                            if csm and hasattr(csm, 'key_quality_insights') and isinstance(csm.key_quality_insights, list):
                                csm.key_quality_insights.append(
                                    f"Grounding: support {grounding.get('supported',0)}/{grounding.get('total',0)}, contradictions {grounding.get('contradictions',0)}, omissions {grounding.get('omissions',0)}"
                                )
                            if hasattr(rm, 'search_strategy_summary') and rm.search_strategy_summary:
                                rm.search_strategy_summary += f" Grounding: support {grounding.get('supported',0)}/{grounding.get('total',0)}, contradictions {grounding.get('contradictions',0)}, omissions {grounding.get('omissions',0)}."
                    except Exception as e_g:
                        logger.warning(f"KAE-lite grounding computation failed: {e_g}")
                    try:
                        preview = getattr(synthesis, 'executive_summary', '')
                        await self._emit({ 'type': 'synthesis_done', 'summary_preview': (preview[:200] if isinstance(preview, str) else ''), 'references': len(getattr(synthesis, 'relevant_references', []) or []) })
                    except Exception:
                        pass
                else: 
                    logger.info("No trusted results remained after filtering. Skipping synthesis and creating an empty/error result.")
                    synthesis = self._create_error_result(
                        research_input=research_input,
                        error_msg="Nenhum resultado confiável permaneceu após a filtragem. Tente uma consulta mais ampla ou verifique a lista de permissões de domínio.",
                        start_time=start_time,
                        formulated_strategy=formulated_strategy_output
                    )
            else: 
                logger.info("No results found after all search strategies. Skipping CiteSource and synthesis, creating an empty/error result.")
                synthesis = self._create_error_result(
                    research_input=research_input,
                    error_msg="Nenhuma informação pôde ser encontrada com base na consulta fornecida e nas fontes de dados disponíveis. Tente reformular sua consulta ou ampliar seu escopo.",
                    start_time=start_time,
                    formulated_strategy=formulated_strategy_output
                )

            if synthesis and not ("error" in getattr(synthesis, 'executive_summary', '').lower()):
                # Calculate the overall search duration from the start of this method
                overall_search_duration = time.time() - start_time

                # Ensure _create_default_research_metrics and log_research_metrics are defined/imported
                # from utils.logging_utils import log_research_metrics (example)
                final_metrics = calculate_research_metrics(
                    search_results=final_results_for_synthesis, 
                    search_duration=overall_search_duration,
                    cite_source_report=cite_source_report_for_metrics,
                    formulated_strategy=formulated_strategy_output
                )
                # Assign the comprehensive metrics object to the synthesis output
                synthesis.research_metrics = final_metrics
                # CRITICAL: Set the search_duration_seconds directly on the SynthesizedResearchOutput object
                synthesis.search_duration_seconds = overall_search_duration

                logger.info(f"Final research metrics calculated: {final_metrics}") 

            # Optional: persist research trace for reproducibility
            try:
                import os as _os, json as _json, datetime as _dt
                if _os.getenv('ENABLE_RESEARCH_TRACE', '').lower() in ('1','true','yes'):
                    trace_dir = _os.path.join(_os.path.dirname(__file__), '..', 'logs', 'research_traces')
                    trace_dir = _os.path.normpath(trace_dir)
                    _os.makedirs(trace_dir, exist_ok=True)
                    fname = _dt.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ') + '_trace.json'
                    trace_path = _os.path.join(trace_dir, fname)
                    # Build lightweight research tree
                    tree = self._build_research_tree(synthesis)
                    # Minimal trace + tree
                    trace_obj = {
                        'query': research_input.user_original_query,
                        'mode': self.research_mode,
                        'preset': self.model_preset,
                        'plan': self._trace.get('plan'),
                        'executions': self._trace.get('executions'),
                        'citesource': self._trace.get('citesource'),
                        'summary_preview': getattr(synthesis, 'executive_summary', '')[:300] if synthesis else '',
                        'research_tree': tree
                    }
                    with open(trace_path, 'w', encoding='utf-8') as f:
                        _json.dump(trace_obj, f, ensure_ascii=False, indent=2)
            except Exception:
                pass

            return synthesis # Return successful synthesis

        except Exception as e:  # Main except block
            logger.error(f"Fatal error during autonomous research: {e}", exc_info=True)
            error_message = f"An error occurred during the research process: {str(e)}"
            # Ensure research_input is available; if not, use a placeholder
            user_query = research_input.user_original_query if research_input and hasattr(research_input, 'user_original_query') else "Unknown query due to error"

            if not synthesis:  # If synthesis object was not created before the error
                synthesis = SynthesizedResearchOutput(
                    original_query=user_query,
                    executive_summary=f"Error: {error_message}",
                    detailed_results=f"Error: Could not generate detailed results due to: {str(e)}",
                    key_findings_by_theme=[],  # Empty list for array types
                    evidence_quality_assessment=f"Error: Assessment unavailable due to: {str(e)}",
                    clinical_implications=[f"Error: Implications unavailable due to: {str(e)}"], # List of strings
                    research_gaps_identified=[f"Error: Gaps unavailable due to: {str(e)}"], # List of strings
                    relevant_references=[], # Empty list for array types
                    search_strategy_used=f"Error: Strategy details unavailable due to: {str(e)}",
                    limitations=[f"The research process failed with an error: {str(e)}", "No results could be synthesized."], # List of strings
                    
                    # Optional fields can be omitted or set to None if the Pydantic model handles it
                    research_metrics=None, 
                    professional_detailed_reasoning_cot=None
                )
                
            # Populate research_metrics if the synthesis object has the attribute and it's None
            # This part might need adjustment based on how ResearchMetrics is structured and if it's truly optional or expected
            if hasattr(synthesis, 'research_metrics') and synthesis.research_metrics is None:
                current_duration = time.time() - start_time
                # Ensure research_input is not None before accessing its attributes for _create_default_research_metrics
                # Also, ensure _create_default_research_metrics can handle potentially None research_input
                synthesis.research_metrics = calculate_research_metrics(
                    search_results=[],
                    search_duration=current_duration,
                    cite_source_report=None,
                    formulated_strategy=formulated_strategy_output
                )
            # Get unique source services from the planned/attempted strategies
            sources_consulted_list = []
            seen_sources = set()
            for s_item in strategies:
                source_service = s_item.get('source_service')
                if source_service and source_service not in seen_sources:
                    sources_consulted_list.append(str(source_service)) # Ensure string representation
                    seen_sources.add(source_service)

        if hasattr(self, 'search_results') and self.search_results:
            # Fallback: if strategies list is not definitive, try to get from actual results
            seen_sources = set()
            for res_item in self.search_results:
                if hasattr(res_item, 'source') and res_item.source and res_item.source.name not in seen_sources:
                    sources_consulted_list.append(res_item.source.name)
                    seen_sources.add(res_item.source.name)

        metrics = calculate_research_metrics(
            search_results=[],
            search_duration=search_duration_seconds,
            cite_source_report=None,
            formulated_strategy=formulated_strategy
        )

        error_result = SynthesizedResearchOutput(
            original_query=getattr(research_input, 'user_original_query', 'N/A'),
            executive_summary="No summary available due to error.",
            detailed_results="No details available due to error.",
            key_findings_by_theme=[{
                "theme_name": "Error",
                "key_findings": [error_msg],
                "strength_of_evidence": "N/A",
                "supporting_studies_count": 0
            }],
            evidence_quality_assessment="No evidence quality assessment available due to error.",
            clinical_implications=["No clinical implications available due to error."],
            research_gaps_identified=["No research gaps identified due to error."],
            relevant_references=[],
            search_strategy_used="fallback_error",
            limitations=["The research process failed with an error. No results could be synthesized."],
            research_metrics=metrics,
            search_duration_seconds=search_duration_seconds,
            llm_token_usage=None, # No LLM synthesis occurred for these paths
            llm_model_name=None   # No LLM synthesis occurred for these paths
        )

    def _compute_grounding_metrics(self, synthesis: SynthesizedResearchOutput, final_results: List[RawSearchResultItem]) -> Dict[str, int]:
        """KAE-lite: naive grounding by checking if key findings appear in abstracts/snippets of cited results."""
        try:
            # Build corpus text from abstracts/snippets
            corpus = []
            for item in final_results or []:
                snip = getattr(item, 'snippet_or_abstract', None)
                if isinstance(snip, str) and snip.strip():
                    corpus.append(snip.lower())
            corpus_text = "\n".join(corpus)

            # Extract claims
            claims: List[str] = []
            kf = getattr(synthesis, 'key_findings_by_theme', []) or []
            for theme in kf:
                key_list = None
                if isinstance(theme, dict):
                    key_list = theme.get('key_findings') or []
                    if not key_list and theme.get('summary'):
                        key_list = [theme.get('summary')]
                else:
                    key_list = getattr(theme, 'key_findings', None) or []
                    if not key_list:
                        summary = getattr(theme, 'summary', None)
                        if isinstance(summary, str) and summary.strip():
                            key_list = [summary]
                for c in key_list or []:
                    if isinstance(c, str) and len(c.strip()) > 0:
                        claims.append(c.strip())

            total = len(claims)
            supported = 0
            contradictions = 0
            for claim in claims:
                tokens = [t for t in re.findall(r"[a-zA-Z]{4,}", claim.lower())]
                if not tokens:
                    continue
                match_count = sum(1 for t in tokens if t in corpus_text)
                if match_count >= 2:
                    supported += 1
            omissions = max(0, total - (supported + contradictions))
            return { 'total': total, 'supported': supported, 'contradictions': contradictions, 'omissions': omissions }
        except Exception:
            return { 'total': 0, 'supported': 0, 'contradictions': 0, 'omissions': 0 }

    def _extract_claims(self, synthesis: SynthesizedResearchOutput) -> List[str]:
        try:
            claims: List[str] = []
            kf = getattr(synthesis, 'key_findings_by_theme', []) or []
            for theme in kf:
                if isinstance(theme, dict):
                    arr = theme.get('key_findings') or []
                    if not arr and theme.get('summary'):
                        arr = [theme.get('summary')]
                else:
                    arr = getattr(theme, 'key_findings', None) or []
                    if not arr:
                        summary = getattr(theme, 'summary', None)
                        if isinstance(summary, str) and summary.strip():
                            arr = [summary]
                for c in arr or []:
                    if isinstance(c, str) and c.strip():
                        claims.append(c.strip())
            return claims
        except Exception:
            return []

    def _build_research_tree(self, synthesis: Optional[SynthesizedResearchOutput]) -> Dict[str, Any]:
        """Construct a lightweight research tree from the persisted trace and synthesis."""
        try:
            claims = self._extract_claims(synthesis) if synthesis else []
            node_plan = {
                'type': 'plan',
                'strategies': self._trace.get('plan') or []
            }
            node_search = {
                'type': 'search',
                'executions': self._trace.get('executions') or []
            }
            node_dedup = {
                'type': 'dedup',
                **(self._trace.get('citesource') or {})
            }
            # Add grounding metrics summary if available in cite_source_metrics
            grounding_summary = None
            try:
                rm = getattr(synthesis, 'research_metrics', None)
                if rm is not None:
                    csm = getattr(rm, 'cite_source_metrics', None)
                    if csm is not None and hasattr(csm, 'key_quality_insights'):
                        for msg in csm.key_quality_insights or []:
                            if isinstance(msg, str) and msg.lower().startswith('grounding:'):
                                grounding_summary = msg
                                break
            except Exception:
                pass
            node_synthesis = {
                'type': 'synthesis',
                'claims': claims,
                'grounding': grounding_summary
            }
            tree = {
                'schema_version': '1.0',
                'root': {
                    'type': 'query',
                    'children': [node_plan, node_search, node_dedup, node_synthesis]
                }
            }
            return tree
        except Exception:
            return {'schema_version': '1.0', 'root': {'type': 'query', 'children': []}}

async def conduct_simple_autonomous_research(research_input: ResearchTaskInput) -> SynthesizedResearchOutput:
    """
    Função principal que executa a pesquisa autônoma simplificada.
    Gerencia o ciclo de vida do serviço com um context manager.
    """
    async with SimpleAutonomousResearchService() as service:
        return await service.conduct_autonomous_research(research_input)
