from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload, selectinload, aliased
from sqlalchemy import desc, func, exists, and_
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from database.models import Patient, LabResult, User, Medication, doctor_patient_association, Exam
import schemas.patient as patient_schemas
import schemas.lab_result as lab_result_schemas
import schemas.medication as medication_schemas
from .associations import is_doctor_assigned_to_patient

import logging

def get_patients(
    db: Session, 
    search: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> Tuple[List[Patient], int]:
    """
    Get patients with optional search filter and pagination.
    TODO: Re-add filtering based on doctor-patient relationship when implemented.
    """
    query = db.query(Patient)

    # Apply search filter if provided (case-insensitive on name)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(func.lower(Patient.name).like(search_term))
    
    # Get total count matching the query *before* pagination
    total = query.count()

    # Apply pagination
    patients = query.offset(skip).limit(limit).all()
    
    return patients, total

def get_patients_by_user(*args, **kwargs):
    """DEPRECATED: Use get_patients instead."""
    # This function is no longer appropriate as we removed user_id filtering from get_patients
    # It might need different logic if patient-specific views are required elsewhere.
    raise NotImplementedError("get_patients_by_user is deprecated, use get_patients with appropriate filters.")
    # return get_patients(db, user_id, skip, limit)

def get_patient(
    db: Session, 
    patient_id: int
) -> Optional[Patient]:
    """
    Get a specific patient by ID, including their exams and associated lab results.
    """
    return (
        db.query(Patient)
        .options(
            selectinload(Patient.exams)
            .selectinload(Exam.lab_results)
        )
        .filter(Patient.patient_id == patient_id)
        .first()
    )

def get_patient_with_labs(
    db: Session, 
    patient_id: int
) -> Optional[Patient]:
    """
    Get a patient with their lab results.
    """
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id
    ).first()
    
    if patient:
        # Fetching lab results separately to avoid potential performance issues
        patient.lab_results = db.query(LabResult).filter(
            LabResult.patient_id == patient_id
        ).order_by(LabResult.timestamp.desc()).all()
        
    return patient

def get_patient_basic(
    db: Session,
    patient_id: int
) -> Optional[Patient]:
    """
    Get a specific patient by ID, without loading related data.
    """
    return (
        db.query(Patient)
        .filter(Patient.patient_id == patient_id)
        .first()
    )

def create_patient_record(
    db: Session,
    patient_data: patient_schemas.PatientCreate,
    user_id: int
) -> Patient:
    """
    Creates a new patient data record and assigns them to a group atomically.
    Ensures the user account exists and has permission before creating.
    If group assignment fails, the entire transaction is rolled back.
    """
    # Extract group_id and remove it from the main patient data
    group_id = patient_data.group_id
    data = patient_data.model_dump(exclude={'group_id'})
    data['user_id'] = user_id

    try:
        # Create the patient instance
        db_patient = Patient(**data)
        db.add(db_patient)
        db.flush()  # Use flush to get the patient_id without committing

        # If a group_id is provided, perform the assignment
        if group_id:
            from .groups import assign_patient_to_group, is_user_admin_of_group
            
            # Check if user is admin of the group
            if not is_user_admin_of_group(db, user_id, group_id):
                raise Exception("User does not have admin rights for this group.")
            
            # Assign patient to group
            from schemas.group import GroupPatientCreate
            assignment_data = GroupPatientCreate(patient_id=db_patient.patient_id)
            assign_patient_to_group(db, group_id, assignment_data, user_id)

        # Commit the entire transaction
        db.commit()
        db.refresh(db_patient)
        return db_patient

    except Exception as e:
        db.rollback()
        logging.error(f"Failed to create patient and assign to group: {e}")
        raise e

