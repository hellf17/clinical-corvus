"""
Testes para o sistema CiteSource - Deduplicação e Análise de Qualidade.
"""

import pytest
import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime

from services.cite_source_service import (
    CiteSourceService, 
    CitationCluster, 
    SourceMetrics,
    QualityAssessment,
    DeduplicationResult,
    CiteSourceReport,
    get_cite_source_service,
    process_with_cite_source
)

from services.cite_source_visualization import (
    CiteSourceVisualizationService,
    generate_cite_source_report
)

from baml_client.types import ResearchSourceType, RawSearchResultItem

# Configurar logging para testes
logging.basicConfig(level=logging.INFO)

@pytest.fixture
def sample_search_results():
    """Resultados de busca simulados para teste."""
    return [
        # Artigo original
        RawSearchResultItem(
            source=ResearchSourceType.PUBMED,
            title="Arteriovenous Carbon Dioxide Gap in Shock Management",
            url="https://pubmed.ncbi.nlm.nih.gov/12345678/",
            snippet_or_abstract="Study on CO2 gap in septic shock patients...",
            publication_date="2023-01-15",
            authors=["Smith J", "Doe A", "Johnson B"],
            journal="Critical Care Medicine",
            pmid="12345678",
            doi="10.1097/CCM.0000000000001234",
            study_type="Randomized Controlled Trial",
            citation_count=25
        ),
        
        # Duplicata do mesmo artigo (fonte diferente)
        RawSearchResultItem(
            source=ResearchSourceType.EUROPE_PMC,
            title="Arteriovenous Carbon Dioxide Gap in Shock Management",
            url="https://europepmc.org/article/MED/12345678",
            snippet_or_abstract="Study on CO2 gap in septic shock patients...",
            publication_date="2023-01-15",
            authors=["Smith J", "Doe A", "Johnson B"],
            journal="Critical Care Medicine",
            pmid="12345678",
            doi="10.1097/CCM.0000000000001234",
            study_type="Randomized Controlled Trial",
            citation_count=30  # Citation count diferente
        ),
        
        # Artigo relacionado mas diferente
        RawSearchResultItem(
            source=ResearchSourceType.LENS_SCHOLARLY,
            title="Hemodynamic Monitoring in Septic Shock: Role of CO2 Measurements",
            url="https://lens.org/article/98765",
            snippet_or_abstract="Comprehensive review of hemodynamic monitoring...",
            publication_date="2023-06-20",
            authors=["Brown C", "White D"],
            journal="Intensive Care Medicine",
            pmid=None,
            doi="10.1007/s00134-023-98765",
            study_type="Systematic Review",
            citation_count=42
        ),
        
        # Busca web (guidelines)
        RawSearchResultItem(
            source=ResearchSourceType.WEB_SEARCH_BRAVE,
            title="Surviving Sepsis Campaign: Guidelines for Management of Sepsis 2024",
            url="https://sccm.org/guidelines/sepsis",
            snippet_or_abstract="Updated guidelines for sepsis management...",
            publication_date="2024-01-01",
            authors=None,
            journal=None,
            pmid=None,
            doi=None,
            study_type="Clinical Guidelines",
            citation_count=None
        ),
        
        # Preprint
        RawSearchResultItem(
            source=ResearchSourceType.PREPRINT,
            title="Novel Biomarkers for Early Detection of Shock",
            url="https://medrxiv.org/preprint/2024.01.001",
            snippet_or_abstract="Investigation of novel biomarkers...",
            publication_date="2024-01-10",
            authors=["Garcia E", "Martinez F"],
            journal="medRxiv",
            pmid=None,
            doi="10.1101/2024.01.001",
            study_type="Research Article",
            citation_count=3
        ),
        
        # Duplicata com título ligeiramente diferente
        RawSearchResultItem(
            source=ResearchSourceType.LENS_SCHOLARLY,
            title="Arteriovenous CO2 Gap in Management of Shock Patients",
            url="https://lens.org/article/11111",
            snippet_or_abstract="Study on CO2 gap in septic shock patients...",
            publication_date="2023-01-15",
            authors=["Smith J", "Doe A", "Johnson B"],
            journal="Critical Care Medicine",
            pmid=None,
            doi="10.1097/CCM.0000000000001234",  # Mesmo DOI
            study_type="Randomized Controlled Trial",
            citation_count=25
        )
    ]

