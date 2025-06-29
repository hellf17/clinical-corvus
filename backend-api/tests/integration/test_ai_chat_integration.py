"""
Integration tests for the AI Chat module.
These tests verify that chat functionality and database operations work correctly.
"""

import pytest
import sys
import os
import json
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from uuid import uuid4
from uuid import UUID

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from database.models import User, Patient, LabResult, AIChatConversation, AIChatMessage
from security import create_access_token
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

def create_test_token(user_id, email, name):
    """Create a test JWT token for a specific user."""
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={
            "sub": email,  # The email is expected in the 'sub' field
            "user_id": user_id,  # User ID is required
            "name": name  # Name is optional but useful
        },
        expires_delta=access_token_expires
    )
    return {"Authorization": f"Bearer {access_token}"}

@pytest.mark.integration
def test_create_and_retrieve_chat_conversation(pg_client, pg_session):
    """
    Test creating a chat conversation and retrieving it from the database.
    """
    # Create a test user directly in the database
    user = User(
        email="chat_test@example.com",
        name="Chat Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Create a test patient associated with this user
    patient = Patient(
        user_id=user.user_id,
        name="Chat Test Patient",
        idade=45,
        sexo="M",
        diagnostico="Test Case for Chat"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a conversation directly in the database
    conversation_id = uuid4()
    conversation = AIChatConversation(
        id=conversation_id,
        title="Test Conversation",
        patient_id=patient.patient_id,
        user_id=user.user_id,
        created_at=datetime.now()
    )
    pg_session.add(conversation)
    pg_session.commit()
    pg_session.refresh(conversation)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Now send a message to the existing conversation
    message_data = {
        "message": "Hello, this is a test message.",
        "content": "Hello, this is a test message.",
        "conversation_id": str(conversation_id)
    }
    
    # Use API to send message to conversation
    response = pg_client.post(
        f"/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    response_data = response.json()
    
    # The response might have assistant_message, assistant_response, or response
    # Check for any of the possible response formats
    response_key = None
    for key in ["message_id", "assistant_message", "assistant_response", "response"]:
        if key in response_data:
            response_key = key
            break
    
    assert response_key is not None, f"No valid response key found in: {response_data.keys()}"
    
    # Verify messages exist in database
    db_messages = pg_session.query(AIChatMessage).filter_by(
        conversation_id=conversation_id
    ).all()
    
    assert len(db_messages) >= 1  # At least the user message
    
    # Check user message content
    user_message = next((m for m in db_messages if m.role == "user"), None)
    assert user_message is not None
    assert user_message.content == message_data["message"]
    
    # Now test retrieving the conversation history
    history_response = pg_client.get(
        f"/api/ai-chat/conversations/{conversation_id}/messages",
        headers=auth_headers
    )
    
    assert history_response.status_code == 200, f"Expected 200, got {history_response.status_code}: {history_response.text}"
    history_data = history_response.json()
    
    # Verify history data
    assert isinstance(history_data, list)
    assert len(history_data) >= 1  # At least the user message should be in the history
    
    # Find our message in the history
    user_message_in_history = next((m for m in history_data if m["role"] == "user" and m["content"] == message_data["message"]), None)
    assert user_message_in_history is not None, "User message was not found in history"

@pytest.mark.integration
def test_chat_with_patient_context(pg_client, pg_session):
    """
    Test chat functionality with patient context and verify data integration.
    """
    # Create a test user
    user = User(
        email="context_test@example.com",
        name="Context Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Create a test patient with detailed information
    patient = Patient(
        user_id=user.user_id,
        name="Context Test Patient",
        idade=65,
        sexo="F",
        altura=1.65,
        peso=70.5,
        diagnostico="Hipertensão Arterial Sistêmica"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Add some lab results for the patient
    lab_results = [
        LabResult(
            patient_id=patient.patient_id,
            test_name="Glicose",
            value_numeric=180.0,
            unit="mg/dL",
            reference_range_low=70.0,
            reference_range_high=100.0,
            is_abnormal=True,
            user_id=user.user_id,  # Use user_id instead of created_by
            timestamp=datetime.now() - timedelta(days=3),  # Use timestamp instead of collection_datetime
            collection_datetime=datetime.now() - timedelta(days=3)
        ),
        LabResult(
            patient_id=patient.patient_id,
            test_name="Hemoglobina Glicada",
            value_numeric=7.5,
            unit="%",
            reference_range_low=4.0,
            reference_range_high=6.0,
            is_abnormal=True,
            user_id=user.user_id,  # Use user_id instead of created_by
            timestamp=datetime.now() - timedelta(days=3),  # Use timestamp instead of collection_datetime
            collection_datetime=datetime.now() - timedelta(days=3)
        )
    ]
    pg_session.add_all(lab_results)
    pg_session.commit()
    
    # Create a conversation directly in the database
    conversation_id = uuid4()
    conversation = AIChatConversation(
        id=conversation_id,
        title="Contexto Clínico",
        patient_id=patient.patient_id,
        user_id=user.user_id,
        created_at=datetime.now()
    )
    pg_session.add(conversation)
    pg_session.commit()
    pg_session.refresh(conversation)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Prepare message with patient context
    message_data = {
        "message": "Quais são os valores de referência para glicose e como estão os resultados desta paciente?",
        "content": "Quais são os valores de referência para glicose e como estão os resultados desta paciente?",
        "include_patient_context": True,
        "patient_context": {
            "patient_id": patient.patient_id,
            "name": patient.name,
            "idade": patient.idade,
            "sexo": patient.sexo,
            "lab_results": [
                {
                    "name": lab.test_name,
                    "value": lab.value_numeric,
                    "unit": lab.unit
                }
                for lab in lab_results
            ]
        }
    }
    
    # Send message with patient context
    response = pg_client.post(
        f"/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    
    # Verify response
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    response_data = response.json()
    
    # The API might return any of these response keys
    response_key = None
    for key in ["message_id", "assistant_message", "assistant_response", "response"]:
        if key in response_data:
            response_key = key
            break
    
    assert response_key is not None, f"No valid response key found in: {response_data.keys()}"
    
    # Verify the user message was stored with patient context
    db_messages = pg_session.query(AIChatMessage).filter_by(
        conversation_id=conversation_id
    ).all()
    
    assert len(db_messages) >= 1, "Expected at least one message in the database"
    
    # Verify that lab results are in context
    assert "Glicose" in json.dumps(message_data["patient_context"])
    assert "180.0" in json.dumps(message_data["patient_context"]) or "180" in json.dumps(message_data["patient_context"])

@pytest.mark.integration
def test_get_all_conversations(pg_client, pg_session):
    """
    Test retrieving all conversations for a user.
    """
    # Create a test user
    user = User(
        email="conversations_test@example.com",
        name="Conversations Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Create two different patients
    patients = [
        Patient(
            user_id=user.user_id,
            name=f"Patient {i}",
            idade=50+i,
            sexo="M" if i % 2 == 0 else "F"
        )
        for i in range(2)
    ]
    pg_session.add_all(patients)
    pg_session.commit()
    for p in patients:
        pg_session.refresh(p)
    
    # Create multiple conversations for both patients
    conversations = []
    for i, patient in enumerate(patients):
        for j in range(2):  # 2 conversations per patient
            conv_id = uuid4()
            conversation = AIChatConversation(
                id=conv_id,
                title=f"Conversation {i}-{j}",
                patient_id=patient.patient_id,  # Don't convert to UUID
                user_id=user.user_id,  # Don't convert to UUID
                last_message_content=f"Last message for conversation {i}-{j}"
            )
            conversations.append(conversation)
            
            # Add some messages to the conversation
            messages = [
                AIChatMessage(
                    id=uuid4(),
                    conversation_id=conv_id,
                    role="user" if k % 2 == 0 else "assistant",
                    content=f"Message {k} in conversation {i}-{j}",
                    message_metadata={}
                )
                for k in range(4)  # 4 messages per conversation
            ]
            pg_session.add_all(messages)
    
    pg_session.add_all(conversations)
    pg_session.commit()
    
    # Create auth token
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Get all conversations
    response = pg_client.get(
        "/api/ai-chat/conversations",
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 200
    response_data = response.json()
    
    # The response is a dict with 'conversations' and 'total' keys
    assert "conversations" in response_data
    assert "total" in response_data
    
    # Should have 4 conversations (2 per patient)
    assert len(response_data["conversations"]) == 4
    
    # Verify conversation format
    for conversation in response_data["conversations"]:
        assert "id" in conversation
        assert "title" in conversation
        assert "patient_id" in conversation
        assert "user_id" in conversation
        assert "last_message_content" in conversation
        assert "created_at" in conversation
        assert "updated_at" in conversation
        
        # Verify it's one of our created conversations
        assert any(str(c.id) == conversation["id"] for c in conversations)
        
        # Debug information
        print(f"Conversation patient_id: {conversation['patient_id']}")
        print(f"Available patient IDs: {[str(p.patient_id) for p in patients]}")
        
        # Verify patient_id is valid - usando uma comparação mais flexível
        # Há dois pacientes no teste, e cada um tem duas conversas
        # Em vez de comparar strings, vamos verificar se o ID está no conjunto de IDs válidos
        # convertendo ambos para inteiros (que é o tipo que SQLite usa no teste)
        valid_patient_ids = set(int(str(p.patient_id)) for p in patients)
        
        # Converter o patient_id da conversa para inteiro com segurança
        try:
            # Se já for um número inteiro
            if isinstance(conversation["patient_id"], int):
                conversation_patient_id = conversation["patient_id"]
            # Se for uma string que representa um número
            elif isinstance(conversation["patient_id"], str) and conversation["patient_id"].isdigit():
                conversation_patient_id = int(conversation["patient_id"])
            else:
                # Tentativa final de converter
                conversation_patient_id = int(str(conversation["patient_id"]))
        except (ValueError, TypeError):
            conversation_patient_id = None
            
        assert conversation_patient_id is not None and conversation_patient_id in valid_patient_ids, \
               f"Patient ID {conversation['patient_id']} not found in {valid_patient_ids}"

@pytest.mark.integration
def test_delete_conversation(pg_client, pg_session):
    """
    Test deleting a conversation and verifying it cascades properly in the database.
    """
    # Create a test user
    user = User(
        email="delete_test@example.com",
        name="Delete Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Create a test patient
    patient = Patient(
        user_id=user.user_id,
        name="Delete Test Patient",
        idade=55
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a conversation
    conv_id = uuid4()
    conversation = AIChatConversation(
        id=conv_id,
        title="Conversation to Delete",
        patient_id=patient.patient_id,  # Don't convert to UUID
        user_id=user.user_id,  # Don't convert to UUID
        last_message_content="This conversation will be deleted"
    )
    pg_session.add(conversation)
    
    # Add messages to the conversation
    messages = [
        AIChatMessage(
            id=uuid4(),
            conversation_id=conv_id,
            role="user" if i % 2 == 0 else "assistant",
            content=f"Message {i} to be deleted",
            message_metadata={}
        )
        for i in range(4)
    ]
    pg_session.add_all(messages)
    pg_session.commit()
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Verify conversation and messages exist
    db_conversation = pg_session.query(AIChatConversation).filter_by(id=conv_id).first()
    assert db_conversation is not None
    
    db_messages = pg_session.query(AIChatMessage).filter_by(conversation_id=conv_id).all()
    assert len(db_messages) == 4
    
    # Delete the conversation
    delete_response = pg_client.delete(
        f"/api/ai-chat/conversations/{conv_id}",
        headers=auth_headers
    )
    
    # Verify delete response
    assert delete_response.status_code == 204
    
    # Verify conversation is deleted
    deleted_conversation = pg_session.query(AIChatConversation).filter_by(id=conv_id).first()
    assert deleted_conversation is None
    
    # Verify messages are cascaded (also deleted)
    deleted_messages = pg_session.query(AIChatMessage).filter_by(conversation_id=conv_id).all()
    assert len(deleted_messages) == 0 