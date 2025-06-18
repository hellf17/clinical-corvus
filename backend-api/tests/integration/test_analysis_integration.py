"""
Integration tests for the analysis module.
These tests verify that analysis creation, retrieval, update, deletion, and search work correctly.
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
def test_create_and_retrieve_analysis(pg_client, pg_session):
    """
    Test creating an analysis and retrieving it from the database.
    """
    # Create a test user
    user = models.User(
        email="analysis_test@example.com",
        name="Analysis Test User",
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
        name="Analysis Test Patient",
        idade=65,
        sexo="M",
        diagnostico="Patient for Analysis Testing"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create analysis data
    analysis_data = {
        "title": "Initial Analysis",
        "content": "This patient's condition requires careful monitoring.",
        "patient_id": str(patient.patient_id)
    }
    
    # Create analysis via API
    response = pg_client.post(
        "/api/analyses/",
        json=analysis_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created_analysis = response.json()
    assert "id" in created_analysis
    analysis_id = created_analysis["id"]
    
    # Retrieve single analysis
    get_response = pg_client.get(
        f"/api/analyses/{analysis_id}",
        headers=auth_headers
    )
    
    # Verify get response
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
    analysis = get_response.json()
    assert analysis["id"] == analysis_id
    assert analysis["patient_id"] == str(patient.patient_id)
    assert analysis["title"] == analysis_data["title"]
    assert analysis["content"] == analysis_data["content"]
    
    # Retrieve analyses for patient
    patient_analyses_response = pg_client.get(
        f"/api/analyses/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Verify patient analyses response
    assert patient_analyses_response.status_code == 200, f"Expected 200, got {patient_analyses_response.status_code}: {patient_analyses_response.text}"
    patient_analyses = patient_analyses_response.json()
    assert len(patient_analyses) >= 1
    
    # Find our analysis in the list
    our_analysis = next((a for a in patient_analyses if a["id"] == analysis_id), None)
    assert our_analysis is not None
    assert our_analysis["title"] == analysis_data["title"]
    assert our_analysis["content"] == analysis_data["content"]

@pytest.mark.integration
def test_update_analysis(pg_client, pg_session):
    """
    Test updating an analysis and verifying the database update.
    """
    # Create a test user
    user = models.User(
        email="analysis_update_test@example.com",
        name="Analysis Update Test User",
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
        name="Analysis Update Test Patient",
        idade=55,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create initial analysis data
    analysis_data = {
        "title": "Preliminary Analysis",
        "content": "Initial assessment of patient condition.",
        "patient_id": str(patient.patient_id)
    }
    
    # Create analysis via API
    create_response = pg_client.post(
        "/api/analyses/",
        json=analysis_data,
        headers=auth_headers
    )
    
    created_analysis = create_response.json()
    analysis_id = created_analysis["id"]
    
    # Update data
    update_data = {
        "title": "Updated Analysis",
        "content": "Updated assessment based on new findings."
    }
    
    # Update analysis
    update_response = pg_client.put(
        f"/api/analyses/{analysis_id}",
        json=update_data,
        headers=auth_headers
    )
    
    # Verify response
    assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
    updated_analysis = update_response.json()
    assert updated_analysis["id"] == analysis_id
    assert updated_analysis["title"] == update_data["title"]
    assert updated_analysis["content"] == update_data["content"]
    
    # Retrieve to verify update
    get_response = pg_client.get(
        f"/api/analyses/{analysis_id}",
        headers=auth_headers
    )
    
    analysis = get_response.json()
    assert analysis["title"] == update_data["title"]
    assert analysis["content"] == update_data["content"]

@pytest.mark.integration
def test_delete_analysis(pg_client, pg_session):
    """
    Test deleting an analysis.
    """
    # Create a test user
    user = models.User(
        email="analysis_delete_test@example.com",
        name="Analysis Delete Test User",
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
        name="Analysis Delete Test Patient",
        idade=70,
        sexo="M"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create analysis data
    analysis_data = {
        "title": "Analysis to Delete",
        "content": "This analysis will be deleted.",
        "patient_id": str(patient.patient_id)
    }
    
    # Create analysis via API
    create_response = pg_client.post(
        "/api/analyses/",
        json=analysis_data,
        headers=auth_headers
    )
    
    created_analysis = create_response.json()
    analysis_id = created_analysis["id"]
    
    # Delete analysis
    delete_response = pg_client.delete(
        f"/api/analyses/{analysis_id}",
        headers=auth_headers
    )
    
    # Verify response
    assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}: {delete_response.text}"
    
    # Try to retrieve deleted analysis
    get_response = pg_client.get(
        f"/api/analyses/{analysis_id}",
        headers=auth_headers
    )
    
    # Should return 404
    assert get_response.status_code == 404, f"Expected 404, got {get_response.status_code}: {get_response.text}"
    
    # Check patient analyses list
    list_response = pg_client.get(
        f"/api/analyses/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    analyses_list = list_response.json()
    # Verify deleted analysis is not in the list
    deleted_analysis = next((a for a in analyses_list if a["id"] == analysis_id), None)
    assert deleted_analysis is None

@pytest.mark.integration
def test_search_analysis(pg_client, pg_session):
    """
    Test searching for analyses.
    """
    # Create a test user
    user = models.User(
        email="analysis_search_test@example.com",
        name="Analysis Search Test User",
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
        name="Analysis Search Test Patient",
        idade=60,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create multiple analyses with different content
    analyses_data = [
        {
            "title": "Cardiac Analysis",
            "content": "Patient shows signs of cardiac abnormalities.",
            "patient_id": str(patient.patient_id)
        },
        {
            "title": "Respiratory Assessment",
            "content": "Lung function appears normal with good oxygen saturation.",
            "patient_id": str(patient.patient_id)
        },
        {
            "title": "Blood Work Review",
            "content": "Blood tests indicate elevated cholesterol levels.",
            "patient_id": str(patient.patient_id)
        }
    ]
    
    # Create analyses
    for analysis_data in analyses_data:
        response = pg_client.post(
            "/api/analyses/",
            json=analysis_data,
            headers=auth_headers
        )
        assert response.status_code == 201
    
    # Search for title
    title_search_response = pg_client.get(
        f"/api/analyses/_search?query=cardiac",
        headers=auth_headers
    )
    
    # Verify search response
    assert title_search_response.status_code == 200
    title_search_results = title_search_response.json()
    assert len(title_search_results) >= 1
    
    # At least one result should have "cardiac" in the title
    cardiac_result = next((a for a in title_search_results if "cardiac" in a["title"].lower()), None)
    assert cardiac_result is not None
    
    # Search for content
    content_search_response = pg_client.get(
        f"/api/analyses/_search?query=cholesterol",
        headers=auth_headers
    )
    
    # Verify second search response
    assert content_search_response.status_code == 200
    content_search_results = content_search_response.json()
    assert len(content_search_results) >= 1
    
    # At least one result should have "cholesterol" in the content
    cholesterol_result = next((a for a in content_search_results if "cholesterol" in a["content"].lower()), None)
    assert cholesterol_result is not None 