@pytest.fixture
def sample_source_timing():
    """Timing simulado das fontes."""
    return {
        "pubmed": 2500.0,
        "europe_pmc": 3200.0,
        "lens": 4100.0,
        "brave": 1800.0
    }

class TestCiteSourceDeduplication:
    """Testes para deduplicação inteligente."""
    
    @pytest.mark.asyncio
    async def test_basic_deduplication(self, sample_search_results):
        """Teste básico de deduplicação."""
        service = CiteSourceService()
        
        clusters, dedup_result = await service._intelligent_deduplication(sample_search_results)
        
        # Deve ter menos clusters que resultados originais
        assert len(clusters) < len(sample_search_results)
        assert dedup_result.removed_duplicates > 0
        
        # Verificar que duplicatas foram detectadas
        assert dedup_result.original_count == len(sample_search_results)
        assert dedup_result.deduplicated_count == len(clusters)
        
        print(f"✅ Deduplicação: {dedup_result.original_count} → {dedup_result.deduplicated_count}")
    
    @pytest.mark.asyncio
    async def test_doi_based_deduplication(self, sample_search_results):
        """Teste de deduplicação baseada em DOI."""
        service = CiteSourceService()
        
        clusters, _ = await service._intelligent_deduplication(sample_search_results)
        
        # Verificar se artigos com mesmo DOI foram agrupados
        doi_cluster = None
        for cluster in clusters:
            if cluster.primary_result.doi == "10.1097/CCM.0000000000001234":
                doi_cluster = cluster
                break
        
        assert doi_cluster is not None
        assert len(doi_cluster.duplicate_results) > 0  # Deve ter duplicatas
        assert len(cluster.source_origins) > 1  # Múltiplas fontes
        
        print(f"✅ Cluster DOI: {len(doi_cluster.duplicate_results)} duplicatas de {len(cluster.source_origins)} fontes")
    
    @pytest.mark.asyncio
    async def test_similarity_calculation(self):
        """Teste de cálculo de similaridade."""
        service = CiteSourceService()
        
        result1 = RawSearchResultItem(
            source=ResearchSourceType.PUBMED,
            title="Test Article Title",
            authors=["Author A", "Author B"],
            snippet_or_abstract="Test abstract content",
            doi="10.1000/test.001"
        )
        
        result2 = RawSearchResultItem(
            source=ResearchSourceType.EUROPE_PMC,
            title="Test Article Title",  # Título idêntico
            authors=["Author A", "Author B"],  # Autores idênticos
            snippet_or_abstract="Test abstract content",
            doi="10.1000/test.001"  # DOI idêntico
        )
        
        similarity = await service._calculate_similarity(result1, result2)
        
        # DOI idêntico deve retornar similaridade máxima
        assert similarity == 1.0
        
        print(f"✅ Similaridade para DOI idêntico: {similarity}")

