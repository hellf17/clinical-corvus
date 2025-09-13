import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from baml_client.types import ClinicalQueryAnalysis
from database.models import User as UserModel
from services.cache_service import cache_service

# Mock dependencies for the router
@pytest.fixture(autouse=True)
def mock_router_dependencies():
    with patch('backend-api.routers.agents_router.b', new_callable=MagicMock) as mock_b, \
         patch('backend-api.routers.agents_router.create_clinical_research_agent') as mock_create_research_agent, \
         patch('backend-api.routers.agents_router.create_clinical_discussion_agent') as mock_create_discussion_agent, \
         patch('backend-api.routers.agents_router.get_current_user_required') as mock_get_current_user_required:
        
        # Mock BAML's AnalyzeClinicalQuery
        mock_b.AnalyzeClinicalQuery = AsyncMock(return_value=ClinicalQueryAnalysis(query_type="general"))

        # Mock agent instances and their agent_response methods
        mock_research_agent_instance = MagicMock()
        mock_research_agent_instance.agent_response = AsyncMock(return_value=MagicMock(content="Research Agent Response"))
        mock_create_research_agent.return_value = mock_research_agent_instance

        mock_discussion_agent_instance = MagicMock()
        mock_discussion_agent_instance.agent_response = AsyncMock(return_value=MagicMock(content="Discussion Agent Response"))
        mock_create_discussion_agent.return_value = mock_discussion_agent_instance

        # Mock current user
        mock_get_current_user_required.return_value = UserModel(id="test_user", email="test@example.com", roles=["doctor"])

        yield {
            "mock_b": mock_b,
            "mock_create_research_agent": mock_create_research_agent,
            "mock_create_discussion_agent": mock_create_discussion_agent,
            "mock_research_agent_instance": mock_research_agent_instance,
            "mock_discussion_agent_instance": mock_discussion_agent_instance,
            "mock_get_current_user_required": mock_get_current_user_required
        }

@pytest.fixture
def client():
    # Clear cache before each test
    cache_service.clear()
    return TestClient(app)

@pytest.mark.asyncio
async def test_agent_routing_research_intent(client, mock_router_dependencies):
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="research")
    
    response = client.post("/api/agents/chat", json={"query": "What is the evidence for new cancer treatments?"})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Research Agent Response"
    assert response.json()["intent"] == "research"
    mock_router_dependencies["mock_create_research_agent"].assert_called_once()
    mock_router_dependencies["mock_create_discussion_agent"].assert_not_called()
    mock_router_dependencies["mock_research_agent_instance"].agent_response.assert_called_once_with("What is the evidence for new cancer treatments?")

@pytest.mark.asyncio
async def test_agent_routing_discussion_intent(client, mock_router_dependencies):
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="discussion")
    
    response = client.post("/api/agents/chat", json={"query": "Discuss a complex patient case with me."})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Discussion Agent Response"
    assert response.json()["intent"] == "discussion"
    mock_router_dependencies["mock_create_discussion_agent"].assert_called_once()
    mock_router_dependencies["mock_create_research_agent"].assert_not_called()
    mock_router_dependencies["mock_discussion_agent_instance"].agent_response.assert_called_once_with("Discuss a complex patient case with me.")

@pytest.mark.asyncio
async def test_agent_routing_general_query_defaults_to_discussion(client, mock_router_dependencies):
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.return_value = ClinicalQueryAnalysis(query_type="general")
    
    response = client.post("/api/agents/chat", json={"query": "Tell me about hypertension."})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Discussion Agent Response"
    assert response.json()["intent"] == "general" # BAML's returned intent
    mock_router_dependencies["mock_create_discussion_agent"].assert_called_once()
    mock_router_dependencies["mock_create_research_agent"].assert_not_called()
    mock_router_dependencies["mock_discussion_agent_instance"].agent_response.assert_called_once_with("Tell me about hypertension.")

@pytest.mark.asyncio
async def test_agent_routing_baml_failure_fallback(client, mock_router_dependencies):
    # Simulate BAML failure by making AnalyzeClinicalQuery raise an exception
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.side_effect = Exception("BAML service error")
    
    # Query with research keywords to trigger fallback to research agent
    response = client.post("/api/agents/chat", json={"query": "I need evidence on diabetes management."})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Research Agent Response"
    assert response.json()["intent"] == "fallback" # Should indicate fallback was used
    mock_router_dependencies["mock_create_research_agent"].assert_called_once()
    mock_router_dependencies["mock_create_discussion_agent"].assert_not_called()
    mock_router_dependencies["mock_research_agent_instance"].agent_response.assert_called_once_with("I need evidence on diabetes management.")

@pytest.mark.asyncio
async def test_agent_routing_baml_failure_fallback_to_discussion(client, mock_router_dependencies):
    # Simulate BAML failure
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.side_effect = Exception("Another BAML error")
    
    # Query with discussion keywords to trigger fallback to discussion agent
    response = client.post("/api/agents/chat", json={"query": "Let's talk about a patient's symptoms."})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Discussion Agent Response"
    assert response.json()["intent"] == "fallback"
    mock_router_dependencies["mock_create_discussion_agent"].assert_called_once()
    mock_router_dependencies["mock_create_research_agent"].assert_not_called()
    mock_router_dependencies["mock_discussion_agent_instance"].agent_response.assert_called_once_with("Let's talk about a patient's symptoms.")

@pytest.mark.asyncio
async def test_agent_routing_with_cache_hit(client, mock_router_dependencies):
    query = "Test query for caching."
    
    # Prime the cache
    cache_key_str = f"{query}-None-None"
    cache_key = hashlib.md5(cache_key_str.encode()).hexdigest()
    cache_service.set(cache_key, {"response": "Cached Response", "intent": "cached_intent"})

    response = client.post("/api/agents/chat", json={"query": query})
    
    assert response.status_code == 200
    assert response.json()["response"] == "Cached Response"
    assert response.json()["intent"] == "cached_intent"
    
    # Ensure BAML and agent creation were NOT called due to cache hit
    mock_router_dependencies["mock_b"].AnalyzeClinicalQuery.assert_not_called()
    mock_router_dependencies["mock_create_research_agent"].assert_not_called()
    mock_router_dependencies["mock_create_discussion_agent"].assert_not_called()
