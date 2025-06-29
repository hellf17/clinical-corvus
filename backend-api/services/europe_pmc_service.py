"""
Serviço de Integração com Europe PMC API.

Acessa 33M+ publicações incluindo texto completo, preprints e literatura cinzenta.
"""

import asyncio
import aiohttp
import logging
import json
from typing import List, Dict, Any, Optional
from urllib.parse import quote_plus
from datetime import datetime

from models.research_models import RawSearchResultItemPydantic

logger = logging.getLogger(__name__)

class EuropePMCService:
    """
    Serviço para busca na base de dados Europe PMC.
    
    Features:
    - 33M+ publicações de múltiplas fontes
    - 10.2M artigos em texto completo
    - Preprints e literatura cinzenta
    - Cross-references para outras bases
    - Citation counts e network
    """
    
    def __init__(self):
        self.base_url = "https://www.ebi.ac.uk/europepmc/webservices/rest"
        self.max_retries = 3
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    async def search_europe_pmc(
        self,
        query: str,
        max_results: int = 25,
        result_type: str = "core",
        include_preprints: bool = True,
        years_back: Optional[int] = 5
    ) -> List[RawSearchResultItemPydantic]:
        """
        Busca no Europe PMC com parâmetros avançados.
        
        Args:
            query: Query de busca
            max_results: Máximo de resultados (até 25 por request)
            result_type: "core", "lite", ou "idlist"
            include_preprints: Incluir preprints
            years_back: Filtrar por anos recentes
        """
        try:
            logger.info(f"🔍 Buscando no Europe PMC: '{query}' (max: {max_results})")
            
            # Construir query otimizada
            enhanced_query = await self._build_enhanced_query(
                query, include_preprints, years_back
            )
            
            # Executar busca
            results = await self._execute_search(
                enhanced_query, max_results, result_type
            )
            
            # Converter para formato padronizado
            converted_results = await self._convert_europe_pmc_results(results, query)
            
            logger.info(f"✅ Europe PMC retornou {len(converted_results)} resultados")
            return converted_results
            
        except Exception as e:
            logger.error(f"❌ Erro na busca Europe PMC: {e}")
            return []
    
    async def _build_enhanced_query(
        self,
        query: str,
        include_preprints: bool = True,
        years_back: Optional[int] = 5
    ) -> str:
        """
        Constrói query otimizada para Europe PMC com filtros específicos.
        """
        try:
            enhanced_query = query
            
            # Adicionar filtros de fonte se incluir preprints
            if include_preprints:
                # SRC:MED (PubMed), SRC:PPR (Preprints), SRC:PMC (PMC)
                enhanced_query += " AND (SRC:MED OR SRC:PPR OR SRC:PMC)"
            
            # Filtro temporal
            if years_back:
                current_year = datetime.now().year
                start_year = current_year - years_back
                enhanced_query += f" AND PUB_YEAR:[{start_year} TO {current_year}]"
            
            # Filtro para humanos (quando aplicável)
            if any(term in query.lower() for term in ["clinical", "patient", "treatment", "therapy"]):
                enhanced_query += " AND (MESH:\"Humans\" OR humans[MeSH])"
            
            # Adicionar filtro de idioma para inglês
            enhanced_query += " AND LANG:eng"
            
            # Priorizar artigos com abstract
            enhanced_query += " AND HAS_ABSTRACT:y"
            
            logger.info(f"📊 Query Europe PMC enhanced: {enhanced_query}")
            return enhanced_query
            
        except Exception as e:
            logger.error(f"❌ Erro ao construir query Europe PMC: {e}")
            return query
    
    async def _execute_search(
        self,
        query: str,
        max_results: int,
        result_type: str = "core"
    ) -> Dict[str, Any]:
        """
        Executa busca na API do Europe PMC.
        """
        search_url = f"{self.base_url}/search"
        
        params = {
            "query": query,
            "resultType": result_type,
            "pageSize": min(max_results, 25),  # Máximo 25 por request
            "format": "json",
            "sort": "RELEVANCE",  # Ordenar por relevância
            "synonym": "true",  # Incluir sinônimos
            "cursorMark": "*"  # Para paginação se necessário
        }
        
        async with aiohttp.ClientSession(timeout=self.timeout) as session:
            for attempt in range(self.max_retries):
                try:
                    async with session.get(search_url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            logger.info(f"✅ Europe PMC API respondeu: {response.status}")
                            return data
                        else:
                            logger.warning(f"⚠️ Europe PMC API retornou: {response.status}")
                            
                except asyncio.TimeoutError:
                    logger.warning(f"⏱️ Timeout na tentativa {attempt + 1}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                    
                except Exception as e:
                    logger.error(f"❌ Erro na tentativa {attempt + 1}: {e}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
        
        return {}
    
    async def _convert_europe_pmc_results(
        self,
        europe_pmc_response: Dict[str, Any],
        original_query: str
    ) -> List[RawSearchResultItemPydantic]:
        """
        Converte resultados do Europe PMC para formato padronizado.
        """
        converted_results = []
        
        try:
            # Europe PMC retorna dados em 'resultList.result'
            result_list = europe_pmc_response.get("resultList", {})
            results = result_list.get("result", [])
            
            if not results:
                logger.warning("⚠️ Resposta Europe PMC sem resultados")
                return []
            
            for result in results:
                try:
                    # Extrair informações principais
                    pmid = result.get("pmid", "")
                    pmcid = result.get("pmcid", "")
                    title = result.get("title", "Título não disponível")
                    abstract = result.get("abstractText", "")
                    
                    # Dados de publicação
                    pub_date = self._extract_publication_date(result)
                    authors = self._extract_authors(result)
                    journal = self._extract_journal_info(result)
                    
                    # Identificadores
                    doi = result.get("doi", "")
                    
                    # Métricas
                    citation_count = result.get("citedByCount", 0)
                    
                    # URL baseada em PMID ou PMCID
                    url = self._build_article_url(pmid, pmcid, doi)
                    
                    # Classificação de tipo de estudo
                    study_type = self._classify_study_type(result)
                    
                    # Determinar fonte (PubMed, PMC, Preprint, etc.)
                    source_type = self._determine_source_type(result)
                    
                    # Criar resultado padronizado
                    converted_result = RawSearchResultItemPydantic(
                        source=source_type,
                        title=title,
                        url=url,
                        snippet_or_abstract=abstract,
                        publication_date=pub_date,
                        authors=authors,
                        journal=journal,
                        pmid=pmid if pmid else None,
                        doi=doi if doi else None,
                        study_type=study_type,
                        citation_count=int(citation_count) if citation_count else 0,
                        relevance_score=self._calculate_relevance_score(result, original_query),
                        composite_impact_score=self._calculate_impact_score(result),
                        academic_source_name="europe_pmc"
                    )
                    
                    converted_results.append(converted_result)
                    
                    logger.debug(f"✅ Convertido Europe PMC: {title[:50]}...")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao converter resultado Europe PMC: {e}")
                    continue
            
            logger.info(f"✅ {len(converted_results)} resultados convertidos do Europe PMC")
            return converted_results
            
        except Exception as e:
            logger.error(f"❌ Erro na conversão de resultados Europe PMC: {e}")
            return []
    
    def _extract_publication_date(self, result: Dict[str, Any]) -> Optional[str]:
        """Extrai data de publicação do resultado Europe PMC."""
        try:
            # Europe PMC tem múltiplos campos de data
            date_fields = [
                "firstPublicationDate",
                "electronicPublicationDate", 
                "pubYear"
            ]
            
            for field in date_fields:
                if field in result and result[field]:
                    return str(result[field])
            
            return None
        except:
            return None
    
    def _extract_authors(self, result: Dict[str, Any]) -> List[str]:
        """Extrai lista de autores."""
        try:
            authors = []
            author_list = result.get("authorList", {}).get("author", [])
            
            for author in author_list:
                if isinstance(author, dict):
                    first_name = author.get("firstName", "")
                    last_name = author.get("lastName", "")
                    full_name = author.get("fullName", "")
                    
                    if full_name:
                        authors.append(full_name)
                    elif first_name and last_name:
                        authors.append(f"{first_name} {last_name}")
                    elif last_name:
                        authors.append(last_name)
            
            return authors[:10]  # Limitar a 10 autores
            
        except:
            return []
    
    def _extract_journal_info(self, result: Dict[str, Any]) -> Optional[str]:
        """Extrai informações do journal."""
        try:
            journal_info = result.get("journalInfo", {})
            journal_title = journal_info.get("journal", {}).get("title", "")
            
            if journal_title:
                return journal_title
            
            # Fallback para outros campos
            return result.get("bookOrReportDetails", {}).get("publisher", None)
            
        except:
            return None
    
    def _build_article_url(self, pmid: str, pmcid: str, doi: str) -> str:
        """Constrói URL para o artigo."""
        try:
            if pmid:
                return f"https://europepmc.org/article/MED/{pmid}"
            elif pmcid:
                return f"https://europepmc.org/article/PMC/{pmcid}"
            elif doi:
                return f"https://doi.org/{doi}"
            else:
                return ""
        except:
            return ""
    
    def _determine_source_type(self, result: Dict[str, Any]) -> str:
        """Determina o tipo de fonte baseado nos metadados."""
        try:
            source = result.get("source", "").upper()
            
            if "PPR" in source or "PREPRINT" in source:
                return "PREPRINT"
            elif "PMC" in source:
                return "EUROPE_PMC"
            elif "MED" in source or result.get("pmid"):
                return "PUBMED"
            else:
                return "EUROPE_PMC"
        except:
            return "EUROPE_PMC"
    
    def _classify_study_type(self, result: Dict[str, Any]) -> Optional[str]:
        """Classifica tipo de estudo baseado nos metadados."""
        try:
            # Verificar publication types
            pub_types = result.get("pubTypeList", {}).get("pubType", [])
            pub_type_names = [pt.get("term", "").lower() for pt in pub_types]
            
            title = result.get("title", "").lower()
            abstract = result.get("abstractText", "").lower()
            
            # Classificação baseada em publication types e conteúdo
            if any("meta-analysis" in pt for pt in pub_type_names):
                return "Meta-Analysis"
            elif any("systematic review" in pt for pt in pub_type_names):
                return "Systematic Review"
            elif any("randomized controlled trial" in pt for pt in pub_type_names):
                return "Randomized Controlled Trial"
            elif any("clinical trial" in pt for pt in pub_type_names):
                return "Clinical Trial"
            elif any("review" in pt for pt in pub_type_names):
                return "Review Article"
            
            # Fallback para análise de texto
            if "meta-analysis" in title + abstract:
                return "Meta-Analysis"
            elif "systematic review" in title + abstract:
                return "Systematic Review"
            elif "randomized" in title + abstract:
                return "Randomized Controlled Trial"
            elif "cohort" in title + abstract:
                return "Cohort Study"
            elif "case-control" in title + abstract:
                return "Case-Control Study"
            else:
                return "Research Article"
                
        except:
            return "Research Article"
    
    def _calculate_relevance_score(self, result: Dict[str, Any], query: str) -> float:
        """Calcula score de relevância."""
        try:
            score = 0.0
            title = result.get("title", "").lower()
            abstract = result.get("abstractText", "").lower()
            query_words = query.lower().split()
            
            for word in query_words:
                if word in title:
                    score += 0.4  # Peso maior para título
                if word in abstract:
                    score += 0.1
            
            # Boost para artigos com texto completo
            if result.get("hasTextMinedTerms") == "Y":
                score += 0.1
            
            # Boost para artigos open access
            if result.get("isOpenAccess") == "Y":
                score += 0.1
            
            return min(score, 1.0)
            
        except:
            return 0.5
    
    def _calculate_impact_score(self, result: Dict[str, Any]) -> Optional[float]:
        """Calcula score de impacto."""
        try:
            citations = int(result.get("citedByCount", 0))
            
            # Normalização baseada em citações
            if citations == 0:
                return 0.0
            elif citations < 5:
                return 0.2
            elif citations < 20:
                return 0.4
            elif citations < 50:
                return 0.6
            elif citations < 100:
                return 0.8
            else:
                return 1.0
                
        except:
            return None

# Instância global do serviço
_europe_pmc_service = None

async def get_europe_pmc_service() -> EuropePMCService:
    """Obtém instância singleton do serviço Europe PMC."""
    global _europe_pmc_service
    if _europe_pmc_service is None:
        _europe_pmc_service = EuropePMCService()
    return _europe_pmc_service

# Função de conveniência
async def search_europe_pmc(
    query: str,
    max_results: int = 25,
    include_preprints: bool = True,
    years_back: Optional[int] = 5
) -> List[RawSearchResultItemPydantic]:
    """
    Função de conveniência para busca no Europe PMC.
    """
    service = await get_europe_pmc_service()
    return await service.search_europe_pmc(
        query=query,
        max_results=max_results,
        include_preprints=include_preprints,
        years_back=years_back
    ) 