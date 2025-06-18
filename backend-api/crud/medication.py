from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime

from database.models import Medication
import schemas.medication as medication_schemas


def get_medications(
    db: Session, 
    patient_id: Union[int, UUID], 
    status: Optional[medication_schemas.MedicationStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Medication]:
    """
    Get all medications for a patient, optionally filtered by status.
    """
    query = db.query(Medication).filter(Medication.patient_id == patient_id)
    
    if status is not None:
        query = query.filter(Medication.status == status)
    
    return query.order_by(Medication.updated_at.desc()).offset(skip).limit(limit).all()


def get_medications_by_patient(
    db: Session, 
    patient_id: Union[int, UUID], 
    status: Optional[medication_schemas.MedicationStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Medication]:
    """
    Alias for get_medications, for backward compatibility.
    """
    return get_medications(db, patient_id, status, skip, limit)


def get_medication(db: Session, medication_id: Union[int, UUID]) -> Optional[Medication]:
    """
    Get a specific medication by ID.
    """
    return db.query(Medication).filter(Medication.medication_id == medication_id).first()


# Alias for backward compatibility
def get_medication_by_id(db: Session, medication_id: Union[int, UUID]) -> Optional[Medication]:
    """
    Alias for get_medication, for backward compatibility.
    """
    return get_medication(db, medication_id)


def create_medication(
    db: Session, 
    medication=None,
    patient_id=None,
    user_id=None,
    medication_data=None
) -> Medication:
    """
    Create a new medication record.
    
    Args:
        db: Database session
        medication: Medication data in Pydantic model
        patient_id: Optional patient ID when not using a Pydantic model
        user_id: Optional user ID when not using a Pydantic model
        medication_data: Optional dictionary with medication data
        
    Returns:
        Created Medication instance
        
    Raises:
        ValueError: If end_date is earlier than start_date or if required data is missing
    """
    # Handle both function signatures
    if medication is None and medication_data is not None:
        # Creating from raw data with patient_id and user_id
        if patient_id is None or user_id is None:
            raise ValueError("patient_id and user_id are required when using medication_data")
            
        # Add patient_id and user_id to medication_data
        medication_data_copy = medication_data.copy()
        medication_data_copy["patient_id"] = patient_id
        medication_data_copy["user_id"] = user_id
        
        # Create Pydantic model if dictionary was provided
        try:
            # from schemas import MedicationCreate
            medication = medication_schemas.MedicationCreate(**medication_data_copy)
        except Exception as e:
            raise ValueError(f"Invalid medication data: {str(e)}")
    
    if medication is None:
        raise ValueError("Either medication or medication_data with patient_id and user_id must be provided")
        
    # Validate dates
    if medication.end_date and medication.start_date and medication.end_date < medication.start_date:
        raise ValueError("End date cannot be before start date")
    
    # Convert Pydantic model to dict, handle both Pydantic v1 and v2
    try:
        # Try Pydantic v2 approach first
        medication_data = medication.model_dump()
    except AttributeError:
        # Fall back to Pydantic v1 approach
        medication_data = medication.dict()
    
    # Remove fields that don't exist in the database model
    if 'instructions' in medication_data:
        medication_data.pop('instructions')
    
    # Ensure raw_frequency is set if provided
    if 'raw_frequency' in medication_data and medication_data['raw_frequency']:
        # Use the provided raw frequency
        pass
    elif hasattr(medication, 'frequency_text'):
        # If frequency_text exists, use it for raw_frequency
        medication_data['raw_frequency'] = medication.frequency_text
    
    # Create SQLAlchemy model instance
    db_medication = Medication(**medication_data)
    
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    
    return db_medication


def update_medication(
    db: Session, 
    medication_id: Union[int, UUID], 
    medication_update: Union[medication_schemas.MedicationUpdate, Dict[str, Any]] = None,
    **kwargs
) -> Medication:
    """
    Update an existing medication record.
    
    Args:
        db: Database session
        medication_id: ID of the medication to update 
        medication_update: Updated data as Pydantic model or dict
        
    Returns:
        Updated Medication instance
        
    Raises:
        ValueError: If end_date is earlier than start_date or if status is not valid
    """
    db_medication = get_medication_by_id(db, medication_id=medication_id)
    
    if db_medication is None:
        return None
    
    # Handle the case where the parameter is passed as a keyword arg
    if medication_update is None:
        if 'medication_update' in kwargs:
            medication_update = kwargs['medication_update']
        elif 'medication_data' in kwargs:
            medication_update = kwargs['medication_data']
    
    # Convert Pydantic model to dict if needed
    if hasattr(medication_update, "model_dump"):
        # Pydantic v2 approach
        update_data = medication_update.model_dump(exclude_unset=True)
    elif hasattr(medication_update, "dict"):
        # Pydantic v1 approach
        update_data = medication_update.dict(exclude_unset=True)
    else:
        # Already a dict
        update_data = medication_update
    
    # Check if update_data is None (no valid data provided)
    if update_data is None:
        raise ValueError("No update data provided")
    
    # Validate dates
    if 'end_date' in update_data and update_data['end_date']:
        start_date = update_data.get('start_date', db_medication.start_date)
        if update_data['end_date'] < start_date:
            raise ValueError("End date cannot be before start date")
    
    # Validate enum values
    if 'status' in update_data:
        # Check if the status value is valid
        if isinstance(update_data['status'], str):
            try:
                # Try to convert string to enum if it's a string
                valid_statuses = [s.value for s in medication_schemas.MedicationStatus]
                if update_data['status'] not in valid_statuses:
                    raise ValueError(f"Invalid status. Valid values are: {', '.join(valid_statuses)}")
                # Convert to enum if it's a valid string
                update_data['status'] = medication_schemas.MedicationStatus(update_data['status'])
            except (ValueError, AttributeError) as e:
                raise ValueError(f"Invalid status: {str(e)}")
    
    if 'route' in update_data:
        if isinstance(update_data['route'], str):
            try:
                valid_routes = [r.value for r in medication_schemas.MedicationRoute]
                if update_data['route'] not in valid_routes:
                    raise ValueError(f"Invalid route. Valid values are: {', '.join(valid_routes)}")
                update_data['route'] = medication_schemas.MedicationRoute(update_data['route'])
            except (ValueError, AttributeError) as e:
                raise ValueError(f"Invalid route: {str(e)}")
    
    if 'frequency' in update_data:
        if isinstance(update_data['frequency'], str):
            try:
                valid_frequencies = [f.value for f in medication_schemas.MedicationFrequency]
                if update_data['frequency'] not in valid_frequencies:
                    raise ValueError(f"Invalid frequency. Valid values are: {', '.join(valid_frequencies)}")
                update_data['frequency'] = medication_schemas.MedicationFrequency(update_data['frequency'])
            except (ValueError, AttributeError) as e:
                raise ValueError(f"Invalid frequency: {str(e)}")
    
    # Update the fields
    for key, value in update_data.items():
        setattr(db_medication, key, value)
    
    # Update the updated_at timestamp
    db_medication.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_medication)
    
    return db_medication


def delete_medication(db: Session, medication_id: Union[int, UUID]) -> bool:
    """
    Delete a medication.
    Returns:
        bool: True if deletion was successful, False if medication not found.
    """
    db_medication = get_medication(db, medication_id=medication_id)
    
    if db_medication:
        db.delete(db_medication)
        db.commit()
        return True
    
    return False


# Helper function to adapt test medication data to schema format
def adapt_medication_data(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adapts medication data from test format to schema format.
    
    Handles:
    - "medication_name" -> "name"
    - "frequency" string to enum conversion
    - Adds default "route" when missing
    
    Args:
        test_data: Medication data in test format
        
    Returns:
        Medication data in schema format
    """
    adapted_data = test_data.copy()
    
    # Handle medication_name -> name conversion
    if "medication_name" in adapted_data:
        adapted_data["name"] = adapted_data.pop("medication_name")
    
    # Preserve original frequency as raw_frequency for API response
    if "frequency" in adapted_data:
        adapted_data["raw_frequency"] = adapted_data["frequency"]
        freq = adapted_data["frequency"].lower()
        if "once daily" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.DAILY
        elif "twice daily" in freq or "bid" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.BID
        elif "three times" in freq or "tid" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.TID
        elif "four times" in freq or "qid" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.QID
        elif "as needed" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.AS_NEEDED
        elif "continuous" in freq:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.CONTINUOUS
        else:
            adapted_data["frequency"] = medication_schemas.MedicationFrequency.OTHER
    
    # Add default route if missing
    if "route" not in adapted_data:
        adapted_data["route"] = medication_schemas.MedicationRoute.ORAL
    
    return adapted_data 