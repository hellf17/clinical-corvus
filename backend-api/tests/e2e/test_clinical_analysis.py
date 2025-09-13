"""
End-to-End tests for the clinical analysis workflow in the clinical-helper-next backend.
This tests the complete cycle of uploading exam data, processing analysis, and generating recommendations.
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
TEST_TXT_PATH = os.path.join(os.path.dirname(__file__), "test_data", "lab_results_sample.txt")


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
    """Create a test patient for analysis testing."""
    patient_data = {
        "name": f"Analysis Test Patient {datetime.now().isoformat()}",
        "idade": 58,
        "sexo": "M",
        "peso": 75.0,
        "altura": 1.72,
        "etnia": "branco",
        "diagnostico": "Suspected Liver Disease, Hypertension",
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
            f.write(b"%PDF-1.5\nTest PDF content for lab results\n%%EOF")
    
    with open(TEST_PDF_PATH, "rb") as f:
        return f.read()


@pytest.fixture
def lab_results_text() -> str:
    """Read test lab results text file."""
    if not os.path.exists(TEST_TXT_PATH):
        # Create a dummy text file for testing if it doesn't exist
        with open(TEST_TXT_PATH, "w") as f:
            f.write("""
            EXAME LABORATORIAL
            Paciente: Test Patient
            Data: 2023-05-01
            
            HEMOGRAMA COMPLETO
            Hemoglobina: 9.5 g/dL (VR: 13.5-17.5)
            Leucócitos: 15000 /mm³ (VR: 4000-10000)
            Plaquetas: 350000 /mm³ (VR: 150000-450000)
            
            FUNÇÃO HEPÁTICA
            ALT: 145 U/L (VR: 7-56)
            AST: 135 U/L (VR: 5-40)
            Bilirrubina Total: 2.5 mg/dL (VR: 0.2-1.2)
            
            FUNÇÃO RENAL
            Creatinina: 1.3 mg/dL (VR: 0.7-1.2)
            Ureia: 45 mg/dL (VR: 15-40)
            """)
    
    with open(TEST_TXT_PATH, "r") as f:
        return f.read()


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_pdf_upload_and_analysis(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    lab_results_pdf: bytes
):
    """Test uploading a PDF with lab results and generating clinical analysis."""
    patient_id = test_patient["patient_id"]
    
    # Upload the PDF file
    files = {
        "file": ("lab_results.pdf", lab_results_pdf, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201, f"Failed to upload PDF: {upload_response.text}"
    
    file_data = upload_response.json()
    file_id = file_data["file_id"]
    
    # Request analysis of the uploaded file
    analysis_response = requests.post(
        f"{BASE_URL}/api/analyze/file/{file_id}",
        headers=auth_headers
    )
    assert analysis_response.status_code == 200, f"Failed to analyze file: {analysis_response.text}"
    
    analysis_result = analysis_response.json()
    
    # Verify analysis results contain expected fields
    assert "summary" in analysis_result, "Analysis should contain a summary"
    assert "findings" in analysis_result, "Analysis should contain findings"
    assert "abnormal_results" in analysis_result, "Analysis should identify abnormal results"
    
    # Check if the specific critical abnormalities were detected (based on test file data)
    abnormal_parameters = [finding["parameter"] for finding in analysis_result["findings"]]
    
    # The PDF file should have liver function abnormalities according to our test file
    assert any("ALT" in param or "AST" in param or "liver" in param.lower() for param in abnormal_parameters), \
        "Analysis should detect liver abnormalities from test data"
    
    # Verify recommendations were generated
    assert "recommendations" in analysis_result, "Analysis should provide clinical recommendations"
    assert len(analysis_result["recommendations"]) > 0, "At least one recommendation should be provided"
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_text_based_analysis(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any],
    lab_results_text: str
):
    """Test direct text-based analysis of lab results."""
    patient_id = test_patient["patient_id"]
    
    # Send the text directly for analysis
    analysis_data = {
        "patient_id": patient_id,
        "text_content": lab_results_text,
        "content_type": "lab_results"
    }
    
    analysis_response = requests.post(
        f"{BASE_URL}/api/analyze/text",
        json=analysis_data,
        headers=auth_headers
    )
    assert analysis_response.status_code == 200, f"Failed to analyze text: {analysis_response.text}"
    
    analysis_result = analysis_response.json()
    
    # Verify analysis results for text-based input
    assert "summary" in analysis_result, "Text analysis should contain a summary"
    assert "findings" in analysis_result, "Text analysis should contain findings"
    
    # Check if the specific critical values were detected (based on test data)
    # In our sample text data we have low hemoglobin and elevated liver enzymes
    abnormal_parameters = [finding["parameter"] for finding in analysis_result["findings"]]
    
    assert any("hemoglobin" in param.lower() or "anemia" in param.lower() for param in abnormal_parameters), \
        "Analysis should detect anemia from test data"
    
    assert any("alt" in param.lower() or "ast" in param.lower() or "liver" in param.lower() 
              for param in abnormal_parameters), \
        "Analysis should detect liver abnormalities from test data"
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_analysis_specific_modules(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any]
):
    """Test specific analysis modules for different medical systems."""
    patient_id = test_patient["patient_id"]
    
    # Test data for each specific module
    test_modules = [
        {
            "module": "hepatic",
            "data": {
                "patient_id": patient_id,
                "lab_results": {
                    "ALT": 145,  # U/L, elevated
                    "AST": 135,  # U/L, elevated
                    "ALP": 210,  # U/L, elevated
                    "Bilirubin_Total": 2.5,  # mg/dL, elevated
                    "Bilirubin_Direct": 1.8,  # mg/dL, elevated
                    "Albumin": 3.0,  # g/dL, low
                    "PT": 16.5  # seconds, prolonged
                }
            },
            "expected_conditions": ["liver dysfunction", "hepatocellular damage", "cholestasis"]
        },
        {
            "module": "renal",
            "data": {
                "patient_id": patient_id,
                "lab_results": {
                    "Creatinine": 2.3,  # mg/dL, elevated
                    "BUN": 65,  # mg/dL, elevated
                    "eGFR": 35,  # mL/min, decreased
                    "Sodium": 133,  # mEq/L, low normal
                    "Potassium": 5.7,  # mEq/L, elevated
                    "Phosphorus": 4.9,  # mg/dL, elevated
                    "Calcium": 8.3  # mg/dL, low normal
                }
            },
            "expected_conditions": ["renal dysfunction", "kidney"]
        },
        {
            "module": "hematology",
            "data": {
                "patient_id": patient_id,
                "lab_results": {
                    "Hemoglobin": 9.5,  # g/dL, low
                    "Hematocrit": 28,  # %, low
                    "WBC": 15000,  # /mm³, elevated
                    "Platelets": 80000,  # /mm³, low
                    "Neutrophils": 75,  # %, elevated
                    "Lymphocytes": 15,  # %, decreased
                    "MCV": 102  # fL, elevated
                }
            },
            "expected_conditions": ["anemia", "thrombocytopenia", "leukocytosis", "neutrophilia"]
        }
    ]
    
    for test_case in test_modules:
        module = test_case["module"]
        data = test_case["data"]
        expected_conditions = test_case["expected_conditions"]
        
        # Call the specific analysis module
        analysis_response = requests.post(
            f"{BASE_URL}/api/analyze/{module}",
            json=data,
            headers=auth_headers
        )
        assert analysis_response.status_code == 200, \
            f"Failed to analyze with {module} module: {analysis_response.text}"
        
        analysis_result = analysis_response.json()
        
        # Verify module-specific analysis results
        assert "summary" in analysis_result, f"{module} analysis should contain a summary"
        assert "findings" in analysis_result, f"{module} analysis should contain findings"
        assert "severity" in analysis_result, f"{module} analysis should provide severity assessment"
        
        # Check for expected conditions in the analysis
        result_text = json.dumps(analysis_result).lower()
        for condition in expected_conditions:
            assert condition in result_text, \
                f"{module} analysis should detect '{condition}' with the provided test data"
    
    # Cleanup
    if test_patient.get("_cleanup_required"):
        requests.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers=auth_headers
        )


@pytest.mark.skip(reason="E2E test requires a running backend environment")
def test_trend_analysis(
    auth_headers: Dict[str, str], 
    test_patient: Dict[str, Any]
):
    """Test trend analysis for a series of lab results over time."""
    patient_id = test_patient["patient_id"]
    
    # Create a series of lab results with timestamps
    today = datetime.now()
    
    # Simulate deteriorating renal function over time
    lab_series = [
        {
            "date": (today - timedelta(days=30)).isoformat(),
            "lab_results": {
                "Creatinine": 1.1,  # mg/dL, normal
                "BUN": 18,  # mg/dL, normal
                "eGFR": 90,  # mL/min, normal
                "Sodium": 140,  # mEq/L, normal
                "Potassium": 4.1  # mEq/L, normal
            }
        },
        {
            "date": (today - timedelta(days=15)).isoformat(),
            "lab_results": {
                "Creatinine": 1.4,  # mg/dL, slightly elevated
                "BUN": 28,  # mg/dL, slightly elevated
                "eGFR": 70,  # mL/min, slightly decreased
                "Sodium": 138,  # mEq/L, normal
                "Potassium": 4.4  # mEq/L, normal
            }
        },
        {
            "date": today.isoformat(),
            "lab_results": {
                "Creatinine": 2.3,  # mg/dL, elevated
                "BUN": 45,  # mg/dL, elevated
                "eGFR": 45,  # mL/min, decreased
                "Sodium": 135,  # mEq/L, low normal
                "Potassium": 5.2  # mEq/L, elevated
            }
        }
    ]
    
    # Upload each set of lab results
    for lab_entry in lab_series:
        result_data = {
            "patient_id": patient_id,
            "date": lab_entry["date"],
            "results": [
                {
                    "name": param,
                    "value": value,
                    "unit": "standard",  # simplified for test
                    "reference_range": "standard"  # simplified for test
                }
                for param, value in lab_entry["lab_results"].items()
            ]
        }
        
        # Add results to patient record
        results_response = requests.post(
            f"{BASE_URL}/api/patients/{patient_id}/lab-results",
            json=result_data,
            headers=auth_headers
        )
        assert results_response.status_code in [200, 201], \
            f"Failed to add lab results: {results_response.text}"
    
    # Perform trend analysis
    trend_response = requests.get(
        f"{BASE_URL}/api/analyze/trends/{patient_id}?parameter=Creatinine",
        headers=auth_headers
    )
    assert trend_response.status_code == 200, f"Failed to get trend analysis: {trend_response.text}"
    
    trend_result = trend_response.json()
    
    # Verify trend analysis results
    assert "trend" in trend_result, "Trend analysis should identify a trend"
    assert trend_result["trend"]["direction"] == "increasing", \
        "Trend analysis should detect increasing creatinine levels"
    assert "severity" in trend_result, "Trend analysis should assess severity"
    assert "recommendations" in trend_result, "Trend analysis should provide recommendations"
    
    # Cleanup
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
    pdf_data = lab_results_pdf()
    text_data = lab_results_text()
    
    # Run tests
    try:
        test_pdf_upload_and_analysis(headers, patient, pdf_data)
        test_text_based_analysis(headers, patient, text_data)
        test_analysis_specific_modules(headers, patient)
        test_trend_analysis(headers, patient)
        print("All clinical analysis tests passed!")
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