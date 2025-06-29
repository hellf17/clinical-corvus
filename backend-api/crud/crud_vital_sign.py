from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import logging

# from backend_api.database import models
from database import models # Corrected
# from backend_api.schemas import vital_sign as schemas # Use alias to avoid name clash
import schemas.vital_sign as vital_sign_schemas # Corrected

logger = logging.getLogger(__name__)

def create_vital_sign(db: Session, vital_sign: vital_sign_schemas.VitalSignCreate, patient_id: int) -> models.VitalSign:
    """Creates a new vital sign record in the database."""
    db_vital_sign = models.VitalSign(
        **vital_sign.model_dump(), 
        patient_id=patient_id
    )
    db.add(db_vital_sign)
    db.commit()
    db.refresh(db_vital_sign)
    logger.info(f"Created vital sign record ID {db_vital_sign.vital_id} for patient {patient_id}")
    return db_vital_sign

def get_vital_signs_for_patient(
    db: Session, 
    patient_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[models.VitalSign]:
    """Retrieves a list of vital signs for a specific patient, ordered by most recent first."""
    return (
        db.query(models.VitalSign)
        .filter(models.VitalSign.patient_id == patient_id)
        .order_by(desc(models.VitalSign.timestamp))
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_latest_vital_sign_for_patient(db: Session, patient_id: int) -> Optional[models.VitalSign]:
    """Retrieves the most recent vital sign record for a specific patient."""
    return (
        db.query(models.VitalSign)
        .filter(models.VitalSign.patient_id == patient_id)
        .order_by(desc(models.VitalSign.timestamp))
        .first()
    )

def delete_vital_sign(db: Session, vital_id: int) -> Optional[models.VitalSign]:
    """Deletes a vital sign record by its ID."""
    db_vital_sign = db.query(models.VitalSign).filter(models.VitalSign.vital_id == vital_id).first()
    if db_vital_sign:
        db.delete(db_vital_sign)
        db.commit()
        logger.info(f"Deleted vital sign record ID {vital_id}")
        return db_vital_sign
    logger.warning(f"Attempted to delete non-existent vital sign record ID {vital_id}")
    return None

# Potential future functions:
# def update_vital_sign(...)
# def get_vital_signs_in_range(...) 