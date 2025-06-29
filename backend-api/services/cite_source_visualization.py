"""
CiteSource Visualization Service - Sistema de Visualização de Relatórios.

Gera visualizações e relatórios detalhados do processamento CiteSource.
"""

import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import base64
import io

from services.cite_source_service import (
    CiteSourceReport, SourceMetrics, QualityAssessment, 
    CitationCluster, DeduplicationResult
)

logger = logging.getLogger(__name__)

class CiteSourceVisualizationService:
    """
    Serviço para gerar visualizações e relatórios do CiteSource.
    """
    
    def __init__(self):
        self.color_palette = {
            "PUBMED": "#2E8B57",           # Sea Green
            "EUROPE_PMC": "#4169E1",       # Royal Blue  
            "LENS_SCHOLARLY": "#FF6347",   # Tomato
            "WEB_SEARCH_BRAVE": "#FF8C00", # Dark Orange
            "PREPRINT": "#9370DB",         # Medium Purple
            "GUIDELINE_RESOURCE": "#20B2AA" # Light Sea Green
        }
    
    async def generate_comprehensive_report(
        self, 
        cite_source_report: CiteSourceReport,
        include_visualizations: bool = True
    ) -> Dict[str, Any]:
        """
        Gera relatório completo do CiteSource com visualizações.
        """
        try:
            logger.info("📊 Gerando relatório abrangente do CiteSource...")
            
            # 1. Resumo executivo
            executive_summary = await self._generate_executive_summary(cite_source_report)
            
            # 2. Análise de performance das fontes
            source_analysis = await self._analyze_source_performance(cite_source_report.source_metrics)
            
            # 3. Análise de deduplicação
            deduplication_analysis = await self._analyze_deduplication(cite_source_report.deduplication_result)
            
            # 4. Análise de qualidade
            quality_analysis = await self._analyze_quality_metrics(cite_source_report.quality_assessment)
            
            # 5. Insights de clusters
            cluster_insights = await self._analyze_citation_clusters(cite_source_report.citation_clusters)
            
            # 6. Recomendações acionáveis
            actionable_recommendations = await self._generate_actionable_recommendations(cite_source_report)
            
            # 7. Visualizações (se solicitadas)
            visualizations = {}
            if include_visualizations:
                visualizations = await self._generate_visualizations(cite_source_report)
            
            # 8. Métricas de benchmark
            benchmark_metrics = await self._calculate_benchmark_metrics(cite_source_report)
            
            comprehensive_report = {
                "metadata": {
                    "query": cite_source_report.query,
                    "timestamp": cite_source_report.timestamp,
                    "processing_time_ms": cite_source_report.processing_time_ms,
                    "total_sources": cite_source_report.total_sources_used,
                    "report_generated_at": datetime.now().isoformat()
                },
                "executive_summary": executive_summary,
                "source_analysis": source_analysis,
                "deduplication_analysis": deduplication_analysis,
                "quality_analysis": quality_analysis,
                "cluster_insights": cluster_insights,
                "benchmark_metrics": benchmark_metrics,
                "actionable_recommendations": actionable_recommendations,
                "visualizations": visualizations
            }
            
            logger.info("✅ Relatório CiteSource gerado com sucesso")
            return comprehensive_report
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório CiteSource: {e}")
            raise
    
    async def _generate_executive_summary(self, report: CiteSourceReport) -> Dict[str, Any]:
        """Gera resumo executivo do processamento."""
        dedup = report.deduplication_result
        quality = report.quality_assessment
        
        # Calcular economia de duplicatas
        dedup_rate = dedup.removed_duplicates / max(dedup.original_count, 1) * 100
        
        # Identificar melhor fonte
        best_source = max(report.source_metrics, key=lambda x: x.quality_score, default=None)
        
        # Calcular eficiência geral
        efficiency_score = (quality.overall_score * 0.6) + ((100 - dedup_rate) / 100 * 0.4)
        
        return {
            "search_efficiency": {
                "efficiency_score": round(efficiency_score * 100, 1),
                "original_results": dedup.original_count,
                "unique_results": dedup.deduplicated_count,
                "deduplication_rate": round(dedup_rate, 1),
                "quality_score": round(quality.overall_score * 100, 1)
            },
            "source_performance": {
                "total_sources_consulted": len(report.source_metrics),
                "active_sources": len([m for m in report.source_metrics if m.total_results > 0]),
                "best_performing_source": best_source.source_name if best_source else "N/A",
                "best_source_quality": round(best_source.quality_score * 100, 1) if best_source else 0
            },
            "coverage_assessment": {
                "coverage_score": round(quality.coverage_score * 100, 1),
                "diversity_score": round(quality.diversity_score * 100, 1),
                "recency_score": round(quality.recency_score * 100, 1),
                "impact_score": round(quality.impact_score * 100, 1)
            },
            "key_insights": await self._extract_key_insights(report)
        }
    
    async def _extract_key_insights(self, report: CiteSourceReport) -> List[str]:
        """Extrai insights principais do relatório."""
        insights = []
        
        quality = report.quality_assessment
        dedup = report.deduplication_result
        
        # Insight sobre deduplicação
        dedup_rate = dedup.removed_duplicates / max(dedup.original_count, 1) * 100
        if dedup_rate > 30:
            insights.append(f"Alta taxa de duplicação ({dedup_rate:.1f}%) indica sobreposição significativa entre fontes")
        elif dedup_rate < 10:
            insights.append(f"Baixa duplicação ({dedup_rate:.1f}%) sugere boa diversidade de fontes")
        
        # Insight sobre qualidade
        if quality.overall_score > 0.8:
            insights.append("Excelente qualidade geral da busca com cobertura abrangente")
        elif quality.overall_score < 0.5:
            insights.append("Qualidade da busca pode ser melhorada - considerar estratégias adicionais")
        
        # Insight sobre fontes
        top_sources = sorted(report.source_metrics, key=lambda x: x.quality_score, reverse=True)[:2]
        if len(top_sources) >= 2:
            insights.append(f"Fontes de melhor performance: {top_sources[0].source_name} e {top_sources[1].source_name}")
        
        # Insight sobre cobertura temporal
        if quality.recency_score > 0.7:
            insights.append("Boa cobertura de publicações recentes")
        elif quality.recency_score < 0.3:
            insights.append("Limitada disponibilidade de estudos recentes - considerar expandir busca temporal")
        
        return insights[:5]  # Máximo 5 insights
    
    async def _analyze_source_performance(self, source_metrics: List[SourceMetrics]) -> Dict[str, Any]:
        """Analisa performance detalhada das fontes."""
        
        # Ordenar por qualidade
        sorted_sources = sorted(source_metrics, key=lambda x: x.quality_score, reverse=True)
        
        # Calcular estatísticas agregadas
        total_results = sum(m.total_results for m in source_metrics)
        total_unique = sum(m.unique_contributions for m in source_metrics)
        avg_quality = sum(m.quality_score for m in source_metrics) / max(len(source_metrics), 1)
        
        # Análise por fonte
        source_breakdown = []
        for metrics in sorted_sources:
            unique_rate = metrics.unique_contributions / max(metrics.total_results, 1) * 100
            overlap_rate = metrics.overlap_with_others / max(metrics.total_results, 1) * 100
            
            source_breakdown.append({
                "source_name": metrics.source_name,
                "total_results": metrics.total_results,
                "unique_contributions": metrics.unique_contributions,
                "unique_rate": round(unique_rate, 1),
                "overlap_rate": round(overlap_rate, 1),
                "quality_score": round(metrics.quality_score * 100, 1),
                "coverage_percentage": round(metrics.coverage_percentage, 1),
                "average_citations": round(metrics.average_citation_count, 1),
                "high_impact_count": metrics.high_impact_count,
                "recent_publications": metrics.recent_publications_count,
                "response_time_ms": round(metrics.response_time_ms, 0),
                "performance_grade": self._calculate_performance_grade(metrics)
            })
        
        return {
            "summary": {
                "total_results": total_results,
                "total_unique_contributions": total_unique,
                "average_quality_score": round(avg_quality * 100, 1),
                "sources_analyzed": len(source_metrics)
            },
            "source_breakdown": source_breakdown,
            "performance_ranking": [s["source_name"] for s in source_breakdown],
            "efficiency_insights": await self._analyze_source_efficiency(source_metrics)
        }
    
    def _calculate_performance_grade(self, metrics: SourceMetrics) -> str:
        """Calcula grade de performance para uma fonte."""
        score = metrics.quality_score
        
        if score >= 0.9:
            return "A+"
        elif score >= 0.8:
            return "A"
        elif score >= 0.7:
            return "B+"
        elif score >= 0.6:
            return "B"
        elif score >= 0.5:
            return "C"
        else:
            return "D"
    
    async def _analyze_source_efficiency(self, source_metrics: List[SourceMetrics]) -> List[str]:
        """Analisa eficiência das fontes."""
        insights = []
        
        # Fonte mais eficiente (qualidade vs tempo)
        efficiency_scores = []
        for m in source_metrics:
            if m.response_time_ms > 0:
                efficiency = m.quality_score / (m.response_time_ms / 1000)  # qualidade por segundo
                efficiency_scores.append((m.source_name, efficiency))
        
        if efficiency_scores:
            best_efficiency = max(efficiency_scores, key=lambda x: x[1])
            insights.append(f"Fonte mais eficiente (qualidade/tempo): {best_efficiency[0]}")
        
        # Fontes com melhor taxa de contribuição única
        unique_rates = [(m.source_name, m.unique_contributions / max(m.total_results, 1)) 
                       for m in source_metrics if m.total_results > 0]
        
        if unique_rates:
            best_unique = max(unique_rates, key=lambda x: x[1])
            insights.append(f"Melhor taxa de contribuição única: {best_unique[0]} ({best_unique[1]:.1%})")
        
        # Fontes com melhor cobertura de alto impacto
        high_impact_rates = [(m.source_name, m.high_impact_count / max(m.total_results, 1)) 
                            for m in source_metrics if m.total_results > 0]
        
        if high_impact_rates:
            best_impact = max(high_impact_rates, key=lambda x: x[1])
            insights.append(f"Melhor cobertura de alto impacto: {best_impact[0]} ({best_impact[1]:.1%})")
        
        return insights
    
    async def _analyze_deduplication(self, dedup_result: DeduplicationResult) -> Dict[str, Any]:
        """Analisa resultados da deduplicação."""
        
        dedup_rate = dedup_result.removed_duplicates / max(dedup_result.original_count, 1) * 100
        efficiency = dedup_result.deduplicated_count / max(dedup_result.original_count, 1) * 100
        
        # Análise de padrões de duplicação
        duplicate_patterns = []
        for group in dedup_result.duplicate_groups:
            if len(group) > 2:  # Grupos com múltiplas duplicatas
                duplicate_patterns.append({
                    "group_size": len(group),
                    "primary_title": group[0][:60] + "..." if len(group[0]) > 60 else group[0]
                })
        
        # Análise de contribuições por fonte
        source_contributions = dedup_result.source_contributions
        total_contributions = sum(source_contributions.values())
        contribution_percentages = {
            source: (count / max(total_contributions, 1) * 100) 
            for source, count in source_contributions.items()
        }
        
        return {
            "summary": {
                "original_count": dedup_result.original_count,
                "deduplicated_count": dedup_result.deduplicated_count,
                "removed_duplicates": dedup_result.removed_duplicates,
                "deduplication_rate": round(dedup_rate, 1),
                "efficiency_percentage": round(efficiency, 1)
            },
            "duplicate_patterns": duplicate_patterns,
            "source_contributions": {
                "raw_counts": source_contributions,
                "percentages": {k: round(v, 1) for k, v in contribution_percentages.items()}
            },
            "deduplication_insights": await self._generate_deduplication_insights(dedup_result)
        }
    
    async def _generate_deduplication_insights(self, dedup_result: DeduplicationResult) -> List[str]:
        """Gera insights sobre o processo de deduplicação."""
        insights = []
        
        dedup_rate = dedup_result.removed_duplicates / max(dedup_result.original_count, 1) * 100
        
        if dedup_rate > 50:
            insights.append("Alta taxa de duplicação pode indicar queries muito similares entre fontes")
        elif dedup_rate < 10:
            insights.append("Baixa duplicação sugere boa diversidade e complementaridade entre fontes")
        
        # Análise de grupos grandes de duplicatas
        large_groups = [g for g in dedup_result.duplicate_groups if len(g) > 3]
        if large_groups:
            insights.append(f"Detectados {len(large_groups)} grupos com múltiplas duplicatas - alta sobreposição")
        
        # Análise de distribuição de fontes
        source_counts = list(dedup_result.source_contributions.values())
        if source_counts:
            max_contrib = max(source_counts)
            min_contrib = min(source_counts)
            if max_contrib > min_contrib * 3:
                insights.append("Distribuição desbalanceada entre fontes - considerar equilibrar estratégias")
        
        return insights
    
    async def _analyze_quality_metrics(self, quality: QualityAssessment) -> Dict[str, Any]:
        """Analisa métricas de qualidade detalhadamente."""
        
        # Converter scores para percentuais
        scores_pct = {
            "overall": round(quality.overall_score * 100, 1),
            "coverage": round(quality.coverage_score * 100, 1),
            "diversity": round(quality.diversity_score * 100, 1),
            "recency": round(quality.recency_score * 100, 1),
            "impact": round(quality.impact_score * 100, 1),
            "source_balance": round(quality.source_balance_score * 100, 1)
        }
        
        # Identificar pontos fortes e fracos
        strengths = []
        weaknesses = []
        
        for metric, score in scores_pct.items():
            if score >= 80:
                strengths.append(f"{metric.title()}: {score}%")
            elif score < 50:
                weaknesses.append(f"{metric.title()}: {score}%")
        
        # Análise de completeness
        completeness_summary = {
            "total_indicators": len(quality.completeness_indicators),
            "indicators_met": sum(1 for v in quality.completeness_indicators.values() if v),
            "indicators_details": quality.completeness_indicators
        }
        
        completeness_rate = completeness_summary["indicators_met"] / max(completeness_summary["total_indicators"], 1) * 100
        
        return {
            "quality_scores": scores_pct,
            "quality_grade": self._calculate_quality_grade(quality.overall_score),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "completeness": {
                **completeness_summary,
                "completeness_rate": round(completeness_rate, 1)
            },
            "quality_insights": await self._generate_quality_insights(quality)
        }
    
    def _calculate_quality_grade(self, overall_score: float) -> str:
        """Calcula grade geral de qualidade."""
        if overall_score >= 0.9:
            return "Excelente"
        elif overall_score >= 0.8:
            return "Muito Boa"
        elif overall_score >= 0.7:
            return "Boa"
        elif overall_score >= 0.6:
            return "Satisfatória"
        elif overall_score >= 0.5:
            return "Necessita Melhoria"
        else:
            return "Insatisfatória"
    
    async def _generate_quality_insights(self, quality: QualityAssessment) -> List[str]:
        """Gera insights sobre qualidade."""
        insights = []
        
        # Análise por dimensão
        if quality.coverage_score < 0.6:
            insights.append("Cobertura limitada - considerar incluir mais fontes")
        
        if quality.diversity_score < 0.6:
            insights.append("Baixa diversidade de tipos de fonte - incluir preprints, diretrizes, etc.")
        
        if quality.recency_score < 0.4:
            insights.append("Poucos estudos recentes encontrados - verificar filtros temporais")
        
        if quality.impact_score < 0.3:
            insights.append("Limitados estudos de alto impacto - considerar incluir journals de prestígio")
        
        if quality.source_balance_score < 0.4:
            insights.append("Contribuições desbalanceadas entre fontes - otimizar estratégias")
        
        # Análise de completeness
        missing_indicators = [k for k, v in quality.completeness_indicators.items() if not v]
        if missing_indicators:
            insights.append(f"Indicadores ausentes: {', '.join(missing_indicators[:3])}")
        
        return insights[:5]  # Máximo 5 insights
    
    async def _analyze_citation_clusters(self, clusters: List[CitationCluster]) -> Dict[str, Any]:
        """Analisa clusters de citações."""
        
        if not clusters:
            return {"summary": "Nenhum cluster analisado"}
        
        # Estatísticas de clusters
        total_duplicates = sum(len(c.duplicate_results) for c in clusters)
        clusters_with_duplicates = len([c for c in clusters if c.duplicate_results])
        avg_confidence = sum(c.confidence_score for c in clusters) / len(clusters)
        
        # Análise de multi-source clusters
        multi_source_clusters = [c for c in clusters if len(c.source_origins) > 1]
        multi_source_rate = len(multi_source_clusters) / len(clusters) * 100
        
        # Top clusters por confiança
        top_clusters = sorted(clusters, key=lambda x: x.confidence_score, reverse=True)[:5]
        top_cluster_info = []
        
        for cluster in top_clusters:
            cluster_info = {
                "title": cluster.primary_result.title[:80] + "..." if len(cluster.primary_result.title) > 80 else cluster.primary_result.title,
                "confidence_score": round(cluster.confidence_score, 3),
                "source_origins": list(cluster.source_origins),
                "duplicates_count": len(cluster.duplicate_results),
                "merge_rationale": cluster.merge_rationale
            }
            top_cluster_info.append(cluster_info)
        
        return {
            "summary": {
                "total_clusters": len(clusters),
                "clusters_with_duplicates": clusters_with_duplicates,
                "total_duplicates_found": total_duplicates,
                "average_confidence": round(avg_confidence, 3),
                "multi_source_clusters": len(multi_source_clusters),
                "multi_source_rate": round(multi_source_rate, 1)
            },
            "top_confidence_clusters": top_cluster_info,
            "cluster_insights": await self._generate_cluster_insights(clusters)
        }
    
    async def _generate_cluster_insights(self, clusters: List[CitationCluster]) -> List[str]:
        """Gera insights sobre clusters."""
        insights = []
        
        if not clusters:
            return ["Nenhum cluster para análise"]
        
        # Análise de confiança
        high_confidence = len([c for c in clusters if c.confidence_score > 0.8])
        if high_confidence > len(clusters) * 0.7:
            insights.append(f"Alta confiança no agrupamento: {high_confidence} clusters com score > 0.8")
        
        # Análise de multi-source
        multi_source = len([c for c in clusters if len(c.source_origins) > 1])
        if multi_source > 0:
            insights.append(f"{multi_source} artigos encontrados em múltiplas fontes - validação cruzada")
        
        # Análise de preservação de metadados
        enhanced_clusters = len([c for c in clusters if c.preserved_metadata.get("highest_citation_count")])
        if enhanced_clusters > 0:
            insights.append(f"{enhanced_clusters} clusters com metadados bibliométricos enriquecidos")
        
        return insights
    
    async def _calculate_benchmark_metrics(self, report: CiteSourceReport) -> Dict[str, Any]:
        """Calcula métricas de benchmark."""
        
        # Benchmarks padrão da indústria
        industry_benchmarks = {
            "deduplication_rate": {"excellent": 20, "good": 35, "acceptable": 50},
            "quality_score": {"excellent": 85, "good": 70, "acceptable": 60},
            "coverage_score": {"excellent": 80, "good": 65, "acceptable": 50},
            "response_time_ms": {"excellent": 3000, "good": 8000, "acceptable": 15000}
        }
        
        # Calcular performance vs benchmarks
        current_metrics = {
            "deduplication_rate": report.deduplication_result.removed_duplicates / max(report.deduplication_result.original_count, 1) * 100,
            "quality_score": report.quality_assessment.overall_score * 100,
            "coverage_score": report.quality_assessment.coverage_score * 100,
            "response_time_ms": report.processing_time_ms
        }
        
        benchmark_analysis = {}
        for metric, value in current_metrics.items():
            benchmarks = industry_benchmarks[metric]
            
            if metric == "response_time_ms":  # Menor é melhor
                if value <= benchmarks["excellent"]:
                    level = "excellent"
                elif value <= benchmarks["good"]:
                    level = "good"
                elif value <= benchmarks["acceptable"]:
                    level = "acceptable"
                else:
                    level = "needs_improvement"
            else:  # Maior é melhor
                if value >= benchmarks["excellent"]:
                    level = "excellent"
                elif value >= benchmarks["good"]:
                    level = "good"
                elif value >= benchmarks["acceptable"]:
                    level = "acceptable"
                else:
                    level = "needs_improvement"
            
            benchmark_analysis[metric] = {
                "current_value": round(value, 1),
                "benchmark_level": level,
                "benchmarks": benchmarks
            }
        
        return {
            "benchmark_analysis": benchmark_analysis,
            "overall_benchmark_grade": self._calculate_overall_benchmark_grade(benchmark_analysis)
        }
    
    def _calculate_overall_benchmark_grade(self, benchmark_analysis: Dict[str, Any]) -> str:
        """Calcula grade geral de benchmark."""
        level_scores = {"excellent": 4, "good": 3, "acceptable": 2, "needs_improvement": 1}
        
        total_score = sum(level_scores.get(data["benchmark_level"], 1) for data in benchmark_analysis.values())
        avg_score = total_score / len(benchmark_analysis)
        
        if avg_score >= 3.5:
            return "Excelente"
        elif avg_score >= 2.5:
            return "Bom"
        elif avg_score >= 1.5:
            return "Aceitável"
        else:
            return "Necessita Melhoria"
    
    async def _generate_actionable_recommendations(self, report: CiteSourceReport) -> List[Dict[str, Any]]:
        """Gera recomendações acionáveis baseadas na análise."""
        recommendations = []
        
        quality = report.quality_assessment
        dedup = report.deduplication_result
        
        # Recomendações baseadas em qualidade
        if quality.coverage_score < 0.7:
            recommendations.append({
                "category": "Coverage",
                "priority": "High",
                "action": "Incluir fontes adicionais",
                "details": "Baixa cobertura detectada. Considerar adicionar Europe PMC, Lens.org ou bases especializadas.",
                "expected_impact": "Aumento de 15-25% na cobertura"
            })
        
        if quality.diversity_score < 0.6:
            recommendations.append({
                "category": "Diversity",
                "priority": "Medium",
                "action": "Diversificar tipos de fonte",
                "details": "Incluir preprints, diretrizes clínicas e literatura cinzenta para maior diversidade.",
                "expected_impact": "Melhoria na diversidade de evidências"
            })
        
        # Recomendações baseadas em deduplicação
        dedup_rate = dedup.removed_duplicates / max(dedup.original_count, 1) * 100
        if dedup_rate > 40:
            recommendations.append({
                "category": "Efficiency",
                "priority": "Medium",
                "action": "Otimizar queries para reduzir duplicação",
                "details": f"Taxa de duplicação alta ({dedup_rate:.1f}%). Refinar estratégias de busca para reduzir sobreposição.",
                "expected_impact": "Redução de 10-20% no tempo de processamento"
            })
        
        # Recomendações baseadas em performance de fontes
        low_performing_sources = [m for m in report.source_metrics if m.quality_score < 0.5]
        if low_performing_sources:
            source_names = [m.source_name for m in low_performing_sources]
            recommendations.append({
                "category": "Source Optimization",
                "priority": "High",
                "action": f"Otimizar estratégias para: {', '.join(source_names)}",
                "details": "Fontes com baixa performance detectadas. Revisar queries e parâmetros específicos.",
                "expected_impact": "Melhoria de 20-30% na qualidade dos resultados"
            })
        
        # Recomendações baseadas em completeness
        missing_indicators = [k for k, v in quality.completeness_indicators.items() if not v]
        if len(missing_indicators) > 2:
            recommendations.append({
                "category": "Completeness",
                "priority": "Medium",
                "action": "Melhorar indicadores de completeness",
                "details": f"Múltiplos indicadores ausentes: {', '.join(missing_indicators[:3])}",
                "expected_impact": "Busca mais abrangente e confiável"
            })
        
        return recommendations[:6]  # Máximo 6 recomendações
    
    async def _generate_visualizations(self, report: CiteSourceReport) -> Dict[str, Any]:
        """Gera dados para visualizações."""
        
        # Nota: Em um ambiente real, aqui gerariamos gráficos usando matplotlib/plotly
        # Por agora, retornamos dados estruturados para visualização no frontend
        
        visualizations = {}
        
        # 1. Gráfico de pizza - Distribuição por fonte
        source_distribution = {
            "type": "pie_chart",
            "title": "Distribuição de Resultados por Fonte",
            "data": [
                {
                    "source": m.source_name,
                    "count": m.total_results,
                    "percentage": round(m.coverage_percentage, 1),
                    "color": self.color_palette.get(m.source_name, "#808080")
                }
                for m in report.source_metrics if m.total_results > 0
            ]
        }
        visualizations["source_distribution"] = source_distribution
        
        # 2. Gráfico de barras - Qualidade por fonte
        quality_comparison = {
            "type": "bar_chart",
            "title": "Qualidade por Fonte",
            "data": [
                {
                    "source": m.source_name,
                    "quality_score": round(m.quality_score * 100, 1),
                    "unique_contributions": m.unique_contributions,
                    "color": self.color_palette.get(m.source_name, "#808080")
                }
                for m in sorted(report.source_metrics, key=lambda x: x.quality_score, reverse=True)
            ]
        }
        visualizations["quality_comparison"] = quality_comparison
        
        # 3. Gráfico radar - Métricas de qualidade
        quality_radar = {
            "type": "radar_chart",
            "title": "Análise Multidimensional de Qualidade",
            "data": {
                "categories": ["Cobertura", "Diversidade", "Recência", "Impacto", "Balanceamento"],
                "values": [
                    round(report.quality_assessment.coverage_score * 100, 1),
                    round(report.quality_assessment.diversity_score * 100, 1),
                    round(report.quality_assessment.recency_score * 100, 1),
                    round(report.quality_assessment.impact_score * 100, 1),
                    round(report.quality_assessment.source_balance_score * 100, 1)
                ]
            }
        }
        visualizations["quality_radar"] = quality_radar
        
        # 4. Timeline - Distribuição temporal (se dados disponíveis)
        # Este seria implementado com dados de publicação dos resultados
        
        return visualizations

# Instância global do serviço
_cite_source_viz_service = None

async def get_cite_source_visualization_service() -> CiteSourceVisualizationService:
    """Obtém instância singleton do serviço de visualização."""
    global _cite_source_viz_service
    if _cite_source_viz_service is None:
        _cite_source_viz_service = CiteSourceVisualizationService()
    return _cite_source_viz_service

# Função de conveniência
async def generate_cite_source_report(
    cite_source_report: CiteSourceReport,
    include_visualizations: bool = True
) -> Dict[str, Any]:
    """
    Função de conveniência para gerar relatório visual do CiteSource.
    """
    service = await get_cite_source_visualization_service()
    return await service.generate_comprehensive_report(cite_source_report, include_visualizations) 