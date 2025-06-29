"""
Ferramentas Langroid para pesquisa médica autônoma.

Este módulo define ferramentas que o agente pode usar autonomamente para:
- Buscar artigos no PubMed
- Realizar buscas web com Brave Search
- Analisar documentos PDF
- Sintetizar evidências
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import langroid as lr
from langroid.agent.tools.orchestration import DoneMessage

# Importar nossos serviços unificados
from models.research_models import RawSearchResultItemPydantic
from services.unified_pubmed_service import unified_pubmed_service, UnifiedSearchResult
from clients.brave_search_client import search_brave_web, BraveSearchResponse
from services.pdf_service import pdf_service

# Importar tipos BAML
from baml_client.types import (
    ResearchSourceType,
    RawSearchResultItem,
    StudyTypeFilter
)

logger = logging.getLogger(__name__)

# --- Ferramentas Langroid ---

class PubMedSearchTool(lr.agent.ToolMessage):
    """Ferramenta para buscar artigos científicos no PubMed."""
    
    request: str = "search_pubmed"
    purpose: str = """
    Buscar artigos científicos no banco de dados PubMed usando termos de busca otimizados.
    Use esta ferramenta quando precisar de evidências científicas de alta qualidade,
    estudos clínicos, revisões sistemáticas ou meta-análises.
    """
    
    query: str = Field(..., description="Termo de busca otimizado para PubMed (pode incluir operadores booleanos e termos MeSH)")
    max_results: int = Field(default=10, description="Número máximo de resultados (1-20)")
    study_type_filter: Optional[str] = Field(default=None, description="Filtro por tipo de estudo: 'systematic_review', 'rct', 'cohort', 'case_control', 'clinical_trial', 'review'")
    date_range_years: Optional[int] = Field(default=None, description="Limitar a artigos dos últimos N anos")

class BraveWebSearchTool(lr.agent.ToolMessage):
    """Ferramenta para buscar informações médicas na web usando Brave Search."""
    
    request: str = "search_web"
    purpose: str = """
    Buscar informações médicas atualizadas na web, incluindo diretrizes clínicas,
    consensos médicos, informações de organizações de saúde e recursos educacionais.
    Use quando precisar de informações mais recentes ou diretrizes não indexadas no PubMed.
    """
    
    query: str = Field(..., description="Termo de busca otimizado para encontrar diretrizes, consensos e informações médicas atualizadas")
    max_results: int = Field(default=10, description="Número máximo de resultados (1-20)")

class AnalyzePDFTool(lr.agent.ToolMessage):
    """Ferramenta para analisar documentos PDF médicos."""
    
    request: str = "analyze_pdf"
    purpose: str = """
    Analisar documentos PDF médicos para extrair informações relevantes,
    avaliar qualidade metodológica e identificar achados clínicos importantes.
    """
    
    pdf_content: str = Field(..., description="Conteúdo de texto extraído do PDF")
    analysis_focus: Optional[str] = Field(default=None, description="Foco específico da análise (metodologia, resultados, implicações clínicas)")
    clinical_question: Optional[str] = Field(default=None, description="Pergunta clínica para orientar a análise")

class SynthesizeEvidenceTool(lr.agent.ToolMessage):
    """Ferramenta para sintetizar evidências de múltiplas fontes."""
    
    request: str = "synthesize_evidence"
    purpose: str = """
    Sintetizar evidências coletadas de múltiplas fontes em um relatório estruturado
    com avaliação de qualidade, temas principais e implicações clínicas.
    """
    
    original_query: str = Field(..., description="Pergunta de pesquisa original")
    search_results: List[Dict[str, Any]] = Field(..., description="Lista de resultados de pesquisa para sintetizar")

class ResearchCompleteTool(lr.agent.ToolMessage):
    """Ferramenta para indicar que a pesquisa foi concluída."""
    
    request: str = "research_complete"
    purpose: str = """
    Indicar que a pesquisa foi concluída e apresentar os resultados finais sintetizados.
    Use quando tiver coletado evidências suficientes e realizado a síntese.
    """
    
    final_synthesis: Dict[str, Any] = Field(..., description="Síntese final da pesquisa com todos os achados organizados")

# --- Agente de Pesquisa Médica ---

class MedicalResearchAgent(lr.ChatAgent):
    """
    Agente autônomo especializado em pesquisa médica baseada em evidências.
    
    Este agente pode:
    - Formular estratégias de busca otimizadas
    - Executar buscas em múltiplas fontes autonomamente
    - Avaliar e sintetizar evidências
    - Adaptar a estratégia baseada nos resultados encontrados
    """
    
    def __init__(self, config: lr.ChatAgentConfig):
        super().__init__(config)
        self.search_results: List[Dict[str, Any]] = []
        self.research_strategy: Optional[Dict[str, Any]] = None
        self.final_synthesis: Optional[Dict[str, Any]] = None
        
    async def search_pubmed(self, msg: PubMedSearchTool) -> str:
        """Executa busca no PubMed."""
        try:
            logger.info(f"🔍 Agente executando busca PubMed: {msg.query}")
            
            # Executar busca usando serviço unificado
            async with unified_pubmed_service as service:
                unified_results = await service.search_unified(
                    query=msg.query,
                    max_results=msg.max_results
                )
            
            # Converter para formato padrão e armazenar
            for result in unified_results:
                self.search_results.append({
                    "source": "PUBMED",
                    "title": result.title,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{result.pmid}/",
                    "snippet_or_abstract": result.abstract,
                    "publication_date": result.publication_date,
                    "authors": result.authors,
                    "journal": result.journal,
                    "pmid": result.pmid,
                    "doi": result.doi,
                    "study_type": None,  # Can be derived from unified metrics if needed
                    "citation_count": result.semantic_scholar_citations or result.opencitations_citations
                })
            
            logger.info(f"✅ Encontrados {len(unified_results)} artigos no PubMed")
            return f"Busca no PubMed concluída. Encontrados {len(unified_results)} artigos relevantes para '{msg.query}'. Total de resultados coletados até agora: {len(self.search_results)}"
            
        except Exception as e:
            logger.error(f"❌ Erro na busca PubMed: {e}")
            return f"Erro na busca PubMed: {str(e)}"
    
    async def search_web(self, msg: BraveWebSearchTool) -> str:
        """Executa busca web com Brave Search."""
        try:
            logger.info(f"🌐 Agente executando busca web: {msg.query}")
            
            # Executar busca
            response = await search_brave_web(
                query=msg.query,
                count=msg.max_results,
                offset=0
            )
            
            if response.error:
                logger.warning(f"⚠️ Erro na busca web: {response.error}")
                return f"Erro na busca web: {response.error}"
            
            # Converter para formato padrão e armazenar
            for result in response.results:
                self.search_results.append({
                    "source": "WEB_SEARCH_BRAVE",
                    "title": result.title,
                    "url": result.url,
                    "snippet_or_abstract": result.description,
                    "publication_date": result.published_time,
                    "authors": None,
                    "journal": None,
                    "pmid": None,
                    "doi": None,
                    "study_type": None,
                    "citation_count": None
                })
            
            logger.info(f"✅ Encontrados {len(response.results)} resultados na web")
            return f"Busca web concluída. Encontrados {len(response.results)} resultados relevantes para '{msg.query}'. Total de resultados coletados até agora: {len(self.search_results)}"
            
        except Exception as e:
            logger.error(f"❌ Erro na busca web: {e}")
            return f"Erro na busca web: {str(e)}"
    
    async def analyze_pdf(self, msg: AnalyzePDFTool) -> str:
        """Analisa documento PDF."""
        try:
            logger.info(f"📄 Agente analisando PDF")
            
            # Usar nosso serviço BAML existente para análise
            from baml_client import b
            from baml_client.types import PDFAnalysisInput
            
            analysis_input = PDFAnalysisInput(
                pdf_content=msg.pdf_content,
                analysis_focus=msg.analysis_focus,
                clinical_question=msg.clinical_question
            )
            
            analysis_result = await b.AnalyzePDFDocument(analysis_input)
            
            # Adicionar aos resultados como um item especial
            self.search_results.append({
                "source": "PDF_ANALYSIS",
                "title": f"Análise de PDF - {analysis_result.document_type}",
                "url": None,
                "snippet_or_abstract": analysis_result.structured_summary,
                "publication_date": None,
                "authors": None,
                "journal": None,
                "pmid": None,
                "doi": None,
                "study_type": analysis_result.document_type,
                "citation_count": None,
                "analysis_details": {
                    "key_findings": analysis_result.key_findings,
                    "methodology_summary": analysis_result.methodology_summary,
                    "clinical_relevance": analysis_result.clinical_relevance,
                    "evidence_quality": analysis_result.evidence_quality,
                    "recommendations": analysis_result.recommendations,
                    "limitations": analysis_result.limitations
                }
            })
            
            logger.info(f"✅ Análise de PDF concluída")
            return f"Análise de PDF concluída. Documento identificado como: {analysis_result.document_type}. Principais achados extraídos e adicionados aos resultados da pesquisa."
            
        except Exception as e:
            logger.error(f"❌ Erro na análise de PDF: {e}")
            return f"Erro na análise de PDF: {str(e)}"
    
    async def synthesize_evidence(self, msg: SynthesizeEvidenceTool) -> str:
        """Sintetiza evidências coletadas usando as funções BAML especializadas."""
        try:
            logger.info(f"🧠 Agente sintetizando evidências com BAML")
            
            if not self.search_results:
                return "Erro: Nenhum resultado de pesquisa disponível para síntese. Execute buscas primeiro."
            
            # Usar nosso serviço BAML existente para síntese
            from baml_client import b
            from baml_client.types import RawSearchResultItem, ResearchSourceType
            
            # Converter resultados para formato BAML
            baml_results = []
            for result in self.search_results:
                # Mapear source string para enum
                source_map = {
                    "PUBMED": ResearchSourceType.PUBMED,
                    "WEB_SEARCH_BRAVE": ResearchSourceType.WEB_SEARCH_BRAVE,
                    "PDF_ANALYSIS": ResearchSourceType.WEB_SEARCH_BRAVE  # Usar como fallback
                }
                
                baml_result = RawSearchResultItem(
                    source=source_map.get(result["source"], ResearchSourceType.PUBMED),
                    title=result["title"],
                    url=result["url"],
                    snippet_or_abstract=result["snippet_or_abstract"],
                    publication_date=result["publication_date"],
                    authors=result["authors"],
                    journal=result["journal"],
                    pmid=result["pmid"],
                    doi=result["doi"],
                    study_type=result["study_type"],
                    citation_count=result["citation_count"]
                )
                baml_results.append(baml_result)
            
            # Executar síntese usando função BAML especializada com sistema robusto
            from services.synthesis_helper_service import synthesize_with_fallback
            synthesis_result = await synthesize_with_fallback(
                original_query=msg.original_query,
                search_results=baml_results
            )
            
            # Armazenar resultado da síntese para uso posterior
            self.final_synthesis = {
                "original_query": synthesis_result.original_query,
                "executive_summary": synthesis_result.executive_summary,
                "key_findings_by_theme": [
                    {
                        "theme_name": theme.theme_name,
                        "key_findings": theme.key_findings,
                        "strength_of_evidence": theme.strength_of_evidence,
                        "supporting_studies_count": theme.supporting_studies_count
                    }
                    for theme in synthesis_result.key_findings_by_theme
                ],
                "evidence_quality_assessment": synthesis_result.evidence_quality_assessment,
                "clinical_implications": synthesis_result.clinical_implications,
                "research_gaps_identified": synthesis_result.research_gaps_identified,
                "relevant_references": [
                    {
                        "title": ref.title,
                        "url": ref.url,
                        "source": ref.source.value if hasattr(ref.source, 'value') else str(ref.source),
                        "journal": ref.journal,
                        "publication_date": ref.publication_date
                    }
                    for ref in synthesis_result.relevant_references[:10]  # Limitar a 10 referências
                ],
                "search_strategy_used": synthesis_result.search_strategy_used,
                "limitations": synthesis_result.limitations,
                "disclaimer": synthesis_result.disclaimer
            }
            
            logger.info(f"✅ Síntese BAML concluída com sucesso")
            
            # Retornar resumo da síntese para o agente
            summary = f"""