class TestCiteSourceQualityAssessment:
    """Testes para avaliação de qualidade."""
    
    @pytest.mark.asyncio
    async def test_source_performance_analysis(self, sample_search_results, sample_source_timing):
        """Teste de análise de performance das fontes."""
        service = CiteSourceService()
        
        source_metrics = await service._analyze_source_performance(sample_search_results, sample_source_timing)
        
        assert len(source_metrics) > 0
        
        # Verificar métricas básicas
        for metrics in source_metrics:
            assert hasattr(metrics, 'source_name')
            assert hasattr(metrics, 'total_results')
            assert hasattr(metrics, 'quality_score')
            assert 0 <= metrics.quality_score <= 1
            
            print(f"✅ {metrics.source_name}: {metrics.total_results} resultados, qualidade {metrics.quality_score:.2f}")
    
    @pytest.mark.asyncio
    async def test_quality_assessment_comprehensive(self, sample_search_results):
        """Teste abrangente de avaliação de qualidade."""
        service = CiteSourceService()
        
        # Criar clusters mock
        clusters = [
            CitationCluster(
                primary_result=result,
                source_origins={str(result.source)},
                confidence_score=0.9
            ) for result in sample_search_results[:3]
        ]
        
        # Criar métricas mock
        source_metrics = [
            SourceMetrics(
                source_name="PUBMED",
                total_results=2,
                quality_score=0.8,
                recent_publications_count=1,
                high_impact_count=1
            ),
            SourceMetrics(
                source_name="EUROPE_PMC", 
                total_results=1,
                quality_score=0.7,
                recent_publications_count=1,
                high_impact_count=0
            )
        ]
        
        quality = await service._assess_search_quality(clusters, source_metrics)
        
        assert hasattr(quality, 'overall_score')
        assert hasattr(quality, 'coverage_score')
        assert hasattr(quality, 'diversity_score')
        assert 0 <= quality.overall_score <= 1
        
        print(f"✅ Qualidade geral: {quality.overall_score:.2f}")
        print(f"   Cobertura: {quality.coverage_score:.2f}")
        print(f"   Diversidade: {quality.diversity_score:.2f}")

class TestCiteSourceIntegration:
    """Testes de integração completa."""
    
    @pytest.mark.asyncio
    async def test_complete_processing_workflow(self, sample_search_results, sample_source_timing):
        """Teste do workflow completo de processamento."""
        query = "arteriovenous carbon dioxide gap shock management"
        
        deduplicated_results, cite_source_report = await process_with_cite_source(
            results=sample_search_results,
            query=query,
            source_timing=sample_source_timing
        )
        
        # Verificar relatório gerado
        assert isinstance(cite_source_report, CiteSourceReport)
        assert cite_source_report.query == query
        assert cite_source_report.total_sources_used > 0
        
        # Verificar deduplicação
        assert len(deduplicated_results) <= len(sample_search_results)
        
        # Verificar estrutura do relatório
        assert hasattr(cite_source_report, 'deduplication_result')
        assert hasattr(cite_source_report, 'source_metrics')
        assert hasattr(cite_source_report, 'quality_assessment')
        assert hasattr(cite_source_report, 'citation_clusters')
        
        print(f"✅ Processamento completo:")
        print(f"   Query: {cite_source_report.query}")
        print(f"   Resultados: {len(sample_search_results)} → {len(deduplicated_results)}")
        print(f"   Qualidade: {cite_source_report.quality_assessment.overall_score:.2f}")
        print(f"   Fontes: {cite_source_report.total_sources_used}")
    
    @pytest.mark.asyncio
    async def test_metadata_preservation(self, sample_search_results):
        """Teste de preservação de metadados."""
        service = CiteSourceService()
        
        clusters, _ = await service._intelligent_deduplication(sample_search_results)
        
        # Verificar se metadados foram preservados
        enhanced_clusters = [c for c in clusters if c.preserved_metadata.get("highest_citation_count")]
        
        assert len(enhanced_clusters) > 0
        
        for cluster in enhanced_clusters:
            # Verificar se citation count mais alto foi preservado
            highest_count = cluster.preserved_metadata.get("highest_citation_count")
            assert highest_count is not None
            assert highest_count > 0
            
            print(f"✅ Cluster com citações preservadas: {highest_count}")

