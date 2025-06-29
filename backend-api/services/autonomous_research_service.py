"""
Serviço de Pesquisa Autônoma usando Langroid.

Este serviço orquestra pesquisas médicas autônomas onde o agente Dr. Corvus
pode decidir quais ferramentas usar e como conduzir a pesquisa baseada na pergunta.
"""

import asyncio
import logging
import os
import re
from typing import Dict, Any, Optional, List
import langroid as lr
from langroid.agent.task import Task

# Importar o dicionário de abreviações
from utils.medical_abbreviations import PORTUGUESE_MEDICAL_ABBREVIATIONS

# Importar nosso agente personalizado
from agents.research_tools import create_medical_research_agent, MedicalResearchAgent

# Importar tipos BAML para compatibilidade
from baml_client.types import (
    ResearchTaskInput,
    SynthesizedResearchOutput,
    PICOQuestion,
    EvidenceTheme,
    RawSearchResultItem,
    ResearchSourceType
)

logger = logging.getLogger(__name__)

class AutonomousResearchService:
    """
    Serviço que coordena pesquisas médicas autônomas usando agentes Langroid.
    
    Este serviço permite que o Dr. Corvus conduza pesquisas de forma completamente
    autônoma, decidindo quais ferramentas usar e como adaptar a estratégia baseada
    nos resultados encontrados.
    """
    
    def __init__(self):
        self.agent: Optional[MedicalResearchAgent] = None
        self.task: Optional[Task] = None
        self._setup_langroid_config()
    
    async def initialize_agent(self) -> MedicalResearchAgent:
        """Inicializa o agente de pesquisa médica."""
        if self.agent is None:
            logger.info("🤖 Inicializando agente de pesquisa médica autônoma")
            self.agent = create_medical_research_agent()
            
            # Criar task para o agente
            self.task = Task(
                agent=self.agent,
                name="Medical Research Task",
                default_human_response="",  # Não esperar input humano
                single_round=False,  # Permitir múltiplas iterações
                max_turns=20,  # Limite de segurança
            )
            
            logger.info("✅ Agente de pesquisa médica inicializado")
        
        return self.agent
    
    async def conduct_autonomous_research(
        self, 
        research_input: ResearchTaskInput,
        max_turns: int = 15
    ) -> SynthesizedResearchOutput:
        """
        Conduz uma pesquisa médica completamente autônoma.
        
        Args:
            research_input: Input da pesquisa com pergunta e parâmetros
            max_turns: Número máximo de iterações do agente
            
        Returns:
            SynthesizedResearchOutput: Resultado sintetizado da pesquisa
        """
        try:
            # Inicializar agente
            agent = await self.initialize_agent()
            
            # Resetar estado do agente para nova pesquisa
            agent.search_results = []
            agent.research_strategy = None
            
            # Formular prompt inicial para o agente
            initial_prompt = self._create_research_prompt(research_input)
            
            logger.info(f"🚀 Iniciando pesquisa autônoma: {research_input.user_original_query}")
            
            # Configurar task com limite de turnos
            self.task.max_turns = max_turns
            
            # Executar pesquisa autônoma
            result = await self.task.run_async(initial_prompt)
            
            # Verificar se a pesquisa foi concluída com sucesso
            if result and "RESEARCH_COMPLETE:" in str(result.content):
                logger.info("✅ Pesquisa autônoma concluída com sucesso")
                
                # Extrair síntese final dos resultados do agente
                return await self._extract_final_synthesis(agent, research_input)
            else:
                logger.warning("⚠️ Pesquisa não foi concluída adequadamente pelo agente")
                
                # Forçar síntese com os resultados coletados até agora
                return await self._force_synthesis(agent, research_input)
                
        except Exception as e:
            logger.error(f"❌ Erro na pesquisa autônoma: {e}", exc_info=True)
            
            # Tentar recuperar com síntese parcial se houver resultados
            if self.agent and self.agent.search_results:
                logger.info("🔄 Tentando recuperar com síntese parcial")
                return await self._force_synthesis(self.agent, research_input)
            else:
                # Retornar resultado de erro estruturado
                return self._create_error_result(research_input, str(e))
    
    def _expand_abbreviations(self, query: str) -> str:
        """Expande abreviações médicas na query usando o dicionário."""
        sorted_keys = sorted(PORTUGUESE_MEDICAL_ABBREVIATIONS.keys(), key=len, reverse=True)
        for abbrev in sorted_keys:
            pattern = r'\\b' + re.escape(abbrev) + r'\\b'
            expansion = PORTUGUESE_MEDICAL_ABBREVIATIONS[abbrev].replace('\\', r'\\\\')
            replacement = f"{expansion} ({abbrev})"
            query = re.sub(pattern, replacement, query, flags=re.IGNORECASE)
        return query

    def _create_research_prompt(self, research_input: ResearchTaskInput) -> str:
        """Cria o prompt inicial para o agente de pesquisa."""
        
        # Expandir abreviações na pergunta do usuário
        expanded_query = self._expand_abbreviations(research_input.user_original_query)
        logger.info(f"Query original: {research_input.user_original_query}")
        logger.info(f"Query expandida para o prompt: {expanded_query}")

        prompt_parts = [
            f"Conduza uma pesquisa médica abrangente para responder à seguinte pergunta:",
            f"",
            f"PERGUNTA: {expanded_query}",
        ]
        
        # Adicionar informações PICO se disponíveis
        if research_input.pico_question:
            pico = research_input.pico_question
            prompt_parts.extend([
                f"",
                f"ESTRUTURA PICO:",
                f"- População: {pico.population or 'Não especificado'}",
                f"- Intervenção: {pico.intervention or 'Não especificado'}",
                f"- Comparação: {pico.comparison or 'Não especificado'}",
                f"- Desfecho: {pico.outcome or 'Não especificado'}",
            ])
        
        # Adicionar foco e público-alvo se especificados
        if research_input.research_focus:
            prompt_parts.append(f"FOCO DA PESQUISA: {research_input.research_focus}")
        
        if research_input.target_audience:
            prompt_parts.append(f"PÚBLICO-ALVO: {research_input.target_audience}")
        
        prompt_parts.extend([
            f"",
            f"Analise a pergunta, formule uma estratégia de busca apropriada e execute",
            f"buscas em múltiplas fontes para coletar evidências relevantes.",
            f"Quando tiver evidências suficientes, sintetize os achados e conclua a pesquisa.",
            f"",
            f"Comece agora!"
        ])
        
        return "\n".join(prompt_parts)
    
    async def _extract_final_synthesis(
        self, 
        agent: MedicalResearchAgent, 
        research_input: ResearchTaskInput
    ) -> SynthesizedResearchOutput:
        """Extrai a síntese final dos resultados do agente."""
        try:
            # Verificar se o agente tem uma síntese final armazenada
            if hasattr(agent, 'final_synthesis') and agent.final_synthesis:
                logger.info(f"🧠 Extraindo síntese final do agente")
                
                synthesis_data = agent.final_synthesis
                
                # Converter de volta para o formato BAML
                from baml_client.types import EvidenceTheme, RawSearchResultItem, ResearchSourceType
                
                # Converter temas
                themes = []
                for theme_data in synthesis_data.get("key_findings_by_theme", []):
                    theme = EvidenceTheme(
                        theme_name=theme_data["theme_name"],
                        key_findings=theme_data["key_findings"],
                        strength_of_evidence=theme_data["strength_of_evidence"],
                        supporting_studies_count=theme_data["supporting_studies_count"]
                    )
                    themes.append(theme)
                
                # Converter referências
                references = []
                for ref_data in synthesis_data.get("relevant_references", []):
                    # Mapear source string de volta para enum
                    source_map = {
                        "PUBMED": ResearchSourceType.PUBMED,
                        "WEB_SEARCH_BRAVE": ResearchSourceType.WEB_SEARCH_BRAVE
                    }
                    
                    ref = RawSearchResultItem(
                        source=source_map.get(ref_data.get("source", "PUBMED"), ResearchSourceType.PUBMED),
                        title=ref_data.get("title", ""),
                        url=ref_data.get("url"),
                        snippet_or_abstract="",  # Não temos o abstract na referência simplificada
                        publication_date=ref_data.get("publication_date"),
                        authors=None,
                        journal=ref_data.get("journal"),
                        pmid=None,
                        doi=None,
                        study_type=None,
                        citation_count=None
                    )
                    references.append(ref)
                
                # Criar o resultado final
                synthesis_result = SynthesizedResearchOutput(
                    original_query=synthesis_data.get("original_query", research_input.user_original_query),
                    executive_summary=synthesis_data.get("executive_summary", ""),
                    key_findings_by_theme=themes,
                    evidence_quality_assessment=synthesis_data.get("evidence_quality_assessment", ""),
                    clinical_implications=synthesis_data.get("clinical_implications", []),
                    research_gaps_identified=synthesis_data.get("research_gaps_identified", []),
                    relevant_references=references,
                    search_strategy_used=synthesis_data.get("search_strategy_used", "Pesquisa autônoma com múltiplas fontes"),
                    limitations=synthesis_data.get("limitations", []),
                    disclaimer=synthesis_data.get("disclaimer", "Pesquisa realizada autonomamente pelo Dr. Corvus.")
                )
                
                return synthesis_result
                
            # Se o agente coletou resultados mas não tem síntese, forçar síntese
            elif agent.search_results:
                logger.info(f"🔄 Agente coletou resultados mas não sintetizou. Forçando síntese.")
                return await self._force_synthesis(agent, research_input)
            else:
                # Sem resultados coletados
                return self._create_no_results_response(research_input)
                
        except Exception as e:
            logger.error(f"❌ Erro na extração da síntese final: {e}")
            return self._create_error_result(research_input, str(e))
    
    async def _force_synthesis(
        self, 
        agent: MedicalResearchAgent, 
        research_input: ResearchTaskInput
    ) -> SynthesizedResearchOutput:
        """Força uma síntese com os resultados parciais coletados."""
        try:
            if agent.search_results:
                logger.info(f"🔄 Forçando síntese com {len(agent.search_results)} resultados parciais")
                
                # Converter e sintetizar resultados parciais
                baml_results = self._convert_to_baml_results(agent.search_results)
                
                from services.synthesis_helper_service import synthesize_with_fallback
                synthesis_result = await synthesize_with_fallback(
                    original_query=research_input.user_original_query,
                    search_results=baml_results
                )
                
                # Adicionar disclaimer sobre pesquisa incompleta
                synthesis_result.disclaimer += " NOTA: Esta síntese foi gerada a partir de uma pesquisa parcialmente concluída."
                synthesis_result.limitations.append("Pesquisa interrompida antes da conclusão completa")
                
                return synthesis_result
            else:
                return self._create_no_results_response(research_input)
                
        except Exception as e:
            logger.error(f"❌ Erro na síntese forçada: {e}")
            return self._create_error_result(research_input, str(e))
    
    def _convert_to_baml_results(self, search_results: List[Dict[str, Any]]) -> List[RawSearchResultItem]:
        """Converte resultados do agente para formato BAML."""
        baml_results = []
        
        for result in search_results:
            # Mapear source string para enum
            source_map = {
                "PUBMED": ResearchSourceType.PUBMED,
                "WEB_SEARCH_BRAVE": ResearchSourceType.WEB_SEARCH_BRAVE,
                "PDF_ANALYSIS": ResearchSourceType.WEB_SEARCH_BRAVE
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
                citation_count=result["citation_count"],
                synthesis_relevance_score=result.get("relevance_score", None)
            )
            baml_results.append(baml_result)
        
        return baml_results
    
    def _create_no_results_response(self, research_input: ResearchTaskInput) -> SynthesizedResearchOutput:
        """Cria resposta quando nenhum resultado foi encontrado."""
        return SynthesizedResearchOutput(
            original_query=research_input.user_original_query,
            executive_summary="Nenhum resultado foi encontrado para a pesquisa realizada.",
            key_findings_by_theme=[],
            evidence_quality_assessment="Não foi possível avaliar - nenhuma evidência encontrada.",
            clinical_implications=[],
            research_gaps_identified=["Necessidade de mais pesquisas na área especificada."],
            relevant_references=[],
            search_strategy_used="Pesquisa autônoma com múltiplas fontes",
            limitations=["Nenhum resultado encontrado nas bases de dados consultadas."],
            disclaimer="Nenhuma evidência foi encontrada para a pergunta de pesquisa especificada."
        )
    
    def _create_error_result(self, research_input: ResearchTaskInput, error_msg: str) -> SynthesizedResearchOutput:
        """Cria resultado de erro estruturado."""
        return SynthesizedResearchOutput(
            original_query=research_input.user_original_query,
            executive_summary=f"Erro durante a pesquisa: {error_msg}",
            key_findings_by_theme=[],
            evidence_quality_assessment="Não foi possível completar a avaliação devido a erro.",
            clinical_implications=[],
            research_gaps_identified=[],
            relevant_references=[],
            search_strategy_used="Pesquisa autônoma (interrompida por erro)",
            limitations=[f"Pesquisa interrompida devido a erro: {error_msg}"],
            disclaimer=f"Esta pesquisa não pôde ser concluída devido a um erro técnico: {error_msg}"
        )

# Instância global do serviço
_autonomous_research_service = None

async def get_autonomous_research_service() -> AutonomousResearchService:
    """Obtém instância singleton do serviço de pesquisa autônoma."""
    global _autonomous_research_service
    if _autonomous_research_service is None:
        _autonomous_research_service = AutonomousResearchService()
    return _autonomous_research_service

async def conduct_autonomous_research(research_input: ResearchTaskInput) -> SynthesizedResearchOutput:
    """
    Função de conveniência para conduzir pesquisa autônoma.
    
    Args:
        research_input: Input da pesquisa
        
    Returns:
        SynthesizedResearchOutput: Resultado sintetizado
    """
    service = await get_autonomous_research_service()
    return await service.conduct_autonomous_research(research_input) 