from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum
from .medication import Medication as MedicationSchema
from .exam import Exam as ExamSchema
from pydantic.config import ConfigDict

# --- Enums for Categorical Fields ---
class Sex(str, Enum):
    MALE = "M"
    FEMALE = "F"
    OTHER = "O"
    UNKNOWN = "U"

class Ethnicity(str, Enum):
    WHITE = "branco"
    BLACK = "negro"
    BROWN = "pardo"
    INDIGENOUS = "indigena"
    ASIAN = "asiatico"
    OTHER = "outro"
    UNKNOWN = "desconhecido"

# --- Patient Schemas ---
class PatientBase(BaseModel):
    weight: Optional[float] = Field(None, gt=0, lt=500, description="Weight in kg")
    height: Optional[float] = Field(None, gt=0, lt=3, description="Height in meters")
    ethnicity: Optional[Ethnicity] = None
    admission_date: Optional[datetime] = None
    comorbidities: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    secondary_diagnosis: Optional[str] = None
    
    @field_validator('height')
    @classmethod
    def height_in_meters(cls, v):
        """Ensures height is stored in meters, converting if given in cm"""
        if v and v > 3:  # Assume value is in cm if > 3
            return v / 100
        return v

class PatientCreate(PatientBase):
    name: str
    birthDate: date
    gender: str
    group_id: Optional[int] = None  # Add optional group assignment

class PatientUpdate(PatientBase):
    # Core fields that can be updated
    name: Optional[str] = None
    birthDate: Optional[date] = None
    gender: Optional[str] = None

    # Additional fields beyond PatientBase that can be updated
    labs: Optional[str] = None
    medications: Optional[str] = None
    physical_exam: Optional[str] = None
    family_history: Optional[str] = None
    clinical_history: Optional[str] = None

class Patient(PatientBase):
    patient_id: int
    user_id: int
    name: str
    birthDate: date
    gender: str
    created_at: datetime
    updated_at: datetime
    exams: List[ExamSchema] = []
    medications: List[MedicationSchema] = []

    model_config = ConfigDict(from_attributes=True)

# Properties shared by models stored in DB
class PatientInDBBase(PatientBase):
    patient_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    # Include fields present in the DB model
    medications: List[MedicationSchema] = []
    exams: List[ExamSchema] = []

    model_config = ConfigDict(from_attributes=True)

# Properties to return to client
class PatientInDB(PatientInDBBase):
    pass

# Schema for patient summary in lists - Updated to match frontend Patient type
class PatientSummary(BaseModel):
    # Map backend fields to frontend field names
    id: int = Field(alias="patient_id")  # Frontend expects "id", backend has "patient_id"
    name: str
    age: Optional[int] = Field(None, alias="idade")  # Frontend expects "age", backend has "idade"
    gender: Optional[str] = Field(None, alias="sexo")  # Frontend expects "gender", backend has "sexo"
    diagnosis: Optional[str] = Field(None, alias="diagnostico")  # Frontend expects "diagnosis", backend has "diagnostico"
    status: Optional[str] = "Ambulatorial" # Default status, frontend expects this field
    lastUpdated: Optional[datetime] = Field(None, alias="data_internacao")  # Frontend expects "lastUpdated", backend has "data_internacao"
    
    # Additional fields required by frontend but not in backend - provide defaults
    lastNote: Optional[str] = None
    alert: Optional[str] = None
    riskScore: int = 0  # Default risk score
    hasAlerts: bool = False  # Default value
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            'fields': {
                'patient_id': 'id',
                'idade': 'age',
                'sexo': 'gender',
                'diagnostico': 'diagnosis',
                'data_internacao': 'lastUpdated'
            }
        }
    )

# Schema for paginated patient list response
class PatientListResponse(BaseModel):
    items: List[PatientSummary]
    total: int