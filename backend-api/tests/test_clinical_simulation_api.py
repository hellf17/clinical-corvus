
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Assuming the FastAPI app instance is in `backend-api.main`
# Adjust the import path if your app instance is located elsewhere.
from main import app 

client = TestClient(app)

# Mock data for a clinical case, consistent with frontend models
mock_clinical_case = {
    "id": "case-test-001",
    "title": "Test Case for API",
    "brief": "A patient presents with symptoms for API testing.",
    "details": "Detailed information about the test case.",
    "difficulty": {
        "level": "Intermediário",
        "focus": "API testing focus"
    },
    "specialties": ["API", "Testing"],
    "learning_objectives": ["Test initialization", "Test step progression"]
}

# Test for the session initialization endpoint
@patch('baml_client.b.InitializeClinicalSimulation.prompt_sync')
def test_initialize_session_success(mock_baml_init):
    """Tests successful session initialization."""
    # Mock the BAML function to return a valid initial state
    mock_baml_init.return_value = {
        "case_context": mock_clinical_case,
        "feedback_history": []
    }

    response = client.post("/api/clinical-simulation/initialize", json={"case_context": mock_clinical_case})
    
    assert response.status_code == 200
    data = response.json()
    assert data["case_context"]["id"] == "case-test-001"
    assert "feedback_history" in data
    assert len(data["feedback_history"]) == 0

def test_initialize_session_invalid_input():
    """Tests for a 422 error with invalid input."""
    response = client.post("/api/clinical-simulation/initialize", json={"invalid_field": "some_value"})
    assert response.status_code == 422

# Tests for the step progression endpoint
@patch('baml_client.b.ProvideFeedbackOnStep.prompt_sync')
def test_step_summarize_success(mock_baml_step):
    """Tests a successful 'SUMMARIZE' step."""
    # Mock the BAML function for the step feedback
    mock_baml_step.return_value = {
        "updated_session_state": {
            "case_context": mock_clinical_case,
            "student_summary": "This is the summary.",
            "feedback_history": ["Initial feedback"]
        },
        "feedback": {
            "overall_assessment": "A good summary.",
            "feedback_strengths": ["Concise"],
            "feedback_improvements": [],
            "missing_elements": [],
            "socratic_questions": [],
            "next_step_guidance": "Proceed to narrow the differential."
        }
    }

    initial_state = {
        "case_context": mock_clinical_case,
        "feedback_history": []
    }
    
    payload = {
        "session_state": initial_state,
        "current_step": "SUMMARIZE",
        "current_input": "This is the summary."
    }

    response = client.post("/api/clinical-simulation/step-translated", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "updated_session_state" in data
    assert "feedback" in data
    assert data["updated_session_state"]["student_summary"] == "This is the summary."
    assert data["feedback"]["overall_assessment"] == "A good summary."

def test_step_invalid_state():
    """Tests for a 422 error if the session state is malformed."""
    payload = {
        "session_state": { "case_context": None }, # Invalid state
        "current_step": "SUMMARIZE",
        "current_input": "Some input."
    }
    response = client.post("/api/clinical-simulation/step-translated", json=payload)
    assert response.status_code == 422
