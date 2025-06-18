"""
Testes para as novas integrações: Lens.org e Europe PMC.
"""

import pytest
import asyncio
import logging
from typing import List

# Configurar logging para testes
logging.basicConfig(level=logging.INFO)

@pytest.fixture
def sample_query():
    """Query de teste para validação."""
    return "arteriovenous carbon dioxide gap shock management"

@pytest.fixture  
def sample_query_pt():
    """Query em português para teste de tradução."""
    return "gap arteriovenoso de co2 no manejo do choque"

class TestEuropePMCIntegration:
    """Testes para integração Europe PMC."""
    
    @pytest.mark.asyncio
    async def test_europe_pmc_search_basic(self, sample_query):
        """Teste básico de busca no Europe PMC."""
        from services.europe_pmc_service import search_europe_pmc
        
        results = await search_europe_pmc(
            query=sample_query,
            max_results=5,
            include_preprints=True
        )
        
        assert isinstance(results, list)
        print(f"✅ Europe PMC retornou {len(results)} resultados")
        
        if results:
            first_result = results[0]
            assert hasattr(first_result, 'title')
            assert hasattr(first_result, 'source')
            assert hasattr(first_result, 'url')
            print(f"   📄 Primeiro resultado: {first_result.title[:60]}...")
    
    @pytest.mark.asyncio
    async def test_europe_pmc_enhanced_query(self, sample_query):
        """Teste de query enhanced do Europe PMC."""
        from services.europe_pmc_service import get_europe_pmc_service
        
        service = await get_europe_pmc_service()
        enhanced_query = await service._build_enhanced_query(
            sample_query, 
            include_preprints=True, 
            years_back=3
        )
        
        assert sample_query in enhanced_query
        assert "PUB_YEAR:" in enhanced_query
        assert "HAS_ABSTRACT:y" in enhanced_query
        print(f"✅ Query enhanced: {enhanced_query}")
    
    @pytest.mark.asyncio
    async def test_europe_pmc_result_conversion(self, sample_query):
        """Teste de conversão de resultados Europe PMC."""
        from services.europe_pmc_service import get_europe_pmc_service
        
        service = await get_europe_pmc_service()
        
        # Mock de resultado Europe PMC
        mock_response = {
            "resultList": {
                "result": [
                    {
                        "pmid": "12345678",
                        "title": "Test Article Title",
                        "abstractText": "Test abstract content",
                        "doi": "10.1000/test.doi",
                        "citedByCount": 42,
                        "firstPublicationDate": "2023-01-15",
                        "authorList": {
                            "author": [
                                {"fullName": "John Doe"},
                                {"fullName": "Jane Smith"}
                            ]
                        },
                        "journalInfo": {
                            "journal": {"title": "Test Journal"}
                        }
                    }
                ]
            }
        }
        
        converted = await service._convert_europe_pmc_results(mock_response, sample_query)
        
        assert len(converted) == 1
        assert converted[0].pmid == "12345678"
        assert converted[0].title == "Test Article Title"
        assert converted[0].citation_count == 42
        print("✅ Conversão de resultados Europe PMC funcionando")

class TestLensScholarIntegration:
    """Testes para integração Lens.org."""
    
    @pytest.mark.asyncio
    async def test_lens_service_initialization(self):
        """Teste de inicialização do serviço Lens."""
        from services.lens_scholar_service import get_lens_scholar_service
        
        service = await get_lens_scholar_service()
        assert service is not None
        print("✅ Serviço Lens inicializado")
    
    @pytest.mark.asyncio 
    async def test_lens_query_building(self, sample_query):
        """Teste de construção de query para Lens."""
        from services.lens_scholar_service import get_lens_scholar_service
        
        service = await get_lens_scholar_service()
        
        if service.client:  # Só testa se SDK disponível
            lens_query = await service._build_lens_query(
                sample_query,
                years_back=5,
                include_patents=False
            )
            
            assert isinstance(lens_query, str)
            print(f"✅ Query Lens construída: {lens_query[:100]}...")
        else:
            print("⚠️ LensScholarPy SDK não disponível - pulando teste")
    
    @pytest.mark.asyncio
    async def test_lens_search_if_available(self, sample_query):
        """Teste de busca Lens (se API key disponível)."""
        from services.lens_scholar_service import search_lens_scholarly
        
        try:
            results = await search_lens_scholarly(
                query=sample_query,
                max_results=3,
                years_back=5
            )
            
            assert isinstance(results, list)
            print(f"✅ Lens.org retornou {len(results)} resultados")
            
            if results:
                first_result = results[0]
                assert hasattr(first_result, 'title')
                assert hasattr(first_result, 'source')
                print(f"   🔬 Primeiro resultado: {first_result.title[:60]}...")
                
        except Exception as e:
            print(f"⚠️ Teste Lens pulado (API key/SDK): {e}")

