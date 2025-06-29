from sqlalchemy.orm import Session
from sqlalchemy import desc, update
from typing import List, Optional, Tuple
from datetime import datetime

from database.models import Alert
import schemas.alert as alert_schemas
import logging

logger = logging.getLogger(__name__)

def create_alert(db: Session, alert_data: alert_schemas.AlertCreate, patient_id: int, creator_user_id: Optional[int] = None) -> Alert:
    """Creates a new alert record in the database."""
    
    db_alert_data = alert_data.model_dump()
    db_alert_data['patient_id'] = patient_id
    
    # Set created_by if provided, otherwise default to None or a system ID
    db_alert_data['created_by'] = creator_user_id 
    
    # User_id might be the assigned doctor or patient, needs logic to determine
    # For now, let's keep it as potentially None or set from creator if applicable
    if 'user_id' not in db_alert_data or db_alert_data['user_id'] is None:
         # Example: assign alert to creator if no specific recipient intended?
         # db_alert_data['user_id'] = creator_user_id
         pass # Keep as None for now

    db_alert = Alert(**db_alert_data)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    logger.info(f"Created alert ID {db_alert.alert_id} for patient {patient_id}")
    return db_alert

def get_alerts_for_patient(
    db: Session, 
    patient_id: int, 
    only_active: bool = True, 
    skip: int = 0, 
    limit: int = 100
) -> Tuple[List[Alert], int]:
    """Retrieves alerts for a specific patient with pagination and filtering."""
    
    query = db.query(Alert).filter(Alert.patient_id == patient_id)
    
    if only_active:
        # Filter for alerts that are not acknowledged or resolved (adjust status values as needed)
        query = query.filter(Alert.status == 'active') 
        
    total_count = query.count()
    
    items = (
        query
        .order_by(Alert.created_at.desc()) # Show newest first
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return items, total_count

def get_alert_by_id(db: Session, alert_id: int) -> Optional[Alert]:
    """Retrieves a single alert by its ID."""
    return db.query(Alert).filter(Alert.alert_id == alert_id).first()

def update_alert_status(db: Session, alert_id: int, update_data: alert_schemas.AlertUpdate, user_id: int) -> Optional[Alert]:
    """Updates the status of an alert (e.g., mark as read, change status)."""
    
    db_alert = get_alert_by_id(db, alert_id)
    if not db_alert:
        return None

    update_values = update_data.model_dump(exclude_unset=True)
    
    # Track who acknowledged/updated
    if 'is_read' in update_values and update_values['is_read']:
        if not db_alert.acknowledged_at: # Only set first acknowledgement time/user
             update_values['acknowledged_at'] = datetime.utcnow()
             # Store user ID or name based on requirements
             # Fetch user name? Or just store ID?
             update_values['acknowledged_by'] = str(user_id) # Store user ID as string for now
             
    # Allow updating status explicitly
    if 'status' in update_values:
        # Add validation for allowed status values if needed
        pass
        
    if not update_values:
        return db_alert # No changes

    db.execute(
        update(Alert)
        .where(Alert.alert_id == alert_id)
        .values(**update_values)
    )
    db.commit()
    db.refresh(db_alert)
    logger.info(f"Updated alert ID {alert_id} by user {user_id}. Changes: {update_values}")
    return db_alert

# TODO: Add functions like get_alerts_for_patient, update_alert_status etc.
# def get_alerts_for_patient(db: Session, patient_id: int, only_active: bool = True, skip: int = 0, limit: int = 100) -> Tuple[List[Alert], int]:
#     ... 