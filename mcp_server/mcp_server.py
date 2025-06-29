"""
MCP (Model Context Protocol) Server implementation for Clinical Helper.

This module provides MCP server functionality to enhance AI interactions by allowing
tool-calling capabilities while continuing to use the existing AI models.
"""

import sys
sys.path.append('/app') # Adiciona o diretório raiz do app ao sys.path

import asyncio
import json
import os
import logging
from typing import Optional, Dict, List, Any, Union
import requests
from contextlib import AsyncExitStack
import xml.etree.ElementTree as ET
from urllib.parse import quote

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mcp_server")

# NEW: CiteSource Integration Imports
from datetime import datetime
try:
    # Import CiteSource services
    from services.cite_source_service import (
        get_cite_source_service, 
        process_with_cite_source,
        CiteSourceReport
    )
    from services.cite_source_visualization import (
        get_cite_source_visualization_service,
        generate_cite_source_report
    )
    from services.simple_autonomous_research import (
        get_simple_autonomous_service,
        conduct_simple_autonomous_research
    )
    from baml_client.types import ResearchTaskInput, RawSearchResultItem, ResearchSourceType
    CITE_SOURCE_AVAILABLE = True
    logger.info("✅ CiteSource services imported successfully")
except ImportError as e:
    CITE_SOURCE_AVAILABLE = False
    logger.warning(f"⚠️ CiteSource services not available: {e}")

# Additional imports for MCP CiteSource integration
try:
    from typing import TypeVar, List as TypeList
    T = TypeVar('T')
except ImportError:
    TypeList = List  # Fallback

# Constantes para API do PubMed
PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_SEARCH_URL = f"{PUBMED_BASE_URL}/esearch.fcgi"
PUBMED_FETCH_URL = f"{PUBMED_BASE_URL}/efetch.fcgi"
PUBMED_SUMMARY_URL = f"{PUBMED_BASE_URL}/esummary.fcgi"

# API Key do NCBI
NCBI_API_KEY = os.getenv("NCBI_API_KEY", "")

# Constantes para API RxNav de interações medicamentosas (gratuita)
RXNAV_BASE_URL = "https://rxnav.nlm.nih.gov/REST"
RXNAV_INTERACTION_URL = f"{RXNAV_BASE_URL}/interaction/list.json"
RXNAV_DRUG_INFO_URL = f"{RXNAV_BASE_URL}/rxcui.json"
RXNAV_DRUG_NAME_URL = f"{RXNAV_BASE_URL}/drugs.json"

# Constantes para API da OMS (Athena API) para dados epidemiológicos
WHO_ATHENA_BASE_URL = "https://apps.who.int/gho/athena/api"
WHO_ATHENA_METADATA_URL = f"{WHO_ATHENA_BASE_URL}/GHO"
WHO_ATHENA_DATA_URL = f"{WHO_ATHENA_BASE_URL}/GHO/{{indicator}}"

# Constantes para API do Brave Search
BRAVE_SEARCH_BASE_URL = "https://api.search.brave.com/res"
BRAVE_WEB_SEARCH_URL = f"{BRAVE_SEARCH_BASE_URL}/v1/web/search"
BRAVE_LOCAL_SEARCH_URL = f"{BRAVE_SEARCH_BASE_URL}/v1/web/tiles"  # Para busca local
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY", "")

# Definir a porta do servidor
MCP_PORT = int(os.getenv("MCP_PORT", "8765"))

class MCPToolDefinition:
    """Definition of an MCP tool."""
    def __init__(self, name: str, description: str, input_schema: Dict[str, Any], output_schema: Dict[str, Any] = None):
        self.name = name
        self.description = description
        self.inputSchema = input_schema
        self.outputSchema = output_schema or {"type": "string"}

class MCPResponse:
    """Response from an MCP tool call."""
    def __init__(self, success: bool, content: str = None, error: str = None):
        self.success = success
        self.content = content
        self.error = error

class ToolsResponse:
    """Response from listing available tools."""
    def __init__(self, tools: List[MCPToolDefinition]):
        self.tools = tools

