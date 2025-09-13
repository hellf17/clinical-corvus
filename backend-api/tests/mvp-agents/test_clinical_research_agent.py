import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agents.clinical_research_agent import ClinicalResearchAgent, LANGROID_AVAILABLE, SIMPLE_AUTONOMOUS_AVAILABLE, BAML_AVAILABLE
from services.patient_context_manager import PatientContextManager
from services.simple_autonomous_research import SimpleAutonomousResearchService
from baml_client.types import ResearchTaskInput, ClinicalScenarioInput, PICOFormulationOutput, SynthesizedResearchOutput

# Mock the external dependencies
@pytest.fixture(autouse=True)
def mock_dependencies():
    with patch('agents.clinical_research_agent.b', new_callable=MagicMock) as mock_b, \
         patch('agents.clinical_research_agent.SimpleAutonomousResearchService') as MockSimpleAutonomousResearchService_cls, \
         patch('agents.academy_tools.create_clinical_academy_agent') as mock_create_academy_agent:
        
        # Configure mock_b (BAML client)
        # Note: AnalyzeClinicalQuery doesn't exist in BAML, the agent uses heuristic analysis
        mock_pico_question = MagicMock()
        mock_pico_question.patient_population = "mock_population"
        mock_pico_question.intervention = "mock_intervention"
        mock_pico_question.comparison = "mock_comparison"
        mock_pico_question.outcome = "mock_outcome"
        
        mock_pico_output = MagicMock()
        mock_pico_output.structured_pico_question = mock_pico_question
        mock_pico_output.structured_question = "Mock PICO Question"
        mock_pico_output.explanation = "Mock reasoning"
        mock_pico_output.search_terms_suggestions = ["term1", "term2"]
        mock_pico_output.boolean_search_strategies = ["strategy1"]
        mock_pico_output.recommended_study_types = ["RCT"]
        
        mock_b.FormulateEvidenceBasedPICOQuestion = AsyncMock(return_value=mock_pico_output)

        # Configure MockSimpleAutonomousResearchService
        mock_research_service_instance = AsyncMock(spec=SimpleAutonomousResearchService)
        mock_research_service_instance.conduct_autonomous_research = AsyncMock(return_value=SynthesizedResearchOutput(
            original_query="mock query",
            executive_summary="Mock research summary",
            professional_detailed_reasoning_cot="Mock detailed reasoning chain of thought",
            clinical_implications=["Mock clinical implication 1", "Mock clinical implication 2"],
            key_findings_by_theme=[],
            research_gaps_identified=["Mock research gap 1"],
            evidence_quality_assessment="Mock evidence quality assessment",
            relevant_references=[],
            research_metrics=None,
            search_duration_seconds=10.0
        ))
        MockSimpleAutonomousResearchService_cls.return_value = mock_research_service_instance
        MockSimpleAutonomousResearchService_cls.return_value.__aenter__.return_value = mock_research_service_instance

        # Configure ClinicalAcademyAgent mock
        mock_academy_agent_instance = MagicMock()
        mock_academy_agent_instance.agent_response = AsyncMock(return_value=MagicMock(content="Mock academy response"))
        mock_create_academy_agent.return_value = mock_academy_agent_instance
        
        yield {
            "mock_b": mock_b,
            "MockSimpleAutonomousResearchService_cls": MockSimpleAutonomousResearchService_cls,
            "mock_research_service_instance": mock_research_service_instance,
            "mock_create_academy_agent": mock_create_academy_agent,
            "mock_academy_agent_instance": mock_academy_agent_instance
        }

@pytest.fixture
def clinical_research_agent():
    # Ensure Langroid is available for proper agent initialization if tests rely on it
    if LANGROID_AVAILABLE:
        from langroid.agent.chat_agent import ChatAgentConfig
        config = ChatAgentConfig(name="TestAgent")
        return ClinicalResearchAgent(config)
    else:
        return ClinicalResearchAgent() # Fallback for non-Langroid environments

@pytest.mark.asyncio
async def test_handle_clinical_query_research(mock_dependencies, clinical_research_agent):
    # Use a query that will trigger research heuristics (contains "evidence")
    query = "What is the evidence for ACE inhibitors in heart failure?"
    result = await clinical_research_agent.handle_clinical_query(query)
    
    # The agent correctly identifies research queries but may fall back to ClinicalAcademyAgent
    # when BAML types are not available or validation fails
    assert result["query_type"] in ["research", "research_fallback"]
    assert "executive_summary" in result["result"]
    mock_dependencies["mock_research_service_instance"].conduct_autonomous_research.assert_called_once()

@pytest.mark.asyncio
async def test_handle_clinical_query_lab_analysis(mock_dependencies, clinical_research_agent):
    # Configure mock for lab insights
    mock_insights = MagicMock()
    mock_insights.clinical_summary = "Lab insights summary"
    mock_insights.important_results_to_discuss_with_doctor = ["High creatinine"]
    mock_dependencies["mock_b"].GenerateDrCorvusInsights = AsyncMock(return_value=mock_insights)

    # Use a query with lab keywords and patient context with recent labs
    query = "Analyze these lab results: Hemoglobin 10, Creatinine 2.0"
    patient_context = {"recent_labs": [{"test_name": "Creatinine", "value": 2.0, "is_abnormal": True}]}
    result = await clinical_research_agent.handle_clinical_query(query, patient_context)

    assert result["query_type"] == "lab_analysis"
    assert result["result"] is not None
    mock_dependencies["mock_b"].GenerateDrCorvusInsights.assert_called_once()

