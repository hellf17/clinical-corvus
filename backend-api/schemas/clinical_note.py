from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from typing import List, Optional
from datetime import datetime
from enum import Enum

class NoteType(str, Enum):
    PROGRESS = "progress"
    ADMISSION = "admission"
    DISCHARGE = "discharge"
    PROCEDURE = "procedure"
    CONSULTATION = "consultation"
    EVOLUTION = "evolution"
    OTHER = "other"

class ClinicalNoteBase(BaseModel):
    title: str
    content: str
    note_type: NoteType = NoteType.PROGRESS

class ClinicalNoteCreate(ClinicalNoteBase):
    patient_id: Any

class ClinicalNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    note_type: Optional[NoteType] = None

class ClinicalNote(ClinicalNoteBase):
    id: Any
    patient_id: Any
    user_id: Any
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClinicalNoteList(BaseModel):
    notes: List[ClinicalNote]
    total: int 