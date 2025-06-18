"""
End-to-End tests for the AI Chat system in the clinical-helper-next backend.
This tests the complete cycle of conversation with the AI assistant, including
context loading, question answering, and conversation management.
"""

import pytest
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
TEST_USER = {"email": "test_doctor@example.com", "password": "test_password"}


@pytest.fixture
def auth_token() -> str:
    """Get an authentication token for API requests."""
    response = requests.post(
        f"{BASE_URL}/auth/token", 
        data={"username": TEST_USER["email"], "password": TEST_USER["password"]}
    )
    assert response.status_code == 200, f"Failed to get auth token: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token: str) -> Dict[str, str]:
    """Create authentication headers for requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def test_patient(auth_headers: Dict[str, str]) -> Dict[str, Any]:
    """Create a test patient for chat testing."""
    patient_data = {
        "name": f"AI Chat Test Patient {datetime.now().isoformat()}",
        "idade": 62,
        "sexo": "F",
        "peso": 68.0,
        "altura": 1.65,
        "etnia": "branco",
        "diagnostico": "Congestive Heart Failure, Diabetes Type 2",
        "data_internacao": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BASE_URL}/patients/",
        json=patient_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    
    patient = response.json()
    patient["_cleanup_required"] = True  # Flag for cleanup
    
    # Add some test lab results for this patient
    lab_results = {
        "patient_id": patient["patient_id"],
        "date": datetime.now().isoformat(),
        "results": [
            {
                "name": "Glucose",
                "value": 187,
                "unit": "mg/dL",
                "reference_range": "70-100"
            },
            {
                "name": "HbA1c",
                "value": 8.2,
                "unit": "%",
                "reference_range": "4.0-5.6"
            },
            {
                "name": "BNP",
                "value": 820,
                "unit": "pg/mL",
                "reference_range": "0-100"
            },
            {
                "name": "Creatinine",
                "value": 1.3,
                "unit": "mg/dL",
                "reference_range": "0.5-1.1"
            }
        ]
    }
    
    lab_response = requests.post(
        f"{BASE_URL}/api/patients/{patient['patient_id']}/lab-results",
        json=lab_results,
        headers=auth_headers
    )
    assert lab_response.status_code in [200, 201]
    
    return patient


def test_create_new_conversation(auth_headers: Dict[str, str]):
    """Test creating a new conversation with the AI assistant."""
    # Create a new conversation
    conversation_data = {
        "title": f"Test Conversation {datetime.now().isoformat()}"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations",
        json=conversation_data,
        headers=auth_headers
    )
    assert response.status_code == 201, f"Failed to create conversation: {response.text}"
    
    conversation = response.json()
    conversation_id = conversation["id"]
    
    # Verify conversation was created with correct title
    assert conversation["title"] == conversation_data["title"]
    assert "created_at" in conversation
    assert "messages" in conversation
    assert len(conversation["messages"]) == 0  # New conversation, no messages yet
    
    # Cleanup - delete the conversation
    cleanup_response = requests.delete(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
        headers=auth_headers
    )
    assert cleanup_response.status_code == 204, "Failed to delete conversation"


def test_send_message_and_get_response(auth_headers: Dict[str, str]):
    """Test sending a message to the AI assistant and getting a response."""
    # Create a new conversation
    conversation_data = {
        "title": f"Medical Question {datetime.now().isoformat()}"
    }
    
    create_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations",
        json=conversation_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    conversation_id = create_response.json()["id"]
    
    # Send a medical question
    message_data = {
        "content": "What are the common treatments for congestive heart failure?",
        "role": "user"
    }
    
    message_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    assert message_response.status_code == 201
    
    # Wait for AI to process and respond (may be async)
    max_retries = 10
    for i in range(max_retries):
        # Get the conversation with messages
        conversation_response = requests.get(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        assert conversation_response.status_code == 200
        
        conversation = conversation_response.json()
        messages = conversation["messages"]
        
        # Check if there's an assistant response
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        if assistant_messages:
            break
        
        time.sleep(1)  # Wait before retrying
    
    # Verify we got an assistant response
    assert any(m["role"] == "assistant" for m in messages), "No assistant response received"
    
    # Verify the assistant response content
    assistant_message = next(m for m in messages if m["role"] == "assistant")
    assert len(assistant_message["content"]) > 0
    
    # Check that the response contains relevant medical information about CHF
    response_text = assistant_message["content"].lower()
    assert any(term in response_text for term in ["acei", "arb", "beta blocker", "diuretic", "ace inhibitor"]), \
        "Response should mention common CHF medications"
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
        headers=auth_headers
    )


def test_patient_context_in_conversation(auth_headers: Dict[str, str], test_patient: Dict[str, Any]):
    """Test using patient context in a conversation with the AI assistant."""
    patient_id = test_patient["patient_id"]
    
    # Create a new conversation with patient context
    conversation_data = {
        "title": f"Patient Context Test {datetime.now().isoformat()}",
        "patient_id": patient_id
    }
    
    create_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations",
        json=conversation_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    conversation_id = create_response.json()["id"]
    
    # Ask about the patient's condition using context
    message_data = {
        "content": "What do the patient's lab results suggest about their condition?",
        "role": "user"
    }
    
    message_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    assert message_response.status_code == 201
    
    # Wait for AI to process and respond
    max_retries = 10
    for i in range(max_retries):
        conversation_response = requests.get(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        assert conversation_response.status_code == 200
        
        conversation = conversation_response.json()
        messages = conversation["messages"]
        
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        if assistant_messages:
            break
        
        time.sleep(1)
    
    # Verify AI response includes patient-specific information
    assistant_message = next(m for m in messages if m["role"] == "assistant")
    response_text = assistant_message["content"].lower()
    
    # The response should reference values we added to the patient's record
    assert any(term in response_text for term in ["glucose", "hba1c", "diabetes", "bnp", "heart failure"]), \
        "Response should reference patient-specific lab values"
    
    # Follow-up question about treatment
    followup_data = {
        "content": "What treatment would you recommend for this patient?",
        "role": "user"
    }
    
    followup_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}/messages",
        json=followup_data,
        headers=auth_headers
    )
    assert followup_response.status_code == 201
    
    # Wait for AI to process and respond to follow-up
    for i in range(max_retries):
        conversation_response = requests.get(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        
        conversation = conversation_response.json()
        messages = conversation["messages"]
        
        # Check if there's a new assistant response (more than 1)
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        if len(assistant_messages) > 1:
            break
        
        time.sleep(1)
    
    # Verify follow-up response addresses both conditions
    followup_response = assistant_messages[-1]["content"].lower()
    
    # Should address both heart failure and diabetes
    assert any(term in followup_response for term in ["ace inhibitor", "arni", "beta blocker"]), \
        "Response should recommend heart failure medications"
    assert any(term in followup_response for term in ["metformin", "insulin", "glp-1", "sglt2"]), \
        "Response should recommend diabetes medications"
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
        headers=auth_headers
    )
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


def test_conversation_management(auth_headers: Dict[str, str]):
    """Test conversation management features like listing, updating title, etc."""
    # Create multiple conversations
    conversation_titles = [
        f"Conversation A {datetime.now().isoformat()}",
        f"Conversation B {datetime.now().isoformat()}",
        f"Conversation C {datetime.now().isoformat()}"
    ]
    
    conversation_ids = []
    
    for title in conversation_titles:
        create_response = requests.post(
            f"{BASE_URL}/api/ai-chat/conversations",
            json={"title": title},
            headers=auth_headers
        )
        assert create_response.status_code == 201
        conversation_ids.append(create_response.json()["id"])
    
    # List all conversations
    list_response = requests.get(
        f"{BASE_URL}/api/ai-chat/conversations",
        headers=auth_headers
    )
    assert list_response.status_code == 200
    
    conversations = list_response.json()
    assert len(conversations) >= len(conversation_ids)
    
    # Verify all created conversations are in the list
    created_conversations = [c for c in conversations if c["id"] in conversation_ids]
    assert len(created_conversations) == len(conversation_ids)
    
    # Update a conversation title
    new_title = f"Updated Title {datetime.now().isoformat()}"
    update_response = requests.patch(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_ids[0]}",
        json={"title": new_title},
        headers=auth_headers
    )
    assert update_response.status_code == 200
    
    # Verify title was updated
    updated_conversation = update_response.json()
    assert updated_conversation["title"] == new_title
    
    # Get a specific conversation
    get_response = requests.get(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_ids[1]}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    retrieved_conversation = get_response.json()
    assert retrieved_conversation["id"] == conversation_ids[1]
    assert retrieved_conversation["title"] == conversation_titles[1]
    
    # Delete conversations
    for conversation_id in conversation_ids:
        delete_response = requests.delete(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 204


def test_system_prompts_and_special_instructions(auth_headers: Dict[str, str]):
    """Test using system prompts and special instructions in conversations."""
    # Create a conversation with a specific system prompt
    conversation_data = {
        "title": f"System Prompt Test {datetime.now().isoformat()}",
        "system_prompt": "You are a cardiology specialist AI assistant. Focus your responses on cardiovascular conditions."
    }
    
    create_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations",
        json=conversation_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    
    conversation_id = create_response.json()["id"]
    
    # Ask a general medical question
    message_data = {
        "content": "What are the most important diagnostic tests for chest pain?",
        "role": "user"
    }
    
    message_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    assert message_response.status_code == 201
    
    # Wait for AI to process and respond
    max_retries = 10
    for i in range(max_retries):
        conversation_response = requests.get(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        assert conversation_response.status_code == 200
        
        conversation = conversation_response.json()
        messages = conversation["messages"]
        
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        if assistant_messages:
            break
        
        time.sleep(1)
    
    # Verify response is cardiology-focused due to system prompt
    assistant_message = next(m for m in messages if m["role"] == "assistant")
    response_text = assistant_message["content"].lower()
    
    # Should focus on cardiac tests due to system prompt
    assert any(term in response_text for term in ["ecg", "electrocardiogram", "troponin", "stress test"]), \
        "Response should focus on cardiac diagnostic tests due to system prompt"
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
        headers=auth_headers
    )


if __name__ == "__main__":
    # This allows running the tests directly without pytest
    import sys
    
    # Setup
    token = auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    patient = test_patient(headers)
    
    # Run tests
    try:
        test_create_new_conversation(headers)
        test_send_message_and_get_response(headers)
        test_patient_context_in_conversation(headers, patient)
        test_conversation_management(headers)
        test_system_prompts_and_special_instructions(headers)
        print("All AI chat tests passed!")
    except Exception as e:
        print(f"Test failed: {str(e)}")
        sys.exit(1)
    finally:
        # Cleanup patient if created
        if patient.get("_cleanup_required"):
            requests.delete(
                f"{BASE_URL}/patients/{patient['patient_id']}",
                headers=headers
            )
    
    sys.exit(0) 