@pytest.mark.asyncio
async def test_handle_clinical_query_clinical_reasoning(mock_dependencies, clinical_research_agent):
    # Use a query with clinical reasoning keywords
    query = "Discuss the differential diagnosis for a 60-year-old male with chest pain."
    result = await clinical_research_agent.handle_clinical_query(query)
    
    assert result["query_type"] == "clinical_reasoning"
    assert result["result"] == "Mock academy response"
    mock_dependencies["mock_academy_agent_instance"].agent_response.assert_called_once_with(query)

@pytest.mark.asyncio
async def test_handle_clinical_query_general_delegation(mock_dependencies, clinical_research_agent):
    # Use a general query that doesn't match specific heuristics
    query = "Tell me about diabetes."
    result = await clinical_research_agent.handle_clinical_query(query)
    
    assert result["query_type"] == "general_clinical"
    assert result["result"] == "Mock academy response"
    mock_dependencies["mock_academy_agent_instance"].agent_response.assert_called_once_with(query)

@pytest.mark.asyncio
async def test_formulate_pico_question_tool_chaining(mock_dependencies, clinical_research_agent):
    # Skip if Langroid not available OR if BAML not available
    if not LANGROID_AVAILABLE or not BAML_AVAILABLE:
        pytest.skip("Langroid or BAML not available, skipping tool tests.")

    query = "How effective are statins in preventing cardiovascular events in diabetic patients?"

    # Mock the internal _handle_research_query call within the tool
    with patch.object(clinical_research_agent, '_handle_research_query', new=AsyncMock(return_value={
        "result": {"executive_summary": "Research on statins effectiveness completed."}
    })) as mock_handle_research:
        result_str = await clinical_research_agent.formulate_pico_question(query)

        mock_dependencies["mock_b"].FormulateEvidenceBasedPICOQuestion.assert_called_once()
        mock_handle_research.assert_called_once()
        assert "PICO Question: Mock PICO Question" in result_str
        assert "Research on statins effectiveness completed." in result_str

@pytest.mark.asyncio
async def test_autonomous_research_tool(mock_dependencies, clinical_research_agent):
    # Skip if Langroid not available OR if SimpleAutonomousResearchService not available
    if not LANGROID_AVAILABLE or not SIMPLE_AUTONOMOUS_AVAILABLE:
        pytest.skip("Langroid or SimpleAutonomousResearchService not available, skipping tool tests.")

    query = "Conduct autonomous research on new treatments for Alzheimer's disease."
    result_str = await clinical_research_agent.autonomous_research(query)

    mock_dependencies["mock_research_service_instance"].conduct_autonomous_research.assert_called_once()
    assert "Research completed: Mock research summary" in result_str

@pytest.mark.asyncio
async def test_analyze_lab_results_tool(mock_dependencies, clinical_research_agent):
    # Skip if Langroid not available OR if BAML not available
    if not LANGROID_AVAILABLE or not BAML_AVAILABLE:
        pytest.skip("Langroid or BAML not available, skipping tool tests.")

    mock_dependencies["mock_b"].GenerateDrCorvusInsights = AsyncMock(return_value=MagicMock(summary="Lab insights summary"))
    lab_data = {"Hemoglobin": "12.5", "Creatinine": "1.1"}
    result_str = await clinical_research_agent.analyze_lab_results(lab_data)

    mock_dependencies["mock_b"].GenerateDrCorvusInsights.assert_called_once()
    assert "Lab analysis completed: Lab insights summary" in result_str

@pytest.mark.asyncio
async def test_clinical_reasoning_tool(mock_dependencies, clinical_research_agent):
    # Skip if Langroid not available OR if BAML not available
    if not LANGROID_AVAILABLE or not BAML_AVAILABLE:
        pytest.skip("Langroid or BAML not available, skipping tool tests.")

    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData = AsyncMock(return_value=MagicMock(one_sentence_summary="Clinical reasoning summary"))
    clinical_case = "Patient presents with cough and fever."
    result_str = await clinical_research_agent.clinical_reasoning(clinical_case)

    mock_dependencies["mock_b"].SummarizeAndStructureClinicalData.assert_called_once()
    assert "Clinical reasoning completed: Clinical reasoning summary" in result_str

@pytest.mark.asyncio
async def test_patient_context_tool(clinical_research_agent):
    # Skip if Langroid not available
    if not LANGROID_AVAILABLE:
        pytest.skip("Langroid not available, skipping tool tests.")

    patient_id = "patient123"
    result_str = await clinical_research_agent.patient_context(patient_id)

    assert f"Patient context retrieved for ID: {patient_id}" in result_str # This is a placeholder for actual integration