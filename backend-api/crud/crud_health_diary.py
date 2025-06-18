from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional, Tuple
from datetime import date, datetime

# from database import models
import database.models as models # Corrected
# from schemas import health_diary as schemas
import schemas.health_diary as health_diary_schemas # Corrected
# from database.models import HealthDiaryEntry, User, Patient


def get_diary_entry(
    db: Session, entry_id: int, user_id: int
) -> Optional[models.HealthDiaryEntry]:
    """Retrieve a specific diary entry by ID for a specific user."""
    return (
        db.query(models.HealthDiaryEntry)
        .filter(models.HealthDiaryEntry.entry_id == entry_id, models.HealthDiaryEntry.user_id == user_id)
        .first()
    )

def get_diary_entries_by_user(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> Tuple[List[models.HealthDiaryEntry], int]:
    """Retrieve diary entries for a specific user with pagination, ordered by date descending."""
    
    query = (
        db.query(models.HealthDiaryEntry)
        .filter(models.HealthDiaryEntry.user_id == user_id)
        .order_by(desc(models.HealthDiaryEntry.created_at))
    )
    
    total_count = query.count()
    
    items = query.offset(skip).limit(limit).all()
    
    return items, total_count

def get_diary_entries(db: Session, user_id: int, limit: int = 20) -> List[models.HealthDiaryEntry]:
    """
    Retrieve the most recent health diary entries for a specific user (patient).
    """
    return (
        db.query(models.HealthDiaryEntry)
        .filter(models.HealthDiaryEntry.user_id == user_id)
        .order_by(models.HealthDiaryEntry.created_at.desc())
        .limit(limit)
        .all()
    )

def create_diary_entry(db: Session, user_id: int, entry_data: health_diary_schemas.HealthDiaryEntryCreate) -> models.HealthDiaryEntry:
    """
    Create a new health diary entry for a specific user (patient).
    """
    db_entry = models.HealthDiaryEntry(
        user_id=user_id,
        content=entry_data.content,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def update_diary_entry(
    db: Session, entry_id: int, entry_update: health_diary_schemas.HealthDiaryEntryUpdate, user_id: int
) -> Optional[models.HealthDiaryEntry]:
    """Update an existing diary entry for a specific user."""
    db_entry = get_diary_entry(db, entry_id=entry_id, user_id=user_id)
    if not db_entry:
        return None

    update_data = entry_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_entry, key, value)

    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def delete_diary_entry(db: Session, entry_id: int, user_id: int) -> Optional[models.HealthDiaryEntry]:
    """Delete a specific diary entry for a specific user."""
    db_entry = get_diary_entry(db, entry_id=entry_id, user_id=user_id)
    if not db_entry:
        return None
    db.delete(db_entry)
    db.commit()
    return db_entry 