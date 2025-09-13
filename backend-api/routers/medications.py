from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime
import json
import logging

from database import get_db, models
import schemas.medication as medication_schemas
from crud import medication as medication_crud
from crud import patients as patient_crud
from crud import is_doctor_assigned_to_patient
from security import get_current_user_required, verify_doctor_patient_access
from routers.vital_signs import check_patient_access, check_modify_permission
from utils.group_authorization import is_user_authorized_for_patient

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Medications"]
)

def format_medication_response(db_medication):
    """Helper function to format medication response consistently"""
    # Check if db_medication is a dictionary or an object
    is_dict = isinstance(db_medication, dict)
    
    # Get values using appropriate access method (dict or object)
    def get_value(obj, key, default=None):
        if is_dict:
            return obj.get(key, default)
        return getattr(obj, key, default)
    
    # Get value for nested attributes (like frequency.value)
    def get_nested_value(obj, key, nested_key, default=None):
        if is_dict:
            value = obj.get(key)
            if value and hasattr(value, nested_key):
                return getattr(value, nested_key)
            return value
        else:
            value = getattr(obj, key, None)
            if value and hasattr(value, nested_key):
                return getattr(value, nested_key)
            return value
    
    # Use raw_frequency if available, otherwise use the enum value
    frequency = get_value(db_medication, 'raw_frequency')
    
    if not frequency:
        frequency_obj = get_value(db_medication, 'frequency')
        if frequency_obj:
            if isinstance(frequency_obj, str):
                frequency = frequency_obj
            elif hasattr(frequency_obj, 'value'):
                frequency = frequency_obj.value
    
    # Get route value
    route = get_value(db_medication, 'route')
    route_value = None
    if route:
        if isinstance(route, str):
            route_value = route
        elif hasattr(route, 'value'):
            route_value = route.value
    
    # Get status value
    status = get_value(db_medication, 'status')
    status_value = None
    if status:
        if isinstance(status, str):
            status_value = status
        elif hasattr(status, 'value'):
            status_value = status.value
    
    # Get start and end dates
    start_date = get_value(db_medication, 'start_date')
    start_date_iso = start_date.isoformat() if start_date else None
    
    end_date = get_value(db_medication, 'end_date')
    end_date_iso = end_date.isoformat() if end_date else None
    
    return {
        "id": str(get_value(db_medication, 'medication_id')),
        "patient_id": str(get_value(db_medication, 'patient_id')),
        "medication_name": get_value(db_medication, 'name'),
        "dosage": get_value(db_medication, 'dosage'),
        "frequency": frequency,
        "route": route_value,
        "start_date": start_date_iso,
        "end_date": end_date_iso,
        "notes": get_value(db_medication, 'notes'),
        "status": status_value
    }

