from sqlalchemy.orm import Session
from sqlalchemy import desc, asc # Import asc for sorting
from typing import List, Optional
import logging
from datetime import datetime

from database import models
import schemas.medication as medication_schemas

logger = logging.getLogger(__name__)

def create_patient_medication(db: Session, medication: medication_schemas.MedicationPatientCreate, patient_id: int, user_id: int) -> models.Medication:
    """Creates a new medication record for a specific patient."""
    db_medication = models.Medication(
        **medication.model_dump(), 
        patient_id=patient_id,
        user_id=user_id # Track who added the medication
    )
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    logger.info(f"Created medication ID {db_medication.medication_id} for patient {patient_id}")
    return db_medication

def get_medications_by_patient_id(
    db: Session,
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'start_date',
    sort_order: str = 'desc',
    status: Optional[medication_schemas.MedicationStatus] = None # Added status parameter
) -> List[models.Medication]:
    """Retrieves a list of medications for a specific patient with sorting, pagination, and status filtering."""
    query = db.query(models.Medication).filter(models.Medication.patient_id == patient_id)

    # Apply status filtering if provided
    if status is not None:
        query = query.filter(models.Medication.status == status)

    # Apply sorting
    sort_column = getattr(models.Medication, sort_by, models.Medication.start_date) # Default to start_date if invalid
    if sort_column is None: # Handle case where sort_by is not a valid column
        sort_column = models.Medication.start_date
        logger.warning(f"Invalid sort_by column '{sort_by}', defaulting to 'start_date'.")
        
    if sort_order.lower() == 'asc':
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    return query.offset(skip).limit(limit).all()

def get_medication_by_id(db: Session, medication_id: int) -> Optional[models.Medication]:
    """Retrieves a single medication by its ID."""
    return db.query(models.Medication).filter(models.Medication.medication_id == medication_id).first()

def update_medication(db: Session, medication_id: int, medication_update: medication_schemas.MedicationUpdate) -> Optional[models.Medication]:
    """Updates an existing medication record."""
    db_medication = get_medication_by_id(db, medication_id)
    if not db_medication:
        return None

    update_data = medication_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_medication, key, value)
        
    # Explicitly set updated_at if not handled automatically by DB
    db_medication.updated_at = datetime.utcnow() 

    db.add(db_medication) # Add to session to track changes
    db.commit()
    db.refresh(db_medication)
    logger.info(f"Updated medication ID {medication_id}")
    return db_medication

def delete_medication(db: Session, medication_id: int) -> Optional[models.Medication]:
    """Deletes a medication record by its ID."""
    db_medication = get_medication_by_id(db, medication_id)
    if db_medication:
        db.delete(db_medication)
        db.commit()
        logger.info(f"Deleted medication ID {medication_id}")
        return db_medication
    logger.warning(f"Attempted to delete non-existent medication ID {medication_id}")
    return None 