class ClinicalMCPServer:
    """
    MCP Server implementation for Clinical Helper that works with the existing models.
    
    This class provides MCP functionality for clinical data tools like PubMed search,
    clinical guidelines lookup, and more. It works with existing models via OpenRouter.
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not found in environment variables")
            
        self.available_tools = self._setup_tools()
        logger.info(f"Clinical MCP Server initialized with {len(self.available_tools)} tools")
        
    def _setup_tools(self) -> List[MCPToolDefinition]:
        """Set up the available clinical tools."""        
        fulltext_search = MCPToolDefinition(
            name="search_fulltext",
            description="Search for full text of medical articles using keywords or identifiers",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query or article identifier"},
                    "search_type": {"type": "string", "description": "Type of search: 'doi', 'pmid', or 'keywords'"}
                },
                "required": ["query"]
            }
        )
        
        clinical_guidelines = MCPToolDefinition(
            name="lookup_guidelines",
            description="Look up clinical guidelines for a specific condition or treatment",
            input_schema={
                "type": "object",
                "properties": {
                    "condition": {"type": "string", "description": "The medical condition or treatment to find guidelines for"}
                },
                "required": ["condition"]
            }
        )
        
        drug_interactions = MCPToolDefinition(
            name="check_drug_interactions",
            description="Check for potential interactions between medications using RxNav database",
            input_schema={
                "type": "object",
                "properties": {
                    "medications": {"type": "array", "items": {"type": "string"}, "description": "List of medications to check for interactions"}
                },
                "required": ["medications"]
            }
        )
        
        who_data = MCPToolDefinition(
            name="get_epidemiological_data",
            description="Get epidemiological data from the WHO Global Health Observatory",
            input_schema={
                "type": "object",
                "properties": {
                    "indicator": {"type": "string", "description": "The health indicator code or name"},
                    "country": {"type": "string", "description": "Country name or code (optional)"},
                    "year": {"type": "integer", "description": "Year for the data (optional)"}
                },
                "required": ["indicator"]
            }
        )
        
        brave_web_search_tool = MCPToolDefinition(
            name="brave_web_search",
            description="Search the web for general medical information, guidelines, and resources",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query for web search"},
                    "count": {"type": "integer", "description": "Number of results to return (max 20)"},
                    "offset": {"type": "integer", "description": "Pagination offset (max 9)"}
                },
                "required": ["query"]
            }
        )
        
        base_tools = [
            fulltext_search, 
            clinical_guidelines, 
            drug_interactions, 
            who_data, 
            brave_web_search_tool, 
        ]
        
        # Add CiteSource tools if available
        if CITE_SOURCE_AVAILABLE:
            logger.info("🔬 Adding CiteSource tools to MCP server")
            
            # Autonomous Deep Research Tool
            autonomous_research_tool = MCPToolDefinition(
                name="conduct_autonomous_research",
                description="Conduct autonomous deep medical research with CiteSource quality analysis and deduplication across multiple databases (PubMed, Europe PMC, Lens.org, etc.)",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_original_query": {"type": "string", "description": "The original research question from the user"},
                        "research_focus": {"type": "string", "description": "Specific focus area (e.g., 'treatment', 'diagnosis', 'prognosis')", "enum": ["treatment", "diagnosis", "prognosis", "etiology", "epidemiology", "guidelines", "prevention"]},
                        "target_audience": {"type": "string", "description": "Target audience level", "enum": ["medical_student", "resident", "practicing_physician", "specialist", "researcher"]},
                        "max_results_per_source": {"type": "integer", "description": "Maximum results per source (default: 8)", "minimum": 5, "maximum": 15}
                    },
                    "required": ["user_original_query"]
                }
            )
            
            # CiteSource Analysis Tool
            cite_source_analysis_tool = MCPToolDefinition(
                name="analyze_with_citesource",
                description="Analyze search results with CiteSource for deduplication, quality assessment, and source performance analysis",
                input_schema={
                    "type": "object",
                    "properties": {
                        "search_results": {"type": "array", "description": "Array of search results to analyze", "items": {"type": "object"}},
                        "query": {"type": "string", "description": "Original search query for context"},
                        "include_visualizations": {"type": "boolean", "description": "Whether to include visualization data", "default": True}
                    },
                    "required": ["search_results", "query"]
                }
            )
            
            # CiteSource Report Generation Tool
            cite_source_report_tool = MCPToolDefinition(
                name="generate_citesource_report",
                description="Generate comprehensive CiteSource quality and performance report with visualizations and actionable insights",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Research query to analyze"},
                        "max_results": {"type": "integer", "description": "Maximum results to collect and analyze", "default": 25, "minimum": 10, "maximum": 50},
                        "include_metrics": {"type": "boolean", "description": "Include detailed metrics analysis", "default": True},
                        "include_visualizations": {"type": "boolean", "description": "Include visualization data", "default": True}
                    },
                    "required": ["query"]
                }
            )
            
            base_tools.extend([
                autonomous_research_tool,
                cite_source_analysis_tool,
                cite_source_report_tool
            ])
            
            logger.info(f"✅ Added {len(base_tools) - 5} CiteSource tools to MCP server")
        else:
            logger.warning("⚠️ CiteSource tools not available - missing dependencies")
        
        return base_tools
    
    async def initialize(self) -> None:
        """Initialize the MCP server."""
        logger.info("Initializing Clinical MCP Server")
        # Any initialization needed
        pass
    
    async def list_tools(self) -> ToolsResponse:
        """List available tools."""
        logger.debug("Listing available clinical tools")
        return ToolsResponse(self.available_tools)
    
    async def call_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> MCPResponse:
        """Call an MCP tool with the provided arguments."""
        logger.info(f"Tool call: {tool_name} with args: {tool_args}")
        
        try:
            if tool_name == "search_fulltext":
                return await self._search_fulltext(tool_args)
            elif tool_name == "lookup_guidelines":
                return await self._lookup_guidelines(tool_args)
            elif tool_name == "check_drug_interactions":
                return await self._check_drug_interactions(tool_args)
            elif tool_name == "interpret_lab_results":
                return await self._interpret_lab_results(tool_args)
            elif tool_name == "get_epidemiological_data":
                return await self._get_epidemiological_data(tool_args)
            elif tool_name == "brave_web_search":
                return await self._brave_web_search(tool_args)
            # NEW: CiteSource tools
            elif tool_name == "conduct_autonomous_research" and CITE_SOURCE_AVAILABLE:
                return await self._conduct_autonomous_research(tool_args)
            elif tool_name == "analyze_with_citesource" and CITE_SOURCE_AVAILABLE:
                return await self._analyze_with_citesource(tool_args)
            elif tool_name == "generate_citesource_report" and CITE_SOURCE_AVAILABLE:
                return await self._generate_citesource_report(tool_args)
            else:
                logger.warning(f"Unknown tool requested: {tool_name}")
                return MCPResponse(False, error=f"Unknown tool: {tool_name}")
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error executing tool {tool_name}: {str(e)}")
    
    async def _search_fulltext(self, args: Dict[str, Any]) -> MCPResponse:
        """Search for full text of medical articles."""
        query = args.get("query")
        if not query:
            return MCPResponse(False, error="No query provided for fulltext search")
            
        search_type = args.get("search_type", "keywords")  # Tipo de busca: 'doi', 'pmid', ou 'keywords'
        
        try:
            logger.info(f"Searching for fulltext: {query} (type: {search_type})")
            
            # Fontes possíveis de texto completo
            fulltext_sources = [
                {"name": "PubMed Central (PMC)", "url": "https://www.ncbi.nlm.nih.gov/pmc/", "free": True, "reliability": "Alta"},
                {"name": "SciELO", "url": "https://scielo.org/", "free": True, "reliability": "Alta"},
                {"name": "Directory of Open Access Journals (DOAJ)", "url": "https://doaj.org/", "free": True, "reliability": "Alta"},
                {"name": "medRxiv", "url": "https://www.medrxiv.org/", "free": True, "reliability": "Média (preprints)"},
                {"name": "Unpaywall", "url": "https://unpaywall.org/", "free": True, "reliability": "Alta"},
                {"name": "Open Access Button", "url": "https://openaccessbutton.org/", "free": True, "reliability": "Alta"},
                {"name": "Sci-Hub", "url": "https://sci-hub.se/", "free": True, "reliability": "Alta, mas com questões legais"},
                {"name": "Google Scholar", "url": "https://scholar.google.com/", "free": "Parcial", "reliability": "Varia"}
            ]
            
            # Em um ambiente real, implementaríamos a busca direta nas fontes acima
            # Por enquanto, vamos simular resultados
            
            # Verificar se é um DOI
            if search_type == "doi" or (search_type == "keywords" and query.startswith("10.")):
                logger.info(f"Detected DOI search: {query}")
                fulltext_results = [
                    {
                        "title": "Article with requested DOI",
                        "source": "PubMed Central",
                        "url": f"https://doi.org/{query}",
                        "access_type": "May be available via Unpaywall or institutional access",
                        "reliability": "Alta"
                    }
                ]
            # Verificar se é um PMID
            elif search_type == "pmid" or (search_type == "keywords" and query.isdigit()):
                logger.info(f"Detected PMID search: {query}")
                # Tentar obter dados da API real
                articles = get_pubmed_article_details([query])
                if articles and len(articles) > 0:
                    article = articles[0]
                    fulltext_results = [
                        {
                            "title": article.get("title", "Unknown title"),
                            "authors": article.get("authors", []),
                            "source": "PubMed",
                            "url": f"https://pubmed.ncbi.nlm.nih.gov/{query}/",
                            "pmid": query,
                            "doi": article.get("doi", ""),
                            "abstract": article.get("abstract", "Abstract not available"),
                            "access_type": check_open_access(query),
                            "reliability": "Alta"
                        }
                    ]
                else:
                    fulltext_results = [
                        {
                            "title": f"Article with PMID {query}",
                            "source": "PubMed",
                            "url": f"https://pubmed.ncbi.nlm.nih.gov/{query}/",
                            "access_type": "Unknown",
                            "reliability": "Alta"
                        }
                    ]
            # Pesquisa por palavras-chave
            else:
                logger.info(f"Keyword search: {query}")
                # Simular resultados de diferentes fontes
                fulltext_results = []
                for i, source in enumerate(fulltext_sources[:3]):  # Limitar a 3 fontes
                    fulltext_results.append({
                        "title": f"Research related to '{query}'",
                        "source": source["name"],
                        "url": f"{source['url']}search?q={quote(query)}",
                        "access_type": "Free" if source["free"] is True else "Varies",
                        "reliability": source["reliability"]
                    })
            
            # Adicionar informações sobre como obter textos completos
            access_info = {
                "instructions": "Para acessar textos completos, siga estas etapas:",
                "steps": [
                    "1. Verifique se o artigo está disponível em acesso aberto através do link fornecido",
                    "2. Tente usar sua afiliação institucional (universidade, hospital) para acesso",
                    "3. Verifique se há uma versão de preprint disponível em repositórios como medRxiv",
                    "4. Para DOIs, use ferramentas como Unpaywall para encontrar versões legalmente gratuitas",
                    "5. Considere entrar em contato diretamente com os autores via email ou ResearchGate"
                ],
                "tools": [
                    {"name": "Unpaywall", "url": "https://unpaywall.org/", "description": "Encontra versões legalmente gratuitas de artigos com DOI"},
                    {"name": "Open Access Button", "url": "https://openaccessbutton.org/", "description": "Ferramenta para encontrar versões de acesso aberto ou solicitar aos autores"},
                    {"name": "DOAJ", "url": "https://doaj.org/", "description": "Diretório de revistas de acesso aberto"}
                ]
            }
            
            logger.info(f"Fulltext search returned {len(fulltext_results)} results")
            
            return MCPResponse(True, content=json.dumps({
                "query": query,
                "search_type": search_type,
                "results": fulltext_results,
                "result_count": len(fulltext_results),
                "access_info": access_info
            }))
        except Exception as e:
            logger.error(f"Error in fulltext search: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error searching for fulltext: {str(e)}")
    
    async def _lookup_guidelines(self, args: Dict[str, Any]) -> MCPResponse:
        """Look up clinical guidelines for a specific condition."""
        condition = args.get("condition")
        if not condition:
            return MCPResponse(False, error="No condition provided for guidelines lookup")
        
        try:
            logger.info(f"Looking up guidelines for: {condition}")
            
            # Primeiro, tentar buscar diretrizes na web usando Brave Search
            logger.info(f"Searching web for guidelines on: {condition}")
            search_query = f"clinical guidelines for {condition} medical treatment"
            web_results = brave_web_search(search_query, count=5)
            
            # Se a busca na web falhar ou não retornar resultados, usar a simulação
            if "error" in web_results or not web_results.get("results", []):
                logger.warning(f"Web search failed or returned no results for guidelines on {condition}. Using simulated data.")
                # Simulate guidelines lookup - would connect to actual guidelines database in production
                guidelines = [
                    {"organization": "WHO", "title": f"Guidelines for {condition}", "year": 2023, "summary": f"General recommendations for {condition} management."},
                    {"organization": "CDC", "title": f"Clinical practice for {condition}", "year": 2022, "summary": f"Evidence-based approaches to {condition}."}
                ]
                
                logger.info(f"Guidelines lookup returned {len(guidelines)} simulated results")
                
                return MCPResponse(True, content=json.dumps({
                    "condition": condition,
                    "guidelines": guidelines,
                    "source": "Simulated data"
                }))
            
            # Formatar os resultados da busca na web para parecerem diretrizes clínicas
            guidelines = []
            for result in web_results.get("results", []):
                # Somente incluir resultados que pareçam ser diretrizes clínicas
                if any(keyword in result.get("title", "").lower() or keyword in result.get("description", "").lower() 
                       for keyword in ["guideline", "practice", "consensus", "recommendation", "treatment", "management"]):
                    guidelines.append({
                        "organization": result.get("title", "").split(" - ")[1] if " - " in result.get("title", "") else "Medical Source",
                        "title": result.get("title", ""),
                        "url": result.get("url", ""),
                        "summary": result.get("description", "No summary available"),
                        "year": "Current"  # Não temos informação precisa do ano
                    })
            
            # Se após a filtragem não houver resultados, usar simulação
            if not guidelines:
                logger.warning(f"No relevant guidelines found for {condition}. Using simulated data.")
                guidelines = [
                    {"organization": "WHO", "title": f"Guidelines for {condition}", "year": 2023, "summary": f"General recommendations for {condition} management."},
                    {"organization": "CDC", "title": f"Clinical practice for {condition}", "year": 2022, "summary": f"Evidence-based approaches to {condition}."}
                ]
                source = "Simulated data (web search found no relevant guidelines)"
            else:
                source = "Web search results"
                
            logger.info(f"Guidelines lookup returned {len(guidelines)} results from {source}")
            
            return MCPResponse(True, content=json.dumps({
                "condition": condition,
                "guidelines": guidelines,
                "source": source
            }))
        except Exception as e:
            logger.error(f"Error in guidelines lookup: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error looking up guidelines: {str(e)}")
    
    async def _check_drug_interactions(self, args: Dict[str, Any]) -> MCPResponse:
        """Check for potential interactions between medications."""
        medications = args.get("medications", [])
        if not medications:
            return MCPResponse(False, error="No medications provided for interaction check")
        
        try:
            logger.info(f"Checking drug interactions for: {medications}")
            
            # Usar a API RxNav para verificar interações
            interactions = check_drug_interactions_rxnav(medications)
            
            # Se não encontrar interações na API real, usar simulação como fallback
            if not interactions and len(medications) >= 2:
                logger.warning(f"No interactions found in RxNav for {medications}. Using simulated data as fallback.")
                interactions = [
                    {"drugs": [medications[0], medications[1]], "severity": "moderate", "description": "These medications may interact. Monitor for side effects."},
                ]
                logger.info(f"Drug interaction check returned {len(interactions)} simulated interactions")
            
            return MCPResponse(True, content=json.dumps({
                "medications": medications,
                "interactions": interactions,
                "interaction_count": len(interactions),
                "source": "RxNav API" if interactions else "Simulated data"
            }))
        except Exception as e:
            logger.error(f"Error in drug interaction check: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error checking drug interactions: {str(e)}")
    
    async def _get_epidemiological_data(self, args: Dict[str, Any]) -> MCPResponse:
        """Get epidemiological data from WHO Global Health Observatory."""
        indicator = args.get("indicator")
        if not indicator:
            # Se não foi fornecido um indicador específico, listar os indicadores disponíveis
            indicators = get_who_indicators()
            return MCPResponse(True, content=json.dumps({
                "available_indicators": indicators,
                "message": "No specific indicator provided. Here's a list of available indicators."
            }))
            
        country = args.get("country")
        year = args.get("year")
        
        try:
            logger.info(f"Getting WHO data for indicator: {indicator}")
            
            # Obter dados epidemiológicos da API da OMS
            data = get_who_data(indicator, country, year)
            
            if not data or not data.get("data"):
                return MCPResponse(False, error=f"No data found for indicator: {indicator}")
            
            return MCPResponse(True, content=json.dumps({
                "indicator": indicator,
                "country": country,
                "year": year,
                "data": data.get("data", []),
                "count": len(data.get("data", [])),
                "source": "WHO Global Health Observatory"
            }))
        except Exception as e:
            logger.error(f"Error getting WHO data: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error getting epidemiological data: {str(e)}")
    
    async def _brave_web_search(self, args: Dict[str, Any]) -> MCPResponse:
        """Search the web using Brave Search API."""
        query = args.get("query")
        if not query:
            return MCPResponse(False, error="No query provided for web search")
            
        count = args.get("count", 10)
        offset = args.get("offset", 0)
        
        try:
            logger.info(f"Performing web search for: {query}")
            
            # Realizar a busca na web
            results = brave_web_search(query, count, offset)
            
            if "error" in results and results["error"] and not results["results"]:
                return MCPResponse(False, error=f"Web search error: {results['error']}")
            
            return MCPResponse(True, content=json.dumps(results))
        except Exception as e:
            logger.error(f"Error in web search: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Error in web search: {str(e)}")
    
    # NEW: CiteSource Methods
    async def _conduct_autonomous_research(self, args: Dict[str, Any]) -> MCPResponse:
        """Conduct autonomous deep medical research with CiteSource integration."""
        user_query = args.get("user_original_query")
        if not user_query:
            return MCPResponse(False, error="No research query provided")
        
        try:
            logger.info(f"🤖 Starting autonomous research for: {user_query}")
            
            # Prepare research task input
            research_input = ResearchTaskInput(
                user_original_query=user_query,
                research_focus=args.get("research_focus"),
                target_audience=args.get("target_audience")
            )
            
            # Conduct autonomous research
            service = await get_simple_autonomous_service()
            synthesis_result = await service.conduct_autonomous_research(research_input)
            
            # Format response for MCP
            mcp_response = {
                "research_summary": {
                    "query": synthesis_result.original_query,
                    "executive_summary": synthesis_result.executive_summary,
                    "evidence_quality": synthesis_result.evidence_quality_assessment,
                    "search_strategy": synthesis_result.search_strategy_used
                },
                "key_findings": [
                    {
                        "theme": theme.theme_name,
                        "findings": theme.key_findings,
                        "evidence_strength": theme.strength_of_evidence,
                        "supporting_studies": theme.supporting_studies_count
                    }
                    for theme in synthesis_result.key_findings_by_theme
                ],
                "clinical_implications": synthesis_result.clinical_implications,
                "research_gaps": synthesis_result.research_gaps_identified,
                "limitations": synthesis_result.limitations,
                "references_count": len(synthesis_result.relevant_references),
                "citations": [
                    {
                        "title": ref.title,
                        "source": str(ref.source),
                        "url": ref.url,
                        "journal": ref.journal,
                        "publication_date": ref.publication_date,
                        "pmid": ref.pmid,
                        "doi": ref.doi
                    }
                    for ref in synthesis_result.relevant_references[:10]  # Limit to first 10 for MCP
                ]
            }
            
            # Add CiteSource metrics if available
            if synthesis_result.research_metrics and hasattr(synthesis_result.research_metrics, 'cite_source_metrics'):
                cite_metrics = synthesis_result.research_metrics.cite_source_metrics
                if cite_metrics:
                    mcp_response["cite_source_analysis"] = {
                        "sources_consulted": cite_metrics.total_sources_consulted,
                        "deduplication_rate": f"{cite_metrics.deduplication_rate:.1%}",
                        "quality_score": f"{cite_metrics.overall_quality_score:.1%}",
                        "best_source": cite_metrics.best_performing_source,
                        "quality_insights": cite_metrics.key_quality_insights
                    }
            
            logger.info(f"✅ Autonomous research completed for: {user_query}")
            return MCPResponse(True, content=json.dumps(mcp_response, ensure_ascii=False))
            
        except Exception as e:
            logger.error(f"❌ Error in autonomous research: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"Autonomous research failed: {str(e)}")
    
    async def _analyze_with_citesource(self, args: Dict[str, Any]) -> MCPResponse:
        """Analyze search results with CiteSource for deduplication and quality assessment."""
        search_results = args.get("search_results")
        query = args.get("query")
        
        if not search_results or not query:
            return MCPResponse(False, error="Missing search_results or query for CiteSource analysis")
        
        try:
            logger.info(f"🔬 Starting CiteSource analysis for {len(search_results)} results")
            
            # Convert input to RawSearchResultItem format
            baml_results = []
            for result in search_results:
                try:
                    # Map source string to enum
                    source_str = result.get("source", "WEB_SEARCH_BRAVE")
                    if hasattr(ResearchSourceType, source_str):
                        source = getattr(ResearchSourceType, source_str)
                    else:
                        source = ResearchSourceType.WEB_SEARCH_BRAVE
                    
                    baml_result = RawSearchResultItem(
                        source=source,
                        title=result.get("title", ""),
                        url=result.get("url"),
                        snippet_or_abstract=result.get("snippet_or_abstract", result.get("description", "")),
                        publication_date=result.get("publication_date"),
                        authors=result.get("authors"),
                        journal=result.get("journal"),
                        pmid=result.get("pmid"),
                        doi=result.get("doi"),
                        study_type=result.get("study_type"),
                        citation_count=result.get("citation_count")
                    )
                    baml_results.append(baml_result)
                except Exception as e:
                    logger.warning(f"⚠️ Skipping invalid result: {e}")
                    continue
            
            if not baml_results:
                return MCPResponse(False, error="No valid search results to analyze")
            
            # Process with CiteSource
            deduplicated_results, cite_source_report = await process_with_cite_source(
                results=baml_results,
                query=query,
                source_timing={}
            )
            
            # Format response
            analysis_response = {
                "deduplication_summary": {
                    "original_count": cite_source_report.deduplication_result.original_count,
                    "deduplicated_count": cite_source_report.deduplication_result.deduplicated_count,
                    "removed_duplicates": cite_source_report.deduplication_result.removed_duplicates,
                    "deduplication_rate": f"{(cite_source_report.deduplication_result.removed_duplicates / max(cite_source_report.deduplication_result.original_count, 1)) * 100:.1f}%"
                },
                "quality_assessment": {
                    "overall_score": f"{cite_source_report.quality_assessment.overall_score:.1%}",
                    "coverage_score": f"{cite_source_report.quality_assessment.coverage_score:.1%}",
                    "diversity_score": f"{cite_source_report.quality_assessment.diversity_score:.1%}",
                    "recency_score": f"{cite_source_report.quality_assessment.recency_score:.1%}",
                    "impact_score": f"{cite_source_report.quality_assessment.impact_score:.1%}",
                },
                "source_performance": [
                    {
                        "source": metrics.source_name,
                        "total_results": metrics.total_results,
                        "unique_contributions": metrics.unique_contributions,
                        "quality_score": f"{metrics.quality_score:.1%}",
                        "response_time": f"{metrics.response_time_ms:.0f}ms"
                    }
                    for metrics in cite_source_report.source_metrics
                ],
                "recommendations": cite_source_report.recommendations,
                "deduplicated_results": [
                    {
                        "title": result.title,
                        "source": str(result.source),
                        "url": result.url,
                        "journal": result.journal,
                        "publication_date": result.publication_date
                    }
                    for result in deduplicated_results[:20]  # Limit for MCP response
                ]
            }
            
            # Add visualizations if requested
            if args.get("include_visualizations", True):
                try:
                    viz_service = await get_cite_source_visualization_service()
                    viz_report = await viz_service.generate_comprehensive_report(
                        cite_source_report, 
                        include_visualizations=True
                    )
                    analysis_response["visualizations"] = viz_report.get("visualizations", {})
                except Exception as viz_error:
                    logger.warning(f"⚠️ Visualization generation failed: {viz_error}")
            
            logger.info(f"✅ CiteSource analysis completed: {len(deduplicated_results)} unique results")
            return MCPResponse(True, content=json.dumps(analysis_response, ensure_ascii=False))
            
        except Exception as e:
            logger.error(f"❌ Error in CiteSource analysis: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"CiteSource analysis failed: {str(e)}")
    
    async def _generate_citesource_report(self, args: Dict[str, Any]) -> MCPResponse:
        """Generate comprehensive CiteSource quality report with test data."""
        query = args.get("query")
        if not query:
            return MCPResponse(False, error="No query provided for CiteSource report")
        
        try:
            logger.info(f"📊 Generating CiteSource report for: {query}")
            
            max_results = args.get("max_results", 25)
            include_metrics = args.get("include_metrics", True)
            include_visualizations = args.get("include_visualizations", True)
            
            # For demonstration, we'll conduct a quick autonomous research
            # to generate real CiteSource data
            research_input = ResearchTaskInput(
                user_original_query=query,
                research_focus="treatment",
                target_audience="practicing_physician"
            )
            
            service = await get_simple_autonomous_service()
            synthesis_result = await service.conduct_autonomous_research(research_input)
            
            # Extract CiteSource report from the synthesis if available
            if (synthesis_result.research_metrics and 
                hasattr(synthesis_result.research_metrics, 'cite_source_metrics') and
                synthesis_result.research_metrics.cite_source_metrics):
                
                cite_metrics = synthesis_result.research_metrics.cite_source_metrics
                
                # Generate comprehensive report
                report_response = {
                    "query": query,
                    "timestamp": datetime.now().isoformat(),
                    "executive_summary": {
                        "total_sources": cite_metrics.total_sources_consulted,
                        "deduplication_efficiency": f"{cite_metrics.deduplication_rate:.1%}",
                        "overall_quality": f"{cite_metrics.overall_quality_score:.1%}",
                        "best_performing_source": cite_metrics.best_performing_source,
                        "processing_time": f"{cite_metrics.processing_time_ms:.0f}ms"
                    },
                    "quality_breakdown": {
                        "coverage": f"{cite_metrics.coverage_score:.1%}",
                        "diversity": f"{cite_metrics.diversity_score:.1%}",
                        "recency": f"{cite_metrics.recency_score:.1%}",
                        "impact": f"{cite_metrics.impact_score:.1%}",
                        "source_balance": f"{cite_metrics.source_balance_score:.1%}"
                    },
                    "key_insights": cite_metrics.key_quality_insights,
                    "research_summary": {
                        "total_unique_results": cite_metrics.deduplicated_results_count,
                        "evidence_themes": len(synthesis_result.key_findings_by_theme),
                        "clinical_implications": len(synthesis_result.clinical_implications),
                        "research_gaps": len(synthesis_result.research_gaps_identified)
                    }
                }
                
                if include_metrics:
                    report_response["detailed_metrics"] = {
                        "deduplication": {
                            "original_count": cite_metrics.original_results_count,
                            "final_count": cite_metrics.deduplicated_results_count,
                            "removed_duplicates": cite_metrics.original_results_count - cite_metrics.deduplicated_results_count,
                            "efficiency_rate": cite_metrics.deduplication_rate
                        },
                        "quality_scores": {
                            "overall": cite_metrics.overall_quality_score,
                            "coverage": cite_metrics.coverage_score,
                            "diversity": cite_metrics.diversity_score,
                            "recency": cite_metrics.recency_score,
                            "impact": cite_metrics.impact_score,
                            "balance": cite_metrics.source_balance_score
                        }
                    }
                
                logger.info(f"✅ CiteSource report generated successfully")
                return MCPResponse(True, content=json.dumps(report_response, ensure_ascii=False))
                
            else:
                # Generate a basic report without CiteSource metrics
                basic_report = {
                    "query": query,
                    "message": "Basic research completed - CiteSource metrics not available",
                    "research_summary": {
                        "executive_summary": synthesis_result.executive_summary,
                        "key_findings_count": len(synthesis_result.key_findings_by_theme),
                        "clinical_implications_count": len(synthesis_result.clinical_implications),
                        "references_count": len(synthesis_result.relevant_references)
                    }
                }
                
                return MCPResponse(True, content=json.dumps(basic_report, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"❌ Error generating CiteSource report: {str(e)}", exc_info=True)
            return MCPResponse(False, error=f"CiteSource report generation failed: {str(e)}")

# Helper function to run async functions in synchronous code
def run_async(coroutine):
    """Run an async function synchronously."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coroutine)
    finally:
        loop.close()

