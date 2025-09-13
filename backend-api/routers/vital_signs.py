from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from database import models
import schemas.vital_sign as vital_sign_schemas
from crud import crud_vital_sign
from database import get_db
from security import get_current_user_required
from crud import patients as crud_patients
from utils.group_authorization import is_user_authorized_for_patient

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["vital-signs"],
)

# Dependency to check if the current user can access/modify patient data
async def check_patient_access(
    patient_id: int,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    # Check if user is admin
    if current_user.role == "admin":
        return True

    # Check if user is the patient themselves
    patient_profile = await crud_patients.get_patient_profile_by_user_id(db, user_id=current_user.user_id)
    if patient_profile and patient_profile.patient_id == patient_id:
        return True
        
    # Check if user is a managing doctor for the patient (direct or through groups)
    if current_user.role == "doctor":
        if is_user_authorized_for_patient(db, current_user, patient_id):
            return True

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this patient's data")

# Dependency to check if user has permission to modify (doctor or admin)
async def check_modify_permission( 
    current_user: models.User = Depends(get_current_user_required)
):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires doctor or admin role")
    return True

@router.post("/patients/{patient_id}/vital_signs", response_model=vital_sign_schemas.VitalSign, status_code=status.HTTP_201_CREATED)
def create_patient_vital_sign(
    patient_id: int,
    vital_sign: vital_sign_schemas.VitalSignCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    _=Depends(check_modify_permission)
):
    """Records a new set of vital signs for a specific patient."""
    logger.info(f"User {current_user.user_id} creating vital sign for patient {patient_id}")
    try:
        db_vital_sign = crud_vital_sign.create_vital_sign(db=db, vital_sign=vital_sign, patient_id=patient_id)
        return db_vital_sign
    except Exception as e:
        logger.error(f"Error creating vital sign for patient {patient_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create vital sign record.")

@router.get("/patients/{patient_id}/vital_signs", response_model=List[vital_sign_schemas.VitalSign])
def read_patient_vital_signs(
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(check_patient_access)
):
    """Retrieves a list of vital sign records for a specific patient."""
    vital_signs = crud_vital_sign.get_vital_signs_for_patient(db=db, patient_id=patient_id, skip=skip, limit=limit)
    return vital_signs

@router.delete("/vital_signs/{vital_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_vital_sign(
    vital_id: int,
    db: Session = Depends(get_db),
    _=Depends(check_modify_permission)
):
    """Deletes a specific vital sign record."""
    deleted_vital = crud_vital_sign.delete_vital_sign(db=db, vital_id=vital_id)
    if deleted_vital is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital sign record not found")
    return None
