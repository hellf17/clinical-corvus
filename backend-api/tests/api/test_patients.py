"""
Tests for patient API endpoints.
"""

import pytest
import sys
import os
import json
from fastapi.testclient import TestClient

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models
from main import app
from security import create_access_token

# This client is only for simple tests that don't require DB access
client = TestClient(app)

def create_test_user(sqlite_session):
    """Create a test user for authentication."""
    user = models.User(
        email="patients_test@example.com",
        name="Patients Test User",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    return user

def get_auth_headers(user_email):
    """Get authorization headers with a valid token."""
    access_token = create_access_token(data={"sub": user_email})
    return {"Authorization": f"Bearer {access_token}"}

def test_create_patient(sqlite_client, sqlite_session):
    """Test creating a new patient."""
    user = create_test_user(sqlite_session)
    
    patient_data = {
        "name": "John Doe",
        "idade": 30,
        "sexo": "M",
        "peso": 70.5,
        "altura": 1.75,
        "etnia": "branco",
        "diagnostico": "Healthy patient"
    }
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.post("/api/patients/", json=patient_data)
    
    assert response.status_code == 201
    assert "patient_id" in response.json()
    assert response.json()["name"] == patient_data["name"]
    assert response.json()["idade"] == patient_data["idade"]
    assert response.json()["sexo"] == patient_data["sexo"]
    assert response.json()["peso"] == patient_data["peso"]

def test_get_all_patients(sqlite_client, sqlite_session):
    """Test retrieving all patients."""
    user = create_test_user(sqlite_session)
    
    # Create multiple test patients
    patients = [
        models.Patient(
            user_id=user.user_id,
            name=f"Test Patient {i}",
            idade=30 + i,
            sexo="M" if i % 2 == 0 else "F",
            peso=70.0 + i,
            altura=1.70 + (i * 0.05),
            etnia="branco",
            diagnostico=f"Test diagnosis {i}"
        )
        for i in range(3)
    ]
    
    sqlite_session.add_all(patients)
    sqlite_session.commit()
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.get("/api/patients/")
    
    assert response.status_code == 200
    assert len(response.json()) >= 3  # May include patients from other tests
    
    # Check if our test patients are in the response
    patient_names = [p["name"] for p in response.json()]
    for i in range(3):
        assert f"Test Patient {i}" in patient_names

def test_get_patient(sqlite_client, sqlite_session):
    """Test retrieving a specific patient."""
    user = create_test_user(sqlite_session)
    
    patient = models.Patient(
        user_id=user.user_id,
        name="Single Test Patient",
        idade=35,
        sexo="F",
        peso=65.5,
        altura=1.65,
        etnia="pardo",
        diagnostico="Test single patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.get(f"/api/patients/{patient.patient_id}")
    
    assert response.status_code == 200
    assert response.json()["patient_id"] == patient.patient_id
    assert response.json()["name"] == patient.name
    assert response.json()["idade"] == patient.idade
    assert response.json()["sexo"] == patient.sexo
    assert response.json()["diagnostico"] == patient.diagnostico

def test_update_patient(sqlite_client, sqlite_session):
    """Test updating an existing patient."""
    user = create_test_user(sqlite_session)
    
    patient = models.Patient(
        user_id=user.user_id,
        name="Update Test Patient",
        idade=40,
        sexo="M",
        peso=75.0,
        altura=1.80,
        etnia="branco",
        diagnostico="Initial diagnosis"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    updated_data = {
        "name": "Updated Patient Name",
        "diagnostico": "Updated diagnosis"
    }
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.put(f"/api/patients/{patient.patient_id}", json=updated_data)
    
    assert response.status_code == 200
    assert response.json()["patient_id"] == patient.patient_id
    assert response.json()["name"] == updated_data["name"]
    assert response.json()["diagnostico"] == updated_data["diagnostico"]
    # These fields should remain unchanged
    assert response.json()["idade"] == patient.idade
    assert response.json()["sexo"] == patient.sexo

def test_delete_patient(sqlite_client, sqlite_session):
    """Test deleting a patient."""
    user = create_test_user(sqlite_session)
    
    patient = models.Patient(
        user_id=user.user_id,
        name="Delete Test Patient",
        idade=45,
        sexo="F",
        peso=62.0,
        altura=1.62,
        etnia="asiatico",
        diagnostico="To be deleted"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.delete(f"/api/patients/{patient.patient_id}")
    
    assert response.status_code == 204
    
    # Verify the patient is actually deleted
    get_response = sqlite_client.get(f"/api/patients/{patient.patient_id}")
    assert get_response.status_code == 404

def test_patient_not_found(sqlite_client, sqlite_session):
    """Test handling of non-existent patient IDs."""
    user = create_test_user(sqlite_session)
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Try to get a non-existent patient
    response = sqlite_client.get("/api/patients/99999")
    assert response.status_code == 404
    
    # Try to update a non-existent patient
    response = sqlite_client.put("/api/patients/99999", json={"name": "Updated"})
    assert response.status_code == 404
    
    # Try to delete a non-existent patient
    response = sqlite_client.delete("/api/patients/99999")
    assert response.status_code == 404

def test_unauthorized_access(sqlite_client, sqlite_session):
    """Test that unauthorized access is properly rejected."""
    # Make sure we have no authentication
    sqlite_client.set_auth_user(None)
    
    # Try to create a patient without authorization
    patient_data = {
        "name": "Unauthorized Patient",
        "idade": 25,
        "sexo": "M",
        "peso": 68.0,
        "altura": 1.72,
        "etnia": "branco",
        "diagnostico": "Unauthorized test"
    }
    
    response = sqlite_client.post("/api/patients/", json=patient_data)
    assert response.status_code == 401
    
    # Create a patient and try to access it without authorization
    user = create_test_user(sqlite_session)
    patient = models.Patient(
        user_id=user.user_id,
        name="Protected Patient",
        idade=33,
        sexo="M",
        peso=80.0,
        altura=1.85,
        etnia="branco",
        diagnostico="Protected test"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    response = sqlite_client.get(f"/api/patients/{patient.patient_id}")
    assert response.status_code == 401

def test_invalid_patient_data(sqlite_client, sqlite_session):
    """Test validation of patient data."""
    user = create_test_user(sqlite_session)
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Test with invalid fields
    invalid_data = {
        "name": "a",  # Too short (should be min_length=2)
        "idade": 150,  # Too high (should be le=120)
        "altura": 3.5  # Too tall (should be lt=3)
    }
    
    response = sqlite_client.post("/api/patients/", json=invalid_data)
    assert response.status_code == 422  # Unprocessable Entity
    
    # Verify the error response contains validation errors
    response_json = response.json()
    assert "detail" in response_json
    
    # Extract the specific validation errors
    errors = {err["loc"][1]: err["msg"] for err in response_json["detail"]}
    assert "name" in errors  # Should have error for short name
    assert "idade" in errors  # Should have error for high age
    assert "altura" in errors  # Should have error for height 