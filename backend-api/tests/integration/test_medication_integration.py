"""
Integration tests for the medications module.
These tests verify that medication creation, retrieval, update, and deletion work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime
from uuid import uuid4

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
def test_create_and_retrieve_medication(pg_client, pg_session):
    """
    Test creating a medication and retrieving it from the database.
    """
    # Create a test user
    user = models.User(
        email="medication_test@example.com",
        name="Medication Test User",
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
        name="Medication Test Patient",
        idade=65,
        sexo="M",
        diagnostico="Patient for Medication Testing"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create medication data
    medication_data = {
        "medication_name": "Atorvastatin",
        "dosage": "40mg",
        "frequency": "Once daily",
        "start_date": str(datetime.now().date()),
        "end_date": None,
        "notes": "Take with evening meal"
    }
    
    # Create medication via API
    response = pg_client.post(
        f"/api/medications/patient/{patient.patient_id}",
        json=medication_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created_medication = response.json()
    assert "id" in created_medication
    medication_id = created_medication["id"]
    
    # Retrieve single medication
    get_response = pg_client.get(
        f"/api/medications/{medication_id}",
        headers=auth_headers
    )
    
    # Verify get response
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
    medication = get_response.json()
    assert medication["id"] == medication_id
    assert medication["patient_id"] == str(patient.patient_id)
    assert medication["medication_name"] == medication_data["medication_name"]
    assert medication["dosage"] == medication_data["dosage"]
    assert medication["frequency"] == medication_data["frequency"]
    assert medication["notes"] == medication_data["notes"]
    
    # Retrieve medications for patient
    patient_medications_response = pg_client.get(
        f"/api/medications/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Verify patient medications response
    assert patient_medications_response.status_code == 200, f"Expected 200, got {patient_medications_response.status_code}: {patient_medications_response.text}"
    patient_medications = patient_medications_response.json()
    assert len(patient_medications) >= 1
    
    # Find our medication in the list
    our_medication = next((m for m in patient_medications if m["id"] == medication_id), None)
    assert our_medication is not None
    assert our_medication["medication_name"] == medication_data["medication_name"]
    assert our_medication["dosage"] == medication_data["dosage"]

@pytest.mark.integration
def test_update_medication(pg_client, pg_session):
    """
    Test updating a medication and verifying the database update.
    """
    # Create a test user
    user = models.User(
        email="medication_update_test@example.com",
        name="Medication Update Test User",
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
        name="Medication Update Test Patient",
        idade=55,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create initial medication data
    medication_data = {
        "medication_name": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "start_date": str(datetime.now().date()),
        "end_date": None,
        "notes": "Take with meals"
    }
    
    # Create medication via API
    create_response = pg_client.post(
        f"/api/medications/patient/{patient.patient_id}",
        json=medication_data,
        headers=auth_headers
    )
    
    created_medication = create_response.json()
    medication_id = created_medication["id"]
    
    # Update data
    update_data = {
        "dosage": "1000mg",
        "frequency": "Once daily",
        "notes": "Take with breakfast only"
    }
    
    # Update medication
    update_response = pg_client.put(
        f"/api/medications/{medication_id}",
        json=update_data,
        headers=auth_headers
    )
    
    # Verify response
    assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
    updated_medication = update_response.json()
    assert updated_medication["id"] == medication_id
    assert updated_medication["dosage"] == update_data["dosage"]
    assert updated_medication["frequency"] == update_data["frequency"]
    assert updated_medication["notes"] == update_data["notes"]
    
    # Verify original data is maintained
    assert updated_medication["medication_name"] == medication_data["medication_name"]
    
    # Retrieve to verify update
    get_response = pg_client.get(
        f"/api/medications/{medication_id}",
        headers=auth_headers
    )
    
    medication = get_response.json()
    assert medication["dosage"] == update_data["dosage"]
    assert medication["frequency"] == update_data["frequency"]
    assert medication["notes"] == update_data["notes"]

@pytest.mark.integration
def test_delete_medication(pg_client, pg_session):
    """
    Test deleting a medication.
    """
    # Create a test user
    user = models.User(
        email="medication_delete_test@example.com",
        name="Medication Delete Test User",
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
        name="Medication Delete Test Patient",
        idade=70,
        sexo="M"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create medication data
    medication_data = {
        "medication_name": "Amlodipine",
        "dosage": "5mg",
        "frequency": "Once daily",
        "start_date": str(datetime.now().date()),
        "end_date": None,
        "notes": "Take in the morning"
    }
    
    # Create medication via API
    create_response = pg_client.post(
        f"/api/medications/patient/{patient.patient_id}",
        json=medication_data,
        headers=auth_headers
    )
    
    created_medication = create_response.json()
    medication_id = created_medication["id"]
    
    # Delete medication
    delete_response = pg_client.delete(
        f"/api/medications/{medication_id}",
        headers=auth_headers
    )
    
    # Verify response
    assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}: {delete_response.text}"
    
    # Try to retrieve deleted medication
    get_response = pg_client.get(
        f"/api/medications/{medication_id}",
        headers=auth_headers
    )
    
    # Should return 404
    assert get_response.status_code == 404, f"Expected 404, got {get_response.status_code}: {get_response.text}"
    
    # Check patient medications list
    list_response = pg_client.get(
        f"/api/medications/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    medications_list = list_response.json()
    # Verify deleted medication is not in the list
    deleted_medication = next((m for m in medications_list if m["id"] == medication_id), None)
    assert deleted_medication is None

@pytest.mark.integration
def test_active_medications(pg_client, pg_session):
    """
    Test retrieving active medications for a patient.
    """
    # Create a test user
    user = models.User(
        email="active_medication_test@example.com",
        name="Active Medication Test User",
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
        name="Active Medication Test Patient",
        idade=60,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create active medication (no end date)
    active_medication_data = {
        "medication_name": "Levothyroxine",
        "dosage": "100mcg",
        "frequency": "Once daily",
        "start_date": str(datetime.now().date()),
        "end_date": None,
        "notes": "Take on empty stomach"
    }
    
    # Create inactive medication (with end date in the past)
    from datetime import timedelta
    past_date = (datetime.now() - timedelta(days=10)).date()
    inactive_medication_data = {
        "medication_name": "Prednisone",
        "dosage": "10mg",
        "frequency": "Once daily",
        "start_date": str((datetime.now() - timedelta(days=20)).date()),
        "end_date": str(past_date),
        "notes": "Short course for inflammation"
    }
    
    # Create medications
    active_response = pg_client.post(
        f"/api/medications/patient/{patient.patient_id}",
        json=active_medication_data,
        headers=auth_headers
    )
    
    inactive_response = pg_client.post(
        f"/api/medications/patient/{patient.patient_id}",
        json=inactive_medication_data,
        headers=auth_headers
    )
    
    # Get active medications
    active_medications_response = pg_client.get(
        f"/api/medications/patient/{patient.patient_id}/active",
        headers=auth_headers
    )
    
    # Verify response
    assert active_medications_response.status_code == 200, f"Expected 200, got {active_medications_response.status_code}: {active_medications_response.text}"
    active_medications = active_medications_response.json()
    
    # Should contain only the active medication
    assert len(active_medications) == 1
    assert active_medications[0]["medication_name"] == active_medication_data["medication_name"]
    
    # Verify the inactive medication is not included
    inactive_medication = next((m for m in active_medications if m["medication_name"] == inactive_medication_data["medication_name"]), None)
    assert inactive_medication is None 