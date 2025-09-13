from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

from database.models import ExamStatus # Import Enum
from .lab_result import LabResult as LabResultSchema # For nesting in response

class ExamBase(BaseModel):
    patient_id: int
    user_id: int # User who uploaded/initiated
    exam_timestamp: datetime # Actual date/time of the exam from PDF or report
    exam_type: Optional[str] = None # E.g., "Blood Panel", "Urinalysis"
    source_file_name: Optional[str] = None
    source_file_path: Optional[str] = None # Path to archived PDF, if stored
    processing_status: ExamStatus = ExamStatus.PENDING
    processing_log: Optional[str] = None

class ExamCreate(BaseModel):
    # patient_id and user_id will be passed as path/dependency parameters in the route
    exam_timestamp: datetime
    exam_type: Optional[str] = None
    source_file_name: Optional[str] = None
    # source_file_path: Optional[str] = None # Usually set by server after saving file
    # processing_status: ExamStatus = ExamStatus.PENDING # Defaulted in model or CRUD
    # processing_log: Optional[str] = None

class ExamUpdate(BaseModel):
    exam_timestamp: Optional[datetime] = None
    exam_type: Optional[str] = None
    source_file_name: Optional[str] = None
    source_file_path: Optional[str] = None
    processing_status: Optional[ExamStatus] = None
    processing_log: Optional[str] = None

class Exam(ExamBase): # Schema for reading/returning exam data
    exam_id: int
    upload_timestamp: datetime
    created_at: datetime
    updated_at: datetime
    lab_results: List[LabResultSchema] = [] # Include associated lab results

    model_config = ConfigDict(from_attributes=True)

class ExamWithLabResults(Exam): # Alias for clarity if needed, or just use Exam
    pass

class ExamListResponse(BaseModel):
    exams: List[Exam]
    total: int