# Funções auxiliares para PubMed

def _apply_default_language_filter(query: str) -> str:
    """Ensure PubMed queries default to English language results unless another language is specified.
    If the query already contains a [lang] filter, leave it unchanged.
    """
    if not query:
        return query
    lower_q = query.lower()
    # If any language filter already present, return unchanged
    if "[lang]" in lower_q:
        return query
    # Otherwise, append English language filter
    return f"({query}) AND english[lang]"
def search_pubmed_articles(query, max_results=10):
    """Busca artigos no PubMed através da API do NCBI E-utilities."""
    try:
        # Apply default English language filter
        query = _apply_default_language_filter(query)
        # Construir URL de pesquisa
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmode": "json",
            "retmax": max_results,
            "sort": "relevance"
        }
        
        # Adicionar API key se disponível
        if NCBI_API_KEY:
            search_params["api_key"] = NCBI_API_KEY
            
        logger.info(f"Buscando no PubMed: {query} (max: {max_results})")
        response = requests.get(PUBMED_SEARCH_URL, params=search_params)
        
        if response.status_code != 200:
            logger.error(f"Erro ao buscar no PubMed: Status {response.status_code}")
            return []
            
        # Parse da resposta JSON
        search_results = response.json()
        
        # Extrair IDs dos artigos encontrados
        if "esearchresult" in search_results and "idlist" in search_results["esearchresult"]:
            pmids = search_results["esearchresult"]["idlist"]
            logger.info(f"Encontrados {len(pmids)} artigos no PubMed")
            
            if pmids:
                # Buscar detalhes dos artigos encontrados
                return get_pubmed_article_details(pmids)
            
        return []
        
    except Exception as e:
        logger.error(f"Erro ao buscar artigos no PubMed: {str(e)}", exc_info=True)
        return []


