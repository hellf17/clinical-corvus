from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from sqlalchemy import desc, func, case
from uuid import UUID # Ensure UUID is imported if used by other functions

# Corrected import
from database.models import ClinicalNote
# Corrected import for schemas
import schemas.clinical_note as clinical_note_schemas


def get_notes(
    db: Session, 
    patient_id: int, 
    skip: int = 0,
    limit: int = 100
) -> List[ClinicalNote]:
    """
    Get all clinical notes for a patient.
    """
    return db.query(ClinicalNote).filter(
        ClinicalNote.patient_id == patient_id
    ).order_by(
        ClinicalNote.created_at.desc()
    ).offset(skip).limit(limit).all()


def get_note(db: Session, note_id: int) -> Optional[ClinicalNote]:
    """
    Get a specific clinical note by ID.
    """
    return db.query(ClinicalNote).filter(ClinicalNote.id == note_id).first()


def create_note(
    db: Session, 
    note: clinical_note_schemas.ClinicalNoteCreate, 
    user_id: int,
    patient_id: int = None
) -> ClinicalNote:
    """
    Create a new clinical note.
    
    Args:
        db: Database session
        note: Clinical note data
        user_id: User ID of the creator
        patient_id: Optional patient ID (will override the one in note)
        
    Returns:
        Created ClinicalNote instance
    """
    # Convert Pydantic model to dict, handle both Pydantic v1 and v2
    try:
        # Try Pydantic v2 approach first
        note_data = note.model_dump()
    except AttributeError:
        # Fall back to Pydantic v1 approach
        note_data = note.dict()
    
    # Add the user ID
    note_data["user_id"] = user_id
    
    # Override patient_id if provided
    if patient_id is not None:
        note_data["patient_id"] = patient_id
    
    # Create SQLAlchemy model instance
    db_note = ClinicalNote(**note_data)
    
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    return db_note


def update_note(
    db: Session, 
    note_id: int, 
    note_update: clinical_note_schemas.ClinicalNoteUpdate
) -> Optional[ClinicalNote]:
    """
    Update an existing clinical note.
    """
    # Get the existing note
    db_note = get_note(db, note_id=note_id)
    
    if db_note is None:
        return None
    
    # Extract only set fields from the update model, handle both Pydantic v1 and v2
    try:
        # Try Pydantic v2 approach first
        try:
            update_data = note_update.model_dump(exclude_unset=True)
        except TypeError:
            # Fall back to v2 without exclude_unset if not supported
            update_data = note_update.model_dump()
    except AttributeError:
        # Fall back to Pydantic v1 approach
        try:
            update_data = note_update.dict(exclude_unset=True)
        except TypeError:
            # Fall back to v1 without exclude_unset if not supported
            update_data = note_update.dict()
    
    # Update the fields
    for key, value in update_data.items():
        setattr(db_note, key, value)
    
    # Update the updated_at timestamp
    db_note.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_note)
    
    return db_note


def delete_note(db: Session, note_id: int) -> bool:
    """
    Delete a clinical note.
    Returns True if the note was deleted, False if it wasn't found.
    """
    db_note = get_note(db, note_id=note_id)
    
    if db_note is None:
        return False
    
    db.delete(db_note)
    db.commit()
    
    return True


# Alias for compatibility with existing tests
create_clinical_note = create_note 