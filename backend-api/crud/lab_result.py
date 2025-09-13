"""
Lab Result CRUD operations.

This module provides CRUD operations for lab results.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.models import LabResult
import logging

logger = logging.getLogger(__name__)


class LabResultCRUD:
    """CRUD operations for LabResult model."""

    def get_by_patient_id(self, db: Session, patient_id: int, limit: int = 10) -> List[LabResult]:
        """Get lab results for a specific patient."""
        return (
            db.query(LabResult)
            .filter(LabResult.patient_id == patient_id)
            .order_by(desc(LabResult.timestamp))
            .limit(limit)
            .all()
        )

    def get(self, db: Session, result_id: int) -> Optional[LabResult]:
        """Get a lab result by ID."""
        return db.query(LabResult).filter(LabResult.result_id == result_id).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[LabResult]:
        """Get multiple lab results."""
        return db.query(LabResult).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in) -> LabResult:
        """Create a new lab result."""
        db_obj = LabResult(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: LabResult, obj_in) -> LabResult:
        """Update a lab result."""
        update_data = obj_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, result_id: int) -> bool:
        """Remove a lab result."""
        obj = db.query(LabResult).filter(LabResult.result_id == result_id).first()
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False


# Create instance for easy import
lab_result = LabResultCRUD()