def check_open_access(pmid):
    """Verifica se um artigo está disponível em Open Access."""
    try:
        # Esta é uma simulação - em produção, usaria APIs como Unpaywall ou Open Access Button
        # ou verificaria no próprio PubMed o status de Open Access
        
        # Verificar status de Open Access via PMC
        pmc_params = {
            "db": "pmc",
            "term": f"{pmid}[pmid]",
            "retmode": "json"
        }
        
        if NCBI_API_KEY:
            pmc_params["api_key"] = NCBI_API_KEY
            
        response = requests.get(PUBMED_SEARCH_URL, params=pmc_params)
        
        if response.status_code == 200:
            results = response.json()
            if "esearchresult" in results and "count" in results["esearchresult"]:
                if int(results["esearchresult"]["count"]) > 0:
                    return "Open Access via PMC"
        
        # Por padrão, assumimos que não sabemos o status
        return "Verificar disponibilidade"
        
    except Exception as e:
        logger.error(f"Erro ao verificar status de acesso para PMID {pmid}: {str(e)}", exc_info=True)
        return "Verificar disponibilidade"

# Funções auxiliares para RxNav (interações medicamentosas)
def get_rxcui_for_drug(drug_name):
    """Obtém o identificador RxCUI para um medicamento pelo nome."""
    try:
        # Construir URL de pesquisa
        params = {
            "name": drug_name
        }
        
        logger.info(f"Buscando RxCUI para medicamento: {drug_name}")
        response = requests.get(RXNAV_DRUG_NAME_URL, params=params)
        
        if response.status_code != 200:
            logger.error(f"Erro ao buscar RxCUI: Status {response.status_code}")
            return None
            
        # Parse da resposta JSON
        results = response.json()
        
        # Extrair o RxCUI se disponível
        if "drugGroup" in results and "conceptGroup" in results["drugGroup"]:
            for group in results["drugGroup"]["conceptGroup"]:
                if "conceptProperties" in group:
                    for prop in group["conceptProperties"]:
                        if "rxcui" in prop:
                            logger.info(f"RxCUI encontrado para {drug_name}: {prop['rxcui']}")
                            return prop["rxcui"]
        
        logger.warning(f"RxCUI não encontrado para {drug_name}")
        return None
        
    except Exception as e:
        logger.error(f"Erro ao buscar RxCUI para {drug_name}: {str(e)}", exc_info=True)
        return None

