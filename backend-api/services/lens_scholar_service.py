"""
Serviço de Integração com Lens.org Scholar API.

Utiliza a API REST oficial do Lens.org para acessar a literatura acadêmica e dados de patentes.
Documentação: https://docs.api.lens.org/
"""

import asyncio
import logging
import os
import json
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime

from models.research_models import RawSearchResultItemPydantic

logger = logging.getLogger(__name__)

class LensScholarService:
    """
    Serviço para busca na base de dados Lens.org usando API REST oficial.
    """
    
    def __init__(self):
        self.api_key = os.getenv("LENS_SCHOLAR_API_KEY")
        self.base_url = "https://api.lens.org"
        self.max_retries = 3
        self.timeout = 30
        
        if not self.api_key:
            logger.warning("⚠️ LENS_SCHOLAR_API_KEY não configurada")
        else:
            logger.info("✅ LensScholar API REST client inicializado")
    
    async def search_lens_scholarly(
        self, 
        query: str, 
        max_results: int = 10,
        years_back: int = 5,
        include_patents: bool = False
    ) -> List[RawSearchResultItemPydantic]:
        """
        Busca literatura acadêmica no Lens.org usando API REST oficial.
        """
        if not self.api_key:
            logger.error("❌ LENS_SCHOLAR_API_KEY não configurada")
            return []
        
        try:
            logger.info(f"🔍 Buscando no Lens.org API: '{query}' (max: {max_results})")
            
            # Construir payload da query
            search_payload = await self._build_search_payload(query, max_results, years_back)
            
            # Executar busca via API REST
            response_data = await self._execute_search_request(search_payload)
            
            # Converter resultados para formato padronizado
            converted_results = await self._convert_lens_results(response_data, query)
            
            logger.info(f"✅ Lens.org API retornou {len(converted_results)} resultados")
            return converted_results
            
        except Exception as e:
            logger.error(f"❌ Erro na busca Lens.org API: {e}")
            return []
    
    async def _build_search_payload(
        self, 
        query: str, 
        max_results: int = 10,
        years_back: int = 5
    ) -> Dict[str, Any]:
        """
        Constrói payload para API REST do Lens.org conforme documentação oficial.
        """
        current_year = datetime.now().year
        start_year = current_year - years_back
        
        # Payload seguindo documentação Lens.org API
        payload = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "title^3",      # Boost título
                                    "abstract^2",   # Boost abstract
                                    "keywords^1.5", # Boost keywords
                                    "full_text"     # Texto completo
                                ],
                                "type": "best_fields",
                                "minimum_should_match": "75%"
                            }
                        }
                    ],
                    "filter": [
                        {
                            "range": {
                                "year_published": {
                                    "gte": start_year,
                                    "lte": current_year
                                }
                            }
                        },
                        {
                            "term": {
                                "has_full_text": True  # Priorizar com texto completo
                            }
                        },
                        {
                            "terms": {
                                "languages": ["en"]
                            }
                        }
                    ]
                }
            },
            "size": max_results,
            "sort": [
                {"_score": {"order": "desc"}},  # Relevância primeiro
                {"scholarly_citations_count": {"order": "desc"}},  # Depois citações
                {"year_published": {"order": "desc"}}  # Por último, recência
            ],
            "include": [
                "lens_id",
                "title", 
                "abstract",
                "authors",
                "source",
                "year_published",
                "date_published",
                "scholarly_citations_count",
                "external_ids",
                "keywords",
                "fields_of_study"
            ]
        }
        
        logger.info(f"📊 Query Lens construída para período {start_year}-{current_year}")
        return payload
    
    async def _execute_search_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executa requisição para API REST do Lens.org.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        url = f"{self.base_url}/scholarly/search"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    logger.debug(f"📡 Tentativa {attempt + 1}/{self.max_retries}: POST {url}")
                    
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Lens.org API respondeu com sucesso")
                        return response.json()
                    elif response.status_code == 401:
                        logger.error("❌ API Key inválida para Lens.org")
                        raise Exception("Invalid API Key")
                    elif response.status_code == 429:
                        logger.warning(f"⚠️ Rate limit atingido, tentativa {attempt + 1}")
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(2 ** attempt)  # Backoff exponencial
                            continue
                    else:
                        logger.warning(f"⚠️ Status {response.status_code}: {response.text}")
                        
                except httpx.TimeoutException:
                    logger.warning(f"⚠️ Timeout na tentativa {attempt + 1}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(1)
                        continue
                except Exception as e:
                    logger.error(f"❌ Erro na requisição: {e}")
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(1)
                        continue
                    raise
        
        raise Exception("Falha em todas as tentativas de requisição")
    
    async def _convert_lens_results(
        self, 
        lens_response: Dict[str, Any],
        original_query: str
    ) -> List[RawSearchResultItemPydantic]:
        """
        Converte resultados da API REST do Lens.org para formato padronizado.
        """
        converted_results = []
        
        try:
            if not lens_response or "data" not in lens_response:
                logger.warning("⚠️ Resposta Lens.org API sem dados")
                return []
            
            hits = lens_response.get("data", [])
            total_hits = lens_response.get("total", 0)
            
            logger.info(f"📊 Lens.org encontrou {total_hits} resultados totais")
            
            for result in hits:
                try:
                    # Extrair informações principais seguindo schema oficial
                    lens_id = result.get("lens_id", "")
                    title = result.get("title", "Título não disponível")
                    abstract = result.get("abstract", "")
                    
                    # Dados de publicação
                    pub_date = self._extract_publication_date(result)
                    authors = self._extract_authors(result)
                    journal = self._extract_journal_info(result)
                    
                    # Métricas e identificadores
                    citation_count = result.get("scholarly_citations_count", 0)
                    doi = self._extract_doi(result)
                    
                    # URL do Lens
                    lens_url = f"https://www.lens.org/lens/scholar/article/{lens_id}" if lens_id else ""
                    
                    # Criar resultado padronizado
                    converted_result = RawSearchResultItemPydantic(
                        source="LENS_SCHOLARLY",
                        title=title,
                        url=lens_url,
                        snippet_or_abstract=abstract,
                        publication_date=pub_date,
                        authors=authors,
                        journal=journal,
                        pmid=None,  # Lens não tem PMID direto
                        doi=doi,
                        study_type=self._classify_study_type(result),
                        citation_count=citation_count,
                        relevance_score=self._calculate_relevance_score(result, original_query),
                        composite_impact_score=self._calculate_impact_score(result),
                        academic_source_name="lens_org_api"
                    )
                    
                    converted_results.append(converted_result)
                    
                    logger.debug(f"✅ Convertido: {title[:50]}...")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao converter resultado Lens: {e}")
                    continue
            
            logger.info(f"✅ {len(converted_results)} resultados convertidos da API Lens.org")
            return converted_results
            
        except Exception as e:
            logger.error(f"❌ Erro na conversão de resultados Lens API: {e}")
            return []
    
    def _extract_publication_date(self, result: Dict[str, Any]) -> Optional[str]:
        """Extrai data de publicação seguindo schema oficial."""
        try:
            # Schema oficial do Lens.org
            date_fields = [
                "date_published", 
                "year_published"
            ]
            
            for field in date_fields:
                if field in result and result[field]:
                    return str(result[field])
            
            return None
        except:
            return None
    
    def _extract_authors(self, result: Dict[str, Any]) -> List[str]:
        """Extrai lista de autores seguindo schema oficial."""
        try:
            authors = []
            authors_data = result.get("authors", [])
            
            for author in authors_data:
                if isinstance(author, dict):
                    # Schema oficial do Lens.org
                    first_name = author.get("first_name", "")
                    last_name = author.get("last_name", "")
                    display_name = author.get("display_name", "")
                    
                    if display_name:
                        authors.append(display_name)
                    elif first_name and last_name:
                        authors.append(f"{first_name} {last_name}")
                elif isinstance(author, str):
                    authors.append(author)
            
            return authors[:10]  # Limitar a 10 autores
            
        except:
            return []
    
    def _extract_journal_info(self, result: Dict[str, Any]) -> Optional[str]:
        """Extrai informações do journal seguindo schema oficial."""
        try:
            source = result.get("source", {})
            if isinstance(source, dict):
                return source.get("title", None)
            return str(source) if source else None
        except:
            return None
    
    def _extract_doi(self, result: Dict[str, Any]) -> Optional[str]:
        """Extrai DOI seguindo schema oficial."""
        try:
            external_ids = result.get("external_ids", [])
            for ext_id in external_ids:
                if ext_id.get("type") == "doi":
                    return ext_id.get("value")
            return None
        except:
            return None
    
    def _classify_study_type(self, result: Dict[str, Any]) -> Optional[str]:
        """Classifica tipo de estudo baseado nos dados da API oficial."""
        try:
            title = result.get("title", "").lower()
            abstract = result.get("abstract", "").lower()
            keywords = result.get("keywords", [])
            fields_of_study = result.get("fields_of_study", [])
            
            # Combinação de sinais do schema oficial
            content = title + " " + abstract + " " + " ".join(keywords) + " " + " ".join(fields_of_study)
            content = content.lower()
            
            # Classificação baseada em evidência
            if any(word in content for word in ["meta-analysis", "meta analysis"]):
                return "Meta-Analysis"
            elif any(word in content for word in ["systematic review", "systematic literature review"]):
                return "Systematic Review"
            elif any(word in content for word in ["randomized controlled trial", "rct", "randomized"]):
                return "Randomized Controlled Trial"
            elif any(word in content for word in ["cohort study", "cohort"]):
                return "Cohort Study"
            elif any(word in content for word in ["case-control", "case control"]):
                return "Case-Control Study"
            elif "review" in content:
                return "Review Article"
            else:
                return "Research Article"
                
        except:
            return "Research Article"
    
    def _calculate_relevance_score(self, result: Dict[str, Any], query: str) -> float:
        """Calcula score de relevância usando dados da API oficial."""
        try:
            score = 0.0
            title = result.get("title", "").lower()
            abstract = result.get("abstract", "").lower()
            query_words = query.lower().split()
            
            # Score baseado em matching (usando dados estruturados da API)
            for word in query_words:
                if word in title:
                    score += 0.3  # Título tem peso maior
                if word in abstract:
                    score += 0.1
            
            # Bonus para resultados com texto completo
            if result.get("has_full_text", False):
                score += 0.1
            
            # Normalizar entre 0 e 1
            return min(score, 1.0)
            
        except:
            return 0.5  # Score neutro em caso de erro
    
    def _calculate_impact_score(self, result: Dict[str, Any]) -> Optional[float]:
        """Calcula score de impacto usando métricas da API oficial."""
        try:
            citations = result.get("scholarly_citations_count", 0)
            
            if citations == 0:
                return 0.0
            elif citations < 10:
                return 0.3
            elif citations < 50:
                return 0.6
            elif citations < 100:
                return 0.8
            else:
                return 1.0
                
        except:
            return None

# Instância global do serviço
_lens_scholar_service = None

async def get_lens_scholar_service() -> LensScholarService:
    """Obtém instância singleton do serviço Lens Scholar."""
    global _lens_scholar_service
    if _lens_scholar_service is None:
        _lens_scholar_service = LensScholarService()
    return _lens_scholar_service

# Função de conveniência para uso direto
async def search_lens_scholarly(
    query: str,
    max_results: int = 10,
    years_back: int = 5
) -> List[RawSearchResultItemPydantic]:
    """
    Função de conveniência para busca no Lens.org via API REST oficial.
    """
    service = await get_lens_scholar_service()
    return await service.search_lens_scholarly(
        query=query,
        max_results=max_results,
        years_back=years_back
    ) 