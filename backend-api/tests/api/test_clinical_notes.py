"""
Tests for medical notes API endpoints.
"""

import pytest
import sys
import os
import json
import uuid
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from uuid import UUID, uuid4

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models
from database.models import NoteType as ModelNoteType
from schemas.clinical_note import NoteType as SchemaNoteType
from main import app
from security import create_access_token

# This client is only for simple tests that don't require DB access
client = TestClient(app)

def create_test_user(sqlite_session):
    """Create a test user for authentication with a unique email."""
    unique_id = str(uuid.uuid4())[:8]
    email = f"medical_notes_test_{unique_id}@example.com"
    user = models.User(
        email=email,
        name="Medical Notes Test User",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    return user

def create_test_patient(sqlite_session, user_id):
    """Create a test patient for medical notes tests."""
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

def get_auth_headers(user_email, user_id=None, name="Test User"):
    """Get authorization headers with a valid token."""
    token_data = {"sub": user_email}
    
    # Include user_id and name if available
    if user_id:
        token_data["user_id"] = user_id
    # Include a default name for testing
    token_data["name"] = name
    
    access_token = create_access_token(data=token_data)
    return {"Authorization": f"Bearer {access_token}"}

def test_create_medical_note(sqlite_client, sqlite_session):
    """Test creating a new medical note."""
    # Use integer ID as expected by the router
    mock_id = str(uuid4())
    mock_patient_id = str(uuid4())
    mock_user_id = str(uuid4())
    
    def mock_create_note(*args, **kwargs):
        # Simple mock that simulates creating a note with an ID
        return {
            "id": mock_id,
            "patient_id": mock_patient_id,
            "user_id": mock_user_id,
            "title": kwargs.get("note").title,
            "content": kwargs.get("note").content,
            "note_type": kwargs.get("note").note_type,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    
    # Apply the mock to the CRUD function
    from crud import clinical_note as notes_crud
    notes_crud.create_note = mock_create_note
    
    user = create_test_user(sqlite_session)
    patient = create_test_patient(sqlite_session, user.user_id)
    
    # Print app routes for debugging
    print("\nAvailable routes:")
    for route in app.routes:
        print(f"Route: {route.path}, Methods: {route.methods}")
    
    note_data = {
        "patient_id": mock_patient_id,
        "title": "Test Note",
        "content": "Patient appears to be in good health. Prescribed vitamins.",
        "note_type": SchemaNoteType.EVOLUTION.value
    }
    
    # Print data being sent for debugging
    print(f"\nSending note data: {json.dumps(note_data, indent=2)}")
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    response = sqlite_client.post("/api/clinical-notes/", json=note_data)
    
    # Print response details for debugging
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {response.text}")
    print(f"Headers: {dict(response.headers)}")
    
    assert response.status_code == 201
    assert "id" in response.json()
    assert response.json()["content"] == note_data["content"]
    assert response.json()["note_type"] == note_data["note_type"]

def test_get_medical_note(sqlite_client, sqlite_session):
    """Test retrieving a specific medical note."""
    # Router expects integer IDs, not UUIDs
    mock_id = 1  # Integer ID for the route parameter
    # But keep UUIDs in the return data structure
    mock_uuid_id = str(uuid4())
    mock_patient_id = str(uuid4())
    mock_user_id = str(uuid4())
    
    mock_note = {
        "id": mock_uuid_id,
        "patient_id": mock_patient_id,
        "user_id": mock_user_id,
        "title": "Test Note",
        "content": "Test medical note content",
        "note_type": SchemaNoteType.EVOLUTION.value,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    def mock_get_note(*args, **kwargs):
        # Simple mock that returns a note with the UUID
        # Ensure the ID used in the route and the returned object match
        print(f"\nMock args: {args}")
        print(f"Mock kwargs: {kwargs}")
        return mock_note
    
    # Apply the mock to the CRUD function
    from crud import clinical_note as notes_crud
    notes_crud.get_note = mock_get_note
    
    user = create_test_user(sqlite_session)
    patient = create_test_patient(sqlite_session, user.user_id)
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    # Use integer ID for the route
    response = sqlite_client.get(f"/api/clinical-notes/{mock_id}")
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert response.status_code == 200
    assert response.json()["id"] == mock_uuid_id
    assert response.json()["content"] == mock_note["content"]
    assert response.json()["note_type"] == mock_note["note_type"]

def test_get_patient_medical_notes(sqlite_client, sqlite_session):
    """Test retrieving all medical notes for a specific patient."""
    # Router expects integer ID for patient_id
    patient_id = 1
    # But use UUID in the response
    uuid_patient_id = str(uuid4())
    user_id = str(uuid4())
    
    mock_notes = [
        {
            "id": str(uuid4()),
            "patient_id": uuid_patient_id,
            "user_id": user_id,
            "title": f"Test Note {i}",
            "content": f"Test note {i} content",
            "note_type": SchemaNoteType.EVOLUTION.value,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        for i in range(1, 4)  # Notes 1, 2, 3
    ]
    
    def mock_get_notes(*args, **kwargs):
        # Simple mock that returns a list of notes
        print(f"\nMock args: {args}")
        print(f"Mock kwargs: {kwargs}")
        return mock_notes
    
    # Apply the mock to the CRUD function
    from crud import clinical_note as notes_crud
    notes_crud.get_notes = mock_get_notes
    
    user = create_test_user(sqlite_session)
    patient = create_test_patient(sqlite_session, user.user_id)
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    # Use integer ID in the route
    response = sqlite_client.get(f"/api/clinical-notes/patient/{patient_id}")
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert response.status_code == 200
    # The response should be a list of notes or wrapped as {"notes": [...]}
    response_data = response.json()
    if isinstance(response_data, dict) and "notes" in response_data:
        notes = response_data["notes"]
    else:
        notes = response_data
        
    assert len(notes) == 3
    # UUID values should match from mock
    assert all(note["patient_id"] == uuid_patient_id for note in notes)

def test_update_medical_note(sqlite_client, sqlite_session):
    """Test updating an existing medical note."""
    # Router expects integer ID
    mock_id = 1
    # But keep UUIDs in the response
    mock_uuid_id = str(uuid4())
    mock_patient_id = str(uuid4()) 
    mock_user_id = str(uuid4())
    
    updated_data = {
        "title": "Updated Note",
        "content": "Updated content",
        "note_type": SchemaNoteType.CONSULTATION.value
    }
    
    mock_updated_note = {
        "id": mock_uuid_id,
        "patient_id": mock_patient_id,
        "user_id": mock_user_id,
        "title": updated_data["title"],
        "content": updated_data["content"],
        "note_type": updated_data["note_type"],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    def mock_update_note(*args, **kwargs):
        # Simple mock that returns an updated note
        print(f"\nUpdate mock args: {args}")
        print(f"Update mock kwargs: {kwargs}")
        return mock_updated_note
    
    def mock_get_note(*args, **kwargs):
        # Ensure the get_note check passes
        print(f"\nGet mock args: {args}")
        print(f"Get mock kwargs: {kwargs}")
        return mock_updated_note
    
    # Apply the mocks to the CRUD functions
    from crud import clinical_note as notes_crud
    notes_crud.update_note = mock_update_note
    notes_crud.get_note = mock_get_note
    
    user = create_test_user(sqlite_session)
    patient = create_test_patient(sqlite_session, user.user_id)
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    # Use integer ID in the route
    response = sqlite_client.put(f"/api/clinical-notes/{mock_id}", json=updated_data)
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert response.status_code == 200
    assert response.json()["content"] == updated_data["content"]
    assert response.json()["note_type"] == updated_data["note_type"]
    assert response.json()["id"] == mock_uuid_id

def test_delete_medical_note(sqlite_client, sqlite_session):
    """Test deleting a medical note."""
    # Router expects integer ID
    mock_id = 1
    
    # Mock the delete_note function to return True (success)
    def mock_delete_note(*args, **kwargs):
        print(f"\nDelete mock args: {args}")
        print(f"Delete mock kwargs: {kwargs}")
        return True
        
    # Apply the mock to the CRUD function
    from crud import clinical_note as notes_crud
    notes_crud.delete_note = mock_delete_note
    
    # Mock get_note to return None after deletion
    def mock_get_note(*args, **kwargs):
        print(f"\nGet mock args: {args}")
        print(f"Get mock kwargs: {kwargs}")
        return None
        
    notes_crud.get_note = mock_get_note
    
    user = create_test_user(sqlite_session)
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    # Test delete note - should return 204 No Content
    response = sqlite_client.delete(f"/api/clinical-notes/{mock_id}")
    
    print(f"\nResponse status: {response.status_code}")
    
    assert response.status_code == 204

def test_unauthorized_access(sqlite_client, sqlite_session):
    """Test that unauthorized access is properly rejected."""
    # We'll use app.dependency_overrides to force a 401 when auth is required
    from fastapi import HTTPException, status
    from security import get_current_user_required
    
    # Save original dependencies
    original_deps = app.dependency_overrides.copy()
    
    def mock_auth_failure():
        """Force authentication to fail with 401"""
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        # Override the auth dependency to fail
        app.dependency_overrides[get_current_user_required] = mock_auth_failure
        
        mock_uuid = uuid4()
        note_data = {
            "patient_id": str(mock_uuid),
            "title": "Unauthorized Note",
            "content": "This should not be created",
            "note_type": SchemaNoteType.EVOLUTION.value
        }
        
        # Try to create a note - should get 401
        response = sqlite_client.post("/api/clinical-notes/", json=note_data)
        assert response.status_code == 401
        
        # Try to get a note - should get 401
        response = sqlite_client.get(f"/api/clinical-notes/{mock_uuid}")
        assert response.status_code == 401
        
    finally:
        # Restore original dependency overrides
        app.dependency_overrides = original_deps

def test_note_not_found(sqlite_client, sqlite_session):
    """Test handling of non-existent note IDs."""
    # Router expects integer ID
    mock_id = 999
    
    def mock_get_note(*args, **kwargs):
        # Always return None to simulate not found
        print(f"\nGet mock args: {args}")
        print(f"Get mock kwargs: {kwargs}")
        return None
    
    def mock_update_note(*args, **kwargs):
        # Always return None to simulate not found
        print(f"\nUpdate mock args: {args}")
        print(f"Update mock kwargs: {kwargs}")
        return None
        
    def mock_delete_note(*args, **kwargs):
        # Always return False to simulate not found
        print(f"\nDelete mock args: {args}")
        print(f"Delete mock kwargs: {kwargs}")
        return False
    
    # Apply the mocks to the CRUD functions
    from crud import clinical_note as notes_crud
    notes_crud.get_note = mock_get_note
    notes_crud.update_note = mock_update_note
    notes_crud.delete_note = mock_delete_note
    
    user = create_test_user(sqlite_session)
    
    # Use the client's set_auth_user method with bypass_auth=True
    sqlite_client.set_auth_user(user, bypass_auth=True)
    
    # Try to get a non-existent note
    response = sqlite_client.get(f"/api/clinical-notes/{mock_id}")
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    assert response.status_code == 404
    
    # Try to update a non-existent note
    response = sqlite_client.put(f"/api/clinical-notes/{mock_id}", json={"content": "Updated"})
    
    print(f"\nUpdate response status: {response.status_code}")
    print(f"Update response body: {response.text}")
    
    assert response.status_code == 404
    
    # Try to delete a non-existent note
    response = sqlite_client.delete(f"/api/clinical-notes/{mock_id}")
    
    print(f"\nDelete response status: {response.status_code}")
    print(f"Delete response body: {response.text if response.text else 'No content'}")
    
    assert response.status_code == 404 