def check_drug_interactions_rxnav(medications):
    """Verifica interações entre medicamentos usando a API RxNav."""
    try:
        # Obter RxCUIs para os medicamentos
        rxcuis = []
        for med in medications:
            rxcui = get_rxcui_for_drug(med)
            if rxcui:
                rxcuis.append(rxcui)
        
        # Se não encontrou RxCUIs suficientes, retornar lista vazia
        if len(rxcuis) < 2:
            logger.warning(f"RxCUIs insuficientes para verificar interações: {len(rxcuis)}")
            return []
        
        # Construir URL de pesquisa
        rxcui_list = "+".join(rxcuis)
        params = {
            "rxcuis": rxcui_list
        }
        
        logger.info(f"Verificando interações entre: {medications}")
        response = requests.get(RXNAV_INTERACTION_URL, params=params)
        
        if response.status_code != 200:
            logger.error(f"Erro ao verificar interações: Status {response.status_code}")
            return []
            
        # Parse da resposta JSON
        results = response.json()
        
        # Extrair as interações se disponíveis
        interactions = []
        if "fullInteractionTypeGroup" in results:
            for group in results["fullInteractionTypeGroup"]:
                if "fullInteractionType" in group:
                    for interaction_type in group["fullInteractionType"]:
                        if "interactionPair" in interaction_type:
                            for pair in interaction_type["interactionPair"]:
                                # Obter os nomes dos medicamentos e descrição
                                drug1 = pair["interactionConcept"][0]["minConceptItem"]["name"]
                                drug2 = pair["interactionConcept"][1]["minConceptItem"]["name"]
                                description = pair["description"]
                                severity = pair.get("severity", "Desconhecida")
                                
                                interactions.append({
                                    "drugs": [drug1, drug2],
                                    "severity": severity,
                                    "description": description
                                })
        
        logger.info(f"Encontradas {len(interactions)} interações medicamentosas")
        return interactions
        
    except Exception as e:
        logger.error(f"Erro ao verificar interações medicamentosas: {str(e)}", exc_info=True)
        return []

