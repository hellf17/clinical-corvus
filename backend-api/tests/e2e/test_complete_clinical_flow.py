"""
End-to-End test for the complete clinical flow in the clinical-helper-next backend.
This tests the end-to-end patient journey from admission to discharge, including
all major API interactions that would occur in a real clinical scenario.
"""

import pytest
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time

# Configuration for tests - would be loaded from environment variables in real setup
BASE_URL = "http://localhost:8000"
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
def lab_results_pdf() -> bytes:
    """Read or create a test lab results PDF file."""
    if not os.path.exists(TEST_PDF_PATH):
        # Create a dummy PDF file for testing if it doesn't exist
        os.makedirs(os.path.dirname(TEST_PDF_PATH), exist_ok=True)
        with open(TEST_PDF_PATH, "wb") as f:
            f.write(b"%PDF-1.5\nTest PDF content for clinical flow testing\n%%EOF")
    
    with open(TEST_PDF_PATH, "rb") as f:
        return f.read()


def test_complete_clinical_flow(auth_headers: Dict[str, str], lab_results_pdf: bytes):
    """
    Test the complete clinical flow from patient admission to discharge.
    
    This test simulates a real clinical workflow:
    1. Patient registration (admission)
    2. Initial clinical note entry
    3. Lab results upload and analysis
    4. Medication prescription
    5. Alert generation and response
    6. Follow-up note and monitoring
    7. AI chat consultation
    8. Final assessment and discharge planning
    """
    # Step 1: Patient registration
    print("\n--- STEP 1: Patient Registration ---")
    
    admission_date = datetime.now()
    patient_data = {
        "name": f"Clinical Flow Test Patient {admission_date.isoformat()}",
        "idade": 68,
        "sexo": "M",
        "peso": 82.5,
        "altura": 1.75,
        "etnia": "branco",
        "diagnostico": "Suspected Sepsis, Pneumonia",
        "data_internacao": admission_date.isoformat()
    }
    
    patient_response = requests.post(
        f"{BASE_URL}/patients/",
        json=patient_data,
        headers=auth_headers
    )
    assert patient_response.status_code == 201, f"Failed to create patient: {patient_response.text}"
    
    patient = patient_response.json()
    patient_id = patient["patient_id"]
    print(f"Created patient with ID: {patient_id}")
    
    # Step 2: Initial clinical note
    print("\n--- STEP 2: Initial Clinical Note ---")
    
    initial_note = {
        "title": "Initial Assessment",
        "content": """
        Patient presented to the ER with fever (39.2°C), productive cough, and shortness of breath for 3 days.
        Oxygen saturation 92% on room air. Decreased breath sounds in right lower lobe.
        Patient appears acutely ill with tachypnea and tachycardia.
        Initial assessment suggests community-acquired pneumonia with possible sepsis.
        Plan: CBC, BMP, blood cultures, chest X-ray, broad-spectrum antibiotics.
        """,
        "note_type": "assessment"
    }
    
    note_response = requests.post(
        f"{BASE_URL}/api/clinical-notes/patient/{patient_id}",
        json=initial_note,
        headers=auth_headers
    )
    assert note_response.status_code == 201, f"Failed to create clinical note: {note_response.text}"
    
    note_id = note_response.json()["id"]
    print(f"Created initial clinical note with ID: {note_id}")
    
    # Step 3: Lab results upload and analysis
    print("\n--- STEP 3: Lab Results Upload and Analysis ---")
    
    # 3.1: Upload lab results
    files = {
        "file": ("admission_labs.pdf", lab_results_pdf, "application/pdf")
    }
    
    upload_response = requests.post(
        f"{BASE_URL}/api/files/upload/{patient_id}",
        files=files,
        headers=auth_headers
    )
    assert upload_response.status_code == 201, f"Failed to upload lab results: {upload_response.text}"
    
    file_id = upload_response.json()["file_id"]
    print(f"Uploaded lab results file with ID: {file_id}")
    
    # 3.2: Manual entry of critical lab values (mimicking extracted data)
    lab_data = {
        "patient_id": patient_id,
        "date": admission_date.isoformat(),
        "results": [
            {
                "name": "WBC",
                "value": 18.5,
                "unit": "10^3/μL",
                "reference_range": "4.5-11.0"
            },
            {
                "name": "Neutrophils",
                "value": 85,
                "unit": "%",
                "reference_range": "40-70"
            },
            {
                "name": "Lymphocytes",
                "value": 8,
                "unit": "%",
                "reference_range": "20-40"
            },
            {
                "name": "CRP",
                "value": 220,
                "unit": "mg/L",
                "reference_range": "0-5"
            },
            {
                "name": "Procalcitonin",
                "value": 2.8,
                "unit": "ng/mL",
                "reference_range": "<0.5"
            },
            {
                "name": "Lactate",
                "value": 3.2,
                "unit": "mmol/L",
                "reference_range": "0.5-2.0"
            },
            {
                "name": "Creatinine",
                "value": 1.7,
                "unit": "mg/dL",
                "reference_range": "0.7-1.3"
            }
        ]
    }
    
    lab_response = requests.post(
        f"{BASE_URL}/api/patients/{patient_id}/lab-results",
        json=lab_data,
        headers=auth_headers
    )
    assert lab_response.status_code in [200, 201], f"Failed to add lab results: {lab_response.text}"
    print("Added critical lab values to patient record")
    
    # 3.3: Request analysis of lab results
    analysis_response = requests.post(
        f"{BASE_URL}/api/analyze/sepsis",
        json={"patient_id": patient_id},
        headers=auth_headers
    )
    assert analysis_response.status_code == 200, f"Failed to analyze for sepsis: {analysis_response.text}"
    
    analysis_result = analysis_response.json()
    print(f"Sepsis analysis result: {analysis_result.get('severity', 'Unknown')} severity")
    
    # Step 4: Medication prescription
    print("\n--- STEP 4: Medication Prescription ---")
    
    medications = [
        {
            "name": "Ceftriaxone",
            "dosage": "2g",
            "frequency": "q24h",
            "route": "IV",
            "start_date": admission_date.isoformat(),
            "status": "active"
        },
        {
            "name": "Azithromycin",
            "dosage": "500mg",
            "frequency": "q24h",
            "route": "IV",
            "start_date": admission_date.isoformat(),
            "status": "active"
        },
        {
            "name": "Normal Saline",
            "dosage": "1000mL",
            "frequency": "q8h",
            "route": "IV",
            "start_date": admission_date.isoformat(),
            "status": "active"
        }
    ]
    
    for medication in medications:
        med_response = requests.post(
            f"{BASE_URL}/api/patients/{patient_id}/medications",
            json=medication,
            headers=auth_headers
        )
        assert med_response.status_code == 201, f"Failed to add medication {medication['name']}: {med_response.text}"
    
    print(f"Prescribed {len(medications)} medications for the patient")
    
    # Step 5: Monitor for alerts
    print("\n--- STEP 5: Alert Generation and Response ---")
    
    # Wait briefly for alert generation (may be async)
    time.sleep(2)
    
    # 5.1: Check for alerts
    alerts_response = requests.get(
        f"{BASE_URL}/api/alerts/patient/{patient_id}",
        headers=auth_headers
    )
    assert alerts_response.status_code == 200, f"Failed to get alerts: {alerts_response.text}"
    
    alerts = alerts_response.json()
    print(f"Found {len(alerts)} alerts for the patient")
    
    # 5.2: Acknowledge critical alerts
    for alert in alerts:
        if alert.get("severity") in ["critical", "severe"]:
            ack_response = requests.post(
                f"{BASE_URL}/api/alerts/{alert['id']}/acknowledge",
                json={"acknowledged_by": "test_doctor"},
                headers=auth_headers
            )
            assert ack_response.status_code == 200, f"Failed to acknowledge alert: {ack_response.text}"
            print(f"Acknowledged critical alert: {alert.get('message', 'Unknown alert')}")
    
    # Step 6: Follow-up note and monitoring
    print("\n--- STEP 6: Follow-up Note and Monitoring ---")
    
    # 6.1: Add follow-up clinical note (24 hours later)
    followup_date = admission_date + timedelta(hours=24)
    
    followup_note = {
        "title": "24-Hour Follow-up",
        "content": """
        Patient shows partial improvement after 24 hours of antibiotic therapy.
        Temperature decreased to 38.1°C. Oxygen saturation improved to 94% on 2L NC.
        Still tachycardic but blood pressure has normalized.
        Repeat labs show WBC decreased to 14.2, lactate decreased to 2.1.
        Continue current management and monitor closely.
        """,
        "note_type": "progress",
        "date": followup_date.isoformat()
    }
    
    note_response = requests.post(
        f"{BASE_URL}/api/clinical-notes/patient/{patient_id}",
        json=followup_note,
        headers=auth_headers
    )
    assert note_response.status_code == 201, f"Failed to create follow-up note: {note_response.text}"
    print("Added 24-hour follow-up note")
    
    # 6.2: Add updated lab values
    followup_labs = {
        "patient_id": patient_id,
        "date": followup_date.isoformat(),
        "results": [
            {
                "name": "WBC",
                "value": 14.2,
                "unit": "10^3/μL",
                "reference_range": "4.5-11.0"
            },
            {
                "name": "Neutrophils",
                "value": 80,
                "unit": "%",
                "reference_range": "40-70"
            },
            {
                "name": "CRP",
                "value": 150,
                "unit": "mg/L",
                "reference_range": "0-5"
            },
            {
                "name": "Lactate",
                "value": 2.1,
                "unit": "mmol/L",
                "reference_range": "0.5-2.0"
            },
            {
                "name": "Creatinine",
                "value": 1.4,
                "unit": "mg/dL",
                "reference_range": "0.7-1.3"
            }
        ]
    }
    
    labs_response = requests.post(
        f"{BASE_URL}/api/patients/{patient_id}/lab-results",
        json=followup_labs,
        headers=auth_headers
    )
    assert labs_response.status_code in [200, 201], f"Failed to add follow-up labs: {labs_response.text}"
    print("Added 24-hour follow-up lab values")
    
    # 6.3: Check for improvement in clinical status
    trend_response = requests.get(
        f"{BASE_URL}/api/analyze/trends/{patient_id}?parameter=Lactate",
        headers=auth_headers
    )
    
    if trend_response.status_code == 200:
        trend_data = trend_response.json()
        print(f"Lactate trend: {trend_data.get('trend', {}).get('direction', 'Unknown')}")
    
    # Step 7: AI chat consultation
    print("\n--- STEP 7: AI Chat Consultation ---")
    
    # 7.1: Create a conversation with patient context
    conversation_data = {
        "title": f"Consultation for Patient {patient['name']}",
        "patient_id": patient_id
    }
    
    chat_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations",
        json=conversation_data,
        headers=auth_headers
    )
    assert chat_response.status_code == 201, f"Failed to create chat conversation: {chat_response.text}"
    
    conversation_id = chat_response.json()["id"]
    print(f"Created chat consultation with ID: {conversation_id}")
    
    # 7.2: Ask the AI assistant about patient management
    message_data = {
        "content": "Based on this patient's presentation and clinical course, what are your recommendations for ongoing management?",
        "role": "user"
    }
    
    message_response = requests.post(
        f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}/messages",
        json=message_data,
        headers=auth_headers
    )
    assert message_response.status_code == 201, f"Failed to send message: {message_response.text}"
    
    # 7.3: Wait for AI response and retrieve it
    max_retries = 10
    for i in range(max_retries):
        conversation_response = requests.get(
            f"{BASE_URL}/api/ai-chat/conversations/{conversation_id}",
            headers=auth_headers
        )
        
        messages = conversation_response.json().get("messages", [])
        assistant_messages = [m for m in messages if m.get("role") == "assistant"]
        
        if assistant_messages:
            assistant_message = assistant_messages[0]["content"]
            print(f"Received AI recommendation: {assistant_message[:100]}...")  # Print first 100 chars
            break
            
        time.sleep(1)
    
    # Step 8: Final assessment and discharge planning
    print("\n--- STEP 8: Final Assessment and Discharge Planning ---")
    
    # 8.1: Update patient status (improved)
    discharge_date = admission_date + timedelta(days=5)
    
    update_data = {
        "status": "improved",
        "discharge_date": discharge_date.isoformat(),
        "discharge_diagnosis": "Resolved Pneumonia with Sepsis",
        "discharge_plan": "Complete 7-day course of oral antibiotics at home, follow-up in 1 week"
    }
    
    update_response = requests.patch(
        f"{BASE_URL}/patients/{patient_id}",
        json=update_data,
        headers=auth_headers
    )
    assert update_response.status_code == 200, f"Failed to update patient status: {update_response.text}"
    print("Updated patient status for discharge planning")
    
    # 8.2: Add discharge clinical note
    discharge_note = {
        "title": "Discharge Summary",
        "content": f"""
        Patient admitted on {admission_date.strftime('%Y-%m-%d')} with pneumonia and sepsis.
        Treated with IV antibiotics and supportive care.
        Clinical improvement noted with normalization of vital signs and improvement in inflammatory markers.
        Discharge diagnosis: Resolved pneumonia with sepsis.
        Discharge medications: Amoxicillin-clavulanate 875/125mg BID for 7 days.
        Follow-up with primary care in 1 week.
        Return precautions reviewed with patient.
        """,
        "note_type": "discharge",
        "date": discharge_date.isoformat()
    }
    
    discharge_response = requests.post(
        f"{BASE_URL}/api/clinical-notes/patient/{patient_id}",
        json=discharge_note,
        headers=auth_headers
    )
    assert discharge_response.status_code == 201, f"Failed to create discharge note: {discharge_response.text}"
    print("Added discharge summary note")
    
    # 8.3: Update medications (stop IV meds, start discharge meds)
    # Stop current medications
    meds_response = requests.get(
        f"{BASE_URL}/api/patients/{patient_id}/medications",
        headers=auth_headers
    )
    
    if meds_response.status_code == 200:
        current_meds = meds_response.json()
        for med in current_meds:
            # Stop current IV meds
            if med.get("route") == "IV" and med.get("status") == "active":
                stop_med_response = requests.patch(
                    f"{BASE_URL}/api/medications/{med['id']}",
                    json={"status": "discontinued", "end_date": discharge_date.isoformat()},
                    headers=auth_headers
                )
                assert stop_med_response.status_code == 200, f"Failed to stop medication: {stop_med_response.text}"
    
    # Add discharge medication
    discharge_med = {
        "name": "Amoxicillin-clavulanate",
        "dosage": "875/125mg",
        "frequency": "BID",
        "route": "PO",
        "start_date": discharge_date.isoformat(),
        "end_date": (discharge_date + timedelta(days=7)).isoformat(),
        "status": "active"
    }
    
    discharge_med_response = requests.post(
        f"{BASE_URL}/api/patients/{patient_id}/medications",
        json=discharge_med,
        headers=auth_headers
    )
    assert discharge_med_response.status_code == 201, f"Failed to add discharge medication: {discharge_med_response.text}"
    print("Updated medications for discharge")
    
    # Verify the complete patient record
    print("\n--- Verifying Complete Patient Record ---")
    
    full_record_response = requests.get(
        f"{BASE_URL}/patients/{patient_id}/full",
        headers=auth_headers
    )
    
    if full_record_response.status_code == 200:
        full_record = full_record_response.json()
        print(f"Complete patient record retrieved successfully.")
        print(f"Clinical notes: {len(full_record.get('clinical_notes', []))}")
        print(f"Lab results: {len(full_record.get('lab_results', []))}")
        print(f"Medications: {len(full_record.get('medications', []))}")
        print(f"Files: {len(full_record.get('files', []))}")
        print(f"Alerts: {len(full_record.get('alerts', []))}")
    
    # Clean up (optional, comment out to keep the test record)
    print("\n--- Cleaning Up Test Data ---")
    cleanup_response = requests.delete(
        f"{BASE_URL}/patients/{patient_id}",
        headers=auth_headers
    )
    assert cleanup_response.status_code == 204, f"Failed to clean up patient data: {cleanup_response.text}"
    print(f"Successfully cleaned up patient data")
    
    print("\n--- Complete Clinical Flow Test Completed Successfully ---")


if __name__ == "__main__":
    # This allows running the test directly without pytest
    import sys
    
    try:
        token = auth_token()
        headers = {"Authorization": f"Bearer {token}"}
        pdf_data = lab_results_pdf()
        
        test_complete_clinical_flow(headers, pdf_data)
        print("Complete clinical flow test passed successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"Test failed: {str(e)}")
        sys.exit(1) 