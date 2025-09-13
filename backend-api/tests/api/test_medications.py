"""
Tests for medication API endpoints.
"""

import pytest
import sys
import os
import json
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from uuid import UUID, uuid4

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models
from schemas.medication import MedicationStatus, MedicationRoute, MedicationFrequency, MedicationPatientCreate
from main import app
from security import create_access_token

# This client is only for simple tests that don't require DB access
client = TestClient(app)

def create_test_user(sqlite_session):
    """Create a test user for authentication with a unique email."""
    unique_id = str(uuid4())[:8]
    email = f"medication_test_{unique_id}@example.com"
    user = models.User(
        clerk_user_id=f"test_clerk_user_{unique_id}",  # Use unique clerk_user_id
        email=email,
        name="Medication Test User",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    return user

def create_test_patient(sqlite_session, user_id):
    """Create a test patient for medication tests."""
    patient = models.Patient(
        name="Test Patient",
        idade=30,
        sexo="M",
        peso=70.5,
        altura=1.75,
        etnia="caucasian",
        diagnostico="Test diagnosis",
        user_id=user_id
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    return patient


def test_create_medication(sqlite_client, sqlite_session, monkeypatch):
    """Test creating a new medication."""
    # Mock UUID handling for testing
    mock_uuid = uuid4()
    mock_created_at = datetime.now()
    mock_updated_at = datetime.now()
    
    def mock_create_medication(*args, **kwargs):
        # Handle both parameter names: 'medication' and 'medication_data'
        medication_obj = kwargs.get("medication") or kwargs.get("medication_data")
        if medication_obj is None:
            raise ValueError("No medication data provided")

        # Extract patient_id and user_id
        patient_id = medication_obj.patient_id if hasattr(medication_obj, 'patient_id') else medication_obj.get('patient_id')
        user_id = medication_obj.user_id if hasattr(medication_obj, 'user_id') else medication_obj.get('user_id')

        return {
            "medication_id": 123,  # Use integer ID as expected by schema
            "patient_id": patient_id,
            "user_id": user_id,    # Include required user_id field
            "name": medication_obj.name if hasattr(medication_obj, 'name') else medication_obj.get('name'),
            "dosage": medication_obj.dosage if hasattr(medication_obj, 'dosage') else medication_obj.get('dosage'),
            "route": medication_obj.route if hasattr(medication_obj, 'route') else medication_obj.get('route'),
            "frequency": medication_obj.frequency if hasattr(medication_obj, 'frequency') else medication_obj.get('frequency'),
            "raw_frequency": getattr(medication_obj, 'raw_frequency', None) or medication_obj.get('raw_frequency') or "Daily",
            "start_date": medication_obj.start_date if hasattr(medication_obj, 'start_date') else medication_obj.get('start_date'),
            "end_date": medication_obj.end_date if hasattr(medication_obj, 'end_date') else medication_obj.get('end_date'),
            "status": medication_obj.status if hasattr(medication_obj, 'status') else medication_obj.get('status'),
            "instructions": getattr(medication_obj, 'instructions', None) or medication_obj.get('instructions') or "Take as directed",
            "notes": medication_obj.notes if hasattr(medication_obj, 'notes') else medication_obj.get('notes'),
            "created_at": mock_created_at,
            "updated_at": mock_updated_at
        }
    
    # Apply the mock to the CRUD function
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "create_medication", mock_create_medication)
    
    user = create_test_user(sqlite_session)
    patient = create_test_patient(sqlite_session, user.user_id)
    patient_id = uuid4()  # Mock patient UUID
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Prepare medication data
    medication_data = {
        "patient_id": str(patient_id),
        "user_id": str(user.user_id),
        "name": "Ibuprofen",
        "dosage": "400mg",
        "route": MedicationRoute.ORAL.value,
        "frequency": MedicationFrequency.TID.value,
        "raw_frequency": "Three times daily",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "status": MedicationStatus.ACTIVE.value,
        "instructions": "Take with food",
        "notes": "For fever and pain"
    }
    
    response = sqlite_client.post(f"/api/patients/{patient.patient_id}/medications", json=medication_data)
    
    assert response.status_code == 201
    assert "medication_id" in response.json()
    assert response.json()["name"] == medication_data["name"]
    assert response.json()["dosage"] == medication_data["dosage"]
    assert response.json()["route"] == medication_data["route"]
    assert response.json()["status"] == medication_data["status"]

def test_get_medication(sqlite_client, sqlite_session, monkeypatch):
    """Test retrieving a specific medication."""
    # Mock UUID and data
    mock_uuid = uuid4()
    patient_id = uuid4()
    
    # Mock medication data
    mock_medication = {
        "medication_id": mock_uuid,
        "patient_id": patient_id,
        "name": "Aspirin",
        "dosage": "100mg",
        "route": MedicationRoute.ORAL.value,
        "frequency": MedicationFrequency.DAILY.value,
        "raw_frequency": "Daily",
        "start_date": datetime.now(),
        "end_date": datetime.now() + timedelta(days=30),
        "status": MedicationStatus.ACTIVE.value,
        "instructions": "Take after breakfast",
        "notes": "For heart health",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    def mock_get_medication(*args, **kwargs):
        return mock_medication
    
    # Apply the mock to the CRUD function
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medication", mock_get_medication)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.get(f"/api/medications/{mock_uuid}")
    
    assert response.status_code == 200
    assert response.json()["id"] == str(mock_uuid)
    assert response.json()["medication_name"] == mock_medication["name"]
    assert response.json()["status"] == mock_medication["status"]

def test_update_medication(sqlite_client, sqlite_session, monkeypatch):
    """Test updating an existing medication."""
    # Mock UUID and data
    mock_uuid = uuid4()
    patient_id = uuid4()
    
    # Original medication
    original_medication = {
        "medication_id": mock_uuid,
        "patient_id": patient_id,
        "name": "Lisinopril",
        "dosage": "10mg",
        "route": MedicationRoute.ORAL.value,
        "frequency": MedicationFrequency.DAILY.value,
        "raw_frequency": "Daily",
        "start_date": datetime.now(),
        "end_date": None,
        "status": MedicationStatus.ACTIVE.value,
        "instructions": "Take in the morning",
        "notes": "For blood pressure",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    # Updated data
    updated_data = {
        "dosage": "20mg",
        "frequency": MedicationFrequency.BID.value,
        "instructions": "Take in morning and evening",
        "notes": "Increased dosage for better blood pressure control"
    }
    
    def mock_get_medication(*args, **kwargs):
        return original_medication
    
    def mock_update_medication(*args, **kwargs):
        # Create an updated version based on the original and the update
        updated = original_medication.copy()
        for key, value in kwargs.get("medication_update").dict(exclude_unset=True).items():
            updated[key] = value
        updated["updated_at"] = datetime.now()
        return updated
    
    # Apply the mocks
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medication", mock_get_medication)
    monkeypatch.setattr(medication_crud, "update_medication", mock_update_medication)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.put(f"/api/medications/{mock_uuid}", json=updated_data)
    
    assert response.status_code == 200
    assert response.json()["id"] == str(mock_uuid)
    assert response.json()["medication_name"] == original_medication["name"]  # Unchanged
    assert response.json()["dosage"] == updated_data["dosage"]     # Changed
    assert response.json()["frequency"] == updated_data["frequency"]  # Changed
    assert "notes" in response.json()  # Changed

def test_delete_medication(sqlite_client, sqlite_session, monkeypatch):
    """Test deleting a medication."""
    # Mock UUID and medication
    mock_uuid = uuid4()
    mock_medication = {
        "medication_id": mock_uuid,
        "patient_id": uuid4(),
        "name": "Metformin",
        "dosage": "500mg",
        "route": MedicationRoute.ORAL.value,
        "frequency": MedicationFrequency.BID.value,
        "raw_frequency": "Twice daily",
        "start_date": datetime.now(),
        "end_date": None,
        "status": MedicationStatus.ACTIVE.value,
        "instructions": "Take with meals",
        "notes": "For diabetes",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    # Track if delete_medication was called
    delete_called = False
    
    def mock_get_medication(*args, **kwargs):
        medication_id = kwargs.get("medication_id")
        if medication_id == mock_uuid and not delete_called:
            return mock_medication
        return None  # After deletion, return None
    
    def mock_delete_medication(*args, **kwargs):
        nonlocal delete_called
        delete_called = True
    
    # Apply the mocks
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medication", mock_get_medication)
    monkeypatch.setattr(medication_crud, "delete_medication", mock_delete_medication)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.delete(f"/api/medications/{mock_uuid}")
    
    assert response.status_code == 204
    assert delete_called
    
    # Try to get the deleted medication
    response = sqlite_client.get(f"/api/medications/{mock_uuid}")
    assert response.status_code == 404

def test_get_patient_medications(sqlite_client, sqlite_session, monkeypatch):
    """Test retrieving all medications for a patient."""
    patient_id = uuid4()
    
    # Mock medications
    mock_medications = [
        {
            "medication_id": uuid4(),
            "patient_id": patient_id,
            "name": f"Medication {i}",
            "dosage": f"{100 * (i+1)}mg",
            "route": MedicationRoute.ORAL.value,
            "frequency": MedicationFrequency.DAILY.value,
            "raw_frequency": "Daily",
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=30),
            "status": MedicationStatus.ACTIVE.value,
            "instructions": f"Take {i+1} times daily",
            "notes": f"Test medication {i}",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        for i in range(3)
    ]
    
    def mock_get_medications(*args, **kwargs):
        if kwargs.get("patient_id") == patient_id:
            # If filtering by status, return only those medications
            if kwargs.get("status"):
                return [m for m in mock_medications if m["status"] == kwargs.get("status")]
            return mock_medications
        return []
    
    # Apply the mock
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medications", mock_get_medications)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.get(f"/api/medications/patient/{patient_id}")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 3
    assert response.json()[0]["medication_name"] == mock_medications[0]["name"]
    assert response.json()[0]["dosage"] == mock_medications[0]["dosage"]

def test_filter_medications_by_status(sqlite_client, sqlite_session, monkeypatch):
    """Test filtering medications by status."""
    patient_id = uuid4()
    
    # Create medications with different statuses
    mock_medications = [
        {
            "medication_id": uuid4(),
            "patient_id": patient_id,
            "name": f"Medication {i}",
            "dosage": f"{100 * (i+1)}mg",
            "route": MedicationRoute.ORAL.value,
            "frequency": MedicationFrequency.DAILY.value,
            "raw_frequency": "Daily",
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=30),
            "status": status.value,  # Each with a different status
            "instructions": f"Take {i+1} times daily",
            "notes": f"Test medication {i}",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        for i, status in enumerate([
            MedicationStatus.ACTIVE, 
            MedicationStatus.COMPLETED, 
            MedicationStatus.SUSPENDED
        ])
    ]
    
    def mock_get_medications(*args, **kwargs):
        if kwargs.get("patient_id") == patient_id:
            # If filtering by status, return only those medications
            if kwargs.get("status"):
                return [m for m in mock_medications if m["status"] == kwargs.get("status")]
            return mock_medications
        return []
    
    # Apply the mock
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medications", mock_get_medications)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Test filtering by ACTIVE status
    response = sqlite_client.get(f"/api/medications/patient/{patient_id}?status={MedicationStatus.ACTIVE.value}")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1
    assert response.json()[0]["status"] == MedicationStatus.ACTIVE.value
    
    # Test filtering by COMPLETED status
    response = sqlite_client.get(f"/api/medications/patient/{patient_id}?status={MedicationStatus.COMPLETED.value}")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1
    assert response.json()[0]["status"] == MedicationStatus.COMPLETED.value

def test_create_medication_for_patient(sqlite_client, sqlite_session, monkeypatch):
    """Test creating a medication for a specific patient."""
    # Mock UUID handling for testing
    mock_uuid = uuid4()
    patient_id = uuid4()
    
    def mock_get_patient_by_id(*args, **kwargs):
        # Simular que o paciente existe
        return {"patient_id": patient_id, "name": "Test Patient"}
    
    def mock_create_medication(*args, **kwargs):
        # A função create_medication recebe um objeto MedicationCreate
        # O patient_id será override pelo endpoint, então precisamos capturar isso
        medication = kwargs.get("medication")
        
        return {
            "medication_id": mock_uuid,
            "patient_id": medication.patient_id,
            "name": medication.name,
            "dosage": medication.dosage,
            "route": medication.route,
            "frequency": medication.frequency,
            "raw_frequency": kwargs.get("medication").raw_frequency or "Daily",
            "start_date": medication.start_date,
            "end_date": medication.end_date,
            "status": medication.status,
            "instructions": medication.instructions,
            "notes": medication.notes,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    
    # Apply the mocks
    from crud import medication as medication_crud
    from crud import patients as patient_crud
    monkeypatch.setattr(patient_crud, "get_patient", mock_get_patient_by_id)
    monkeypatch.setattr(medication_crud, "create_medication", mock_create_medication)
    
    user = create_test_user(sqlite_session)
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Prepare medication data (without patient_id, as it comes from the URL)
    medication_data = {
        "name": "Ceftriaxone",
        "dosage": "2g",
        "route": MedicationRoute.INTRAVENOUS.value,
        "frequency": MedicationFrequency.DAILY.value,
        "raw_frequency": "Once daily",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "status": MedicationStatus.ACTIVE.value,
        "instructions": "Administer over 30 minutes",
        "notes": "For severe infection"
    }
    
    response = sqlite_client.post(f"/api/medications/patient/{patient_id}", json=medication_data)
    
    assert response.status_code == 201
    assert "id" in response.json()
    assert response.json()["medication_name"] == medication_data["name"]
    assert response.json()["dosage"] == medication_data["dosage"]
    assert response.json()["route"] == medication_data["route"]
    assert response.json()["status"] == medication_data["status"]

def test_patient_medication_unauthorized_access(sqlite_client, sqlite_session, monkeypatch):
    """Test unauthorized access to medication endpoints."""
    # Try without authentication
    patient_id = uuid4()
    medication_id = uuid4()

    # Mock get_medication para evitar acesso ao banco de dados
    def mock_get_medication(*args, **kwargs):
        return None  # Retornar None para simular que a medicação não existe

    # Mock get_medications para evitar acesso ao banco de dados
    def mock_get_medications(*args, **kwargs):
        return []

    # Aplicar os mocks
    from crud import medication as medication_crud
    monkeypatch.setattr(medication_crud, "get_medication", mock_get_medication)
    monkeypatch.setattr(medication_crud, "get_medications", mock_get_medications)

    # Make sure we have no authentication
    sqlite_client.set_auth_user(None)

    # Endpoints que suportam GET - não incluir /api/medications/ pois é apenas POST
    get_endpoints = [
        f"/api/medications/{medication_id}",
        f"/api/medications/patient/{patient_id}"
    ]

    for endpoint in get_endpoints:
        # GET requests without authentication should return 401
        response = sqlite_client.get(endpoint)
        assert response.status_code == 401, f"GET {endpoint} should require authentication"

    # Test POST and PUT endpoints without authentication
    post_endpoints = [
        "/api/medications/",
        f"/api/medications/patient/{patient_id}"
    ]
    
    for endpoint in post_endpoints:
        response = sqlite_client.post(endpoint, json={"name": "Test"})
        assert response.status_code == 401, f"POST {endpoint} should require authentication"
        
    # With authentication but non-existent resources
    user = create_test_user(sqlite_session)
    # Set the user for authentication in the client
    sqlite_client.set_auth_user(user)
    
    # Non-existent medication should return 404, not 401
    response = sqlite_client.get(f"/api/medications/{uuid4()}", headers={})
    assert response.status_code == 404, "Non-existent medication should return 404" 