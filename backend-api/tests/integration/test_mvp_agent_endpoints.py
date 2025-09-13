import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from database.models import User as UserModel
from services.cache_service import cache_service
from baml_client.types import ClinicalQueryAnalysis, PICOFormulationOutput, SynthesizedResearchOutput, ClinicalDataInput, StructuredSummaryOutput

# Define a base URL for the test client
BASE_URL = "http://test"

# Mock external dependencies for integration tests
@pytest.fixture(autouse=True)
def mock_integration_dependencies():
    with patch('backend-api.routers.mvp_agents.ClinicalResearchAgent') as MockClinicalResearchAgent_cls, \
         patch('backend-api.routers.mvp_agents.ClinicalDiscussionAgent') as MockClinicalDiscussionAgent_cls, \
         patch('backend-api.routers.mvp_agents.patient_context_manager') as mock_patient_context_manager, \
         patch('backend-api.security.get_current_user_required') as mock_get_current_user_required, \
         patch('backend-api.security.get_current_user_optional') as mock_get_current_user_optional, \
         patch('backend-api.routers.mvp_agents.b', new_callable=MagicMock) as mock_baml_router:
        
        # Mock ClinicalResearchAgent
        mock_research_agent_instance = MagicMock()
        mock_research_agent_instance.handle_clinical_query = AsyncMock(return_value={
            "result": {
                "executive_summary": "Mock Research Summary for Integration Test",
                "key_findings": [{"theme_name": "Test", "key_findings": ["Finding 1"], "strength_of_evidence": "High"}],
                "relevant_references": [],
                "patient_specific_notes": ["Note 1"]
            },
            "query_type": "research",
            "agent_type": "clinical_research",
            "service_used": "SimpleAutonomousResearchService"
        })
        MockClinicalResearchAgent_cls.return_value = mock_research_agent_instance

        # Mock ClinicalDiscussionAgent
        mock_discussion_agent_instance = MagicMock()
        mock_discussion_agent_instance.discuss_clinical_case = AsyncMock(return_value={
            "result": {
                "case_description": "Mock Case Description",
                "analysis": {"summary": "Mock Analysis Summary"},
                "discussion": {"clinical_reasoning": {"assessment": "Mock Reasoning"}},
                "patient_context_included": True
            },
            "agent_type": "clinical_discussion"
        })
        mock_discussion_agent_instance.continue_discussion = AsyncMock(return_value={
            "result": {"answer": "Mock Follow-up Answer"},
            "agent_type": "clinical_discussion"
        })
        mock_discussion_agent_instance.get_conversation_history = MagicMock(return_value=[
            {"case_description": "Previous Case", "discussion": {"assessment": "Previous Discussion"}}
        ])
        MockClinicalDiscussionAgent_cls.return_value = mock_discussion_agent_instance

        # Mock PatientContextManager
        mock_patient_context_manager.get_patient_context = AsyncMock(return_value={
            "patient_id": "test_patient_id",
            "demographics": {"age": 60, "gender": "male", "primary_diagnosis": "Hypertension"},
            "clinical_summary": "60-year-old male with hypertension."
        })
        mock_patient_context_manager.check_patient_access = AsyncMock(return_value=True)

        # Mock current user
        mock_user = UserModel(id="test_user", email="test@example.com", roles=["doctor"])
        mock_get_current_user_required.return_value = mock_user
        mock_get_current_user_optional.return_value = mock_user

        # Mock BAML within the router (for routing logic)
        mock_baml_router.AnalyzeClinicalQuery = AsyncMock(return_value=ClinicalQueryAnalysis(query_type="general"))

        yield {
            "mock_research_agent_instance": mock_research_agent_instance,
            "mock_discussion_agent_instance": mock_discussion_agent_instance,
            "mock_patient_context_manager": mock_patient_context_manager,
            "mock_get_current_user_required": mock_get_current_user_required,
            "mock_baml_router": mock_baml_router
        }

@pytest.fixture
def client():
    # Clear cache before each test
    cache_service.clear()
    return httpx.AsyncClient(app=app, base_url=BASE_URL)