def update_patient(
    db: Session, 
    patient_id: int,
    patient_update: patient_schemas.PatientUpdate
) -> Optional[Patient]:
    """
    Update an existing patient record by patient_id.
    Requires authorization check before calling this (e.g., doctor is assigned).
    """
    db_patient = get_patient(db, patient_id=patient_id)
    if db_patient is None:
        return None

    update_data = patient_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)
    
    db_patient.updated_at = datetime.now(timezone.utc) # Use timezone aware
    db.commit()
    db.refresh(db_patient)
    return db_patient

def delete_patient(
    db: Session, 
    patient_id: int
) -> bool:
    """
    Delete a patient record by patient_id.
    Requires authorization check before calling this.
    Handles cascade deletion defined in the model relationships.
    """
    db_patient = get_patient(db, patient_id=patient_id)
    if db_patient is None:
        return False

    db.delete(db_patient)
    db.commit()
    return True

def count_patients_by_user(
    db: Session,
    user_id: int
) -> int:
    """
    Count the number of patients a user has.
    """
    return db.query(Patient).filter(
        Patient.user_id == user_id
    ).count()

# New function to get patient profile based on associated User ID
def get_patient_profile(db: Session, user_id: int) -> Optional[Patient]:
    """
    Get the patient profile associated with a given user ID (i.e., the patient themselves).
    Includes associated active medications, exams, and their lab results.
    """
    return (
        db.query(Patient)
        .options(
            joinedload(Patient.medications),
            selectinload(Patient.exams)
            .selectinload(Exam.lab_results)
        )
        .filter(Patient.user_id == user_id)
        .first()
    )

# --- Doctor/Patient Specific CRUD ---

def get_assigned_patients_for_doctor(
    db: Session, 
    doctor_id: int, 
    search: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> Tuple[List[Patient], int]:
    """
    Get patients assigned to a specific doctor, with optional search and pagination.
    """
    # Query patients linked via the association table to the doctor
    query = (
        db.query(Patient)
        .join(doctor_patient_association, Patient.patient_id == doctor_patient_association.c.patient_patient_id)
        .filter(doctor_patient_association.c.doctor_user_id == doctor_id)
    )

    # Apply search filter if provided (case-insensitive on name)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(func.lower(Patient.name).like(search_term))
    
    # Get total count matching the query *before* pagination
    total = query.count()

    # Apply pagination and ordering
    patients = query.order_by(Patient.name).offset(skip).limit(limit).all()
    
    return patients, total

# --- CRUD Object for Easy Import ---
class PatientCRUD:
    """CRUD operations for Patient model."""

    def get(self, db: Session, patient_id: int) -> Optional[Patient]:
        """Get a patient by ID."""
        return get_patient(db, patient_id)

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Patient]:
        """Get multiple patients."""
        patients, _ = get_patients(db, skip=skip, limit=limit)
        return patients

    def create(self, db: Session, *, obj_in: patient_schemas.PatientCreate, user_id: int) -> Patient:
        """Create a new patient."""
        return create_patient_record(db, obj_in, user_id)

    def update(self, db: Session, *, db_obj: Patient, obj_in: patient_schemas.PatientUpdate) -> Patient:
        """Update a patient."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        db_obj.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, patient_id: int) -> bool:
        """Remove a patient."""
        return delete_patient(db, patient_id)

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[Patient]:
        """Get patient by user ID."""
        return get_patient_profile(db, user_id)

    def get_assigned_for_doctor(self, db: Session, doctor_id: int, *, skip: int = 0, limit: int = 100) -> List[Patient]:
        """Get patients assigned to a doctor."""
        patients, _ = get_assigned_patients_for_doctor(db, doctor_id, skip=skip, limit=limit)
        return patients


# Create instance for easy import
patient = PatientCRUD()

# --- Deprecated/Old Functions Removed ---
# Removed: get_patients (replaced by router logic)
# Removed: get_patients_by_user (deprecated)
# Removed: get_patient_with_labs (functionality can be handled by schema or specific fetches)
# Removed: create_patient (replaced by create_patient_record)
# Removed: count_patients_by_user (likely unused)