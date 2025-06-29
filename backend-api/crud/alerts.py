from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from database.models import Alert, Patient, User, doctor_patient_association
import schemas.alert as alert_schemas
from .associations import is_doctor_assigned_to_patient
from typing import List, Optional, Tuple
from datetime import datetime

def create_alert(db: Session, alert: alert_schemas.AlertCreate) -> Alert:
    """
    Create a new alert in the database.
    
    Args:
        db: Database session
        alert: Alert data
        
    Returns:
        The created alert
    """
    db_alert = Alert(
        patient_id=alert.patient_id,
        alert_type=alert.alert_type if hasattr(alert, 'alert_type') else None,
        message=alert.message,
        severity=alert.severity,
        parameter=alert.parameter if hasattr(alert, 'parameter') else None,
        category=alert.category if hasattr(alert, 'category') else None,
        value=alert.value if hasattr(alert, 'value') else None,
        reference=alert.reference if hasattr(alert, 'reference') else None,
        status=alert.status if hasattr(alert, 'status') else "active",
        interpretation=alert.interpretation if hasattr(alert, 'interpretation') else None,
        recommendation=alert.recommendation if hasattr(alert, 'recommendation') else None,
        is_read=False,
        created_at=datetime.now(),
        created_by=alert.created_by if hasattr(alert, 'created_by') else None,
        user_id=alert.user_id if hasattr(alert, 'user_id') else None,
        details=alert.details if hasattr(alert, 'details') else None
    )
    
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    return db_alert

def get_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """
    Get an alert by ID.
    
    Args:
        db: Database session
        alert_id: Alert ID
        
    Returns:
        The alert or None if not found
    """
    return db.query(Alert).filter(Alert.alert_id == alert_id).first()

def get_alerts_by_patient_id(db: Session, patient_id: int, limit: int = 100, skip: int = 0) -> List[Alert]:
    """
    Get all alerts for a specific patient.
    
    Args:
        db: Database session
        patient_id: Patient ID
        limit: Maximum number of alerts to return
        skip: Number of alerts to skip
        
    Returns:
        List of alerts
    """
    return db.query(Alert).filter(Alert.patient_id == patient_id).order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

def get_alerts_by_user_and_status(
    db: Session,
    user_id: int,
    is_read: bool,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Alert], int]:
    """
    Get alerts for a specific user, filtered by read status, with pagination.
    
    Args:
        db: Database session
        user_id: User ID
        is_read: If provided, filters alerts by read status
        skip: Number of alerts to skip
        limit: Maximum number of alerts to return
        
    Returns:
        Tuple containing list of alerts and total count
    """
    query = db.query(Alert).filter(Alert.user_id == user_id)
    
    query = query.filter(Alert.is_read == is_read)
    
    total = query.count()
    
    alerts = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
    return alerts, total

def get_alerts(
    db: Session,
    current_user: User,
    status: Optional[str] = None,
    patient_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 10
) -> Tuple[List[Alert], int]:
    """
    Get alerts based on user role and assignments, with optional filters.
    - Doctors see alerts for their assigned patients.
    - Patients see alerts for themselves.
    Includes patient name.
    """
    query = db.query(Alert, Patient.name.label("patient_name")) \
              .outerjoin(Patient, Alert.patient_id == Patient.patient_id)

    if current_user.role == 'doctor':
        # Filter alerts for patients assigned to this doctor
        query = query.join(
            doctor_patient_association, 
            Alert.patient_id == doctor_patient_association.c.patient_patient_id
        ).filter(doctor_patient_association.c.doctor_user_id == current_user.user_id)
        
        # If a specific patient_id is requested, ensure doctor has access (redundant check if already joined)
        if patient_id is not None:
             query = query.filter(Alert.patient_id == patient_id) # Already filtered by join

    elif current_user.role == 'patient':
        # Filter alerts for the patient themselves
        # Find the patient record linked to the user
        patient_record = db.query(Patient.patient_id).filter(Patient.user_id == current_user.user_id).first()
        if patient_record:
            query = query.filter(Alert.patient_id == patient_record.patient_id)
            # If specific patient_id requested, ensure it matches their own ID
            if patient_id is not None and patient_id != patient_record.patient_id:
                 # Requesting specific patient ID that isn't theirs - return empty
                 return [], 0 
        else:
            # Patient user has no linked patient record - return empty
             return [], 0
        
    else: # Other roles (guest, admin?) - For now, return empty. Adjust if needed.
        return [], 0

    # Apply status filter
    if status == 'read':
        query = query.filter(Alert.is_read == True)
    elif status == 'unread':
        query = query.filter(Alert.is_read == False)
    
    # Clone the query for counting before applying limit/offset
    count_query = query.with_entities(func.count(Alert.alert_id)) 
    total = count_query.scalar() or 0 # Handle potential None scalar

    # Apply ordering, offset, and limit for the final results
    results = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
    
    alerts_with_name = []
    for alert_obj, patient_name_str in results:
        alert_obj.patient_name = patient_name_str # Assign patient name dynamically
        alerts_with_name.append(alert_obj)

    return alerts_with_name, total

def mark_alert_as_read(db: Session, alert_id: int, user: User) -> Optional[Alert]:
    """Marks a specific alert as read. Requires user to have access to the alert's patient."""
    db_alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()

    if not db_alert:
        return None # Alert not found
    
    # Authorization Check
    patient_id = db_alert.patient_id
    authorized = False
    if user.role == 'doctor':
        if is_doctor_assigned_to_patient(db, doctor_user_id=user.user_id, patient_patient_id=patient_id):
            authorized = True
    elif user.role == 'patient':
        patient_record = db.query(Patient.patient_id).filter(Patient.user_id == user.user_id).first()
        if patient_record and patient_record.patient_id == patient_id:
            authorized = True
    
    if not authorized:
        # Raise exception or return None to indicate lack of authorization
        # Returning None might be confused with alert not found, so exception is clearer
        raise PermissionError("User not authorized to modify this alert.")

    # Proceed with marking as read if authorized
    if not db_alert.is_read:
        db_alert.is_read = True
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
    
    return db_alert

def update_alert(db: Session, alert_id: int, alert_update: alert_schemas.AlertUpdate) -> Optional[Alert]:
    """
    Update an alert.
    
    Args:
        db: Database session
        alert_id: Alert ID
        alert_update: Alert update data
        
    Returns:
        The updated alert or None if not found
    """
    db_alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    
    if not db_alert:
        return None
    
    # Update fields
    update_data = alert_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_alert, key, value)
    
    db.commit()
    db.refresh(db_alert)
    
    return db_alert

def delete_alert(db: Session, alert_id: int) -> bool:
    """
    Delete an alert.
    
    Args:
        db: Database session
        alert_id: Alert ID
        
    Returns:
        True if the alert was deleted, False otherwise
    """
    db_alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    
    if not db_alert:
        return False
    
    db.delete(db_alert)
    db.commit()
    
    return True 