class TestCiteSourceVisualization:
    """Testes para sistema de visualização."""
    
    @pytest.mark.asyncio
    async def test_comprehensive_report_generation(self, sample_search_results, sample_source_timing):
        """Teste de geração de relatório abrangente."""
        query = "test query for visualization"
        
        # Processar com CiteSource primeiro
        _, cite_source_report = await process_with_cite_source(
            results=sample_search_results,
            query=query,
            source_timing=sample_source_timing
        )
        
        # Gerar relatório visual
        comprehensive_report = await generate_cite_source_report(
            cite_source_report=cite_source_report,
            include_visualizations=True
        )
        
        # Verificar estrutura do relatório
        assert "metadata" in comprehensive_report
        assert "executive_summary" in comprehensive_report
        assert "source_analysis" in comprehensive_report
        assert "deduplication_analysis" in comprehensive_report
        assert "quality_analysis" in comprehensive_report
        assert "visualizations" in comprehensive_report
        
        # Verificar conteúdo do resumo executivo
        exec_summary = comprehensive_report["executive_summary"]
        assert "search_efficiency" in exec_summary
        assert "source_performance" in exec_summary
        assert "coverage_assessment" in exec_summary
        assert "key_insights" in exec_summary
        
        print("✅ Relatório abrangente gerado com sucesso")
        print(f"   Eficiência: {exec_summary['search_efficiency']['efficiency_score']}%")
        print(f"   Qualidade: {exec_summary['search_efficiency']['quality_score']}%")
    
    @pytest.mark.asyncio
    async def test_visualization_data_structure(self, sample_search_results, sample_source_timing):
        """Teste da estrutura de dados para visualizações."""
        query = "test query"
        
        _, cite_source_report = await process_with_cite_source(
            results=sample_search_results,
            query=query,
            source_timing=sample_source_timing
        )
        
        viz_service = CiteSourceVisualizationService()
        visualizations = await viz_service._generate_visualizations(cite_source_report)
        
        # Verificar tipos de visualização
        assert "source_distribution" in visualizations
        assert "quality_comparison" in visualizations
        assert "quality_radar" in visualizations
        
        # Verificar estrutura da distribuição por fonte
        source_dist = visualizations["source_distribution"]
        assert source_dist["type"] == "pie_chart"
        assert "data" in source_dist
        assert len(source_dist["data"]) > 0
        
        # Verificar dados do radar de qualidade
        quality_radar = visualizations["quality_radar"]
        assert quality_radar["type"] == "radar_chart"
        assert "data" in quality_radar
        assert "categories" in quality_radar["data"]
        assert "values" in quality_radar["data"]
        assert len(quality_radar["data"]["categories"]) == len(quality_radar["data"]["values"])
        
        print("✅ Estruturas de visualização validadas")

