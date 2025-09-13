from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database.models import Exam, User, Patient, ExamStatus
import schemas.exam as exam_schemas

def get_exam(db: Session, exam_id: int) -> Optional[Exam]:
    """Retrieve a single exam by its ID."""
    return db.query(Exam).filter(Exam.exam_id == exam_id).first()

def get_exams_by_patient(db: Session, patient_id: int, skip: int = 0, limit: int = 100) -> (List[Exam], int):
    """Retrieve paginated exams for a specific patient and the total count."""
    query = db.query(Exam).filter(Exam.patient_id == patient_id)
    total = query.count()
    exams = query.order_by(Exam.exam_timestamp.desc()).offset(skip).limit(limit).all()
    return exams, total

def create_exam(db: Session, exam_data: exam_schemas.ExamCreate, patient_id: int, user_id: int) -> Exam:
    """Create a new exam record."""
    db_exam = Exam(
        **exam_data.model_dump(), 
        patient_id=patient_id, 
        user_id=user_id, # This is the uploader/initiator
        upload_timestamp=datetime.utcnow() # Ensure upload_timestamp is set
    )
    # Ensure exam_timestamp is part of exam_data and is set, otherwise default or raise
    if not db_exam.exam_timestamp:
        # Decide on default behavior: error or default to upload_timestamp or now()
        # For now, let's assume exam_data schema ensures it or it's handled before this call
        # If it can be None and should default, add: db_exam.exam_timestamp = datetime.utcnow()
        pass 

    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def update_exam_status(db: Session, exam_id: int, status: ExamStatus, processing_log: Optional[str] = None) -> Optional[Exam]:
    """Update the processing status and log of an exam."""
    db_exam = get_exam(db, exam_id)
    if db_exam:
        db_exam.processing_status = status
        if processing_log:
            db_exam.processing_log = processing_log
        db_exam.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_exam)
    return db_exam

def update_exam(db: Session, exam_id: int, exam_update_data: exam_schemas.ExamUpdate) -> Optional[Exam]:
    """Update details of an existing exam."""
    db_exam = get_exam(db, exam_id)
    if db_exam:
        update_data = exam_update_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_exam, key, value)
        db_exam.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_exam)
    return db_exam

def delete_exam(db: Session, exam_id: int) -> Optional[Exam]:
    """Delete an exam record."""
    # Note: Consider implications for associated LabResults (cascade delete is set up in model)
    db_exam = get_exam(db, exam_id)
    if db_exam:
        db.delete(db_exam)
        db.commit()
    return db_exam 