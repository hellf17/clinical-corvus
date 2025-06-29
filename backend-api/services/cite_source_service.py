"""
CiteSource Service - Sistema Avançado de Gerenciamento de Citações e Deduplicação.

Implementa metodologia inspirada no CiteSource para:
- Deduplicação inteligente mantendo metadados de origem
- Análise de performance e cobertura de fontes
- Validação de qualidade e benchmarking
- Normalização e estruturação de referências
- Métricas de eficácia de busca
"""

import asyncio
import logging
import hashlib
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from collections import defaultdict, Counter
from difflib import SequenceMatcher
import json

from models.research_models import RawSearchResultItemPydantic
from baml_client.types import ResearchSourceType, RawSearchResultItem

logger = logging.getLogger(__name__)

@dataclass
class SourceMetrics:
    """Métricas de performance por fonte."""
    source_name: str
    total_results: int = 0
    unique_contributions: int = 0
    overlap_with_others: int = 0
    quality_score: float = 0.0
    coverage_percentage: float = 0.0
    average_citation_count: float = 0.0
    high_impact_count: int = 0
    recent_publications_count: int = 0
    full_text_available_count: int = 0
    response_time_ms: float = 0.0
    success_rate: float = 100.0

@dataclass
class DeduplicationResult:
    """Resultado da deduplicação."""
    original_count: int
    deduplicated_count: int
    removed_duplicates: int
    duplicate_groups: List[List[str]] = field(default_factory=list)
    source_contributions: Dict[str, int] = field(default_factory=dict)

@dataclass
class CitationCluster:
    """Cluster de citações relacionadas."""
    primary_result: RawSearchResultItem
    duplicate_results: List[RawSearchResultItem] = field(default_factory=list)
    source_origins: Set[str] = field(default_factory=set)
    confidence_score: float = 0.0
    merge_rationale: str = ""
    preserved_metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class QualityAssessment:
    """Avaliação de qualidade da busca."""
    overall_score: float
    coverage_score: float
    diversity_score: float
    recency_score: float
    impact_score: float
    source_balance_score: float
    completeness_indicators: Dict[str, bool]
    recommendations: List[str]

@dataclass
class CiteSourceReport:
    """Relatório completo do CiteSource."""
    query: str
    total_sources_used: int
    deduplication_result: DeduplicationResult
    source_metrics: List[SourceMetrics]
    quality_assessment: QualityAssessment
    citation_clusters: List[CitationCluster]
    processing_time_ms: float
    timestamp: str
    recommendations: List[str]