class TestCiteSourcePerformance:
    """Testes de performance e eficiência."""
    
    @pytest.mark.asyncio
    async def test_large_dataset_processing(self):
        """Teste com dataset grande."""
        # Simular 50 resultados
        large_dataset = []
        for i in range(50):
            result = RawSearchResultItem(
                source=ResearchSourceType.PUBMED if i % 2 == 0 else ResearchSourceType.EUROPE_PMC,
                title=f"Test Article {i}",
                url=f"https://example.com/{i}",
                snippet_or_abstract=f"Abstract for article {i}",
                publication_date="2023-01-01",
                authors=[f"Author {i}"],
                journal="Test Journal",
                pmid=str(1000000 + i),
                doi=f"10.1000/test.{i:03d}",
                citation_count=i
            )
            large_dataset.append(result)
        
        start_time = datetime.now()
        
        _, cite_source_report = await process_with_cite_source(
            results=large_dataset,
            query="test large dataset",
            source_timing={"pubmed": 3000, "europe_pmc": 3500}
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        assert cite_source_report.deduplication_result.original_count == 50
        assert processing_time < 5.0  # Deve processar em menos de 5 segundos
        
        print(f"✅ Dataset grande processado em {processing_time:.2f}s")
        print(f"   {cite_source_report.deduplication_result.removed_duplicates} duplicatas removidas")

class TestCiteSourceEdgeCases:
    """Testes para casos extremos."""
    
    @pytest.mark.asyncio
    async def test_empty_results(self):
        """Teste com lista vazia de resultados."""
        empty_results = []
        
        deduplicated, report = await process_with_cite_source(
            results=empty_results,
            query="empty test",
            source_timing={}
        )
        
        assert len(deduplicated) == 0
        assert report.deduplication_result.original_count == 0
        assert report.deduplication_result.removed_duplicates == 0
        
        print("✅ Caso vazio tratado corretamente")
    
    @pytest.mark.asyncio
    async def test_single_result(self):
        """Teste com apenas um resultado."""
        single_result = [
            RawSearchResultItem(
                source=ResearchSourceType.PUBMED,
                title="Single Test Article",
                url="https://example.com/single",
                snippet_or_abstract="Single test abstract"
            )
        ]
        
        deduplicated, report = await process_with_cite_source(
            results=single_result,
            query="single test",
            source_timing={"pubmed": 1000}
        )
        
        assert len(deduplicated) == 1
        assert report.deduplication_result.original_count == 1
        assert report.deduplication_result.removed_duplicates == 0
        
        print("✅ Resultado único tratado corretamente")
    
    @pytest.mark.asyncio
    async def test_all_duplicates(self):
        """Teste onde todos os resultados são duplicatas."""
        base_result = RawSearchResultItem(
            source=ResearchSourceType.PUBMED,
            title="Same Article",
            url="https://example.com/same",
            snippet_or_abstract="Same abstract",
            doi="10.1000/same"
        )
        
        # Criar várias "duplicatas" (mesmo DOI)
        duplicate_results = []
        for i, source in enumerate([ResearchSourceType.PUBMED, ResearchSourceType.EUROPE_PMC, ResearchSourceType.LENS_SCHOLARLY]):
            duplicate = RawSearchResultItem(
                source=source,
                title=base_result.title,
                url=f"https://example.com/same/{i}",
                snippet_or_abstract=base_result.snippet_or_abstract,
                doi=base_result.doi  # Mesmo DOI
            )
            duplicate_results.append(duplicate)
        
        deduplicated, report = await process_with_cite_source(
            results=duplicate_results,
            query="all duplicates test",
            source_timing={"pubmed": 1000, "europe_pmc": 1200, "lens": 1500}
        )
        
        # Deve resultar em apenas 1 resultado deduplicado
        assert len(deduplicated) == 1
        assert report.deduplication_result.original_count == 3
        assert report.deduplication_result.removed_duplicates == 2
        
        print("✅ Todas duplicatas tratadas corretamente")
        print(f"   {report.deduplication_result.original_count} → {len(deduplicated)}")

# Função de teste manual para desenvolvimento
async def manual_test_cite_source():
    """Execução manual dos testes CiteSource para desenvolvimento."""
    print("🧪 Executando testes manuais do CiteSource...\n")
    
    # Criar dados de teste
    sample_results = [
        RawSearchResultItem(
            source=ResearchSourceType.PUBMED,
            title="CO2 Gap in Shock Management",
            pmid="12345678",
            doi="10.1097/test.001",
            citation_count=25
        ),
        RawSearchResultItem(
            source=ResearchSourceType.EUROPE_PMC,
            title="CO2 Gap in Shock Management",  # Mesmo título
            pmid="12345678",  # Mesmo PMID
            doi="10.1097/test.001",  # Mesmo DOI
            citation_count=30
        ),
        RawSearchResultItem(
            source=ResearchSourceType.LENS_SCHOLARLY,
            title="Hemodynamic Monitoring in Critical Care",
            doi="10.1007/different.002",
            citation_count=42
        )
    ]
    
    # Teste 1: Processamento completo
    print("1️⃣ Testando processamento completo...")
    try:
        deduplicated, report = await process_with_cite_source(
            results=sample_results,
            query="test query",
            source_timing={"pubmed": 2000, "europe_pmc": 2500, "lens": 3000}
        )
        
        print(f"   Originais: {len(sample_results)}")
        print(f"   Deduplicados: {len(deduplicated)}")
        print(f"   Qualidade: {report.quality_assessment.overall_score:.2f}")
        print(f"   Duplicatas removidas: {report.deduplication_result.removed_duplicates}")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    # Teste 2: Geração de relatório visual
    print("\n2️⃣ Testando relatório visual...")
    try:
        if 'report' in locals():
            visual_report = await generate_cite_source_report(
                cite_source_report=report,
                include_visualizations=True
            )
            
            exec_summary = visual_report["executive_summary"]
            print(f"   Eficiência: {exec_summary['search_efficiency']['efficiency_score']}%")
            print(f"   Fontes ativas: {exec_summary['source_performance']['active_sources']}")
            print(f"   Insights: {len(exec_summary['key_insights'])}")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    print("\n✅ Testes manuais CiteSource concluídos!")

if __name__ == "__main__":
    asyncio.run(manual_test_cite_source()) 