# This file makes the crud directory a proper Python package
# It re-exports CRUD modules for easier imports

# from .crud_user import user # Module doesn't seem to exist
# from .crud_patient import patient # Incorrect module name
# from .patients import patient # Corrected module name, but 'patient' object likely not defined

from . import ai_chat
# import crud.clinical_note # Incorrect style
from . import clinical_note # Corrected
# import crud.medication # Incorrect style
from . import medication # Corrected
# import crud.patients # Incorrect style (already imported patient obj above, just import module if needed)
from . import patients # Corrected

# New CRUD modules
# import crud.crud_health_tip # Incorrect style
from . import crud_health_tip # Corrected
# import crud.crud_health_diary # Incorrect style
from . import crud_health_diary # Corrected
# import crud.crud_lab_summary # Incorrect style
from . import crud_lab_summary # Corrected

# Import alert CRUD - Keep only alerts.py
# import crud.crud_alert # Incorrect module name
# import crud.alerts # Incorrect style
from . import alerts # Corrected

# Expose association functions
from .associations import is_doctor_assigned_to_patient, assign_doctor_to_patient, remove_doctor_from_patient

# Remove duplicate imports below
# # New CRUD modules
# import crud.crud_health_tip
# import crud.crud_health_diary
# import crud.crud_lab_summary
#
# # Import alert CRUD
# import crud.crud_alert

# Import necessary models and Session type
from sqlalchemy.orm import Session
# from sqlalchemy import exists, and_
# from ..database.models import User, Patient, doctor_patient_association # Corrected relative path

# --- Doctor-Patient Association CRUD --- # Now moved to associations.py

# def is_doctor_assigned_to_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
#     """Checks if a specific doctor is assigned to a specific patient."""
#     # ... function code removed ...
#     return association_exists
#
# def assign_doctor_to_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
#     """Assigns a doctor to a patient if not already assigned. Returns True if assigned, False otherwise."""
#     # ... function code removed ...
#     return False
#
# def remove_doctor_from_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
#     """Removes the assignment of a doctor from a patient. Returns True if removed, False otherwise."""
#     # ... function code removed ...
#     return False 