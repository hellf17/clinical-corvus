import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from database.models import User as UserModel
from services.cache_service import cache_service
from middleware.agent_security import AgentSecurityMiddleware
from middleware.error_handling import ErrorHandlingMiddleware

# Mock dependencies for the router and middleware
@pytest.fixture(autouse=True)
def mock_dependencies():
    with patch('backend-api.routers.mvp_agents.ClinicalResearchAgent') as MockClinicalResearchAgent_cls, \
         patch('backend-api.routers.mvp_agents.ClinicalDiscussionAgent') as MockClinicalDiscussionAgent_cls, \
         patch('backend-api.routers.mvp_agents.patient_context_manager') as mock_patient_context_manager, \
         patch('backend-api.security.get_current_user_required') as mock_get_current_user_required, \
         patch('backend-api.security.get_current_user_optional') as mock_get_current_user_optional:
        
        # Mock agent instances and their handle_clinical_query methods
        mock_research_agent_instance = MagicMock()
        mock_research_agent_instance.handle_clinical_query = AsyncMock(return_value={"result": "Mock Research Response"})
        MockClinicalResearchAgent_cls.return_value = mock_research_agent_instance

        mock_discussion_agent_instance = MagicMock()
        mock_discussion_agent_instance.discuss_clinical_case = AsyncMock(return_value={"result": "Mock Discussion Response"})
        mock_discussion_agent_instance.continue_discussion = AsyncMock(return_value={"result": "Mock Follow-up Response"})
        mock_discussion_agent_instance.get_conversation_history = MagicMock(return_value=[])
        MockClinicalDiscussionAgent_cls.return_value = mock_discussion_agent_instance

        # Mock patient context manager
        mock_patient_context_manager.get_patient_context = AsyncMock(return_value={
            "patient_id": "test_patient_id", "demographics": {"age": 30}
        })
        mock_patient_context_manager.check_patient_access = AsyncMock(return_value=True)

        # Mock current user for authentication
        mock_user = UserModel(id="test_user", email="test@example.com", roles=["doctor"])
        mock_get_current_user_required.return_value = mock_user
        mock_get_current_user_optional.return_value = mock_user

        yield {
            "MockClinicalResearchAgent_cls": MockClinicalResearchAgent_cls,
            "MockClinicalDiscussionAgent_cls": MockClinicalDiscussionAgent_cls,
            "mock_patient_context_manager": mock_patient_context_manager,
            "mock_get_current_user_required": mock_get_current_user_required,
            "mock_get_current_user_optional": mock_get_current_user_optional
        }

@pytest.fixture
def client():
    # Clear cache before each test
    cache_service.clear()
    # Create a test client for the FastAPI app
    # The middleware should be active on the app
    return TestClient(app)

@pytest.mark.asyncio
async def test_error_handling_middleware_unhandled_exception(client, mock_dependencies):
    # Simulate an unhandled exception in the research agent
    mock_dependencies["MockClinicalResearchAgent_cls"].return_value.handle_clinical_query.side_effect = Exception("Simulated unhandled error")
    
    response = client.post("/api/mvp-agents/clinical-research", json={"query": "test query"})
    
    assert response.status_code == 500
    assert response.json()["detail"] == "An internal server error occurred."
    assert response.json()["error_type"] == "Exception"

@pytest.mark.asyncio
async def test_agent_security_middleware_unauthenticated(client, mock_dependencies):
    # Simulate unauthenticated user
    mock_dependencies["mock_get_current_user_required"].side_effect = HTTPException(status_code=401, detail="Not authenticated")
    
    response = client.post("/api/mvp-agents/clinical-research", json={"query": "test query"})
    
    # The middleware returns a Response object directly, not a JSONResponse from HTTPException
    assert response.status_code == 401
    assert response.text == "User not authenticated"

@pytest.mark.asyncio
async def test_agent_security_middleware_access_denied(client, mock_dependencies):
    # Simulate access denied to patient
    mock_dependencies["mock_patient_context_manager"].check_patient_access.return_value = False
    
    response = client.post("/api/mvp-agents/clinical-research", json={"query": "test query", "patient_id": "denied_patient"})
    
    assert response.status_code == 403
    assert "Access to patient denied." in response.text

@pytest.mark.asyncio
async def test_clinical_research_endpoint_service_error(client, mock_dependencies):
    # Simulate an error within the ClinicalResearchAgent's handle_clinical_query
    mock_dependencies["MockClinicalResearchAgent_cls"].return_value.handle_clinical_query.side_effect = Exception("Research service failed")
    
    response = client.post("/api/mvp-agents/clinical-research", json={"query": "fail research"})
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Clinical research failed: Research service failed"

@pytest.mark.asyncio
async def test_clinical_discussion_endpoint_service_error(client, mock_dependencies):
    # Simulate an error within the ClinicalDiscussionAgent's discuss_clinical_case
    mock_dependencies["MockClinicalDiscussionAgent_cls"].return_value.discuss_clinical_case.side_effect = Exception("Discussion service failed")
    
    response = client.post("/api/mvp-agents/clinical-discussion", json={"case_description": "fail discussion"})
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Clinical discussion failed: Discussion service failed"

@pytest.mark.asyncio
async def test_clinical_query_endpoint_service_error(client, mock_dependencies):
    # Simulate an error in routing logic or delegated agent
    mock_dependencies["MockClinicalResearchAgent_cls"].return_value.handle_clinical_query.side_effect = Exception("Query routing failed")
    
    response = client.post("/api/mvp-agents/clinical-query", json={"query": "fail routing"})
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Clinical query failed: Query routing failed"

@pytest.mark.asyncio
async def test_follow_up_discussion_endpoint_service_error(client, mock_dependencies):
    # Simulate an error in the ClinicalDiscussionAgent's continue_discussion
    mock_dependencies["MockClinicalDiscussionAgent_cls"].return_value.continue_discussion.side_effect = Exception("Follow-up service failed")
    
    response = client.post("/api/mvp-agents/follow-up-discussion", json={"follow_up_question": "fail follow-up"})
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Follow-up discussion failed: Follow-up service failed"

@pytest.mark.asyncio
async def test_get_conversation_history_service_error(client, mock_dependencies):
    # Simulate an error in the ClinicalDiscussionAgent's get_conversation_history
    mock_dependencies["MockClinicalDiscussionAgent_cls"].return_value.get_conversation_history.side_effect = Exception("History service failed")
    
    response = client.get("/api/mvp-agents/conversation-history")
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to get conversation history: History service failed"

@pytest.mark.asyncio
async def test_health_check_endpoint_service_error(client, mock_dependencies):
    # Simulate an error in one of the health checks
    mock_dependencies["mock_patient_context_manager"].check_patient_access.side_effect = Exception("Patient access check failed")
    
    response = client.get("/api/mvp-agents/health")
    
    assert response.status_code == 200 # Health check endpoint itself should not raise 500 for internal service errors
    assert response.json()["status"] == "degraded"
    assert "Patient access check failed" in response.json()["services"]["patient_context_manager"]