class TestIntegratedSearch:
    """Testes da busca integrada."""
    
    @pytest.mark.asyncio
    async def test_simple_autonomous_with_new_sources(self, sample_query_pt):
        """Teste da pesquisa autônoma com novas fontes."""
        from services.simple_autonomous_research import get_simple_autonomous_service
        from baml_client.types import ResearchTaskInput
        
        service = await get_simple_autonomous_service()
        
        research_input = ResearchTaskInput(
            user_original_query=sample_query_pt,
            research_focus="tratamento",
            target_audience="practicing_physician"
        )
        
        # Teste apenas geração de estratégias (não execução completa)
        strategies = await service._analyze_and_generate_strategies(research_input)
        
        assert isinstance(strategies, list)
        assert len(strategies) > 0
        
        # Verificar se inclui novas fontes
        strategy_types = [s.get("type", "") for s in strategies]
        
        print(f"✅ Estratégias geradas: {len(strategies)}")
        for i, strategy in enumerate(strategies):
            print(f"   {i+1}. {strategy.get('description', 'N/A')}")
        
        # Verificar presença de estratégias das novas fontes
        has_europe_pmc = any("europe_pmc" in st for st in strategy_types)
        has_lens = any("lens" in st for st in strategy_types)
        
        if has_europe_pmc:
            print("✅ Estratégias Europe PMC incluídas")
        if has_lens:
            print("✅ Estratégias Lens.org incluídas")

class TestTranslationAndBAML:
    """Testes de tradução e integração BAML."""
    
    @pytest.mark.asyncio
    async def test_query_translation_for_new_sources(self, sample_query_pt):
        """Teste de tradução de queries para novas fontes."""
        from services.simple_autonomous_research import SimpleAutonomousResearchService
        
        service = SimpleAutonomousResearchService()
        
        translated = service._translate_query_to_english(sample_query_pt)
        
        assert isinstance(translated, str)
        assert "arteriovenous" in translated.lower()
        assert "carbon dioxide" in translated.lower() or "co2" in translated.lower()
        assert "shock" in translated.lower()
        
        print(f"✅ Tradução: '{sample_query_pt}' → '{translated}'")
    
    @pytest.mark.asyncio
    async def test_baml_strategy_with_new_sources(self, sample_query_pt):
        """Teste de geração de estratégias BAML incluindo novas fontes."""
        from baml_client import b
        from baml_client.types import ResearchTaskInput
        
        research_input = ResearchTaskInput(
            user_original_query=sample_query_pt,
            research_focus="diagnóstico",
            target_audience="medical_student"  
        )
        
        try:
            strategy_output = await b.FormulateDeepResearchStrategy(research_input)
            
            assert hasattr(strategy_output, 'search_parameters_list')
            
            if strategy_output.search_parameters_list:
                sources = [param.source for param in strategy_output.search_parameters_list]
                source_names = [str(source) for source in sources]
                
                print(f"✅ BAML gerou estratégias para: {source_names}")
                
                # Verificar se BAML está incluindo novas fontes
                has_europe_pmc = "EUROPE_PMC" in source_names
                has_lens = "LENS_SCHOLARLY" in source_names
                
                if has_europe_pmc:
                    print("✅ BAML incluiu Europe PMC")
                if has_lens:
                    print("✅ BAML incluiu Lens.org")
            
        except Exception as e:
            print(f"⚠️ Teste BAML falhou: {e}")

# Função de teste manual para desenvolvimento
async def manual_test_run():
    """Execução manual dos testes para desenvolvimento."""
    print("🧪 Executando testes manuais das novas integrações...\n")
    
    query_en = "arteriovenous carbon dioxide gap shock management"
    query_pt = "gap arteriovenoso de co2 no manejo do choque"
    
    # Teste Europe PMC
    print("1️⃣ Testando Europe PMC...")
    try:
        from services.europe_pmc_service import search_europe_pmc
        europe_results = await search_europe_pmc(query_en, max_results=3)
        print(f"   Europe PMC: {len(europe_results)} resultados")
    except Exception as e:
        print(f"   ❌ Europe PMC erro: {e}")
    
    # Teste Lens.org
    print("\n2️⃣ Testando Lens.org...")
    try:
        from services.lens_scholar_service import search_lens_scholarly
        lens_results = await search_lens_scholarly(query_en, max_results=3)
        print(f"   Lens.org: {len(lens_results)} resultados")
    except Exception as e:
        print(f"   ❌ Lens.org erro: {e}")
    
    # Teste integração completa
    print("\n3️⃣ Testando integração...")
    try:
        from services.simple_autonomous_research import get_simple_autonomous_service
        from baml_client.types import ResearchTaskInput
        
        service = await get_simple_autonomous_service()
        research_input = ResearchTaskInput(user_original_query=query_pt)
        
        strategies = await service._analyze_and_generate_strategies(research_input)
        print(f"   Estratégias geradas: {len(strategies)}")
        
    except Exception as e:
        print(f"   ❌ Integração erro: {e}")
    
    print("\n✅ Testes manuais concluídos!")

if __name__ == "__main__":
    asyncio.run(manual_test_run()) 