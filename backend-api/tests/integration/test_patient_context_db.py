import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.patient_context_manager import PatientContextManager
from database.models import Patient as PatientModel
from database.models import LabResult as LabResultModel
from database.models import Medication as MedicationModel
from database.models import ClinicalNote as ClinicalNoteModel
from datetime import datetime

# Fixture to mock the database session and PatientService
@pytest.fixture(autouse=True)
def mock_db_and_patient_service():
    with patch('backend-api.services.patient_context_manager.get_db') as mock_get_db, \
         patch('backend-api.services.patient_context_manager.PatientService') as MockPatientService_cls:
        
        # Mock a database session
        mock_db_session = MagicMock()
        mock_get_db.return_value.__enter__.return_value = mock_db_session

        # Mock PatientService methods
        mock_patient_service_instance = AsyncMock()
        
        # Mock return values for PatientService
        mock_patient_service_instance.get_patient = AsyncMock(return_value=PatientModel(
            id="db_patient_id",
            first_name="Jane",
            last_name="Doe",
            age=35,
            gender="female",
            primary_diagnosis="Diabetes",
            date_of_birth=datetime(1989, 5, 15).date(),
            allergies=["Penicillin"],
            medical_history=["Gestational Diabetes"],
            emergency_contact={"name": "John Doe", "phone": "555-5678"}
        ))
        mock_patient_service_instance.get_patient_labs = AsyncMock(return_value=[
            LabResultModel(id="lab1", test_name="Glucose", value=180, reference_range="70-110", units="mg/dL", date_collected=datetime(2024, 1, 1).date(), is_abnormal=True, status="abnormal"),
            LabResultModel(id="lab2", test_name="HbA1c", value=8.5, reference_range="4.0-6.0", units="%", date_collected=datetime(2024, 1, 1).date(), is_abnormal=True, status="abnormal")
        ])
        mock_patient_service_instance.get_patient_medications = AsyncMock(return_value=[
            MedicationModel(id="med1", name="Metformin", dosage="500mg", frequency="BID", route="PO", start_date=datetime(2023, 1, 1).date(), status="active", high_risk=False),
            MedicationModel(id="med2", name="Insulin", dosage="10 units", frequency="Daily", route="SC", start_date=datetime(2023, 6, 1).date(), status="active", high_risk=True)
        ])
        mock_patient_service_instance.get_patient_notes = AsyncMock(return_value=[
            ClinicalNoteModel(id="note1", summary="Patient reports increased thirst.", note_type="progress", created_at=datetime(2024, 1, 10), author="Dr. A", priority="normal"),
            ClinicalNoteModel(id="note2", summary="Reviewed lab results, adjusted insulin dose.", note_type="plan", created_at=datetime(2024, 1, 15), author="Dr. A", priority="high")
        ])
        
        MockPatientService_cls.return_value = mock_patient_service_instance

        yield {
            "mock_db_session": mock_db_session,
            "mock_patient_service_instance": mock_patient_service_instance
        }

@pytest.fixture
def patient_context_manager_db():
    # Instantiate PatientContextManager, which will use the mocked PatientService
    return PatientContextManager()

@pytest.mark.asyncio
async def test_get_patient_context_db_integration(patient_context_manager_db, mock_db_and_patient_service):
    patient_id = "db_patient_id"
    user_id = "db_user_id"

    context = await patient_context_manager_db.get_patient_context(patient_id, user_id)

    # Assertions to check if the mocked PatientService methods were called
    mock_db_and_patient_service["mock_patient_service_instance"].get_patient.assert_called_once_with(patient_id, user_id)
    mock_db_and_patient_service["mock_patient_service_instance"].get_patient_labs.assert_called_once_with(patient_id, limit=10)
    mock_db_and_patient_service["mock_patient_service_instance"].get_patient_medications.assert_called_once_with(patient_id)
    mock_db_and_patient_service["mock_patient_service_instance"].get_patient_notes.assert_called_once_with(patient_id, limit=5)

    # Assertions to check the structure and content of the returned context
    assert context["patient_id"] == patient_id
    assert context["demographics"]["first_name"] == "Jane"
    assert len(context["recent_labs"]) == 2
    assert context["recent_labs"][0]["test_name"] == "Glucose"
    assert len(context["medications"]) == 2
    assert context["medications"][0]["name"] == "Metformin"
    assert len(context["recent_notes"]) == 2
    assert "increased thirst" in context["recent_notes"][0]["summary"]
    assert "Diabetes" in context["clinical_summary"]
    assert len(context["abnormal_labs"]) == 2
    assert len(context["high_risk_medications"]) == 1
    assert context["high_risk_medications"][0]["name"] == "Insulin"
    assert len(context["recent_concerns"]) == 1 # "Reviewed lab results, adjusted insulin dose." has high priority
