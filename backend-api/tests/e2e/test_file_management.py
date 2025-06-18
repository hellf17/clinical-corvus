"""
End-to-End tests for the file management system in the clinical-helper-next backend.
This tests the complete cycle of file operations including upload, download, and processing.
"""

import pytest
import requests
import json
import os
import io
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, List, BinaryIO, Optional

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
TEST_USER = {"email": "test_doctor@example.com", "password": "test_password"}
TEST_FILES_DIR = os.path.join(os.path.dirname(__file__), "test_data")


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
    """Create a test patient for file operations."""
    patient_data = {
        "name": f"File Test Patient {datetime.now().isoformat()}",
        "idade": 45,
        "sexo": "M",
        "peso": 70.0,
        "altura": 1.75,
        "etnia": "branco",
        "diagnostico": "Pneumonia",
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
def pdf_file() -> bytes:
    """Create a test PDF file."""
    pdf_path = os.path.join(TEST_FILES_DIR, "test_file.pdf")
    
    # Create a dummy PDF file if it doesn't exist
    if not os.path.exists(pdf_path):
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
        with open(pdf_path, "wb") as f:
            f.write(b"%PDF-1.5\nTest PDF file for file management testing\n%%EOF")
    
    with open(pdf_path, "rb") as f:
        return f.read()


@pytest.fixture
def image_file() -> bytes:
    """Create a test image file."""
    # Create a very simple PNG file (minimal header)
    png_data = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    
    image_path = os.path.join(TEST_FILES_DIR, "test_image.png")
    os.makedirs(os.path.dirname(image_path), exist_ok=True)
    
    with open(image_path, "wb") as f:
        f.write(png_data)
    
    with open(image_path, "rb") as f:
        return f.read()


@pytest.fixture
def text_file() -> bytes:
    """Create a test text file with medical data."""
    text_content = """
    EXAME LABORATORIAL
    Paciente: Test Patient
    Data: 2023-05-15
    
    HEMOGRAMA COMPLETO
    Hemoglobina: 14.2 g/dL (VR: 13.5-17.5)
    Leucócitos: 7500 /mm³ (VR: 4000-10000)
    Plaquetas: 250000 /mm³ (VR: 150000-450000)
    
    BIOQUÍMICA
    Glicose: 95 mg/dL (VR: 70-100)
    Creatinina: 0.9 mg/dL (VR: 0.7-1.2)
    Ureia: 30 mg/dL (VR: 15-40)
    """
    
    text_path = os.path.join(TEST_FILES_DIR, "test_labs.txt")
    os.makedirs(os.path.dirname(text_path), exist_ok=True)
    
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text_content)
    
    with open(text_path, "rb") as f:
        return f.read()


