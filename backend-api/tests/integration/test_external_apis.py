import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.simple_autonomous_research import SimpleAutonomousResearchService
from baml_client.types import ResearchTaskInput, SynthesizedResearchOutput, RawSearchResultItem, ResearchSourceType
import httpx

# Mock external API responses
@pytest.fixture
def mock_external_api_responses():
    mock_pubmed_response = MagicMock()
    mock_pubmed_response.json.return_value = {
        "resultList": {
            "result": [
                {"pmid": "1", "title": "PubMed Title 1", "source": "PubMed", "pubType": "Journal Article", "pubYear": "2023", "journalInfo": {"journal": {"title": "Journal A"}}},
                {"pmid": "2", "title": "PubMed Title 2", "source": "PubMed", "pubType": "Review", "pubYear": "2022", "journalInfo": {"journal": {"title": "Journal B"}}}
            ]
        }
    }
    
    mock_europe_pmc_response = MagicMock()
    mock_europe_pmc_response.json.return_value = {
        "resultList": {
            "result": [
                {"id": "3", "title": "Europe PMC Title 1", "source": "Europe PMC", "pubType": "Journal Article", "pubYear": "2021", "journalInfo": {"journal": {"title": "Journal C"}}},
                {"id": "4", "title": "Europe PMC Title 2", "source": "Europe PMC", "pubType": "Research Article", "pubYear": "2020", "journalInfo": {"journal": {"title": "Journal D"}}}
            ]
        }
    }

    mock_brave_web_response = {
        "web": {
            "results": [
                {"url": "http://brave.com/article1", "title": "Brave Article 1", "description": "Desc 1"},
                {"url": "http://brave.com/article2", "title": "Brave Article 2", "description": "Desc 2"}
            ]
        }
    }

    return {
        "pubmed": mock_pubmed_response,
        "europe_pmc": mock_europe_pmc_response,
        "brave_web": mock_brave_web_response
    }

# Fixture to mock httpx.AsyncClient for external API calls
@pytest.fixture(autouse=True)
def mock_httpx_client(mock_external_api_responses):
    with patch('httpx.AsyncClient') as MockAsyncClient:
        mock_client_instance = AsyncMock(spec=httpx.AsyncClient)
        mock_client_instance.get.side_effect = [
            mock_external_api_responses["pubmed"], # For PubMedService
            mock_external_api_responses["europe_pmc"] # For EuropePMCService
        ]
        mock_client_instance.post.side_effect = [
            # Add mocks for any POST requests if necessary
        ]
        MockAsyncClient.return_value = mock_client_instance
        yield MockAsyncClient

# Fixture to mock BAML calls within SimpleAutonomousResearchService
@pytest.fixture(autouse=True)
def mock_baml_calls():
    with patch('backend-api.services.simple_autonomous_research.b', new_callable=MagicMock) as mock_baml:
        mock_baml.FormulateDeepResearchStrategy = AsyncMock(return_value=MagicMock(
            search_parameters_list=[
                MagicMock(
                    query_string="test query pubmed",
                    source=ResearchSourceType.PUBMED,
                    rationale="Search PubMed for test query"
                ),
                MagicMock(
                    query_string="test query europepmc",
                    source=ResearchSourceType.EUROPE_PMC,
                    rationale="Search Europe PMC for test query"
                )
            ],
            refined_query_for_llm_synthesis="refined test query"
        ))
        mock_baml.SynthesizeDeepResearch = AsyncMock(return_value=SynthesizedResearchOutput(
            original_query="refined test query",
            executive_summary="Synthesized summary from mock external APIs.",
            detailed_results="Detailed mock results.",
            key_findings_by_theme=[],
            evidence_quality_assessment="Good",
            clinical_implications=[],
            research_gaps_identified=[],
            relevant_references=[],
            search_strategy_used="mock strategy",
            limitations=[],
            research_metrics=MagicMock(),
            professional_detailed_reasoning_cot="mock reasoning"
        ))
        mock_baml.TranslateToEnglish = AsyncMock(return_value=MagicMock(translated_text="english query"))
        mock_baml.ExtractPubMedKeywords = AsyncMock(return_value=MagicMock(simplified_query="simplified query"))
        
        yield mock_baml

# Fixture to mock MCP calls
@pytest.fixture(autouse=True)
def mock_mcp_calls(mock_external_api_responses):
    with patch('backend-api.services.simple_autonomous_research.async_brave_web_search', new=AsyncMock(return_value=mock_external_api_responses["brave_web"])), \
         patch('backend-api.services.simple_autonomous_research.async_lookup_guidelines', new=AsyncMock(return_value={"web": {"results": []}})): # Mocking for completeness
        yield

@pytest.mark.asyncio
async def test_simple_autonomous_research_service_integration(mock_httpx_client, mock_baml_calls, mock_mcp_calls, mock_external_api_responses):
    service = SimpleAutonomousResearchService()
    
    research_input = ResearchTaskInput(
        user_original_query="test query",
        pico_question=None,
        quality_filters_applied=[],
        date_range_searched=None,
        language_filters_applied=["portuguese"]
    )

    async with service:
        result = await service.conduct_autonomous_research(research_input)
    
    assert isinstance(result, SynthesizedResearchOutput)
    assert "Synthesized summary from mock external APIs." in result.executive_summary
    assert mock_baml_calls.FormulateDeepResearchStrategy.called
    assert mock_baml_calls.SynthesizeDeepResearch.called

    # Verify that external API calls were made through httpx.AsyncClient mocks
    assert mock_httpx_client.return_value.get.call_count >= 2 # PubMed and Europe PMC
    
    # Verify that the results are accumulated and passed to synthesis
    # The exact number of RawSearchResultItem depends on the conversion logic,
    # but we can check if they are present in the final synthesis call
    synthesize_call_args = mock_baml_calls.SynthesizeDeepResearch.call_args
    assert synthesize_call_args is not None
    search_results_passed_to_synthesis = synthesize_call_args.kwargs['search_results']
    
    # At least some results from PubMed and Europe PMC should be present and converted
    pubmed_converted_count = sum(1 for r in search_results_passed_to_synthesis if r.source == ResearchSourceType.PUBMED)
    europe_pmc_converted_count = sum(1 for r in search_results_passed_to_synthesis if r.source == ResearchSourceType.EUROPE_PMC)
    brave_converted_count = sum(1 for r in search_results_passed_to_synthesis if r.source == ResearchSourceType.WEB_SEARCH_BRAVE)

    assert pubmed_converted_count > 0
    assert europe_pmc_converted_count > 0
    assert brave_converted_count > 0
    
    # Check that translation was called
    mock_baml_calls.TranslateToEnglish.assert_called_once_with("test query")
    mock_baml_calls.ExtractPubMedKeywords.assert_called_once_with("english query")
