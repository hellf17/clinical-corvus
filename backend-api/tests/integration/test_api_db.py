"""
Integration tests for API and database interactions.
These tests verify that database operations via the API work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
import database.models as models
from security import create_access_token
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

def create_test_token(user_id, email="test@example.com", name="Test User"):
    """Create a test JWT token for a specific user."""
    from config import get_settings
    settings = get_settings()
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={
            "sub": email,  # The email is expected in the 'sub' field
            "user_id": user_id,  # User ID is required
            "name": name  # Name is optional but useful
        },
        expires_delta=access_token_expires
    )
    
    # Ensure the Authorization header uses the exact format the API expects
    return {"Authorization": f"Bearer {access_token}"}

@pytest.mark.integration
def test_create_and_retrieve_patient(pg_client, pg_session):
    """
    Test creating a patient via API and retrieving it from the database.
    This integration test verifies the full flow from API to database and back.
    """
    # Create a test user directly in the database
    user = models.User(
        email="integration_test@example.com",
        name="Integration Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Configure o cliente para usar este usuário para autenticação
    pg_client.set_auth_user(user)
    
    # Create test patient data - Removidos campos que não existem no modelo
    patient_data = {
        "name": "Integration Test Patient",
        "idade": 65,
        "sexo": "F",
        "peso": 70.0,
        "altura": 1.60,
        "etnia": "branco",
        "diagnostico": "Integration Test Case",
        "data_internacao": datetime.now().isoformat()
        # Campos "medicacoes", "exames", etc., removidos pois não existem no modelo Patient
    }
    
    # Create patient via API - não precisamos mais de headers
    response = pg_client.post(
        "/api/patients/",
        json=patient_data
    )
    
    # Verify API response
    assert response.status_code == 201
    created_patient = response.json()
    patient_id = created_patient["patient_id"]
    
    # Verify patient exists in the database
    db_patient = pg_session.query(models.Patient).filter_by(patient_id=patient_id).first()
    assert db_patient is not None
    assert db_patient.name == patient_data["name"]
    assert db_patient.idade == patient_data["idade"]
    assert db_patient.user_id == user.user_id
    
    # Retrieve patient via API
    get_response = pg_client.get(f"/api/patients/{patient_id}")
    assert get_response.status_code == 200
    retrieved_patient = get_response.json()
    
    # Verify retrieved data matches
    assert retrieved_patient["name"] == patient_data["name"]
    assert retrieved_patient["idade"] == patient_data["idade"]
    assert retrieved_patient["sexo"] == patient_data["sexo"]
    assert retrieved_patient["user_id"] == user.user_id

@pytest.mark.integration
def test_patient_update_cascade(pg_client, pg_session):
    """
    Test updating a patient and verifying updates are reflected in the database.
    """
    # Create a test user
    user = models.User(
        email="cascade_test@example.com",
        name="Cascade Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Configure o cliente para usar este usuário para autenticação
    pg_client.set_auth_user(user)
    
    # Create test patient directly in the database
    patient = models.Patient(
        user_id=user.user_id,
        name="Original Patient Name",
        idade=50,
        sexo="M",
        diagnostico="Original diagnosis"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Update patient via API
    update_data = {
        "name": "Updated Patient Name",
        "diagnostico": "Updated diagnosis",
        "idade": 55
    }
    
    response = pg_client.put(
        f"/api/patients/{patient.patient_id}",
        json=update_data
    )
    
    # Verify API response
    assert response.status_code == 200
    updated_patient = response.json()
    assert updated_patient["name"] == update_data["name"]
    assert updated_patient["diagnostico"] == update_data["diagnostico"]
    assert updated_patient["idade"] == update_data["idade"]
    
    # Verify database was updated
    pg_session.refresh(patient)
    assert patient.name == update_data["name"]
    assert patient.diagnostico == update_data["diagnostico"]
    assert patient.idade == update_data["idade"]
    
    # Sexo should not have changed (wasn't in update data)
    assert patient.sexo == "M"

@pytest.mark.integration
def test_patient_deletion_cascade(pg_client, pg_session):
    """
    Test that deleting a patient cascades properly in the database.
    Creates a patient with lab results, then deletes the patient and verifies
    that the lab results are also deleted.
    """
    # Create a test user
    user = models.User(
        email="delete_cascade@example.com",
        name="Delete Cascade User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Configure o cliente para usar este usuário para autenticação
    pg_client.set_auth_user(user)
    
    # Create test patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Cascade Delete Patient",
        idade=60
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Add lab results to the patient
    lab1 = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_name="Glucose",
        value_numeric=110,
        unit="mg/dL",
        timestamp=datetime.now()
    )
    
    lab2 = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_name="Creatinine",
        value_numeric=1.1,
        unit="mg/dL",
        timestamp=datetime.now()
    )
    
    pg_session.add(lab1)
    pg_session.add(lab2)
    pg_session.commit()
    
    # Verify lab results exist
    lab_count = pg_session.query(models.LabResult).filter_by(patient_id=patient.patient_id).count()
    assert lab_count == 2
    
    # Delete patient via API
    delete_response = pg_client.delete(f"/api/patients/{patient.patient_id}")
    assert delete_response.status_code == 204
    
    # Verify patient was deleted
    deleted_patient = pg_session.query(models.Patient).filter_by(patient_id=patient.patient_id).first()
    assert deleted_patient is None
    
    # Verify lab results were cascaded
    lab_count_after = pg_session.query(models.LabResult).filter_by(patient_id=patient.patient_id).count()
    assert lab_count_after == 0 