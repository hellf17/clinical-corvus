from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union, Any
from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic.config import ConfigDict

class MedicationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"

class MedicationRoute(str, Enum):
    ORAL = "oral"
    INTRAVENOUS = "intravenous"
    INTRAMUSCULAR = "intramuscular"
    SUBCUTANEOUS = "subcutaneous"
    INHALATION = "inhalation"
    TOPICAL = "topical"
    RECTAL = "rectal"
    OTHER = "other"

class MedicationFrequency(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    BID = "bid"  # twice a day
    TID = "tid"  # three times a day
    QID = "qid"  # four times a day
    CONTINUOUS = "continuous"
    AS_NEEDED = "as_needed"
    OTHER = "other"

class MedicationBase(BaseModel):
    name: str
    dosage: str
    route: MedicationRoute
    frequency: MedicationFrequency
    raw_frequency: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    status: MedicationStatus = MedicationStatus.ACTIVE
    instructions: Optional[str] = None
    notes: Optional[str] = None

class MedicationPatientCreate(MedicationBase):
    # Não inclui patient_id, pois será obtido da URL
    pass

class MedicationCreate(MedicationBase):
    patient_id: Union[int, str, UUID]  # Accept int, str, or UUID for patient_id
    user_id: Union[int, str, UUID]  # Accept int, str, or UUID for user_id
    
    @field_validator('patient_id', 'user_id', mode='before')
    @classmethod
    def validate_id(cls, v, info):
        # Allow integer IDs (e.g., from SQLite tests)
        if isinstance(v, int):
            return v
        # Allow UUID strings or UUID objects
        try:
            if isinstance(v, str):
                return UUID(v)
            if isinstance(v, UUID):
                 return v
        except (ValueError, TypeError):
            pass # Let Pydantic handle the final validation
        # If not int or valid UUID string/object, raise error or let Pydantic handle
        raise ValueError(f"Invalid ID format: {v}")

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    route: Optional[MedicationRoute] = None
    frequency: Optional[MedicationFrequency] = None
    raw_frequency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[MedicationStatus] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None

class Medication(MedicationBase):
    medication_id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    user_id: int

    model_config = ConfigDict(from_attributes=True)

class MedicationList(BaseModel):
    medications: List[Medication]
    total: int 