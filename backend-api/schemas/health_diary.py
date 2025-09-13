from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class HealthDiaryEntryBase(BaseModel):
    entry_date: date
    mood: Optional[str] = None # Could use Enum later
    symptoms: Optional[str] = None
    activity_level: Optional[str] = None # Could use Enum/Scale later
    notes: Optional[str] = None

class HealthDiaryEntryCreate(HealthDiaryEntryBase):
    entry_date: date = Field(default_factory=date.today)

class HealthDiaryEntryUpdate(HealthDiaryEntryBase):
    # Allow partial updates
    entry_date: Optional[date] = None
    mood: Optional[str] = None
    symptoms: Optional[str] = None
    activity_level: Optional[str] = None
    notes: Optional[str] = None

class HealthDiaryEntry(HealthDiaryEntryBase):
    entry_id: int
    user_id: int # Associated user (patient)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HealthDiaryEntryList(BaseModel):
    entries: list[HealthDiaryEntry]

class PaginatedHealthDiaryResponse(BaseModel):
    items: List[HealthDiaryEntry]
    total: int 