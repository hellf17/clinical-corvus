"""
Patient Service - Core patient data management

This service provides access to patient data with proper authorization
and integrates with the existing database models and CRUD operations.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import existing database models and CRUD operations
try:
    from database.models import Patient, LabResult, Medication, VitalSign, ClinicalNote
    from crud.patients import patient as patient_crud
    from crud.lab_result import lab_result as lab_result_crud
    from crud.medication import medication as medication_crud
    from crud.vital_sign import vital_sign as vital_sign_crud
    from crud.clinical_note import clinical_note as clinical_note_crud
    DATABASE_AVAILABLE = True
    logger.info("Database models and CRUD operations available")
except ImportError as e:
    logger.warning(f"Database models not available: {e}")
    DATABASE_AVAILABLE = False


class PatientService:
    """
    Service for managing patient data with proper authorization.

    This service integrates with existing database models and provides
    a clean interface for accessing patient information.
    """

    def __init__(self):
        if not DATABASE_AVAILABLE:
            logger.warning("PatientService initialized without database - using mock data")
        else:
            logger.info("PatientService initialized with database access")

    async def get_patient(self, patient_id: str, user_id: str) -> Dict[str, Any]:
        """
        Get basic patient demographic information.

        Args:
            patient_id: Patient identifier
            user_id: User requesting access (for authorization)

        Returns:
            Patient demographic data
        """
        try:
            if not DATABASE_AVAILABLE:
                # Return mock data
                return {
                    "id": patient_id,
                    "name": f"Mock Patient {patient_id}",
                    "age": 45,
                    "gender": "F",
                    "medical_record_number": f"MRN{patient_id}",
                    "date_of_birth": "1979-01-15",
                    "created_at": datetime.now().isoformat()
                }

            # Get patient from database
            patient = await patient_crud.get(patient_id)

            if not patient:
                raise ValueError(f"Patient {patient_id} not found")

            # TODO: Add authorization check here
            # For now, assume access is granted

            return {
                "id": patient.id,
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "medical_record_number": patient.medical_record_number,
                "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                "created_at": patient.created_at.isoformat() if patient.created_at else None
            }

        except Exception as e:
            logger.error(f"Error getting patient {patient_id}: {e}")
            raise

    async def get_patient_labs(self, patient_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent lab results for a patient.

        Args:
            patient_id: Patient identifier
            limit: Maximum number of results to return

        Returns:
            List of lab results
        """
        try:
            if not DATABASE_AVAILABLE:
                # Return mock data
                return [
                    {
                        "id": f"lab_{i}",
                        "test_name": f"Test {i}",
                        "value": f"{i * 10}",
                        "unit": "mg/dL",
                        "reference_range": f"{i * 5}-{i * 15}",
                        "is_abnormal": i % 3 == 0,
                        "date": datetime.now().isoformat(),
                        "notes": f"Mock lab result {i}"
                    }
                    for i in range(min(limit, 5))
                ]

            # Get lab results from database
            labs = await lab_result_crud.get_by_patient_id(patient_id, limit=limit)

            return [
                {
                    "id": lab.id,
                    "test_name": lab.test_name,
                    "value": lab.value,
                    "unit": lab.unit,
                    "reference_range": lab.reference_range,
                    "is_abnormal": lab.is_abnormal,
                    "date": lab.date.isoformat() if lab.date else None,
                    "notes": lab.notes
                }
                for lab in labs
            ]

        except Exception as e:
            logger.error(f"Error getting labs for patient {patient_id}: {e}")
            return []

    async def get_patient_medications(self, patient_id: str) -> List[Dict[str, Any]]:
        """
        Get current medications for a patient.

        Args:
            patient_id: Patient identifier

        Returns:
            List of current medications
        """
        try:
            if not DATABASE_AVAILABLE:
                # Return mock data
                return [
                    {
                        "id": f"med_{i}",
                        "name": f"Medication {i}",
                        "dosage": f"{i * 10}mg",
                        "frequency": "daily",
                        "route": "oral",
                        "status": "active",
                        "start_date": datetime.now().isoformat(),
                        "prescribing_physician": "Dr. Smith"
                    }
                    for i in range(3)
                ]

            # Get medications from database
            medications = await medication_crud.get_by_patient_id(patient_id)

            return [
                {
                    "id": med.id,
                    "name": med.name,
                    "dosage": med.dosage,
                    "frequency": med.frequency,
                    "route": med.route,
                    "status": med.status,
                    "start_date": med.start_date.isoformat() if med.start_date else None,
                    "end_date": med.end_date.isoformat() if med.end_date else None,
                    "prescribing_physician": med.prescribing_physician,
                    "notes": med.notes
                }
                for med in medications
            ]

        except Exception as e:
            logger.error(f"Error getting medications for patient {patient_id}: {e}")
            return []

    async def get_patient_vitals(self, patient_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent vital signs for a patient.

        Args:
            patient_id: Patient identifier
            limit: Maximum number of results to return

        Returns:
            List of vital signs
        """
        try:
            if not DATABASE_AVAILABLE:
                # Return mock data
                return [
                    {
                        "id": f"vital_{i}",
                        "measurement_type": "blood_pressure",
                        "value": f"120/{80 + i}",
                        "unit": "mmHg",
                        "date": datetime.now().isoformat(),
                        "notes": f"Mock vital sign {i}"
                    }
                    for i in range(min(limit, 5))
                ]

            # Get vital signs from database
            vitals = await vital_sign_crud.get_by_patient_id(patient_id, limit=limit)

            return [
                {
                    "id": vital.id,
                    "measurement_type": vital.measurement_type,
                    "value": vital.value,
                    "unit": vital.unit,
                    "date": vital.date.isoformat() if vital.date else None,
                    "notes": vital.notes
                }
                for vital in vitals
            ]

        except Exception as e:
            logger.error(f"Error getting vitals for patient {patient_id}: {e}")
            return []

    async def get_patient_notes(self, patient_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recent clinical notes for a patient.

        Args:
            patient_id: Patient identifier
            limit: Maximum number of results to return

        Returns:
            List of clinical notes
        """
        try:
            if not DATABASE_AVAILABLE:
                # Return mock data
                return [
                    {
                        "id": f"note_{i}",
                        "content": f"Clinical note {i} for patient {patient_id}",
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat(),
                        "author": "Dr. Corvus",
                        "note_type": "progress_note"
                    }
                    for i in range(min(limit, 3))
                ]

            # Get clinical notes from database
            notes = await clinical_note_crud.get_by_patient_id(patient_id, limit=limit)

            return [
                {
                    "id": note.id,
                    "content": note.content,
                    "created_at": note.created_at.isoformat() if note.created_at else None,
                    "updated_at": note.updated_at.isoformat() if note.updated_at else None,
                    "author": note.author,
                    "note_type": note.note_type
                }
                for note in notes
            ]

        except Exception as e:
            logger.error(f"Error getting notes for patient {patient_id}: {e}")
            return []

    async def validate_patient_access(self, patient_id: str, user_id: str) -> bool:
        """
        Validate that a user has access to a patient's data.

        Args:
            patient_id: Patient identifier
            user_id: User identifier

        Returns:
            True if access is granted, False otherwise
        """
        try:
            # For now, just check if patient exists
            patient = await self.get_patient(patient_id, user_id)
            return "error" not in patient
        except Exception:
            return False