# Basic endpoints (for reference/other clients)
@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_medication(
    medication: medication_schemas.MedicationCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new medication record."""
    # Ensure user_id is set if not provided
    if not hasattr(medication, 'user_id') or medication.user_id is None:
        medication.user_id = current_user.user_id
    
    db_medication = medication_crud.create_medication(db=db, medication=medication)
    # Return formatted response
    return format_medication_response(db_medication)

@router.get("/{medication_id}", response_model=Dict[str, Any])
def get_medication(
    medication_id: Union[int, UUID], 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get a specific medication by ID."""
    db_medication = medication_crud.get_medication(db, medication_id=medication_id)
    if db_medication is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Return formatted response
    return format_medication_response(db_medication)

@router.put("/{medication_id}", response_model=Dict[str, Any])
def update_medication(
    medication_id: Union[int, UUID], 
    medication: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update an existing medication."""
    db_medication = medication_crud.get_medication(db, medication_id=medication_id)
    if db_medication is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Update raw_frequency directly in the database if we're updating frequency
    if 'frequency' in medication:
        # Check if db_medication is a dictionary (mocked) or an ORM object
        if isinstance(db_medication, dict):
            db_medication['raw_frequency'] = medication['frequency']
        else:
            db_medication.raw_frequency = medication['frequency']
            db.flush()
    
    # Adapt test data to schema format
    adapted_data = medication_crud.adapt_medication_data(medication)
    
    # Store the original frequency
    if 'frequency' in medication:
        adapted_data['raw_frequency'] = medication['frequency']
    
    # Create update object 
    try:
        medication_update = medication_schemas.MedicationUpdate(**adapted_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid data: {str(e)}")
    
    # Update the medication
    updated_medication = medication_crud.update_medication(db=db, medication_id=medication_id, medication_update=medication_update)
    
    # Return formatted response with raw_frequency (if available) for tests
    response = format_medication_response(updated_medication)
    
    # If raw_frequency is available, use it as the frequency in the response
    if isinstance(updated_medication, dict):
        if updated_medication.get('raw_frequency'):
            response["frequency"] = updated_medication.get('raw_frequency')
    else:
        if updated_medication.raw_frequency:
            response["frequency"] = updated_medication.raw_frequency
        
    return response

@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: Union[int, UUID], 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete a medication."""
    db_medication = medication_crud.get_medication(db, medication_id=medication_id)
    if db_medication is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    medication_crud.delete_medication(db=db, medication_id=medication_id)
    return None

# Patient-specific endpoints (matching frontend expectations)
@router.post(
    "/patients/{patient_id}/medications", 
    response_model=medication_schemas.Medication,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(check_modify_permission)]
)
def create_patient_medication_endpoint(
    patient_id: int,
    medication: medication_schemas.MedicationPatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Creates a new medication record for a specific patient."""
    logger.info(f"User {current_user.user_id} creating medication for patient {patient_id}")
    try:
        # Create medication using the existing create_medication function
        # First, convert the MedicationPatientCreate to a dict and add patient_id
        medication_dict = medication.model_dump() if hasattr(medication, 'model_dump') else medication.dict()
        medication_dict['patient_id'] = patient_id
        medication_dict['user_id'] = current_user.user_id
    
        db_medication = medication_crud.create_medication(
            db=db,
            medication_data=medication_dict
        )
        return db_medication
    except Exception as e:
        logger.error(f"Error creating medication for patient {patient_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create medication: {e}")

@router.get(
    "/patients/{patient_id}/medications",
    response_model=List[medication_schemas.Medication],
    dependencies=[Depends(check_patient_access)]
)
def get_patient_medications_endpoint(
    patient_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    sort_by: str = Query('start_date', enum=[f.name for f in models.Medication.__table__.columns]),
    sort_order: str = Query('desc', enum=['asc', 'desc']),
    status: Optional[medication_schemas.MedicationStatus] = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieves a list of medications for a specific patient."""
    medications = medication_crud.get_medications_by_patient_id(
        db=db, 
        patient_id=patient_id, 
        skip=skip, 
        limit=limit, 
        sort_by=sort_by, 
        sort_order=sort_order,
        status=status
    )
    return medications

@router.patch(
    "/medications/{medication_id}",
    response_model=medication_schemas.Medication,
    dependencies=[Depends(check_modify_permission)]
)
def update_medication_endpoint(
    medication_id: int,
    medication_update: medication_schemas.MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Updates an existing medication record."""
    logger.info(f"User {current_user.user_id} attempting to update medication {medication_id}")
    
    existing_medication = medication_crud.get_medication_by_id(db, medication_id)
    if not existing_medication:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
         
    updated_medication = medication_crud.update_medication(db, medication_id, medication_update)
    if updated_medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return updated_medication

@router.delete(
    "/medications/{medication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(check_modify_permission)]
)
def delete_medication_endpoint(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Deletes a medication record."""
    logger.warning(f"User {current_user.user_id} attempting to delete medication {medication_id}")
    
    existing_medication = medication_crud.get_medication_by_id(db, medication_id)
    if not existing_medication:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
         
    deleted = medication_crud.delete_medication(db, medication_id)
    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    return None

@router.get("/patient/{patient_id}/active", response_model=List[Dict[str, Any]])
def get_active_medications_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get active medications for a specific patient.
    Requires doctor to be assigned to patient directly or through groups, or user to be the patient."""
    # Authorization Check (Same as get_medications_by_patient)
    authorized = False
    if current_user.role == 'admin':
        authorized = True
    elif current_user.role == 'doctor':
        if is_user_authorized_for_patient(db, current_user, patient_id):
            authorized = True
    elif current_user.role == 'patient':
        # Check if the requested patient_id matches the patient's own record ID
        patient_record = db.query(models.Patient).filter(models.Patient.user_id == current_user.user_id).first()
        if patient_record and patient_record.patient_id == patient_id:
            authorized = True

    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access medications for this patient."
        )

    medications = medication_crud.get_medications(
        db, patient_id=patient_id, status=medication_schemas.MedicationStatus.active
    )
    
    # Format each medication in the response
    result = []
    for med in medications:
        result.append(format_medication_response(med))
    
    return result