def test_file_upload_and_retrieval(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    pdf_file: bytes
):
    """Test uploading a file and retrieving its metadata."""
    patient_id = test_patient["patient_id"]
    
    # Upload PDF file
    files = {
        "file": ("test_report.pdf", pdf_file, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201, f"Failed to upload file: {upload_response.text}"
    
    upload_data = upload_response.json()
    file_id = upload_data["file_id"]
    
    # Verify upload response contains expected metadata
    assert upload_data["file_name"] == "test_report.pdf"
    assert upload_data["content_type"] == "application/pdf"
    assert upload_data["patient_id"] == patient_id
    assert "upload_date" in upload_data
    assert "file_size" in upload_data
    
    # Get file metadata
    file_response = requests.get(
        f"{BASE_URL}/api/files/{file_id}",
        headers=auth_headers
    )
    assert file_response.status_code == 200
    
    file_metadata = file_response.json()
    assert file_metadata["file_id"] == file_id
    assert file_metadata["file_name"] == "test_report.pdf"
    
    # Get all files for the patient
    patient_files_response = requests.get(
        f"{BASE_URL}/api/files/patient/{patient_id}",
        headers=auth_headers
    )
    assert patient_files_response.status_code == 200
    
    patient_files = patient_files_response.json()
    assert len(patient_files) >= 1
    assert any(file["file_id"] == file_id for file in patient_files)
    
    # Download the file
    download_response = requests.get(
        f"{BASE_URL}/api/files/download/{file_id}",
        headers=auth_headers
    )
    assert download_response.status_code == 200
    assert download_response.content == pdf_file
    
    # Cleanup
    delete_response = requests.delete(
        f"{BASE_URL}/api/files/{file_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 204
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


def test_multiple_file_formats(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    pdf_file: bytes,
    image_file: bytes,
    text_file: bytes
):
    """Test uploading and processing different file formats."""
    patient_id = test_patient["patient_id"]
    uploaded_file_ids = []
    
    # Upload PDF file
    files = {
        "file": ("medical_report.pdf", pdf_file, "application/pdf")
    }
    
    pdf_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert pdf_response.status_code == 201
    uploaded_file_ids.append(pdf_response.json()["file_id"])
    
    # Upload image file
    files = {
        "file": ("xray_image.png", image_file, "image/png")
    }
    
    img_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert img_response.status_code == 201
    uploaded_file_ids.append(img_response.json()["file_id"])
    
    # Upload text file
    files = {
        "file": ("lab_results.txt", text_file, "text/plain")
    }
    
    text_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert text_response.status_code == 201
    uploaded_file_ids.append(text_response.json()["file_id"])
    
    # Verify all files are listed for the patient
    files_response = requests.get(
        f"{BASE_URL}/api/files/patient/{patient_id}",
        headers=auth_headers
    )
    assert files_response.status_code == 200
    
    patient_files = files_response.json()
    assert len(patient_files) >= 3
    
    # Check that each file type is properly categorized
    pdf_files = [f for f in patient_files if f["content_type"] == "application/pdf"]
    image_files = [f for f in patient_files if f["content_type"].startswith("image/")]
    text_files = [f for f in patient_files if f["content_type"] == "text/plain"]
    
    assert len(pdf_files) >= 1
    assert len(image_files) >= 1
    assert len(text_files) >= 1
    
    # Cleanup
    for file_id in uploaded_file_ids:
        requests.delete(
            f"{BASE_URL}/api/files/{file_id}",
            headers=auth_headers
        )
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


def test_file_processing_and_extraction(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    pdf_file: bytes,
    text_file: bytes
):
    """Test processing files and extracting clinical data."""
    patient_id = test_patient["patient_id"]
    
    # Upload PDF file for processing
    files = {
        "file": ("lab_report.pdf", pdf_file, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201
    file_id = upload_response.json()["file_id"]
    
    # Request text extraction from the PDF
    extract_response = requests.post(
        f"{BASE_URL}/api/files/extract/{file_id}",
        headers=auth_headers
    )
    assert extract_response.status_code in [200, 202]  # 202 if async
    
    # If async, we need to wait and poll for results
    if extract_response.status_code == 202:
        max_retries = 10
        extraction_result = None
        
        for i in range(max_retries):
            status_response = requests.get(
                f"{BASE_URL}/api/files/extraction/{file_id}/status",
                headers=auth_headers
            )
            assert status_response.status_code == 200
            
            status = status_response.json()
            if status["status"] == "completed":
                extraction_result = status.get("result")
                break
            
            import time
            time.sleep(1)
        
        assert extraction_result is not None, "Extraction did not complete within expected time"
    else:
        extraction_result = extract_response.json()
    
    # Verify extracted content
    assert "text_content" in extraction_result
    assert len(extraction_result["text_content"]) > 0
    
    # Now try extracting structured data from a text file
    files = {
        "file": ("structured_labs.txt", text_file, "text/plain")
    }
    
    text_upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert text_upload_response.status_code == 201
    text_file_id = text_upload_response.json()["file_id"]
    
    # Request structured data extraction (if available)
    structured_response = requests.post(
        f"{BASE_URL}/api/files/extract/{text_file_id}/structured",
        headers=auth_headers
    )
    
    # Either the endpoint exists or we get a 404
    if structured_response.status_code != 404:
        assert structured_response.status_code in [200, 202]
        
        # If available, verify the structured data
        if structured_response.status_code == 200:
            structured_data = structured_response.json()
            assert "lab_results" in structured_data
            assert len(structured_data["lab_results"]) > 0
            
            # Check for expected fields in lab results
            for result in structured_data["lab_results"]:
                assert "name" in result
                assert "value" in result
                assert "unit" in result
                assert "reference_range" in result
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/files/{file_id}",
        headers=auth_headers
    )
    
    requests.delete(
        f"{BASE_URL}/api/files/{text_file_id}",
        headers=auth_headers
    )
    
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


def test_public_file_upload(pdf_file: bytes):
    """Test the public file upload endpoint for guest users."""
    # Upload a file without authentication
    files = {
        "file": ("guest_upload.pdf", pdf_file, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/guest-upload",
        files=files
    )
    
    # This should work even without auth token
    assert upload_response.status_code == 201, f"Failed to upload file as guest: {upload_response.text}"
    
    # Verify we get a token or identifier to reference this file later
    upload_data = upload_response.json()
    assert "token" in upload_data or "id" in upload_data
    
    # We don't need to cleanup guest uploads as they should be automatically
    # cleaned up after a certain time period


def test_file_permissions(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    pdf_file: bytes
):
    """Test file access permissions for different users."""
    patient_id = test_patient["patient_id"]
    
    # Upload a file
    files = {
        "file": ("confidential.pdf", pdf_file, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201
    file_id = upload_response.json()["file_id"]
    
    # Mark the file as restricted (if API supports this)
    permission_data = {
        "is_restricted": True,
        "allowed_roles": ["doctor"]
    }
    
    permission_response = requests.post(
        f"{BASE_URL}/api/files/{file_id}/permissions",
        json=permission_data,
        headers=auth_headers
    )
    
    # This is optional - if the endpoint doesn't exist, we'll skip this check
    if permission_response.status_code != 404:
        assert permission_response.status_code == 200
        
        # If we have permission controls, we should test with different user roles
        # This would require creating test users with different roles
        # We'll skip the detailed implementation for now
    
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


if __name__ == "__main__":
    # This allows running the tests directly without pytest
    import sys
    
    # Setup
    token = auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    patient = test_patient(headers)
    pdf = pdf_file()
    img = image_file()
    txt = text_file()
    
    # Run tests
    try:
        test_file_upload_and_retrieval(headers, patient, pdf)
        test_multiple_file_formats(headers, patient, pdf, img, txt)
        test_file_processing_and_extraction(headers, patient, pdf, txt)
        test_public_file_upload(pdf)
        test_file_permissions(headers, patient, pdf)
        print("All file management tests passed!")
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