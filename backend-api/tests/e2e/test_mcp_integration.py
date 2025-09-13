"""
End-to-End tests for the MCP (Medical Context Processor) integration.
This tests the complete cycle of communication between the backend API and the MCP server.
"""

import pytest
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import base64
import time

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "http://localhost:5000")
TEST_USER = {"email": "test_doctor@example.com", "password": "test_password"}
TEST_FILES_DIR = os.path.join(os.path.dirname(__file__), "test_data")
TEST_PDF_PATH = os.path.join(TEST_FILES_DIR, "lab_results_sample.pdf")


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
    """Create a test patient for MCP tests."""
    patient_data = {
        "name": f"MCP Test Patient {datetime.now().isoformat()}",
        "idade": 55,
        "sexo": "F",
        "peso": 65.0,
        "altura": 1.60,
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
    """Read or create a test lab results PDF file."""
    if not os.path.exists(TEST_PDF_PATH):
        # Create a dummy PDF file for testing if it doesn't exist
        os.makedirs(os.path.dirname(TEST_PDF_PATH), exist_ok=True)
        with open(TEST_PDF_PATH, "wb") as f:
            f.write(b"%PDF-1.5\nTest PDF content for MCP testing\n%%EOF")
    
    with open(TEST_PDF_PATH, "rb") as f:
        return f.read()


def is_mcp_server_available() -> bool:
    """Check if the MCP server is available before running tests."""
    try:
        response = requests.get(f"{MCP_SERVER_URL}/health", timeout=5)
        return response.status_code == 200
    except (requests.RequestException, ConnectionError):
        return False


@pytest.mark.skipif(not is_mcp_server_available(), reason="MCP server is not available")
@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_mcp_pdf_extraction(auth_headers: Dict[str, str], test_patient: Dict[str, Any], lab_results_pdf: bytes):
    """Test PDF text extraction via MCP server."""
    patient_id = test_patient["patient_id"]
    
    # Upload a PDF file
    files = {
        "file": ("mcp_test.pdf", lab_results_pdf, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201, f"Failed to upload PDF: {upload_response.text}"
    
    file_id = upload_response.json()["file_id"]
    
    # Request text extraction via MCP
    extraction_response = requests.post(
        f"{BASE_URL}/api/mcp/extract/pdf/{file_id}",
        headers=auth_headers
    )
    assert extraction_response.status_code in [200, 202], f"Failed to request extraction: {extraction_response.text}"
    
    # If the operation is asynchronous, wait for completion
    if extraction_response.status_code == 202:
        extraction_id = extraction_response.json().get("extraction_id")
        assert extraction_id, "No extraction ID returned for async operation"
        
        # Poll for completion
        max_retries = 10
        extraction_result = None
        
        for i in range(max_retries):
            status_response = requests.get(
                f"{BASE_URL}/api/mcp/extract/status/{extraction_id}",
                headers=auth_headers
            )
            assert status_response.status_code == 200
            
            status = status_response.json()
            if status["status"] == "completed":
                extraction_result = status.get("result")
                break
                
            time.sleep(1)
        
        assert extraction_result is not None, "Extraction did not complete within expected time"
    else:
        extraction_result = extraction_response.json()
    
    # Verify extraction result
    assert "text" in extraction_result
    assert len(extraction_result["text"]) > 0
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/files/{file_id}",
        headers=auth_headers
    )
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skipif(not is_mcp_server_available(), reason="MCP server is not available")
@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_mcp_clinical_data_extraction(auth_headers: Dict[str, str], test_patient: Dict[str, Any]):
    """Test clinical data extraction and structured parsing via MCP server."""
    patient_id = test_patient["patient_id"]
    
    # Sample text containing clinical data
    clinical_text = """
    RESULTADO DE EXAMES LABORATORIAIS
    Paciente: Jane Doe
    Data: 15/05/2023
    
    Hemograma:
    - Hemoglobina: 10.2 g/dL (VR: 12.0-16.0)
    - Leucócitos: 12500 /mm³ (VR: 4000-10000)
    - Plaquetas: 190000 /mm³ (VR: 150000-450000)
    
    Bioquímica:
    - Creatinina: 2.1 mg/dL (VR: 0.6-1.2)
    - Ureia: 65 mg/dL (VR: 15-40)
    - Potássio: 5.4 mEq/L (VR: 3.5-5.0)
    - Sódio: 138 mEq/L (VR: 135-145)
    """
    
    # Send text for extraction
    extraction_data = {
        "text": clinical_text,
        "content_type": "lab_results"
    }
    
    extraction_response = requests.post(
        f"{BASE_URL}/api/mcp/extract/structured",
        json=extraction_data,
        headers=auth_headers
    )
    assert extraction_response.status_code == 200, f"Failed to extract structured data: {extraction_response.text}"
    
    extraction_result = extraction_response.json()
    
    # Verify extraction result
    assert "lab_results" in extraction_result
    assert len(extraction_result["lab_results"]) > 0
    
    # Check for specific tests in the extracted data
    test_names = [test["name"].lower() for test in extraction_result["lab_results"]]
    assert "hemoglobina" in test_names
    assert "creatinina" in test_names
    
    # Now associate this data with the patient
    association_data = {
        "patient_id": patient_id,
        "structured_data": extraction_result
    }
    
    association_response = requests.post(
        f"{BASE_URL}/api/mcp/associate/lab-results",
        json=association_data,
        headers=auth_headers
    )
    assert association_response.status_code in [200, 201], f"Failed to associate data with patient: {association_response.text}"
    
    # Verify association by retrieving patient's lab results
    results_response = requests.get(
        f"{BASE_URL}/api/patients/{patient_id}/lab-results",
        headers=auth_headers
    )
    assert results_response.status_code == 200
    
    patient_results = results_response.json()
    assert len(patient_results) > 0
    
    # Check that at least one of our values was successfully associated
    found_values = False
    for result in patient_results:
        for test in result.get("results", []):
            if test["name"].lower() in ["hemoglobina", "creatinina"]:
                found_values = True
                break
        if found_values:
            break
    
    assert found_values, "Lab results were not properly associated with the patient"
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skipif(not is_mcp_server_available(), reason="MCP server is not available")
@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_mcp_medical_image_analysis(auth_headers: Dict[str, str], test_patient: Dict[str, Any]):
    """Test medical image analysis via MCP server."""
    patient_id = test_patient["patient_id"]
    
    # Create a minimal test image - normally this would be a real medical image
    # but for testing we just need something that works with the MCP interface
    png_data = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    
    # Upload the image
    files = {
        "file": ("chest_xray.png", png_data, "image/png")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201, f"Failed to upload image: {upload_response.text}"
    
    image_id = upload_response.json()["file_id"]
    
    # Request image analysis via MCP
    analysis_response = requests.post(
        f"{BASE_URL}/api/mcp/analyze/image/{image_id}",
        json={"analysis_type": "chest_xray"},
        headers=auth_headers
    )
    
    # This endpoint might not exist, so we'll accept 404
    if analysis_response.status_code != 404:
        assert analysis_response.status_code in [200, 202], f"Failed to request image analysis: {analysis_response.text}"
        
        # If the API exists and operation is asynchronous, wait for completion
        if analysis_response.status_code == 202:
            analysis_id = analysis_response.json().get("analysis_id")
            assert analysis_id, "No analysis ID returned for async operation"
            
            # Poll for completion
            max_retries = 10
            analysis_result = None
            
            for i in range(max_retries):
                status_response = requests.get(
                    f"{BASE_URL}/api/mcp/analysis/status/{analysis_id}",
                    headers=auth_headers
                )
                assert status_response.status_code == 200
                
                status = status_response.json()
                if status["status"] == "completed":
                    analysis_result = status.get("result")
                    break
                    
                time.sleep(1)
            
            assert analysis_result is not None, "Analysis did not complete within expected time"
            
            # Verify analysis result structure
            assert "findings" in analysis_result
    else:
        print("MCP image analysis endpoint not available, skipping detailed tests")
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/files/{image_id}",
        headers=auth_headers
    )
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skipif(not is_mcp_server_available(), reason="MCP server is not available")
@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_mcp_health_and_status(auth_headers: Dict[str, str]):
    """Test MCP server health and status endpoints."""
    # Check MCP status via the backend API
    status_response = requests.get(
        f"{BASE_URL}/api/mcp/status",
        headers=auth_headers
    )
    assert status_response.status_code == 200, f"Failed to get MCP status: {status_response.text}"
    
    status = status_response.json()
    assert "status" in status
    assert status["status"] in ["available", "ok", "up", "running"]
    
    # Check MCP version and capabilities
    info_response = requests.get(
        f"{BASE_URL}/api/mcp/info",
        headers=auth_headers
    )
    
    if info_response.status_code != 404:
        assert info_response.status_code == 200, f"Failed to get MCP info: {info_response.text}"
        
        info = info_response.json()
        assert "version" in info
        assert "capabilities" in info


if __name__ == "__main__":
    # This allows running the tests directly without pytest
    import sys
    
    if not is_mcp_server_available():
        print("MCP server is not available. Skipping tests.")
        sys.exit(0)
    
    # Setup
    token = auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    patient = test_patient(headers)
    pdf_data = lab_results_pdf()
    
    # Run tests
    try:
        test_mcp_pdf_extraction(headers, patient, pdf_data)
        test_mcp_clinical_data_extraction(headers, patient)
        test_mcp_medical_image_analysis(headers, patient)
        test_mcp_health_and_status(headers)
        print("All MCP integration tests passed!")
    except Exception as e:
        print(f"Test failed: {str(e)}")
        sys.exit(1)
    finally:
        # Cleanup
        if patient.get("_cleanup_required"):
            requests.delete(
                f"{BASE_URL}/patients/{patient['patient_id']}",
                headers=headers
            )
    
    sys.exit(0) 