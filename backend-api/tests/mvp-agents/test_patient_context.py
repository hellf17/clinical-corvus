import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.patient_context_manager import PatientContextManager, PATIENT_SERVICE_AVAILABLE
from database.models import Patient as PatientModel
from database.models import LabResult as LabResultModel
from database.models import Medication as MedicationModel
from database.models import ClinicalNote as ClinicalNoteModel

@pytest.fixture(autouse=True)
def mock_patient_service_dependencies():
    with patch('backend-api.services.patient_context_manager.PatientService') as MockPatientService_cls, \
         patch('backend-api.services.patient_context_manager.get_db') as mock_get_db:
        
        mock_patient_service_instance = AsyncMock()
        mock_patient_service_instance.get_patient = AsyncMock(return_value=PatientModel(
            id="test_patient_id",
            first_name="John",
            last_name="Doe",
            age=60,
            gender="male",
            primary_diagnosis="Hypertension",
            allergies=["Penicillin"],
            medical_history=["Type 2 Diabetes"],
            emergency_contact={"name": "Jane Doe", "phone": "555-1234"}
        ))
        mock_patient_service_instance.get_patient_labs = AsyncMock(return_value=[
            LabResultModel(test_name="Glucose", value=150, reference_range="70-110", units="mg/dL", date_collected="2024-01-01", is_abnormal=True, status="abnormal"),
            LabResultModel(test_name="Hemoglobin A1c", value=7.5, reference_range="4.0-6.0", units="%", date_collected="2024-01-01", is_abnormal=True, status="abnormal"),
            LabResultModel(test_name="Creatinine", value=1.0, reference_range="0.6-1.2", units="mg/dL", date_collected="2024-01-01", is_abnormal=False, status="normal")
        ])
        mock_patient_service_instance.get_patient_medications = AsyncMock(return_value=[
            MedicationModel(name="Lisinopril", dosage="10mg", frequency="Daily", status="active", high_risk=False),
            MedicationModel(name="Metformin", dosage="500mg", frequency="BID", status="active", high_risk=False),
            MedicationModel(name="Warfarin", dosage="5mg", frequency="Daily", status="active", high_risk=True)
        ])
        mock_patient_service_instance.get_patient_notes = AsyncMock(return_value=[
            ClinicalNoteModel(summary="Patient reports controlled hypertension.", note_type="progress", created_at="2024-01-05", author="Dr. Smith", priority="normal"),
            ClinicalNoteModel(summary="Acute onset of chest pain, ruling out MI.", note_type="admission", created_at="2024-01-04", author="Dr. Jones", priority="high")
        ])
        
        MockPatientService_cls.return_value = mock_patient_service_instance
        
        mock_db_session = MagicMock()
        mock_get_db.return_value.__enter__.return_value = mock_db_session

        yield {
            "mock_patient_service_instance": mock_patient_service_instance,
            "MockPatientService_cls": MockPatientService_cls
        }

@pytest.fixture
def patient_context_manager():
    return PatientContextManager()

@pytest.mark.asyncio
async def test_get_patient_context_full(patient_context_manager, mock_patient_service_dependencies):
    patient_id = "test_patient_id"
    user_id = "test_user_id"
    
    context = await patient_context_manager.get_patient_context(patient_id, user_id)
    
    assert "patient_id" in context
    assert context["patient_id"] == patient_id
    assert "demographics" in context
    assert context["demographics"]["age"] == 60
    assert "recent_labs" in context
    assert len(context["recent_labs"]) == 3
    assert context["abnormal_labs"][0]["test_name"] == "Glucose"
    assert "medications" in context
    assert len(context["medications"]) == 3
    assert context["high_risk_medications"][0]["name"] == "Warfarin"
    assert "recent_notes" in context
    assert len(context["recent_notes"]) == 2
    assert context["recent_concerns"][0]["summary"].startswith("Acute onset of chest pain")
    assert "clinical_summary" in context
    assert "60-year-old male with Hypertension" in context["clinical_summary"]
    
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.assert_called_once_with(patient_id, user_id)
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_labs.assert_called_once()
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_medications.assert_called_once()
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_notes.assert_called_once()

@pytest.mark.asyncio
async def test_get_patient_context_no_optional_data(patient_context_manager, mock_patient_service_dependencies):
    patient_id = "test_patient_id"
    user_id = "test_user_id"
    
    context = await patient_context_manager.get_patient_context(
        patient_id, user_id, 
        include_labs=False, include_medications=False, include_notes=False
    )
    
    assert "recent_labs" not in context or len(context["recent_labs"]) == 0
    assert "medications" not in context or len(context["medications"]) == 0
    assert "recent_notes" not in context or len(context["recent_notes"]) == 0
    assert "clinical_summary" in context
    assert "Hypertension" in context["clinical_summary"] # Still includes demographics
    
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_labs.assert_not_called()
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_medications.assert_not_called()
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient_notes.assert_not_called()

@pytest.mark.asyncio
async def test_get_patient_context_patient_not_found(patient_context_manager, mock_patient_service_dependencies):
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.return_value = None
    
    patient_id = "non_existent_id"
    user_id = "test_user_id"
    
    context = await patient_context_manager.get_patient_context(patient_id, user_id)
    
    assert "error" in context
    assert "Patient not found or access denied" in context["error"]

@pytest.mark.asyncio
async def test_get_patient_context_service_unavailable(patient_context_manager):
    # Temporarily set PATIENT_SERVICE_AVAILABLE to False for this test
    original_status = PATIENT_SERVICE_AVAILABLE
    with patch('backend-api.services.patient_context_manager.PATIENT_SERVICE_AVAILABLE', False):
        manager = PatientContextManager() # Re-initialize to pick up the patch
        context = await manager.get_patient_context("any_id", "any_user")
        assert "mock_data" in context
        assert context["mock_data"] is True
    # Restore original status
    patch('backend-api.services.patient_context_manager.PATIENT_SERVICE_AVAILABLE', original_status)


@pytest.mark.asyncio
async def test_check_patient_access(patient_context_manager, mock_patient_service_dependencies):
    patient_id = "test_patient_id"
    user_id = "test_user_id"
    
    has_access = await patient_context_manager.check_patient_access(patient_id, user_id)
    assert has_access is True
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.assert_called_once_with(patient_id, user_id)

@pytest.mark.asyncio
async def test_check_patient_access_denied(patient_context_manager, mock_patient_service_dependencies):
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.return_value = None
    
    patient_id = "denied_patient_id"
    user_id = "test_user_id"
    
    has_access = await patient_context_manager.check_patient_access(patient_id, user_id)
    assert has_access is False

@pytest.mark.asyncio
async def test_get_patient_summary(patient_context_manager, mock_patient_service_dependencies):
    patient_id = "test_patient_id"
    user_id = "test_user_id"
    
    summary = await patient_context_manager.get_patient_summary(patient_id, user_id)
    
    assert "60-year-old male with Hypertension" in summary
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.assert_called_once_with(patient_id, user_id)

@pytest.mark.asyncio
async def test_get_patient_summary_error(patient_context_manager, mock_patient_service_dependencies):
    mock_patient_service_dependencies["mock_patient_service_instance"].get_patient.side_effect = Exception("Service error")
    
    summary = await patient_context_manager.get_patient_summary("error_id", "error_user")
    
    assert "Patient summary unavailable." in summary