Síntese concluída com sucesso! 

📊 RESUMO DA ANÁLISE:
- Analisados: {len(baml_results)} resultados de pesquisa
- Temas identificados: {len(synthesis_result.key_findings_by_theme)}
- Implicações clínicas: {len(synthesis_result.clinical_implications)}
- Referências relevantes: {len(synthesis_result.relevant_references)}

🎯 PRINCIPAIS ACHADOS:
{synthesis_result.executive_summary[:300]}...

A síntese completa foi armazenada e está pronta para ser finalizada.
Use a ferramenta 'research_complete' para concluir a pesquisa.
"""
            return summary
            
        except Exception as e:
            logger.error(f"❌ Erro na síntese de evidências: {e}")
            return f"Erro na síntese de evidências: {str(e)}"
    
    async def research_complete(self, msg: ResearchCompleteTool) -> str:
        """Marca a pesquisa como concluída e retorna a síntese final."""
        logger.info(f"🎯 Pesquisa concluída pelo agente")
        
        # Verificar se temos uma síntese armazenada
        if hasattr(self, 'final_synthesis') and self.final_synthesis:
            # Retornar uma mensagem especial que indica conclusão com a síntese
            return f"RESEARCH_COMPLETE: {self.final_synthesis}"
        else:
            # Se não temos síntese, usar os dados fornecidos
            return f"RESEARCH_COMPLETE: {msg.final_synthesis}"

def create_medical_research_agent() -> MedicalResearchAgent:
    """Cria e configura um agente de pesquisa médica."""
    
    config = lr.ChatAgentConfig(
        name="Dr. Corvus Research Agent",
        system_message="""
        Você é Dr. Corvus, um agente especializado em pesquisa médica baseada em evidências.
        
        Sua missão é conduzir pesquisas médicas abrangentes e autônomas, utilizando múltiplas fontes
        de evidência científica para responder perguntas clínicas complexas.
        
        PROCESSO DE PESQUISA:
        
        1. **Análise da Pergunta**: Analise cuidadosamente a pergunta de pesquisa para identificar:
           - Conceitos-chave e termos MeSH relevantes
           - Tipo de evidência necessária (tratamento, diagnóstico, prognóstico)
           - Fontes mais apropriadas para a busca
        
        2. **Estratégia Multi-fonte**: Execute buscas em:
           - PubMed: Para evidências científicas de alta qualidade (RCTs, revisões sistemáticas)
           - Web Search: Para diretrizes atualizadas e consensos médicos
           - PDF Analysis: Se documentos específicos forem fornecidos
        
        3. **Avaliação Iterativa**: Após cada busca:
           - Avalie a qualidade e relevância dos resultados
           - Determine se são necessárias buscas adicionais com termos diferentes
           - Ajuste a estratégia conforme necessário
        
        4. **Síntese Final**: Quando tiver evidências suficientes (pelo menos 5-10 resultados relevantes):
           - Use a ferramenta synthesize_evidence para criar síntese estruturada
           - Organize por temas e qualidade da evidência
           - Forneça implicações clínicas claras
           - Use research_complete para finalizar
        
        DIRETRIZES IMPORTANTES:
        - SEMPRE comece com busca no PubMed para evidências de alta qualidade
        - Use termos de busca específicos e otimizados para cada fonte
        - Para tratamento: priorize RCTs e revisões sistemáticas
        - Para diagnóstico: busque estudos de acurácia diagnóstica
        - Para prognóstico: foque em estudos de coorte
        - Colete pelo menos 5-10 resultados relevantes antes de sintetizar
        - Seja crítico na avaliação da qualidade das evidências
        - Se uma busca não retornar resultados úteis, tente termos alternativos
        
        FERRAMENTAS DISPONÍVEIS:
        - search_pubmed: Buscar artigos científicos no PubMed
        - search_web: Buscar diretrizes e informações atualizadas na web
        - analyze_pdf: Analisar documentos PDF específicos
        - synthesize_evidence: Sintetizar evidências coletadas usando BAML
        - research_complete: Finalizar pesquisa com síntese completa
        
        EXEMPLO DE FLUXO:
        1. Analise a pergunta e identifique conceitos-chave
        2. Execute search_pubmed com termos otimizados
        3. Se necessário, execute search_web para diretrizes
        4. Avalie se tem evidências suficientes
        5. Execute synthesize_evidence para criar síntese
        6. Use research_complete para finalizar
        
        Comece SEMPRE analisando a pergunta e executando uma busca no PubMed.
        """,
        use_tools=False,
        use_functions_api=True,
        vecdb=None,
    )
    
    agent = MedicalResearchAgent(config)
    
    # Habilitar todas as ferramentas
    agent.enable_message(PubMedSearchTool)
    agent.enable_message(BraveWebSearchTool)
    agent.enable_message(AnalyzePDFTool)
    agent.enable_message(SynthesizeEvidenceTool)
    agent.enable_message(ResearchCompleteTool)
    
    return agent 