import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agents.clinical_discussion_agent import ClinicalDiscussionAgent, LANGROID_AVAILABLE, PATIENT_CONTEXT_AVAILABLE, BAML_AVAILABLE
from services.patient_context_manager import PatientContextManager
from baml_client.types import ClinicalDataInput, StructuredSummaryOutput, ClinicalQueryAnalysis

# Mock external dependencies
@pytest.fixture(autouse=True)
def mock_dependencies():
    with patch('backend-api.agents.clinical_discussion_agent.patient_context_manager') as mock_patient_context_manager, \
         patch('backend-api.agents.clinical_discussion_agent.ClinicalResearchAgent') as MockClinicalResearchAgent_cls, \
         patch('backend-api.agents.clinical_discussion_agent.b', new_callable=MagicMock) as mock_b:
        
        # Configure mock_patient_context_manager
        mock_patient_context_manager.get_patient_context = AsyncMock(return_value={
            "patient_id": "test_patient_id",
            "demographics": {"age": 60, "gender": "male", "primary_diagnosis": "Hypertension"},
            "recent_labs": [],
            "medications": [],
            "recent_notes": [],
            "clinical_summary": "60-year-old male with hypertension."
        })
        mock_patient_context_manager.check_patient_access = AsyncMock(return_value=True)

        # Configure MockClinicalResearchAgent
        mock_research_agent_instance = MagicMock()
        mock_research_agent_instance.handle_clinical_query = AsyncMock(return_value={
            "result": {"executive_summary": "Mock research insights."},
            "query_type": "research",
            "agent_type": "clinical_research"
        })
        MockClinicalResearchAgent_cls.return_value = mock_research_agent_instance

        # Configure mock_b (BAML client)
        mock_b.SummarizeAndStructureClinicalData = AsyncMock(return_value=StructuredSummaryOutput(
            one_sentence_summary="Mock clinical case summary.",
            semantic_qualifiers_identified=["fever", "cough"],
            key_patient_details_abstracted=["age", "gender"],
            suggested_areas_for_further_data_gathering=["imaging", "culture"],
            needs_research=False
        ))
        
        yield {
            "mock_patient_context_manager": mock_patient_context_manager,
            "MockClinicalResearchAgent_cls": MockClinicalResearchAgent_cls,
            "mock_research_agent_instance": mock_research_agent_instance,
            "mock_b": mock_b
        }

@pytest.fixture
def clinical_discussion_agent():
    if LANGROID_AVAILABLE:
        from langroid.agent.chat_agent import ChatAgentConfig
        config = ChatAgentConfig(name="TestDiscussionAgent")
        return ClinicalDiscussionAgent(config)
    else:
        return ClinicalDiscussionAgent()

@pytest.mark.asyncio
async def test_discuss_clinical_case_no_patient_context(mock_dependencies, clinical_discussion_agent):
    case_description = "Patient presents with fever and cough."
    result = await clinical_discussion_agent.discuss_clinical_case(
        case_description=case_description,
        include_patient_context=False
    )

    assert result["case_description"] == case_description
    assert "analysis" in result
    assert "discussion" in result
    assert not result["patient_context_included"]
    mock_dependencies["mock_patient_context_manager"].get_patient_context.assert_not_called()
    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData.assert_called_once()

@pytest.mark.asyncio
async def test_discuss_clinical_case_with_patient_context(mock_dependencies, clinical_discussion_agent):
    case_description = "Patient presents with fever and cough. Patient ID: test_patient_id."
    patient_id = "test_patient_id"
    user_id = "test_user_id"
    
    result = await clinical_discussion_agent.discuss_clinical_case(
        case_description=case_description,
        patient_id=patient_id,
        user_id=user_id,
        include_patient_context=True
    )

    assert result["case_description"] == case_description
    assert result["patient_context_included"]
    mock_dependencies["mock_patient_context_manager"].get_patient_context.assert_called_once_with(patient_id, user_id)
    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData.assert_called_once()

@pytest.mark.asyncio
async def test_discuss_clinical_case_needs_research(mock_dependencies, clinical_discussion_agent):
    case_description = "Research question: What is the latest evidence for treating COVID-19?"
    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData.return_value.needs_research = True
    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData.return_value.suggested_areas_for_further_data_gathering = ["latest evidence for treating COVID-19"]

    result = await clinical_discussion_agent.discuss_clinical_case(case_description)

    assert "research_insights" in result["discussion"]
    mock_dependencies["mock_research_agent_instance"].handle_clinical_query.assert_called_once()
    assert mock_dependencies["mock_research_agent_instance"].handle_clinical_query.call_args[0][0] == case_description # Ensure query is passed

@pytest.mark.asyncio
async def test_continue_discussion_valid_id(clinical_discussion_agent):
    # First, start a discussion to populate memory
    await clinical_discussion_agent.discuss_clinical_case("Initial case discussion.")
    
    follow_up_question = "What are the next steps?"
    result = await clinical_discussion_agent.continue_discussion(follow_up_question, conversation_id=0)

    assert result["follow_up_question"] == follow_up_question
    assert "response" in result
    assert result["conversation_id"] == 0

@pytest.mark.asyncio
async def test_continue_discussion_invalid_id(clinical_discussion_agent):
    follow_up_question = "What are the next steps?"
    result = await clinical_discussion_agent.continue_discussion(follow_up_question, conversation_id=999)

    assert "error" in result
    assert "Invalid conversation ID" in result["error"]

@pytest.mark.asyncio
async def test_conversation_history(clinical_discussion_agent):
    await clinical_discussion_agent.discuss_clinical_case("Case 1.")
    await clinical_discussion_agent.discuss_clinical_case("Case 2.")
    await clinical_discussion_agent.discuss_clinical_case("Case 3.")

    history = clinical_discussion_agent.get_conversation_history(limit=2)
    assert len(history) == 2
    assert "Case 3." in history[1]["case_description"]

@pytest.mark.asyncio
async def test_clear_conversation_history(clinical_discussion_agent):
    await clinical_discussion_agent.discuss_clinical_case("Case to be cleared.")
    clinical_discussion_agent.clear_conversation_history()
    history = clinical_discussion_agent.get_conversation_history()
    assert len(history) == 0
