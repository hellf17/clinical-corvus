"""
Integration tests for the alerts module.
These tests verify that alert creation, notification, and database operations work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
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
def test_create_and_retrieve_alert(pg_client, pg_session):
    """
    Test creating an alert and retrieving it from the database.
    """
    # Create a test user
    user = models.User(
        email="alerts_test@example.com",
        name="Alerts Test User",
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
        name="Alerts Test Patient",
        idade=75,
        sexo="M",
        diagnostico="Patient for Alert Testing"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create alert data
    alert_data = {
        "patient_id": patient.patient_id,
        "alert_type": "lab_result",
        "message": "Critical potassium level detected",
        "severity": "high",
        "is_read": False,
        "details": {
            "test_name": "Potassium",
            "value": "6.5",
            "unit": "mEq/L",
            "reference_range": "3.5-5.0"
        }
    }
    
    # Create alert via API
    response = pg_client.post(
        "/api/alerts/",
        json=alert_data,
        headers=auth_headers
    )
    
    # Verify API response
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    created_alert = response.json()
    assert "alert_id" in created_alert
    alert_id = created_alert["alert_id"]
    
    # Verify alert exists in database
    db_alert = pg_session.query(models.Alert).filter_by(alert_id=alert_id).first()
    assert db_alert is not None
    assert db_alert.patient_id == patient.patient_id
    assert db_alert.alert_type == alert_data["alert_type"]
    assert db_alert.message == alert_data["message"]
    assert db_alert.severity == alert_data["severity"]
    assert db_alert.is_read == alert_data["is_read"]
    assert db_alert.created_by == user.user_id
    
    # Retrieve single alert
    get_response = pg_client.get(
        f"/api/alerts/{alert_id}",
        headers=auth_headers
    )
    
    # Verify get response
    assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
    alert = get_response.json()
    assert alert["alert_id"] == alert_id
    assert alert["patient_id"] == patient.patient_id
    assert alert["message"] == alert_data["message"]
    assert alert["severity"] == alert_data["severity"]
    
    # Retrieve alerts for patient
    patient_alerts_response = pg_client.get(
        f"/api/alerts/patient/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Verify patient alerts response
    assert patient_alerts_response.status_code == 200, f"Expected 200, got {patient_alerts_response.status_code}: {patient_alerts_response.text}"
    patient_alerts = patient_alerts_response.json()
    assert isinstance(patient_alerts, list)
    assert len(patient_alerts) >= 1
    
    # Find our alert in the list
    our_alert = next((a for a in patient_alerts if a["alert_id"] == alert_id), None)
    assert our_alert is not None
    assert our_alert["message"] == alert_data["message"]

@pytest.mark.integration
def test_mark_alert_as_read(pg_client, pg_session):
    """
    Test marking an alert as read and verifying the database update.
    """
    # Create a test user
    user = models.User(
        email="alert_read_test@example.com",
        name="Alert Read Test User",
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
        name="Alert Read Test Patient",
        idade=60,
        sexo="F"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create an unread alert directly in the database
    alert = models.Alert(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        alert_type="medication",
        message="Potential medication interaction",
        severity="medium",
        is_read=False,
        created_by=user.user_id,
        created_at=datetime.now()
    )
    pg_session.add(alert)
    pg_session.commit()
    pg_session.refresh(alert)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Mark alert as read
    read_response = pg_client.put(
        f"/api/alerts/{alert.alert_id}/read",
        headers=auth_headers
    )
    
    # Verify response
    assert read_response.status_code == 200, f"Expected 200, got {read_response.status_code}: {read_response.text}"
    updated_alert = read_response.json()
    assert updated_alert["alert_id"] == alert.alert_id
    assert updated_alert["is_read"] == True
    
    # Verify database update
    pg_session.refresh(alert)
    assert alert.is_read == True
    
    # Verify the alert appears in read alerts list
    read_alerts_response = pg_client.get(
        "/api/alerts/by-status/read",
        headers=auth_headers
    )
    
    assert read_alerts_response.status_code == 200, f"Expected 200, got {read_alerts_response.status_code}: {read_alerts_response.text}"
    read_alerts = read_alerts_response.json()
    assert isinstance(read_alerts, list)
    
    # Find our alert in the list
    our_alert = next((a for a in read_alerts if a["alert_id"] == alert.alert_id), None)
    assert our_alert is not None
    assert our_alert["is_read"] == True

@pytest.mark.integration
def test_generate_automatic_alerts(pg_client, pg_session):
    """
    Test automatic alert generation from lab results and verify database updates.
    """
    # Create a test user
    user = models.User(
        email="auto_alert_test@example.com",
        name="Auto Alert Test User",
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
        name="Auto Alert Test Patient",
        idade=70,
        sexo="M"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)
    
    # Create a test category for lab results
    category = models.TestCategory(
        name="chemistry",
        description="Chemistry tests"
    )
    pg_session.add(category)
    pg_session.commit()
    pg_session.refresh(category)
    
    # Create an abnormal lab result that should trigger an alert
    lab_result = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_name="Creatinine",
        test_category_id=category.category_id,
        value_numeric=3.4,  # Abnormally high
        unit="mg/dL",
        reference_range_low=0.6,
        reference_range_high=1.2,
        is_abnormal=True,  # Explicitly mark as abnormal
        created_by=user.user_id,
        collection_datetime=datetime.now(),
        timestamp=datetime.now()  # Adicionar timestamp que é obrigatório
    )
    pg_session.add(lab_result)
    pg_session.commit()
    pg_session.refresh(lab_result)
    
    # Trigger alert generation endpoint
    generate_response = pg_client.post(
        f"/api/alerts/generate-from-lab-results/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Verify response
    assert generate_response.status_code == 201, f"Expected 201, got {generate_response.status_code}: {generate_response.text}"
    generated_data = generate_response.json()
    
    # Check for either 'alerts_generated' (old format) or 'count' (new format)
    if 'alerts_generated' in generated_data:
        assert generated_data["alerts_generated"] >= 1
    else:
        assert 'count' in generated_data, f"Expected 'count' or 'alerts_generated' in response: {generated_data}"
        assert generated_data["count"] >= 1
        assert 'alerts' in generated_data, f"Expected 'alerts' key in response: {generated_data}"
        assert len(generated_data["alerts"]) >= 1
    
    # Verify alerts exist in database for this abnormal result
    alerts = pg_session.query(models.Alert).filter_by(
        patient_id=patient.patient_id,
        alert_type="lab_result"
    ).all()
    
    assert len(alerts) >= 1
    
    # Find specific alert for our abnormal creatinine
    creatinine_alert = next((
        a for a in alerts 
        if "creatinine" in a.message.lower() or "3.4" in a.message
    ), None)
    
    assert creatinine_alert is not None
    assert creatinine_alert.severity in ["high", "medium", "critical", "severe"]  # Severity should reflect abnormality
    assert creatinine_alert.is_read == False 