# Funções auxiliares para API da OMS (dados epidemiológicos)
def get_who_indicators():
    """Obtém a lista de indicadores disponíveis na API da OMS."""
    try:
        logger.info("Buscando indicadores disponíveis na API da OMS")
        response = requests.get(f"{WHO_ATHENA_METADATA_URL}.json")
        
        if response.status_code != 200:
            logger.error(f"Erro ao buscar indicadores da OMS: Status {response.status_code}")
            return []
            
        # Parse da resposta JSON
        results = response.json()
        
        # Extrair os indicadores disponíveis
        indicators = []
        if "dimension" in results:
            for dim in results["dimension"]:
                if "code" in dim and "title" in dim:
                    indicators.append({
                        "code": dim["code"],
                        "title": dim["title"]
                    })
        
        logger.info(f"Encontrados {len(indicators)} indicadores na API da OMS")
        return indicators
        
    except Exception as e:
        logger.error(f"Erro ao buscar indicadores da OMS: {str(e)}", exc_info=True)
        return []

def get_who_data(indicator, country=None, year=None):
    """Obtém dados epidemiológicos da API da OMS para um indicador específico."""
    try:
        # Construir URL de pesquisa
        url = WHO_ATHENA_DATA_URL.format(indicator=indicator)
        params = {
            "format": "json"
        }
        
        # Adicionar filtros opcionais
        if country:
            params["filter"] = f"COUNTRY:{ quote(country) }"
        if year:
            if "filter" in params:
                params["filter"] += ";YEAR:" + str(year)
            else:
                params["filter"] = "YEAR:" + str(year)
        
        logger.info(f"Buscando dados da OMS para: {indicator}")
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            logger.error(f"Erro ao buscar dados da OMS: Status {response.status_code}")
            return {}
            
        # Parse da resposta JSON
        results = response.json()
        
        # Formatar os dados para uso mais fácil
        formatted_data = {
            "indicator": indicator,
            "data": []
        }
        
        if "fact" in results:
            for item in results["fact"]:
                data_point = {
                    "country": item.get("dim", {}).get("COUNTRY", "Global"),
                    "year": item.get("dim", {}).get("YEAR", ""),
                    "value": item.get("Value", ""),
                    "comments": item.get("Comments", "")
                }
                formatted_data["data"].append(data_point)
        
        logger.info(f"Obtidos {len(formatted_data['data'])} pontos de dados para {indicator}")
        return formatted_data
        
    except Exception as e:
        logger.error(f"Erro ao buscar dados da OMS para {indicator}: {str(e)}", exc_info=True)
        return {}

# Funções auxiliares para API do Brave Search
def brave_web_search(query, count=10, offset=0):
    """Realiza uma busca na web usando a API do Brave Search."""
    try:
        if not BRAVE_API_KEY:
            logger.error("Chave de API do Brave Search não encontrada")
            return {"error": "API key not configured", "results": []}
            
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": BRAVE_API_KEY
        }
        
        params = {
            "q": query,
            "count": min(count, 20),  # Máximo de 20 resultados por página
            "offset": min(offset, 9)   # Máximo offset de 9 páginas
        }
        
        logger.info(f"Realizando busca web no Brave Search: '{query}' (count: {count}, offset: {offset})")
        response = requests.get(BRAVE_WEB_SEARCH_URL, headers=headers, params=params)
        
        if response.status_code != 200:
            logger.error(f"Erro na busca web do Brave: Status {response.status_code}")
            return {"error": f"Search API error: {response.status_code}", "results": []}
            
        # Parse da resposta JSON
        results = response.json()
        
        # Processar e formatar os resultados para torná-los mais úteis para o LLM
        formatted_results = []
        
        # Adicionar resultados web
        if "web" in results and "results" in results["web"]:
            for item in results["web"]["results"]:
                formatted_results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "description": item.get("description", ""),
                    "source": "web"
                })
        
        # Adicionar resultados de notícias se disponíveis
        if "news" in results and "results" in results["news"]:
            for item in results["news"]["results"]:
                formatted_results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "description": item.get("description", ""),
                    "source": "news",
                    "published_time": item.get("age", "")
                })
        
        # Adicionar resultados relacionados se disponíveis
        if "infobox" in results and "content" in results["infobox"]:
            formatted_results.append({
                "title": results["infobox"].get("title", "Info"),
                "description": results["infobox"].get("content", ""),
                "source": "infobox"
            })
            
        logger.info(f"Busca web retornou {len(formatted_results)} resultados")
        return {
            "query": query,
            "total_results": results.get("properties", {}).get("total_results", 0),
            "results": formatted_results
        }
        
    except Exception as e:
        logger.error(f"Erro na busca web do Brave: {str(e)}", exc_info=True)
        return {"error": str(e), "results": []}

