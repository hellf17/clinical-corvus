"""
Integration tests for the clinical notes module.
These tests verify that clinical notes creation, retrieval, update, deletion, and search work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from database import models
from security import create_access_token
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

def create_test_token(user_id, email, name):
    """Create a test JWT token for a specific user."""
    from datetime import timedelta
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
def test_create_and_retrieve_clinical_note(pg_client, pg_session):
    """
    Test creating a clinical note and retrieving it from the database.
    """
    # Create a test user
    user = models.User(
        email="clinical_note_test@example.com",
        name="Clinical Note Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create a test patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Clinical Note Test Patient",
        idade=65,
        sexo="M",
        diagnostico="Patient for Clinical Note Testing"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create clinical note data
    note_data = {
        "title": "Initial Assessment",
        "content": "Patient presents with symptoms of hypertension and mild edema.",
        "patient_id": patient.patient_id,
        "note_type": "progress"
    }
    
    # Create clinical note via API
    response = pg_client.post(
        "/api/clinical-notes/",
        json=note_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created_note = response.json()
    assert "id" in created_note
    note_id = created_note["id"]
    
    # Retrieve single clinical note
    get_response = pg_client.get(
        f"/api/clinical-notes/{note_id}",
        headers=auth_headers
    )
    
    # Verify get response
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
    note = get_response.json()
    assert note["id"] == note_id
    assert note["patient_id"] == patient.patient_id
    assert note["title"] == note_data["title"]
    assert note["content"] == note_data["content"]
    
    # Retrieve clinical notes for patient
    patient_notes_response = pg_client.get(
        f"/api/clinical-notes/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Verify patient notes response
    assert patient_notes_response.status_code == 200, f"Expected 200, got {patient_notes_response.status_code}: {patient_notes_response.text}"
    patient_notes = patient_notes_response.json()
    assert len(patient_notes) >= 1
    
    # Find our note in the list
    our_note = next((n for n in patient_notes if n["id"] == note_id), None)
    assert our_note is not None
    assert our_note["title"] == note_data["title"]
    assert our_note["content"] == note_data["content"]

@pytest.mark.integration
def test_update_clinical_note(pg_client, pg_session):
    """
    Test updating a clinical note and verifying the database update.
    """
    # Create a test user
    user = models.User(
        email="clinical_note_update_test@example.com",
        name="Clinical Note Update Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create a test patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Clinical Note Update Test Patient",
        idade=55,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create initial clinical note data
    note_data = {
        "title": "Follow-up Visit",
        "content": "Patient reports feeling better. Blood pressure is 130/85.",
        "patient_id": patient.patient_id,
        "note_type": "progress"
    }
    
    # Create clinical note via API
    create_response = pg_client.post(
        "/api/clinical-notes/",
        json=note_data,
        headers=auth_headers
    )
    
    created_note = create_response.json()
    note_id = created_note["id"]
    
    # Update data
    update_data = {
        "title": "Follow-up Visit - Updated",
        "content": "Patient reports feeling better. Blood pressure is 130/85. Prescribed new medication."
    }
    
    # Update clinical note
    update_response = pg_client.put(
        f"/api/clinical-notes/{note_id}",
        json=update_data,
        headers=auth_headers
    )
    
    # Verify response
    assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
    updated_note = update_response.json()
    assert updated_note["id"] == note_id
    assert updated_note["title"] == update_data["title"]
    assert updated_note["content"] == update_data["content"]
    
    # Retrieve to verify update
    get_response = pg_client.get(
        f"/api/clinical-notes/{note_id}",
        headers=auth_headers
    )
    
    note = get_response.json()
    assert note["title"] == update_data["title"]
    assert note["content"] == update_data["content"]

@pytest.mark.integration
def test_delete_clinical_note(pg_client, pg_session):
    """
    Test deleting a clinical note.
    """
    # Create a test user
    user = models.User(
        email="clinical_note_delete_test@example.com",
        name="Clinical Note Delete Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create a test patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Clinical Note Delete Test Patient",
        idade=70,
        sexo="M"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create clinical note data
    note_data = {
        "title": "Note to Delete",
        "content": "This note will be deleted in the test.",
        "patient_id": patient.patient_id,
        "note_type": "progress"
    }
    
    # Create clinical note via API
    create_response = pg_client.post(
        "/api/clinical-notes/",
        json=note_data,
        headers=auth_headers
    )
    
    created_note = create_response.json()
    note_id = created_note["id"]
    
    # Delete clinical note
    delete_response = pg_client.delete(
        f"/api/clinical-notes/{note_id}",
        headers=auth_headers
    )
    
    # Verify response
    assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}: {delete_response.text}"
    
    # Try to retrieve deleted note
    get_response = pg_client.get(
        f"/api/clinical-notes/{note_id}",
        headers=auth_headers
    )
    
    # Should return 404
    assert get_response.status_code == 404, f"Expected 404, got {get_response.status_code}: {get_response.text}"
    
    # Check patient notes list
    list_response = pg_client.get(
        f"/api/clinical-notes/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    notes_list = list_response.json()
    # Verify deleted note is not in the list
    deleted_note = next((n for n in notes_list if n["id"] == note_id), None)
    assert deleted_note is None

@pytest.mark.integration
def test_search_clinical_notes(pg_client, pg_session):
    """
    Test searching for clinical notes.
    """
    # Create a test user
    user = models.User(
        email="clinical_note_search_test@example.com",
        name="Clinical Note Search Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create a test patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Clinical Note Search Test Patient",
        idade=60,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create multiple clinical notes with different content
    notes_data = [
        {
            "title": "Cardiac Evaluation",
            "content": "Patient experiencing chest pain and shortness of breath. ECG shows normal sinus rhythm.",
            "patient_id": patient.patient_id,
            "note_type": "progress"
        },
        {
            "title": "Diabetes Follow-up",
            "content": "HbA1c levels improved. Patient adhering to diet and medication regimen.",
            "patient_id": patient.patient_id,
            "note_type": "progress"
        },
        {
            "title": "Annual Physical",
            "content": "Routine physical examination. All vitals within normal range. Screening tests ordered.",
            "patient_id": patient.patient_id,
            "note_type": "progress"
        }
    ]
    
    # Create clinical notes
    for note_data in notes_data:
        response = pg_client.post(
            "/api/clinical-notes/",
            json=note_data,
            headers=auth_headers
        )
        assert response.status_code == 201
    
    # Search for notes by title
    title_search_response = pg_client.get(
        f"/api/clinical-notes/search?query=cardiac",
        headers=auth_headers
    )
    
    # Print response details for debugging
    print(f"Search response status: {title_search_response.status_code}")
    print(f"Search response content: {title_search_response.text}")
    
    # Verify search response
    assert title_search_response.status_code == 200, f"Expected 200, got {title_search_response.status_code}: {title_search_response.text}"
    title_search_results = title_search_response.json()
    assert len(title_search_results) >= 1
    
    # Verify results contain the cardiac evaluation note
    cardiac_result = next((n for n in title_search_results if "cardiac" in n["title"].lower()), None)
    assert cardiac_result is not None
    
    # Search for notes by content
    content_search_response = pg_client.get(
        f"/api/clinical-notes/search?query=diabetes",
        headers=auth_headers
    )
    
    # Verify content search response
    assert content_search_response.status_code == 200
    content_search_results = content_search_response.json()
    assert len(content_search_results) >= 1
    
    # At least one result should have diabetes in the title or content
    diabetes_content_result = next((n for n in content_search_results 
                                  if "diabetes" in n["title"].lower() or "diabetes" in n["content"].lower()), None)
    assert diabetes_content_result is not None 