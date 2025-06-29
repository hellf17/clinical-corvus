from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic import field_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum
from .medication import Medication as MedicationSchema
from .exam import Exam as ExamSchema

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
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    birthDate: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    idade: Optional[int] = Field(None, ge=0, le=120, description="Age in years")
    sexo: Optional[Sex] = None
    peso: Optional[float] = Field(None, gt=0, lt=500, description="Weight in kg")
    altura: Optional[float] = Field(None, gt=0, lt=3, description="Height in meters")
    etnia: Optional[Ethnicity] = None
    data_internacao: Optional[datetime] = None
    diagnostico: Optional[str] = Field(None, validation_alias='diagnosis')
    primary_diagnosis: Optional[str] = None
    
    @field_validator('altura')
    @classmethod
    def altura_in_meters(cls, v):
        """Ensures altura is stored in meters, converting if given in cm"""
        if v and v > 3:  # Assume value is in cm if > 3
            return v / 100
        return v

class PatientCreate(PatientBase):
    name: str
    email: EmailStr
    birthDate: date
    gender: str
    phone: str

class PatientUpdate(PatientBase):
    # Additional fields beyond PatientBase that can be updated
    exames: Optional[str] = None
    medicacoes: Optional[str] = None
    exame_fisico: Optional[str] = None
    historia_familiar: Optional[str] = None
    historia_clinica: Optional[str] = None

class Patient(PatientBase):
    patient_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    exams: List[ExamSchema] = []
    medications: List[MedicationSchema] = []

    model_config = ConfigDict(from_attributes=True)

class PatientSummary(BaseModel):
    patient_id: int
    name: str
    idade: Optional[int] = None
    sexo: Optional[Sex] = None
    diagnostico: Optional[str] = None
    data_internacao: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Properties shared by models stored in DB
class PatientInDBBase(PatientBase):
    patient_id: int
    user_id: int
    name: str
    created_at: datetime
    updated_at: datetime
    # Include fields present in the DB model
    medications: List[MedicationSchema] = []
    exams: List[ExamSchema] = []

    model_config = ConfigDict(from_attributes=True)

# Properties to return to client
class PatientInDB(PatientInDBBase):
    pass

# Schema for patient summary in lists
class PatientSummary(BaseModel):
    patient_id: int
    name: str
    diagnostico: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Schema for paginated patient list response
class PatientListResponse(BaseModel):
    items: List[PatientSummary]
    total: int 