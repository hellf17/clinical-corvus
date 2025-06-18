"""
End-to-End tests for the patient management workflow in the clinical-helper-next backend.
This tests the complete cycle of patient operations including creation, update, and deletion.
"""

import pytest
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
TEST_USER = {"email": "test_doctor@example.com", "password": "test_password"}


@pytest.fixture
def auth_token() -> str:
    """Get an authentication token for API requests."""
    # Login and get token
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
def test_patient_data() -> Dict[str, Any]:
    """Create test patient data."""
    return {
        "name": f"Test Patient {datetime.now().isoformat()}",
        "idade": 45,
        "sexo": "M",
        "peso": 75.5,
        "altura": 1.80,
        "etnia": "branco",
        "diagnostico": "Hypertension, Type 2 Diabetes",
        "data_internacao": datetime.now().isoformat()
    }


def test_patient_creation(auth_headers: Dict[str, str], test_patient_data: Dict[str, Any]):
    """Test creating a new patient."""
    # Create the patient
    response = requests.post(
        f"{BASE_URL}/patients/",
        json=test_patient_data,
        headers=auth_headers
    )
    assert response.status_code == 201, f"Failed to create patient: {response.text}"
    
    # Get created patient data
    patient_data = response.json()
    patient_id = patient_data["patient_id"]
    
    assert patient_data["name"] == test_patient_data["name"]
    assert patient_data["idade"] == test_patient_data["idade"]
    assert patient_data["sexo"] == test_patient_data["sexo"]
    
    # Cleanup - delete the created patient
    cleanup_response = requests.delete(
        f"{BASE_URL}/patients/{patient_id}",
        headers=auth_headers
    )
    assert cleanup_response.status_code == 204, "Failed to delete test patient"


def test_patient_update(auth_headers: Dict[str, str], test_patient_data: Dict[str, Any]):
    """Test updating an existing patient."""
    # Create the patient first
    create_response = requests.post(
        f"{BASE_URL}/patients/",
        json=test_patient_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    patient_id = create_response.json()["patient_id"]
    
    # Update patient data
    update_data = {
        "name": f"Updated Patient {datetime.now().isoformat()}",
        "diagnostico": "Updated diagnosis with more details"
    }
    
    update_response = requests.patch(
        f"{BASE_URL}/patients/{patient_id}",
        json=update_data,
        headers=auth_headers
    )
    assert update_response.status_code == 200
    
    # Verify the update
    updated_patient = update_response.json()
    assert updated_patient["name"] == update_data["name"]
    assert updated_patient["diagnostico"] == update_data["diagnostico"]
    
    # Original fields should remain unchanged
    assert updated_patient["idade"] == test_patient_data["idade"]
    assert updated_patient["sexo"] == test_patient_data["sexo"]
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/patients/{patient_id}",
        headers=auth_headers
    )


def test_patient_retrieval(auth_headers: Dict[str, str], test_patient_data: Dict[str, Any]):
    """Test retrieving patient details."""
    # Create multiple patients
    patient_ids = []
    for i in range(3):
        patient_data = test_patient_data.copy()
        patient_data["name"] = f"Test Patient {i} - {datetime.now().isoformat()}"
        create_response = requests.post(
            f"{BASE_URL}/patients/",
            json=patient_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        patient_ids.append(create_response.json()["patient_id"])
    
    # Get the list of patients
    list_response = requests.get(
        f"{BASE_URL}/patients/",
        headers=auth_headers
    )
    assert list_response.status_code == 200
    patients_list = list_response.json()
    
    # Verify all created test patients are in the list
    created_patients = [p for p in patients_list if p["patient_id"] in patient_ids]
    assert len(created_patients) == len(patient_ids)
    
    # Get a specific patient
    specific_patient_response = requests.get(
        f"{BASE_URL}/patients/{patient_ids[0]}",
        headers=auth_headers
    )
    assert specific_patient_response.status_code == 200
    retrieved_patient = specific_patient_response.json()
    
    # Verify patient details
    assert retrieved_patient["patient_id"] == patient_ids[0]
    
    # Cleanup
    for patient_id in patient_ids:
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


def test_patient_medical_data_workflow(auth_headers: Dict[str, str], test_patient_data: Dict[str, Any]):
    """Test adding medical data to a patient (lab results, medications, clinical notes)."""
    # Create a patient
    create_response = requests.post(
        f"{BASE_URL}/patients/",
        json=test_patient_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    patient_id = create_response.json()["patient_id"]
    
    # Add a medication
    medication_data = {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "daily",
        "route": "oral",
        "start_date": datetime.now().isoformat(),
        "status": "active"
    }
    
    medication_response = requests.post(
        f"{BASE_URL}/patients/{patient_id}/medications/",
        json=medication_data,
        headers=auth_headers
    )
    assert medication_response.status_code == 201
    
    # Add a clinical note
    note_data = {
        "title": "Initial Assessment",
        "content": "Patient presents with symptoms of...",
        "note_type": "progress"
    }
    
    note_response = requests.post(
        f"{BASE_URL}/patients/{patient_id}/clinical-notes/",
        json=note_data,
        headers=auth_headers
    )
    assert note_response.status_code == 201
    
    # Get patient with associated medical data
    patient_response = requests.get(
        f"{BASE_URL}/patients/{patient_id}/full",  # Endpoint that returns all associated data
        headers=auth_headers
    )
    assert patient_response.status_code == 200
    
    patient_full_data = patient_response.json()
    
    # Verify medical data is correctly associated
    assert len(patient_full_data.get("medications", [])) >= 1
    assert len(patient_full_data.get("clinical_notes", [])) >= 1
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/patients/{patient_id}",
        headers=auth_headers
    )


if __name__ == "__main__":
    # This allows running the tests directly without pytest
    import sys
    import os
    
    # Setup
    headers = {"Authorization": f"Bearer {auth_token()}"}
    patient_data = test_patient_data()
    
    # Run tests
    test_patient_creation(headers, patient_data)
    test_patient_update(headers, patient_data)
    test_patient_retrieval(headers, patient_data)
    test_patient_medical_data_workflow(headers, patient_data)
    
    print("All tests passed!")
    sys.exit(0) 