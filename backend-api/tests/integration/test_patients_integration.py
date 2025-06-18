"""
Integration tests for the patients module.
These tests verify that patient creation, retrieval, update, deletion, and search work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
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
def test_create_and_retrieve_patient(pg_client, pg_session):
    """
    Test creating a patient and retrieving it from the database.
    """
    # Create a test user
    user = models.User(
        email="patient_test@example.com",
        name="Patient Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create patient data
    patient_data = {
        "name": "Test Patient",
        "idade": 45,
        "sexo": "M",
        "diagnostico": "Hypertension, Type 2 Diabetes",
        "exame_fisico": "Normal vital signs, mild edema in lower extremities",
        "historia_familiar": "Father with heart disease",
        "medicacoes": "Metformin, Lisinopril",
        "exames": "HbA1c: 7.2%, Blood pressure: 140/90"
    }
    
    # Create patient via API
    response = pg_client.post(
        "/api/patients/",
        json=patient_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created_patient = response.json()
    assert "patient_id" in created_patient
    patient_id = created_patient["patient_id"]
    
    # Retrieve single patient
    get_response = pg_client.get(
        f"/api/patients/{patient_id}",
        headers=auth_headers
    )
    
    # Verify get response
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
    patient = get_response.json()
    assert patient["patient_id"] == patient_id
    assert patient["name"] == patient_data["name"]
    assert patient["idade"] == patient_data["idade"]
    assert patient["sexo"] == patient_data["sexo"]
    assert patient["diagnostico"] == patient_data["diagnostico"]
    
    # Retrieve all patients for user
    list_response = pg_client.get(
        "/api/patients/",
        headers=auth_headers
    )
    
    # Verify list response
    assert list_response.status_code == 200, f"Expected 200, got {list_response.status_code}: {list_response.text}"
    patients = list_response.json()
    assert len(patients) >= 1
    
    # Find our patient in the list
    our_patient = next((p for p in patients if p["patient_id"] == patient_id), None)
    assert our_patient is not None
    assert our_patient["name"] == patient_data["name"]
    assert our_patient["idade"] == patient_data["idade"]

@pytest.mark.integration
def test_update_patient(pg_client, pg_session):
    """
    Test updating a patient and verifying the database update.
    """
    # Create a test user
    user = models.User(
        email="patient_update_test@example.com",
        name="Patient Update Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create initial patient data
    patient_data = {
        "name": "Update Test Patient",
        "idade": 50,
        "sexo": "F",
        "diagnostico": "Hypothyroidism",
        "exame_fisico": "Normal",
        "historia_familiar": "Mother with thyroid issues",
        "medicacoes": "Levothyroxine",
        "exames": "TSH: 4.5 mIU/L"
    }
    
    # Create patient via API
    create_response = pg_client.post(
        "/api/patients/",
        json=patient_data,
        headers=auth_headers
    )
    
    created_patient = create_response.json()
    patient_id = created_patient["patient_id"]
    
    # Update data
    update_data = {
        "name": "Update Test Patient",
        "idade": 50,
        "sexo": "F",
        "diagnostico": "Hypothyroidism, Vitamin D Deficiency",
        "exame_fisico": "Normal, mild fatigue",
        "historia_familiar": "Mother with thyroid issues, father with osteoporosis",
        "medicacoes": "Levothyroxine, Vitamin D supplements",
        "exames": "TSH: 3.2 mIU/L, Vitamin D: 22 ng/mL"
    }
    
    # Update patient
    update_response = pg_client.put(
        f"/api/patients/{patient_id}",
        json=update_data,
        headers=auth_headers
    )
    
    # Verify response
    assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
    updated_patient = update_response.json()
    assert updated_patient["patient_id"] == patient_id
    assert updated_patient["diagnostico"] == update_data["diagnostico"]
    
    # Get the patient from the database to verify all fields were updated
    db_patient = pg_session.query(models.Patient).filter_by(patient_id=patient_id).first()
    assert db_patient is not None
    
    # Check database values match the update data
    assert db_patient.diagnostico == update_data["diagnostico"]
    
    # For fields that may not be returned in the API response but should be in the database
    if hasattr(db_patient, "exames"):
        assert db_patient.exames == update_data["exames"]
    if hasattr(db_patient, "medicacoes"):
        assert db_patient.medicacoes == update_data["medicacoes"]
    if hasattr(db_patient, "exame_fisico"):
        assert db_patient.exame_fisico == update_data["exame_fisico"]
    if hasattr(db_patient, "historia_familiar"):
        assert db_patient.historia_familiar == update_data["historia_familiar"]

@pytest.mark.integration
def test_delete_patient(pg_client, pg_session):
    """
    Test deleting a patient.
    """
    # Create a test user
    user = models.User(
        email="patient_delete_test@example.com",
        name="Patient Delete Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create patient data
    patient_data = {
        "name": "Delete Test Patient",
        "idade": 65,
        "sexo": "M",
        "diagnostico": "Patient to be deleted"
    }
    
    # Create patient via API
    create_response = pg_client.post(
        "/api/patients/",
        json=patient_data,
        headers=auth_headers
    )
    
    created_patient = create_response.json()
    patient_id = created_patient["patient_id"]
    
    # Delete patient
    delete_response = pg_client.delete(
        f"/api/patients/{patient_id}",
        headers=auth_headers
    )
    
    # Verify response
    assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}: {delete_response.text}"
    
    # Try to retrieve deleted patient
    get_response = pg_client.get(
        f"/api/patients/{patient_id}",
        headers=auth_headers
    )
    
    # Should return 404
    assert get_response.status_code == 404, f"Expected 404, got {get_response.status_code}: {get_response.text}"
    
    # Check patients list
    list_response = pg_client.get(
        "/api/patients/",
        headers=auth_headers
    )
    
    patients_list = list_response.json()
    # Verify deleted patient is not in the list
    deleted_patient = next((p for p in patients_list if p["patient_id"] == patient_id), None)
    assert deleted_patient is None

@pytest.mark.integration
def test_search_patients(pg_client, pg_session):
    """
    Test searching for patients.
    """
    # Create a test user
    user = models.User(
        email="patient_search_test@example.com",
        name="Patient Search Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Set the user as authenticated for the test
    pg_client.set_auth_user(user)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create multiple patients with different names and diagnoses
    patients_data = [
        {
            "name": "John Smith",
            "idade": 60,
            "sexo": "M",
            "diagnostico": "Coronary Artery Disease"
        },
        {
            "name": "Maria Rodriguez",
            "idade": 45,
            "sexo": "F",
            "diagnostico": "Asthma, Allergic Rhinitis"
        },
        {
            "name": "Robert Johnson",
            "idade": 72,
            "sexo": "M",
            "diagnostico": "Parkinson's Disease, Hypertension"
        }
    ]
    
    # Create patients
    for patient_data in patients_data:
        response = pg_client.post(
            "/api/patients/",
            json=patient_data,
            headers=auth_headers
        )
        assert response.status_code == 201
    
    # Search for patients by name
    name_search_response = pg_client.get(
        "/api/patients/search?query=rodriguez",
        headers=auth_headers
    )
    
    # Print detailed error for debugging
    if name_search_response.status_code != 200:
        print(f"Error response: {name_search_response.status_code}")
        print(f"Response content: {name_search_response.text}")
    
    # Verify search response
    assert name_search_response.status_code == 200
    name_search_results = name_search_response.json()
    assert len(name_search_results) >= 1
    
    # Verify results contain Maria Rodriguez
    rodriguez_result = next((p for p in name_search_results if "rodriguez" in p["name"].lower()), None)
    assert rodriguez_result is not None
    
    # Search for patients by diagnosis
    diagnosis_search_response = pg_client.get(
        "/api/patients/search?query=parkinson",
        headers=auth_headers
    )
    
    # Verify diagnosis search response
    assert diagnosis_search_response.status_code == 200
    diagnosis_search_results = diagnosis_search_response.json()
    assert len(diagnosis_search_results) >= 1
    
    # At least one result should have Parkinson's in the diagnosis
    parkinsons_diagnosis_result = next((p for p in diagnosis_search_results 
                                     if "parkinson" in p["diagnostico"].lower()), None)
    assert parkinsons_diagnosis_result is not None 