class CiteSourceService:
    """
    Serviço principal do CiteSource para gerenciamento avançado de citações.
    """
    
    def __init__(self):
        self.similarity_threshold = 0.85  # Threshold para considerar duplicatas
        self.title_weight = 0.4
        self.author_weight = 0.3
        self.doi_weight = 0.8
        self.pmid_weight = 0.9
        self.abstract_weight = 0.2
        
        # Benchmark de fontes conhecidas para validação
        self.source_benchmarks = {
            "PUBMED": {"expected_coverage": 0.7, "quality_weight": 0.9},
            "EUROPE_PMC": {"expected_coverage": 0.8, "quality_weight": 0.85},
            "LENS_SCHOLARLY": {"expected_coverage": 0.9, "quality_weight": 0.8},
            "WEB_SEARCH_BRAVE": {"expected_coverage": 0.4, "quality_weight": 0.6},
            "PREPRINT": {"expected_coverage": 0.3, "quality_weight": 0.7}
        }
    
    async def process_search_results(
        self,
        results: List[RawSearchResultItem],
        query: str,
        source_timing: Optional[Dict[str, float]] = None
    ) -> CiteSourceReport:
        """
        Processa resultados de busca aplicando deduplicação e análise completa.
        """
        start_time = datetime.now()
        logger.info(f"🔬 CiteSource processando {len(results)} resultados para: '{query}'")
        
        try:
            # 1. Análise inicial de fontes
            source_metrics = await self._analyze_source_performance(results, source_timing or {})
            
            # 2. Deduplicação inteligente
            citation_clusters, dedup_result = await self._intelligent_deduplication(results)
            
            # 3. Avaliação de qualidade
            quality_assessment = await self._assess_search_quality(citation_clusters, source_metrics)
            
            # 4. Gerar recomendações
            recommendations = await self._generate_recommendations(
                citation_clusters, source_metrics, quality_assessment
            )
            
            # 5. Criar relatório final
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            report = CiteSourceReport(
                query=query,
                total_sources_used=len(set(r.source for r in results)),
                deduplication_result=dedup_result,
                source_metrics=source_metrics,
                quality_assessment=quality_assessment,
                citation_clusters=citation_clusters,
                processing_time_ms=processing_time,
                timestamp=datetime.now().isoformat(),
                recommendations=recommendations
            )
            
            logger.info(f"✅ CiteSource concluído: {len(citation_clusters)} clusters, "
                       f"{dedup_result.removed_duplicates} duplicatas removidas")
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Erro no processamento CiteSource: {e}")
            raise
    
    async def _intelligent_deduplication(
        self, 
        results: List[RawSearchResultItem]
    ) -> Tuple[List[CitationCluster], DeduplicationResult]:
        """
        Realiza deduplicação inteligente mantendo metadados de origem.
        """
        logger.info("🔍 Iniciando deduplicação inteligente...")
        
        clusters = []
        processed_indices = set()
        duplicate_groups = []
        source_contributions = defaultdict(int)
        
        for i, result in enumerate(results):
            if i in processed_indices:
                continue
            
            # Criar novo cluster com resultado principal
            cluster = CitationCluster(
                primary_result=result,
                source_origins={str(result.source)},
                preserved_metadata={"primary_source": str(result.source)}
            )
            
            # Contar contribuição da fonte
            source_contributions[str(result.source)] += 1
            
            # Encontrar duplicatas
            duplicates = []
            duplicate_indices = []
            
            for j, other_result in enumerate(results[i+1:], i+1):
                if j in processed_indices:
                    continue
                
                similarity = await self._calculate_similarity(result, other_result)
                
                if similarity >= self.similarity_threshold:
                    duplicates.append(other_result)
                    duplicate_indices.append(j)
                    cluster.source_origins.add(str(other_result.source))
                    
                    # Preservar metadados únicos da duplicata
                    await self._merge_metadata(cluster, other_result)
            
            if duplicates:
                cluster.duplicate_results = duplicates
                cluster.confidence_score = await self._calculate_cluster_confidence(cluster)
                cluster.merge_rationale = await self._generate_merge_rationale(cluster)
                
                # Registrar grupo de duplicatas
                duplicate_group = [result.title] + [d.title for d in duplicates]
                duplicate_groups.append(duplicate_group)
                
                # Marcar índices como processados
                processed_indices.update(duplicate_indices)
            
            processed_indices.add(i)
            clusters.append(cluster)
        
        dedup_result = DeduplicationResult(
            original_count=len(results),
            deduplicated_count=len(clusters),
            removed_duplicates=len(results) - len(clusters),
            duplicate_groups=duplicate_groups,
            source_contributions=dict(source_contributions)
        )
        
        logger.info(f"✅ Deduplicação: {len(results)} → {len(clusters)} "
                   f"({dedup_result.removed_duplicates} duplicatas removidas)")
        
        return clusters, dedup_result
    
    async def _calculate_similarity(
        self, 
        result1: RawSearchResultItem, 
        result2: RawSearchResultItem
    ) -> float:
        """
        Calcula similaridade entre dois resultados usando múltiplos critérios.
        """
        similarity_score = 0.0
        
        # 1. Identificadores únicos (peso máximo)
        if result1.doi and result2.doi and result1.doi == result2.doi:
            return 1.0
        
        if result1.pmid and result2.pmid and result1.pmid == result2.pmid:
            return 1.0
        
        # 2. Similaridade de título
        if result1.title and result2.title:
            title_sim = self._text_similarity(
                self._normalize_title(result1.title),
                self._normalize_title(result2.title)
            )
            similarity_score += title_sim * self.title_weight
        
        # 3. Similaridade de autores
        if result1.authors and result2.authors:
            author_sim = self._author_similarity(result1.authors, result2.authors)
            similarity_score += author_sim * self.author_weight
        
        # 4. Similaridade de abstract/snippet
        if result1.snippet_or_abstract and result2.snippet_or_abstract:
            abstract_sim = self._text_similarity(
                result1.snippet_or_abstract[:200],  # Primeiros 200 chars
                result2.snippet_or_abstract[:200]
            )
            similarity_score += abstract_sim * self.abstract_weight
        
        # 5. Mesmo journal
        if result1.journal and result2.journal:
            if result1.journal.lower() == result2.journal.lower():
                similarity_score += 0.1
        
        return min(similarity_score, 1.0)
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """Calcula similaridade entre textos."""
        if not text1 or not text2:
            return 0.0
        
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def _normalize_title(self, title: str) -> str:
        """Normaliza título removendo caracteres especiais, boilerplate e padronizando."""
        if not title:
            return ""

        normalized = title.lower()

        # Common boilerplate/source tags to remove (case-insensitive)
        # Order matters: more specific or longer patterns first
        boilerplate_patterns = [
            r"\s*-\s*pubmed\s*$",  # Matches " - PubMed" at the end
            r"\s*\|\s*stroke\s*$", # Matches " | Stroke" at the end
            r"\s*\|\s*professional\s+heart\s+daily\s*\|\s*american\s+heart\s+association\s*$", # Matches " | Professional Heart Daily | American Heart Association"
            r"\s*a\s+guideline\s+from\s+the\s+american\s+heart\s+association\s*(?:/|and)\s*american\s+stroke\s+association\s*",
            r"\s*a\s+report\s+of\s+the\s+american\s+college\s+of\s+cardiology\s*(?:/|and)\s*american\s+heart\s+association\s+joint\s+committee\s+on\s+clinical\s+practice\s+guidelines\s*",
            r"\s*-\s*professional\s+heart\s+daily\s*$",
            r"\s*\|\s*circulation\s*$",
            r"^\s*hub\s*-\s*", # Matches "Hub - " at the beginning
            r"\s*:\s*a\s+guideline\s+from.*$", # Matches ": a guideline from..." to the end
            r"\s*guideline\s+for\s+the\s+management\s+of\s+patients\s+with\s*",
            r"\s*guideline\s+for\s+the\s+diagnosis\s+and\s+management\s+of\s*",
            # Add more specific patterns as needed
        ]

        for pattern in boilerplate_patterns:
            normalized = re.sub(pattern, "", normalized, flags=re.IGNORECASE).strip()
        
        # Standard normalization: remove remaining punctuation and extra spaces
        normalized = re.sub(r'[^\w\s]', '', normalized) 
        normalized = re.sub(r'\s+', ' ', normalized).strip() 

        return normalized
    
    def _author_similarity(self, authors1: List[str], authors2: List[str]) -> float:
        """Calcula similaridade entre listas de autores."""
        if not authors1 or not authors2:
            return 0.0
        
        # Normalizar nomes de autores
        norm_authors1 = {self._normalize_author_name(a) for a in authors1}
        norm_authors2 = {self._normalize_author_name(a) for a in authors2}
        
        # Calcular interseção
        intersection = norm_authors1.intersection(norm_authors2)
        union = norm_authors1.union(norm_authors2)
        
        if not union:
            return 0.0
        
        return len(intersection) / len(union)
    
    def _normalize_author_name(self, name: str) -> str:
        """Normaliza nome de autor."""
        if not name:
            return ""
        
        # Remover títulos e pontuação
        name = re.sub(r'\b(Dr|Prof|MD|PhD)\b\.?', '', name, flags=re.IGNORECASE)
        name = re.sub(r'[^\w\s]', '', name)
        
        # Converter para formato "Último, Primeiro"
        parts = name.strip().split()
        if len(parts) >= 2:
            return f"{parts[-1].lower()}, {parts[0].lower()}"
        
        return name.lower().strip()
    
    async def _merge_metadata(self, cluster: CitationCluster, duplicate: RawSearchResultItem):
        """Merge metadados únicos da duplicata no cluster."""
        metadata = cluster.preserved_metadata
        
        # Preservar DOIs adicionais
        if duplicate.doi and duplicate.doi not in metadata.get("dois", []):
            metadata.setdefault("dois", []).append(duplicate.doi)
        
        # Preservar PMIDs adicionais
        if duplicate.pmid and duplicate.pmid not in metadata.get("pmids", []):
            metadata.setdefault("pmids", []).append(duplicate.pmid)
        
        # Preservar URLs únicos
        if duplicate.url and duplicate.url not in metadata.get("urls", []):
            metadata.setdefault("urls", []).append(duplicate.url)
        
        # Preservar informações de citação mais altas
        if duplicate.citation_count and (
            not cluster.primary_result.citation_count or 
            duplicate.citation_count > cluster.primary_result.citation_count
        ):
            metadata["highest_citation_count"] = duplicate.citation_count
            metadata["highest_citation_source"] = str(duplicate.source)
        
        # Preservar informações de fontes acadêmicas
        if hasattr(duplicate, 'academic_source_name') and duplicate.academic_source_name:
            metadata.setdefault("academic_sources", []).append(duplicate.academic_source_name)
    
    async def _calculate_cluster_confidence(self, cluster: CitationCluster) -> float:
        """Calcula confiança do agrupamento."""
        confidence = 0.5  # Base
        
        # Boost por identificadores únicos
        if cluster.preserved_metadata.get("dois") or cluster.preserved_metadata.get("pmids"):
            confidence += 0.3
        
        # Boost por múltiplas fontes
        if len(cluster.source_origins) > 1:
            confidence += 0.1 * len(cluster.source_origins)
        
        # Boost por informações bibliométricas
        if cluster.preserved_metadata.get("highest_citation_count"):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def _generate_merge_rationale(self, cluster: CitationCluster) -> str:
        """Gera explicação do agrupamento."""
        reasons = []
        
        if cluster.preserved_metadata.get("dois"):
            reasons.append("DOI idêntico")
        
        if cluster.preserved_metadata.get("pmids"):
            reasons.append("PMID idêntico")
        
        if len(cluster.source_origins) > 1:
            sources = ", ".join(cluster.source_origins)
            reasons.append(f"Encontrado em múltiplas fontes: {sources}")
        
        if cluster.preserved_metadata.get("highest_citation_count"):
            reasons.append("Métricas bibliométricas consolidadas")
        
        if not reasons:
            reasons = ["Similaridade de título e autores"]
        
        return "; ".join(reasons)
    
    async def _analyze_source_performance(
        self, 
        results: List[RawSearchResultItem],
        source_timing: Dict[str, float]
    ) -> List[SourceMetrics]:
        """
        Analisa performance e qualidade de cada fonte.
        """
        logger.info("📊 Analisando performance das fontes...")
        
        source_stats = defaultdict(lambda: {
            'total': 0, 'citations': [], 'recent': 0, 'full_text': 0
        })
        
        # Coletar estatísticas básicas
        for result in results:
            source_name = str(result.source)
            stats = source_stats[source_name]
            
            stats['total'] += 1
            
            if result.citation_count:
                stats['citations'].append(result.citation_count)
            
            # Verificar se é recente (últimos 3 anos)
            if result.publication_date:
                try:
                    pub_year = int(result.publication_date[:4])
                    current_year = datetime.now().year
                    if current_year - pub_year <= 3:
                        stats['recent'] += 1
                except:
                    pass
            
            # Verificar texto completo (heurística)
            if (result.url and any(indicator in result.url.lower() 
                                 for indicator in ['pmc', 'full', 'pdf', 'doi'])):
                stats['full_text'] += 1
        
        # Calcular métricas por fonte
        metrics_list = []
        
        for source_name, stats in source_stats.items():
            # Calcular qualidade baseada em benchmarks
            benchmark = self.source_benchmarks.get(source_name, {
                "expected_coverage": 0.5, "quality_weight": 0.7
            })
            
            # Score de qualidade baseado em múltiplos fatores
            quality_score = 0.0
            
            # Fator 1: Volume de resultados vs esperado
            if stats['total'] > 0:
                quality_score += 0.3
            
            # Fator 2: Presença de citações
            citation_ratio = len(stats['citations']) / max(stats['total'], 1)
            quality_score += citation_ratio * 0.25
            
            # Fator 3: Publicações recentes
            recent_ratio = stats['recent'] / max(stats['total'], 1)
            quality_score += recent_ratio * 0.2
            
            # Fator 4: Texto completo disponível
            full_text_ratio = stats['full_text'] / max(stats['total'], 1)
            quality_score += full_text_ratio * 0.15
            
            # Fator 5: Peso da fonte
            quality_score *= benchmark["quality_weight"]
            
            metrics = SourceMetrics(
                source_name=source_name,
                total_results=stats['total'],
                quality_score=min(quality_score, 1.0),
                coverage_percentage=stats['total'] / max(len(results), 1) * 100,
                average_citation_count=sum(stats['citations']) / max(len(stats['citations']), 1),
                high_impact_count=len([c for c in stats['citations'] if c > 50]),
                recent_publications_count=stats['recent'],
                full_text_available_count=stats['full_text'],
                response_time_ms=source_timing.get(source_name, 0.0),
                success_rate=100.0 if stats['total'] > 0 else 0.0
            )
            
            metrics_list.append(metrics)
        
        # Calcular contribuições únicas (após deduplicação conceitual)
        await self._calculate_unique_contributions(metrics_list, results)
        
        return metrics_list
    
    async def _calculate_unique_contributions(
        self, 
        metrics_list: List[SourceMetrics], 
        results: List[RawSearchResultItem]
    ):
        """Calcula contribuições únicas de cada fonte."""
        
        # Agrupar por fonte
        source_results = defaultdict(list)
        for result in results:
            source_results[str(result.source)].append(result)
        
        # Para cada fonte, contar quantos resultados são únicos
        for metrics in metrics_list:
            source_name = metrics.source_name
            source_items = source_results[source_name]
            
            unique_count = 0
            overlap_count = 0
            
            for item in source_items:
                # Verificar se este item aparece em outras fontes
                is_unique = True
                
                for other_source, other_items in source_results.items():
                    if other_source == source_name:
                        continue
                    
                    for other_item in other_items:
                        # Verificar similaridade rápida (DOI, PMID, título)
                        if await self._quick_similarity_check(item, other_item):
                            is_unique = False
                            overlap_count += 1
                            break
                    
                    if not is_unique:
                        break
                
                if is_unique:
                    unique_count += 1
            
            metrics.unique_contributions = unique_count
            metrics.overlap_with_others = overlap_count
    
    async def _quick_similarity_check(
        self, 
        item1: RawSearchResultItem, 
        item2: RawSearchResultItem
    ) -> bool:
        """Verificação rápida de similaridade para cálculo de contribuições únicas."""
        
        # DOI ou PMID idênticos = definitivamente o mesmo
        if item1.doi and item2.doi and item1.doi == item2.doi:
            return True
        
        if item1.pmid and item2.pmid and item1.pmid == item2.pmid:
            return True
        
        # Similaridade de título alta
        if item1.title and item2.title:
            title_sim = self._text_similarity(
                self._normalize_title(item1.title),
                self._normalize_title(item2.title)
            )
            if title_sim > 0.9:
                return True
        
        return False
    
    async def _assess_search_quality(
        self, 
        clusters: List[CitationCluster],
        source_metrics: List[SourceMetrics]
    ) -> QualityAssessment:
        """
        Avalia qualidade geral da busca.
        """
        logger.info("🎯 Avaliando qualidade da busca...")
        
        # 1. Score de cobertura (baseado em múltiplas fontes)
        total_sources = len(source_metrics)
        active_sources = len([m for m in source_metrics if m.total_results > 0])
        coverage_score = active_sources / max(total_sources, 1)
        
        # 2. Score de diversidade (baseado em tipos de fonte)
        source_types = set()
        for metrics in source_metrics:
            if "PUBMED" in metrics.source_name:
                source_types.add("academic_primary")
            elif "EUROPE_PMC" in metrics.source_name:
                source_types.add("full_text")
            elif "LENS" in metrics.source_name:
                source_types.add("comprehensive")
            elif "BRAVE" in metrics.source_name:
                source_types.add("web_current")
            elif "PREPRINT" in metrics.source_name:
                source_types.add("preprint")
        
        diversity_score = len(source_types) / 5.0  # 5 tipos ideais
        
        # 3. Score de recência
        total_recent = sum(m.recent_publications_count for m in source_metrics)
        total_results = sum(m.total_results for m in source_metrics)
        recency_score = total_recent / max(total_results, 1)
        
        # 4. Score de impacto
        total_high_impact = sum(m.high_impact_count for m in source_metrics)
        impact_score = min(total_high_impact / max(total_results, 1) * 10, 1.0)
        
        # 5. Score de balanceamento de fontes
        if source_metrics:
            contributions = [m.total_results for m in source_metrics]
            max_contrib = max(contributions)
            min_contrib = min(contributions)
            source_balance_score = min_contrib / max(max_contrib, 1)
        else:
            source_balance_score = 0.0
        
        # Score geral (média ponderada)
        overall_score = (
            coverage_score * 0.25 +
            diversity_score * 0.20 +
            recency_score * 0.20 +
            impact_score * 0.20 +
            source_balance_score * 0.15
        )
        
        # Indicadores de completeness
        completeness_indicators = {
            "multiple_sources_active": active_sources >= 3,
            "high_impact_studies_found": total_high_impact > 0,
            "recent_studies_available": total_recent > 0,
            "full_text_sources_included": any("PMC" in m.source_name for m in source_metrics),
            "comprehensive_coverage": coverage_score > 0.7,
            "balanced_source_contribution": source_balance_score > 0.3
        }
        
        # Gerar recomendações
        recommendations = []
        if coverage_score < 0.7:
            recommendations.append("Considerar incluir fontes adicionais para melhor cobertura")
        if diversity_score < 0.6:
            recommendations.append("Incluir mais tipos de fontes (preprints, diretrizes, etc.)")
        if recency_score < 0.3:
            recommendations.append("Buscar evidências mais recentes")
        if impact_score < 0.2:
            recommendations.append("Incluir critérios para estudos de alto impacto")
        
        return QualityAssessment(
            overall_score=overall_score,
            coverage_score=coverage_score,
            diversity_score=diversity_score,
            recency_score=recency_score,
            impact_score=impact_score,
            source_balance_score=source_balance_score,
            completeness_indicators=completeness_indicators,
            recommendations=recommendations
        )
    
    async def _generate_recommendations(
        self,
        clusters: List[CitationCluster],
        source_metrics: List[SourceMetrics],
        quality_assessment: QualityAssessment
    ) -> List[str]:
        """
        Gera recomendações específicas baseadas na análise.
        """
        recommendations = []
        
        # Análise de gaps
        if len(clusters) < 5:
            recommendations.append("Considerar expandir critérios de busca - poucos resultados únicos encontrados")
        
        # Análise de fontes
        low_performing_sources = [m for m in source_metrics if m.quality_score < 0.5]
        if low_performing_sources:
            source_names = [m.source_name for m in low_performing_sources]
            recommendations.append(f"Otimizar estratégias para fontes: {', '.join(source_names)}")
        
        # Análise de duplicação
        total_originals = sum(m.total_results for m in source_metrics)
        dedup_rate = (total_originals - len(clusters)) / max(total_originals, 1)
        
        if dedup_rate > 0.5:
            recommendations.append("Alta taxa de duplicação detectada - considerar refinar queries")
        
        # Análise de completeness
        missing_indicators = [k for k, v in quality_assessment.completeness_indicators.items() if not v]
        if missing_indicators:
            recommendations.append(f"Considerar melhorar: {', '.join(missing_indicators)}")
        
        # Análise de tempo de resposta
        slow_sources = [m for m in source_metrics if m.response_time_ms > 5000]
        if slow_sources:
            recommendations.append("Algumas fontes apresentaram tempo de resposta elevado")
        
        return recommendations
    
    def get_deduplicated_results(self, clusters: List[CitationCluster]) -> List[RawSearchResultItem]:
        """
        Extrai lista de resultados deduplicados dos clusters.
        """
        deduplicated = []
        
        for cluster in clusters:
            # Usar resultado principal do cluster
            primary = cluster.primary_result
            
            # Enriquecer com metadados preservados
            if cluster.preserved_metadata.get("highest_citation_count"):
                primary.citation_count = cluster.preserved_metadata["highest_citation_count"]
            
            # Adicionar informação sobre cluster
            if hasattr(primary, 'cluster_info'):
                primary.cluster_info = {
                    "sources": list(cluster.source_origins),
                    "confidence": cluster.confidence_score,
                    "duplicates_found": len(cluster.duplicate_results)
                }
            
            deduplicated.append(primary)
        
        return deduplicated

# Instância global do serviço
_cite_source_service = None

async def get_cite_source_service() -> CiteSourceService:
    """Obtém instância singleton do serviço CiteSource."""
    global _cite_source_service
    if _cite_source_service is None:
        _cite_source_service = CiteSourceService()
    return _cite_source_service

# Função de conveniência
async def process_with_cite_source(
    results: List[RawSearchResultItem],
    query: str,
    source_timing: Optional[Dict[str, float]] = None
) -> Tuple[List[RawSearchResultItem], CiteSourceReport]:
    """
    Função de conveniência para processar resultados com CiteSource.
    
    Returns:
        Tuple[List[RawSearchResultItem], CiteSourceReport]: Resultados deduplicados e relatório completo
    """
    service = await get_cite_source_service()
    report = await service.process_search_results(results, query, source_timing)
    deduplicated_results = service.get_deduplicated_results(report.citation_clusters)
    
    return deduplicated_results, report 