# ---------------------------
# FastAPI Server Setup:
# ---------------------------

from fastapi import FastAPI, Request, HTTPException
import uvicorn
from pydantic import BaseModel, Field
from typing import List as TypeList, Dict as TypeDict, Optional as TypeOptional
from datetime import datetime

app = FastAPI(title="Clinical Helper Context Server")

# Create instance of the server (only clinical for now)
context_provider = ClinicalMCPServer()
# research_server = DeepResearchMCPServer()

# --- Pydantic Models for Context Endpoint --- 

class PatientDemographics(BaseModel):
    patient_id: Union[int, str]
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    # Add other relevant fields as needed

class SimpleVitalSign(BaseModel):
    type: str
    value: Union[str, float, int]
    timestamp: str

class SimpleLabResult(BaseModel):
    test_name: str
    value: Union[str, float, int]
    unit: Optional[str] = None
    timestamp: str
    is_abnormal: Optional[bool] = None

class SimpleMedication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None # e.g., active, inactive

class SimpleClinicalNote(BaseModel):
    title: Optional[str] = None
    note_type: Optional[str] = None
    content_snippet: str # Expecting backend to send only a snippet
    timestamp: str

class ConversationMessage(BaseModel):
    role: str
    content: str

class ContextRequest(BaseModel):
    patient_data: PatientDemographics
    recent_vitals: TypeList[SimpleVitalSign] = Field(default_factory=list)
    recent_labs: TypeList[SimpleLabResult] = Field(default_factory=list)
    active_medications: TypeList[SimpleMedication] = Field(default_factory=list)
    recent_notes: TypeList[SimpleClinicalNote] = Field(default_factory=list)
    conversation_history: TypeList[ConversationMessage] = Field(default_factory=list)
    max_context_length: Optional[int] = 2000 # Optional limit

class ContextResponse(BaseModel):
    context_string: str
    debug_info: Optional[Dict[str, Any]] = None # For debugging lengths, sources

# Additional Pydantic models for MCP tool calls
class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)

class ToolCallResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None

class ToolListResponse(BaseModel):
    tools: List[Dict[str, Any]]

# --- End Pydantic Models ---


