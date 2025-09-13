"""
End-to-End tests for the alert system workflow in the clinical-helper-next backend.
This tests the complete cycle of alert generation, management, and response.
"""

import pytest
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import base64

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
TEST_USER = {"email": "test_doctor@example.com", "password": "test_password"}
TEST_PDF_PATH = os.path.join(os.path.dirname(__file__), "test_data", "lab_results_sample.pdf")


@pytest.fixture
def auth_token() -> str:
    """Get an authentication token for API requests."""
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
def test_patient(auth_headers: Dict[str, str]) -> Dict[str, Any]:
    """Create a test patient for alert testing."""
    patient_data = {
        "name": f"Alert Test Patient {datetime.now().isoformat()}",
        "idade": 65,
        "sexo": "M",
        "peso": 80.5,
        "altura": 1.75,
        "etnia": "branco",
        "diagnostico": "Chronic Kidney Disease, Hypertension",
        "data_internacao": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BASE_URL}/patients/",
        json=patient_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    
    patient = response.json()
    patient["_cleanup_required"] = True  # Flag for cleanup
    
    return patient


@pytest.fixture
def lab_results_pdf() -> bytes:
    """Read test lab results PDF file."""
    if not os.path.exists(TEST_PDF_PATH):
        # Create a dummy PDF file for testing if it doesn't exist
        with open(TEST_PDF_PATH, "wb") as f:
            f.write(b"%PDF-1.5\nTest PDF content\n%%EOF")
    
    with open(TEST_PDF_PATH, "rb") as f:
        return f.read()