@pytest.mark.asyncio
async def test_clinical_research_endpoint_success(client, mock_integration_dependencies):
    query = "What is the latest evidence for ACE inhibitors in heart failure?"
    patient_id = "patient123"
    
    response = await client.post(
        "/api/mvp-agents/clinical-research", 
        json={"query": query, "patient_id": patient_id}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["agent_type"] == "clinical_research"
    assert "Mock Research Summary" in json_response["result"]["executive_summary"]
    assert json_response["patient_context_included"] is True
    
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_called_once_with(
        query=query, patient_context=mock_integration_dependencies["mock_patient_context_manager"].get_patient_context.return_value
    )
    mock_integration_dependencies["mock_patient_context_manager"].get_patient_context.assert_called_once_with(patient_id, "test_user")

@pytest.mark.asyncio
async def test_clinical_discussion_endpoint_success(client, mock_integration_dependencies):
    case_description = "Patient with acute chest pain, suspected MI."
    patient_id = "patient456"
    
    response = await client.post(
        "/api/mvp-agents/clinical-discussion",
        json={"case_description": case_description, "patient_id": patient_id}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["agent_type"] == "clinical_discussion"
    assert "Mock Case Description" in json_response["result"]["case_description"]
    assert json_response["result"]["patient_context_included"] is True
    
    mock_integration_dependencies["mock_discussion_agent_instance"].discuss_clinical_case.assert_called_once_with(
        case_description=case_description,
        patient_id=patient_id,
        user_id="test_user",
        include_patient_context=True
    )

@pytest.mark.asyncio
async def test_clinical_query_endpoint_research_route(client, mock_integration_dependencies):
    query = "Find studies on hypertension treatment."
    mock_integration_dependencies["mock_baml_router"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="research")
    
    response = await client.post(
        "/api/mvp-agents/clinical-query",
        json={"query": query}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["agent_type"] == "clinical_research"
    assert json_response["routing_decision"]["query_type"] == "research"
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_called_once()
    mock_integration_dependencies["mock_discussion_agent_instance"].discuss_clinical_case.assert_not_called()

@pytest.mark.asyncio
async def test_clinical_query_endpoint_discussion_route(client, mock_integration_dependencies):
    query = "Discuss this patient's symptoms: fever, cough, fatigue."
    mock_integration_dependencies["mock_baml_router"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="discussion")
    
    response = await client.post(
        "/api/mvp-agents/clinical-query",
        json={"query": query}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["agent_type"] == "clinical_discussion"
    assert json_response["routing_decision"]["query_type"] == "discussion"
    mock_integration_dependencies["mock_discussion_agent_instance"].discuss_clinical_case.assert_called_once()
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_not_called()

@pytest.mark.asyncio
async def test_follow_up_discussion_endpoint_success(client, mock_integration_dependencies):
    follow_up_question = "What about the lab results?"
    conversation_id = 0
    
    response = await client.post(
        "/api/mvp-agents/follow-up-discussion",
        json={"follow_up_question": follow_up_question, "conversation_id": conversation_id}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["agent_type"] == "clinical_discussion"
    assert "Mock Follow-up Answer" in json_response["result"]["answer"]
    
    mock_integration_dependencies["mock_discussion_agent_instance"].continue_discussion.assert_called_once_with(
        follow_up_question=follow_up_question,
        conversation_id=conversation_id
    )

@pytest.mark.asyncio
async def test_get_conversation_history_endpoint_success(client, mock_integration_dependencies):
    mock_integration_dependencies["mock_discussion_agent_instance"].get_conversation_history.return_value = [
        {"case_description": "Test Case 1"}, {"case_description": "Test Case 2"}
    ]
    
    response = await client.get("/api/mvp-agents/conversation-history?limit=2")
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["total_conversations"] == 2
    assert json_response["conversation_history"][0]["case_description"] == "Test Case 1"
    
    mock_integration_dependencies["mock_discussion_agent_instance"].get_conversation_history.assert_called_once_with(limit=2)

@pytest.mark.asyncio
async def test_health_check_endpoint_success(client, mock_integration_dependencies):
    response = await client.get("/api/mvp-agents/health")
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["status"] == "healthy"
    assert "clinical_research_agent" in json_response["services"]
    assert "clinical_discussion_agent" in json_response["services"]
    assert "patient_context_manager" in json_response["services"]
    assert "autonomous_research_service" in json_response["services"]
    assert "baml_client" in json_response["services"]

@pytest.mark.asyncio
async def test_clinical_research_endpoint_cache(client, mock_integration_dependencies):
    query = "Cached research query"
    patient_id = "patient_cache"
    
    # First request - uncached
    response1 = await client.post(
        "/api/mvp-agents/clinical-research", 
        json={"query": query, "patient_id": patient_id}
    )
    assert response1.status_code == 200
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_called_once()
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.reset_mock() # Reset mock call count

    # Second request - should be cached
    response2 = await client.post(
        "/api/mvp-agents/clinical-research", 
        json={"query": query, "patient_id": patient_id}
    )
    assert response2.status_code == 200
    assert response2.json()["result"]["executive_summary"] == response1.json()["result"]["executive_summary"]
    
    # Ensure agent was NOT called again due to cache hit
    mock_integration_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_not_called()

@pytest.mark.asyncio
async def test_pico_chaining_to_research(client, mock_integration_dependencies):
    # This test directly calls the agent chat endpoint, and mocks the BAML
    # AnalyzeClinicalQuery to route to research agent.
    # It then verifies that the formulate_pico_question tool, when called,
    # triggers the autonomous_research method within the agent.

    # Mock BAML to route to research agent and ensure the agent's tool is called
    mock_integration_dependencies["mock_baml_router"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="research")

    # Mock the specific tool call within the ClinicalResearchAgent
    # We need to mock the _handle_research_query that `formulate_pico_question` calls
    with patch.object(mock_integration_dependencies["mock_research_agent_instance"], 'formulate_pico_question', new=AsyncMock(return_value="PICO and Research Chaining Success")) as mock_formulate_pico:
        query = "Formulate a PICO question and research its effectiveness: statins for hyperlipidemia."
        response = await client.post(
            "/api/agents/chat", # This is the unified agent chat endpoint
            json={"query": query}
        )
        
        assert response.status_code == 200
        json_response = response.json()
        assert "PICO and Research Chaining Success" in json_response["response"]
        
        # Verify that the formulate_pico_question tool was attempted to be called by Langroid
        # This checks the orchestration aspect
        mock_formulate_pico.assert_called_once_with(query=query)
        
        # We don't directly assert on autonomous_research here because it's an internal call
        # of formulate_pico_question, which we've mocked out.
        # The success of this test implies the routing worked and the tool was engaged.
        # More detailed internal chaining would be covered in unit tests for the agent itself.