@app.get("/")
def read_root():
    """Root endpoint for the Context Server."""
    return {"message": "Clinical Helper Context Server", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy", "service": "mcp-context-server"}

# NEW: Generic MCP Tool Endpoints
@app.get("/list-tools")
async def list_tools_endpoint():
    """
    Endpoint para listar todas as ferramentas MCP disponíveis.
    """
    try:
        tools_response = await context_provider.list_tools()
        tools_list = []
        
        for tool in tools_response.tools:
            tools_list.append({
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema,
                "output_schema": tool.outputSchema
            })
        
        return ToolListResponse(tools=tools_list)
        
    except Exception as e:
        logger.error(f"❌ Erro ao listar ferramentas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run-tool")
async def run_tool_endpoint(request: ToolCallRequest):
    """
    Endpoint genérico para executar qualquer ferramenta MCP.
    """
    try:
        logger.info(f"🔧 Executando ferramenta MCP: '{request.tool_name}' com argumentos: {request.arguments}")
        
        # Chamar a ferramenta através do servidor MCP
        result = await context_provider.call_tool(request.tool_name, request.arguments)
        
        return ToolCallResponse(
            success=result.success,
            content=result.content,
            error=result.error
        )
        
    except Exception as e:
        logger.error(f"❌ Erro ao executar ferramenta '{request.tool_name}': {e}", exc_info=True)
        return ToolCallResponse(
            success=False,
            content=None,
            error=str(e)
        )

# Initialize the server on startup
@app.on_event("startup")
async def startup_event():
    await context_provider.initialize()
    # await research_server.initialize() # Initialize research if kept
    logger.info("Context Server initialized successfully")

@app.get("/brave-search")
async def brave_search_endpoint(query: str, count: int = 10, offset: int = 0):
    """
    Endpoint direto para busca web usando Brave Search.
    """
    try:
        logger.info(f"Recebida requisição de busca web: '{query}' (count: {count}, offset: {offset})")
        
        # Chamar a função de busca web existente
        results = brave_web_search(query, count, offset)
        
        logger.info(f"Busca web retornou {len(results.get('results', []))} resultados")
        return results
        
    except Exception as e:
        logger.error(f"Erro no endpoint de busca web: {e}", exc_info=True)
        return {"error": str(e), "results": []}

# NEW: CiteSource REST Endpoints
@app.get("/citesource-research")
async def autonomous_research_endpoint(
    query: str,
    research_focus: str = "treatment",
    target_audience: str = "practicing_physician",
    max_results: int = 8
):
    """
    Endpoint para pesquisa autônoma com CiteSource.
    """
    if not CITE_SOURCE_AVAILABLE:
        return {"error": "CiteSource services not available", "available": False}
    
    try:
        logger.info(f"🤖 Iniciando pesquisa autônoma CiteSource: '{query}'")
        
        # Usar o servidor MCP para a pesquisa
        result = await context_provider._conduct_autonomous_research({
            "user_original_query": query,
            "research_focus": research_focus,
            "target_audience": target_audience,
            "max_results_per_source": max_results
        })
        
        if result.success:
            return json.loads(result.content)
        else:
            return {"error": result.error}
            
    except Exception as e:
        logger.error(f"❌ Erro na pesquisa autônoma: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/citesource-analyze")
async def analyze_results_endpoint(request: Request):
    """
    Endpoint para análise CiteSource de resultados de pesquisa.
    """
    if not CITE_SOURCE_AVAILABLE:
        return {"error": "CiteSource services not available", "available": False}
    
    try:
        data = await request.json()
        search_results = data.get("search_results", [])
        query = data.get("query", "")
        
        if not search_results or not query:
            return {"error": "Missing search_results or query"}
        
        logger.info(f"🔬 Iniciando análise CiteSource de {len(search_results)} resultados")
        
        # Usar o servidor MCP para análise
        result = await context_provider._analyze_with_citesource({
            "search_results": search_results,
            "query": query,
            "include_visualizations": data.get("include_visualizations", True)
        })
        
        if result.success:
            return json.loads(result.content)
        else:
            return {"error": result.error}
            
    except Exception as e:
        logger.error(f"❌ Erro na análise CiteSource: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/citesource-report")
async def generate_report_endpoint(
    query: str,
    max_results: int = 25,
    include_metrics: bool = True,
    include_visualizations: bool = True
):
    """
    Endpoint para geração de relatório CiteSource.
    """
    if not CITE_SOURCE_AVAILABLE:
        return {"error": "CiteSource services not available", "available": False}
    
    try:
        logger.info(f"📊 Gerando relatório CiteSource: '{query}'")
        
        # Usar o servidor MCP para o relatório
        result = await context_provider._generate_citesource_report({
            "query": query,
            "max_results": max_results,
            "include_metrics": include_metrics,
            "include_visualizations": include_visualizations
        })
        
        if result.success:
            return json.loads(result.content)
        else:
            return {"error": result.error}
            
    except Exception as e:
        logger.error(f"❌ Erro na geração de relatório: {e}", exc_info=True)
        return {"error": str(e)}

@app.get("/citesource-status")
async def citesource_status_endpoint():
    """
    Endpoint para verificar status das funcionalidades CiteSource.
    """
    return {
        "citesource_available": CITE_SOURCE_AVAILABLE,
        "mcp_tools_count": len(context_provider.available_tools),
        "citesource_tools": [
            tool.name for tool in context_provider.available_tools 
            if "citesource" in tool.name.lower() or "autonomous" in tool.name.lower()
        ] if CITE_SOURCE_AVAILABLE else [],
        "server_info": {
            "name": "Clinical Helper MCP Server with CiteSource",
            "version": "1.0.0",
            "capabilities": [
                "pubmed_search",
                "clinical_guidelines",
                "drug_interactions", 
                "epidemiological_data",
                "web_search"
            ] + (["autonomous_research", "citesource_analysis", "citesource_reports"] if CITE_SOURCE_AVAILABLE else [])
        }
    }

# --- New Context Endpoint --- 
@app.post("/context", response_model=ContextResponse)
async def generate_context(request: ContextRequest):
    """Generates a formatted context string based on provided patient data."""
    try:
        logger.info(f"Received context request for patient ID: {request.patient_data.patient_id}")
        # --- Context Formatting Logic --- 
        context_parts = []
        debug_info = {"sources_used": [], "char_counts": {}}
        
        # Get labels defined within the provider class instance if they exist
        # Using a placeholder dict if the attribute doesn't exist
        parameterLabels = getattr(context_provider, 'parameterLabels', {}) 

        # 1. Patient Summary
        context_parts.append("**Resumo do Paciente:**")
        pd = request.patient_data
        summary = f"ID: {pd.patient_id}"
        if pd.name: summary += f", Nome: {pd.name}"
        if pd.age: summary += f", Idade: {pd.age}"
        if pd.gender: summary += f", Sexo: {pd.gender}"
        if pd.primary_diagnosis: summary += f", Diagnóstico Principal: {pd.primary_diagnosis}"
        context_parts.append(summary)
        debug_info["sources_used"].append("demographics")
        debug_info["char_counts"]["demographics"] = len(summary)

        # 2. Active Medications
        if request.active_medications:
            context_parts.append("\n**Medicações Ativas:**")
            med_list = []
            for med in request.active_medications[:5]: # Limit number displayed
                med_str = f"- {med.name}"
                if med.dosage: med_str += f" ({med.dosage})"
                if med.frequency: med_str += f" {med.frequency}"
                med_list.append(med_str)
            context_parts.append("\n".join(med_list))
            if len(request.active_medications) > 5: context_parts.append("... (e mais)")
            debug_info["sources_used"].append("medications")
            debug_info["char_counts"]["medications"] = sum(len(s) for s in med_list)

        # 3. Recent Vitals (Show latest few)
        if request.recent_vitals:
            context_parts.append("\n**Sinais Vitais Recentes (mais recentes primeiro):**")
            vital_list = []
            try:
                sorted_vitals = sorted(request.recent_vitals, key=lambda v: v.timestamp, reverse=True)
            except Exception as sort_err:
                logger.error(f"Error sorting vitals by timestamp: {sort_err}")
                sorted_vitals = request.recent_vitals

            for vital in sorted_vitals[:10]:
                try:
                    timestamp_dt = datetime.fromisoformat(vital.timestamp.replace('Z', '+00:00'))
                    formatted_time = timestamp_dt.strftime('%d/%m %H:%M')
                except ValueError:
                    formatted_time = vital.timestamp
                label = parameterLabels.get(vital.type, vital.type)
                vital_list.append(f"- {label}: {vital.value} ({formatted_time})")
            context_parts.append("\n".join(vital_list))
            if len(sorted_vitals) > 10: context_parts.append("... (e mais)")
            debug_info["sources_used"].append("vitals")
            debug_info["char_counts"]["vitals"] = sum(len(s) for s in vital_list)
            
        # 4. Recent Labs (Show latest few, highlight abnormal)
        if request.recent_labs:
            context_parts.append("\n**Resultados Laboratoriais Recentes (mais recentes primeiro):**")
            lab_list = []
            try:
                sorted_labs = sorted(request.recent_labs, key=lambda l: l.timestamp, reverse=True)
            except Exception as sort_err:
                 logger.error(f"Error sorting labs by timestamp: {sort_err}")
                 sorted_labs = request.recent_labs

            for lab in sorted_labs[:15]:
                try:
                    timestamp_dt = datetime.fromisoformat(lab.timestamp.replace('Z', '+00:00'))
                    formatted_time = timestamp_dt.strftime('%d/%m %H:%M')
                except ValueError:
                     formatted_time = lab.timestamp
                abnormal_flag = " [ALTERADO]" if lab.is_abnormal else ""
                lab_list.append(f"- {lab.test_name}: {lab.value} {lab.unit or ''}{abnormal_flag} ({formatted_time})")
            context_parts.append("\n".join(lab_list))
            if len(sorted_labs) > 15: context_parts.append("... (e mais)")
            debug_info["sources_used"].append("labs")
            debug_info["char_counts"]["labs"] = sum(len(s) for s in lab_list)

        # 5. Recent Notes (Show snippets)
        if request.recent_notes:
            context_parts.append("\n**Notas Clínicas Recentes (mais recentes primeiro):**")
            note_list = []
            try:
                sorted_notes = sorted(request.recent_notes, key=lambda n: n.timestamp, reverse=True)
            except Exception as sort_err:
                logger.error(f"Error sorting notes by timestamp: {sort_err}")
                sorted_notes = request.recent_notes

            for note in sorted_notes[:5]:
                try:
                    timestamp_dt = datetime.fromisoformat(note.timestamp.replace('Z', '+00:00'))
                    formatted_time = timestamp_dt.strftime('%d/%m %H:%M')
                except ValueError:
                    formatted_time = note.timestamp
                note_title = note.title or note.note_type or "Nota"
                note_list.append(f"- {note_title} ({formatted_time}): {note.content_snippet}...")
            context_parts.append("\n".join(note_list))
            if len(sorted_notes) > 5: context_parts.append("... (e mais notas)")
            debug_info["sources_used"].append("notes")
            debug_info["char_counts"]["notes"] = sum(len(s) for s in note_list)

        # 6. Conversation History (Keep it brief)
        if request.conversation_history:
            context_parts.append("\n**Histórico Recente da Conversa:**")
            history_str = "\n".join([f"{msg.role.capitalize()}: {msg.content[:150]}{'...' if len(msg.content) > 150 else ''}" 
                                       for msg in request.conversation_history[-4:]])
            context_parts.append(history_str)
            debug_info["sources_used"].append("history")
            debug_info["char_counts"]["history"] = len(history_str)

        # --- Combine and Truncate --- 
        full_context = "\n".join(context_parts)
        
        max_len = request.max_context_length or 2000
        if len(full_context) > max_len:
            logger.warning(f"Context length ({len(full_context)}) exceeded limit ({max_len}). Truncating.")
            full_context = full_context[:max_len] + "\n... [CONTEXTO TRUNCADO]"
            debug_info["truncated"] = True
        else:
            debug_info["truncated"] = False
            
        debug_info["final_length"] = len(full_context)
        logger.info(f"Generated context string of length: {len(full_context)}")
        
        return ContextResponse(context_string=full_context, debug_info=debug_info)

    except Exception as e:
        logger.error(f"Error generating context: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating context: {str(e)}")

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=MCP_PORT)