def upload_lab_results(
    patient_id: str, 
    pdf_data: bytes, 
    headers: Dict[str, str]
) -> Dict[str, Any]:
    """Upload lab results PDF for a patient."""
    files = {
        "file": ("lab_results.pdf", pdf_data, "application/pdf")
    }
    
    response = requests.post(
        f"{BASE_URL}/patients/{patient_id}/lab-results/upload",
        files=files,
        headers=headers
    )
    assert response.status_code == 201, f"Failed to upload lab results: {response.text}"
    
    return response.json()


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_lab_result_alert_generation(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    lab_results_pdf: bytes
):
    """Test the generation of alerts from lab results."""
    patient_id = test_patient["patient_id"]
    
    # Upload lab results
    upload_response = upload_lab_results(patient_id, lab_results_pdf, auth_headers)
    lab_result_id = upload_response["id"]
    
    # Check that the upload triggered alert generation (this may be async)
    # We'll need to poll for alerts
    MAX_RETRIES = 10
    RETRY_DELAY_SECONDS = 1
    
    alerts_found = False
    for i in range(MAX_RETRIES):
        alerts_response = requests.get(
            f"{BASE_URL}/patients/{patient_id}/alerts",
            headers=auth_headers
        )
        assert alerts_response.status_code == 200
        
        alerts = alerts_response.json()
        if len(alerts) > 0:
            alerts_found = True
            break
            
        import time
        time.sleep(RETRY_DELAY_SECONDS)
    
    assert alerts_found, "No alerts were generated within the expected timeframe"
    
    # Verify alerts are properly categorized and prioritized
    critical_alerts = [a for a in alerts if a["severity"] == "critical"]
    severe_alerts = [a for a in alerts if a["severity"] == "severe"]
    moderate_alerts = [a for a in alerts if a["severity"] == "moderate"]
    
    # Print alert counts for debugging
    print(f"Found {len(critical_alerts)} critical alerts, {len(severe_alerts)} severe alerts, and {len(moderate_alerts)} moderate alerts")
    
    # Test acknowledging an alert
    if len(alerts) > 0:
        alert_id = alerts[0]["id"]
        acknowledge_response = requests.post(
            f"{BASE_URL}/alerts/{alert_id}/acknowledge",
            headers=auth_headers
        )
        assert acknowledge_response.status_code == 200
        
        # Verify alert is marked as acknowledged
        alert_details = requests.get(
            f"{BASE_URL}/alerts/{alert_id}",
            headers=auth_headers
        )
        assert alert_details.status_code == 200
        assert alert_details.json()["acknowledged"] == True
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_manual_alert_creation(auth_headers: Dict[str, str], test_patient: Dict[str, Any]):
    """Test manually creating alerts for a patient."""
    patient_id = test_patient["patient_id"]
    
    # Create a manual alert
    alert_data = {
        "patient_id": patient_id,
        "category": "Medication",
        "parameter": "Warfarin",
        "message": "INR critically high, consider adjusting warfarin dose",
        "severity": "critical",
        "recommendation": "Reduce dosage by 50% and recheck INR in 24 hours"
    }
    
    create_response = requests.post(
        f"{BASE_URL}/alerts/",
        json=alert_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    
    alert_id = create_response.json()["id"]
    
    # Get the created alert
    alert_response = requests.get(
        f"{BASE_URL}/alerts/{alert_id}",
        headers=auth_headers
    )
    assert alert_response.status_code == 200
    
    alert = alert_response.json()
    assert alert["message"] == alert_data["message"]
    assert alert["severity"] == alert_data["severity"]
    
    # Update the alert
    update_data = {
        "severity": "severe",
        "recommendation": "Updated recommendation: Reduce dosage by 25% and recheck INR tomorrow"
    }
    
    update_response = requests.patch(
        f"{BASE_URL}/alerts/{alert_id}",
        json=update_data,
        headers=auth_headers
    )
    assert update_response.status_code == 200
    
    # Verify the update
    updated_alert = requests.get(
        f"{BASE_URL}/alerts/{alert_id}",
        headers=auth_headers
    ).json()
    
    assert updated_alert["severity"] == update_data["severity"]
    assert updated_alert["recommendation"] == update_data["recommendation"]
    
    # Delete the alert
    delete_response = requests.delete(
        f"{BASE_URL}/alerts/{alert_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 204
    
    # Verify deletion
    get_deleted = requests.get(
        f"{BASE_URL}/alerts/{alert_id}",
        headers=auth_headers
    )
    assert get_deleted.status_code == 404
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_alerts_dashboard(auth_headers: Dict[str, str]):
    """Test the alerts dashboard endpoint."""
    # Create multiple test patients with alerts
    test_patients = []
    alert_ids = []
    
    for i in range(3):
        # Create patient
        patient_data = {
            "name": f"Dashboard Test Patient {i} - {datetime.now().isoformat()}",
            "idade": 50 + i*10,
            "sexo": "F" if i % 2 == 0 else "M",
            "diagnostico": f"Test Diagnosis {i}"
        }
        
        patient_response = requests.post(
            f"{BASE_URL}/patients/",
            json=patient_data,
            headers=auth_headers
        )
        assert patient_response.status_code == 201
        patient = patient_response.json()
        test_patients.append(patient)
        
        # Create alerts for this patient
        for severity in ["critical", "severe", "moderate"]:
            alert_data = {
                "patient_id": patient["patient_id"],
                "category": "Test Category",
                "parameter": f"Test Parameter {severity}",
                "message": f"Test alert message with {severity} severity",
                "severity": severity
            }
            
            alert_response = requests.post(
                f"{BASE_URL}/alerts/",
                json=alert_data,
                headers=auth_headers
            )
            assert alert_response.status_code == 201
            alert_ids.append(alert_response.json()["id"])
    
    # Get the alerts dashboard
    dashboard_response = requests.get(
        f"{BASE_URL}/alerts/dashboard",
        headers=auth_headers
    )
    assert dashboard_response.status_code == 200
    
    dashboard_data = dashboard_response.json()
    
    # Verify dashboard contains expected data
    assert "alerts_by_severity" in dashboard_data
    assert "critical_alerts_count" in dashboard_data
    assert "alerts_by_category" in dashboard_data
    assert "recent_alerts" in dashboard_data
    
    # Verify at least our test alerts are included
    assert dashboard_data["critical_alerts_count"] >= 3  # We created 3 critical alerts
    
    # Cleanup
    for patient in test_patients:
        requests.delete(
            f"{BASE_URL}/patients/{patient['patient_id']}",
            headers=auth_headers
        )
    
    for alert_id in alert_ids:
        requests.delete(
            f"{BASE_URL}/alerts/{alert_id}",
            headers=auth_headers
        )


if __name__ == "__main__":
    # This allows running the tests directly without pytest
    import sys
    
    # Setup
    headers = {"Authorization": f"Bearer {auth_token()}"}
    patient = test_patient(headers)
    pdf_data = lab_results_pdf()
    
    # Run tests
    test_lab_result_alert_generation(headers, patient, pdf_data)
    test_manual_alert_creation(headers, patient)
    test_alerts_dashboard(headers)
    
    print("All alert system tests passed!")
    sys.exit(0) 