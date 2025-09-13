"""
Patient Context Manager - MVP Implementation

This service leverages existing patient management system to provide
comprehensive patient context for clinical agents.

Integrates with:
- Existing PatientService for patient data
- Existing lab, medication, and notes services
- Role-based access control
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Import existing services
try:
    from services.patient_service import PatientService
    from models.patient import PatientModel
    from models.lab_result import LabResultModel
    from models.medication import MedicationModel
    from models.clinical_note import ClinicalNoteModel
    PATIENT_SERVICE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Patient services not available: {e}")
    PATIENT_SERVICE_AVAILABLE = False
    PatientService = None
    PatientModel = None
    LabResultModel = None
    MedicationModel = None
    ClinicalNoteModel = None

# Import database dependencies
try:
    from database.connection import get_db
    DATABASE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Database connection not available: {e}")
    DATABASE_AVAILABLE = False
    get_db = None


class PatientContextManager:
    """
    MVP Integration: Leverages existing patient management system
    to provide comprehensive patient context for clinical agents.
    """

    def __init__(self):
        if PATIENT_SERVICE_AVAILABLE:
            self.patient_service = PatientService()
        else:
            self.patient_service = None

    async def get_patient_context(
        self, 
        patient_id: str, 
        user_id: str,
        include_labs: bool = True,
        include_medications: bool = True,
        include_notes: bool = True,
        lab_limit: int = 10,
        note_limit: int = 5
    ) -> Dict[str, Any]:
        """
        Get comprehensive patient context using existing services
        
        Args:
            patient_id: Patient ID
            user_id: User ID for authorization
            include_labs: Whether to include recent labs
            include_medications: Whether to include current medications
            include_notes: Whether to include recent notes
            lab_limit: Maximum number of recent labs to include
            note_limit: Maximum number of recent notes to include
            
        Returns:
            Comprehensive patient context dictionary
        """
        try:
            logger.info(f"Getting patient context for patient {patient_id}, user {user_id}")

            if not PATIENT_SERVICE_AVAILABLE or not self.patient_service:
                return self._mock_patient_context(patient_id)

            # Verify user has access to patient using existing service
            patient = await self._get_patient_with_access_check(patient_id, user_id)
            if not patient:
                logger.warning(f"Patient {patient_id} not found or user {user_id} lacks access")
                return {"error": "Patient not found or access denied"}

            context = {
                "patient_id": patient_id,
                "demographics": await self._extract_demographics(patient),
                "last_updated": datetime.now().isoformat()
            }

            # Get recent labs using existing lab service
            if include_labs:
                try:
                    recent_labs = await self._get_recent_labs(patient_id, lab_limit)
                    context["recent_labs"] = recent_labs
                    context["abnormal_labs"] = [
                        lab for lab in recent_labs 
                        if lab.get("is_abnormal", False)
                    ]
                except Exception as e:
                    logger.warning(f"Could not retrieve labs for patient {patient_id}: {e}")
                    context["recent_labs"] = []
                    context["abnormal_labs"] = []

            # Get current medications using existing medication service
            if include_medications:
                try:
                    medications = await self._get_current_medications(patient_id)
                    context["medications"] = medications
                    context["high_risk_medications"] = [
                        med for med in medications 
                        if med.get("high_risk", False)
                    ]
                except Exception as e:
                    logger.warning(f"Could not retrieve medications for patient {patient_id}: {e}")
                    context["medications"] = []
                    context["high_risk_medications"] = []

            # Get recent notes using existing notes service
            if include_notes:
                try:
                    recent_notes = await self._get_recent_notes(patient_id, note_limit)
                    context["recent_notes"] = recent_notes
                    context["recent_concerns"] = [
                        note for note in recent_notes 
                        if note.get("priority", "normal").lower() in ["high", "urgent"]
                    ]
                except Exception as e:
                    logger.warning(f"Could not retrieve notes for patient {patient_id}: {e}")
                    context["recent_notes"] = []
                    context["recent_concerns"] = []

            # Add clinical summary
            context["clinical_summary"] = await self._generate_clinical_summary(context)

            logger.info(f"Patient context retrieved successfully for patient {patient_id}")
            return context

        except Exception as e:
            logger.error(f"Error retrieving patient context for patient {patient_id}: {e}", exc_info=True)
            return {
                "error": f"Failed to retrieve patient context: {str(e)}",
                "patient_id": patient_id
            }

    async def _get_patient_with_access_check(self, patient_id: str, user_id: str) -> Optional[PatientModel]:
        """Get patient with access verification using existing service"""
        try:
            # Use existing patient service with role-based access control
            patient = await self.patient_service.get_patient(patient_id, user_id)
            return patient
        except Exception as e:
            logger.warning(f"Access check failed for patient {patient_id}, user {user_id}: {e}")
            return None

    async def _extract_demographics(self, patient: PatientModel) -> Dict[str, Any]:
        """Extract demographics from patient model"""
        try:
            return {
                "age": getattr(patient, "age", None),
                "gender": getattr(patient, "gender", None),
                "date_of_birth": getattr(patient, "date_of_birth", None),
                "primary_diagnosis": getattr(patient, "primary_diagnosis", None),
                "allergies": getattr(patient, "allergies", []),
                "medical_history": getattr(patient, "medical_history", []),
                "emergency_contact": getattr(patient, "emergency_contact", None)
            }
        except Exception as e:
            logger.warning(f"Error extracting demographics: {e}")
            return {}

    async def _get_recent_labs(self, patient_id: str, limit: int) -> List[Dict[str, Any]]:
        """Get recent lab results using existing service"""
        try:
            if not self.patient_service:
                return []
                
            # Use existing method pattern (adjust based on actual service interface)
            lab_results = await self.patient_service.get_patient_labs(patient_id, limit=limit)
            
            return [
                {
                    "test_name": getattr(lab, "test_name", "Unknown"),
                    "value": getattr(lab, "value", None),
                    "reference_range": getattr(lab, "reference_range", None),
                    "units": getattr(lab, "units", None),
                    "date": getattr(lab, "date_collected", None),
                    "is_abnormal": getattr(lab, "is_abnormal", False),
                    "status": getattr(lab, "status", "normal")
                }
                for lab in (lab_results or [])
            ]
        except Exception as e:
            logger.warning(f"Error getting recent labs: {e}")
            return []

    async def _get_current_medications(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get current medications using existing service"""
        try:
            if not self.patient_service:
                return []
                
            # Use existing method pattern (adjust based on actual service interface)
            medications = await self.patient_service.get_patient_medications(patient_id)
            
            return [
                {
                    "name": getattr(med, "name", "Unknown"),
                    "dosage": getattr(med, "dosage", None),
                    "frequency": getattr(med, "frequency", None),
                    "route": getattr(med, "route", None),
                    "start_date": getattr(med, "start_date", None),
                    "end_date": getattr(med, "end_date", None),
                    "prescriber": getattr(med, "prescriber", None),
                    "indication": getattr(med, "indication", None),
                    "status": getattr(med, "status", "active"),
                    "high_risk": getattr(med, "high_risk", False)
                }
                for med in (medications or [])
                if getattr(med, "status", "active") == "active"
            ]
        except Exception as e:
            logger.warning(f"Error getting current medications: {e}")
            return []

    async def _get_recent_notes(self, patient_id: str, limit: int) -> List[Dict[str, Any]]:
        """Get recent clinical notes using existing service"""
        try:
            if not self.patient_service:
                return []
                
            # Use existing method pattern (adjust based on actual service interface)
            notes = await self.patient_service.get_patient_notes(patient_id, limit=limit)
            
            return [
                {
                    "date": getattr(note, "created_at", None),
                    "type": getattr(note, "note_type", "clinical"),
                    "summary": getattr(note, "summary", "")[:200] + "..." if len(getattr(note, "summary", "")) > 200 else getattr(note, "summary", ""),
                    "author": getattr(note, "author", "Unknown"),
                    "priority": getattr(note, "priority", "normal"),
                    "tags": getattr(note, "tags", [])
                }
                for note in (notes or [])
            ]
        except Exception as e:
            logger.warning(f"Error getting recent notes: {e}")
            return []

    async def _generate_clinical_summary(self, context: Dict[str, Any]) -> str:
        """Generate a clinical summary from the patient context"""
        try:
            demographics = context.get("demographics", {})
            labs = context.get("recent_labs", [])
            medications = context.get("medications", [])
            notes = context.get("recent_notes", [])
            
            summary_parts = []
            
            # Demographics summary
            age = demographics.get("age")
            gender = demographics.get("gender")
            if age and gender:
                summary_parts.append(f"{age}-year-old {gender}")
                
            primary_dx = demographics.get("primary_diagnosis")
            if primary_dx:
                summary_parts.append(f"with {primary_dx}")
                
            # Medication summary
            if medications:
                active_meds = [med["name"] for med in medications if med.get("status") == "active"]
                if active_meds:
                    med_summary = f"Currently on {len(active_meds)} medications"
                    if len(active_meds) <= 3:
                        med_summary += f": {', '.join(active_meds)}"
                    summary_parts.append(med_summary)
                    
            # Lab summary
            abnormal_labs = context.get("abnormal_labs", [])
            if abnormal_labs:
                summary_parts.append(f"{len(abnormal_labs)} abnormal lab values")
                
            # Notes summary
            if notes:
                recent_concerns = context.get("recent_concerns", [])
                if recent_concerns:
                    summary_parts.append(f"{len(recent_concerns)} recent clinical concerns")
                    
            return ". ".join(summary_parts) + "." if summary_parts else "No significant clinical summary available."
            
        except Exception as e:
            logger.warning(f"Error generating clinical summary: {e}")
            return "Clinical summary unavailable."

    def _mock_patient_context(self, patient_id: str) -> Dict[str, Any]:
        """Mock patient context when services are not available"""
        logger.info(f"Using mock patient context for patient {patient_id}")
        
        return {
            "patient_id": patient_id,
            "demographics": {
                "age": 45,
                "gender": "male",
                "primary_diagnosis": "Hypertension",
                "allergies": ["Penicillin"]
            },
            "recent_labs": [
                {
                    "test_name": "Complete Blood Count",
                    "value": "Normal",
                    "date": "2024-01-15",
                    "is_abnormal": False
                }
            ],
            "medications": [
                {
                    "name": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Daily",
                    "status": "active"
                }
            ],
            "recent_notes": [
                {
                    "date": "2024-01-15",
                    "type": "progress",
                    "summary": "Patient reports feeling well, blood pressure controlled",
                    "author": "Dr. Mock"
                }
            ],
            "clinical_summary": "45-year-old male with hypertension, currently on Lisinopril, recent labs normal.",
            "last_updated": datetime.now().isoformat(),
            "mock_data": True
        }

    async def get_patient_summary(self, patient_id: str, user_id: str) -> str:
        """Get a brief patient summary for agent context"""
        try:
            context = await self.get_patient_context(patient_id, user_id)
            return context.get("clinical_summary", "No patient summary available.")
        except Exception as e:
            logger.error(f"Error getting patient summary: {e}")
            return "Patient summary unavailable."

    async def check_patient_access(self, patient_id: str, user_id: str) -> bool:
        """Check if user has access to patient"""
        try:
            patient = await self._get_patient_with_access_check(patient_id, user_id)
            return patient is not None
        except Exception as e:
            logger.error(f"Error checking patient access: {e}")
            return False


# Global instance for reuse
patient_context_manager = PatientContextManager()