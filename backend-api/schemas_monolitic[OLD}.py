from pydantic import BaseModel, Field, EmailStr, Field, validator, constr
from typing import Optional, List, Union, Dict, Any
from uuid import UUID
from datetime import datetime, date
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
import json

# --- Token Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token expiration time in seconds")

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    user_id: Optional[int] = None
    name: Optional[str] = None
    exp: Optional[datetime] = None

# --- User Schemas ---

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    """Schema for creating a user (via OAuth or directly)"""
    pass

class UserRoleUpdate(BaseModel):
    """Schema for updating a user's role"""
    role: str = Field(..., description="User role (doctor or patient)")

class User(UserBase):
    """Schema for fully representing a user, used in responses"""
    user_id: int
    created_at: datetime
    role: Optional[str] = None

    model_config = {"from_attributes": True}

class UserInDB(User):
    """Schema for internal representation (not exposed in API)"""
    pass

# --- Authentication Status Schema ---

class AuthStatus(BaseModel):
    is_authenticated: bool
    user: Optional[User] = None

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
    idade: Optional[int] = Field(None, ge=0, le=120, description="Age in years")
    sexo: Optional[Sex] = None
    peso: Optional[float] = Field(None, gt=0, lt=500, description="Weight in kg")
    altura: Optional[float] = Field(None, gt=0, lt=3, description="Height in meters")
    etnia: Optional[Ethnicity] = None
    data_internacao: Optional[datetime] = None
    diagnostico: Optional[str] = None

    @validator('altura')
    def altura_in_meters(cls, v):
        """Ensures altura is stored in meters, converting if given in cm"""
        if v and v > 3:  # Assume value is in cm if > 3
            return v / 100
        return v

class PatientCreate(PatientBase):
    name: str = Field(..., min_length=2, max_length=255)

class PatientUpdate(PatientBase):
    pass

class Patient(PatientBase):
    patient_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class PatientSummary(BaseModel):
    patient_id: int
    name: str
    idade: Optional[int] = None
    sexo: Optional[Sex] = None
    diagnostico: Optional[str] = None
    data_internacao: Optional[datetime] = None

    model_config = {"from_attributes": True}

# --- Test Category Schemas ---

class TestCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class TestCategoryCreate(TestCategoryBase):
    pass

class TestCategory(TestCategoryBase):
    category_id: int

    model_config = {"from_attributes": True}

# --- Lab Result Schemas ---

class LabResultBase(BaseModel):
    test_name: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    timestamp: datetime
    reference_range_low: Optional[float] = None
    reference_range_high: Optional[float] = None

    @validator('value_numeric', 'value_text')
    def validate_value(cls, v, values):
        """Ensures at least one value type is provided"""
        if 'value_numeric' not in values and 'value_text' not in values:
            if v is None:
                raise ValueError('Either value_numeric or value_text must be provided')
        return v

class LabResultCreate(LabResultBase):
    patient_id: int
    category_id: Optional[int] = None

class LabResult(LabResultBase):
    result_id: int
    patient_id: int
    user_id: int
    category_id: Optional[int] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}

class LabResultWithInterpretations(LabResult):
    interpretations: List['LabInterpretation'] = []

    model_config = {"from_attributes": True}

# --- Medication Schemas ---

class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    active: bool = True

class MedicationCreate(MedicationBase):
    patient_id: int

class Medication(MedicationBase):
    medication_id: int
    patient_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class MedicationUpdate(BaseModel):
    """Schema para atualização parcial de medicações"""
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    active: Optional[bool] = None
    notes: Optional[str] = None

class MedicationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ALL = "all"

class MedicationRoute(str, Enum):
    ORAL = "oral"
    INTRAVENOUS = "intravenous"
    INTRAMUSCULAR = "intramuscular"
    SUBCUTANEOUS = "subcutaneous"
    TOPICAL = "topical"
    INHALATION = "inhalation"
    RECTAL = "rectal"
    NASAL = "nasal"
    OTHER = "other"

class MedicationFrequency(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    EVERY_HOUR = "every_hour"
    EVERY_2_HOURS = "every_2_hours"
    EVERY_4_HOURS = "every_4_hours"
    EVERY_6_HOURS = "every_6_hours"
    EVERY_8_HOURS = "every_8_hours"
    EVERY_12_HOURS = "every_12_hours"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    AS_NEEDED = "as_needed"
    OTHER = "other"

class MedicationList(BaseModel):
    medications: List[Medication]
    total: int

# --- Clinical Score Schemas ---

class ScoreType(str, Enum):
    SOFA = "SOFA"
    QSOFA = "qSOFA"
    APACHE2 = "APACHE II"
    SAPS3 = "SAPS3"
    NEWS = "NEWS"
    MEWS = "MEWS"

class ClinicalScoreBase(BaseModel):
    score_type: ScoreType
    value: float
    timestamp: datetime

class ClinicalScoreCreate(ClinicalScoreBase):
    patient_id: int

class ClinicalScore(ClinicalScoreBase):
    score_id: int
    patient_id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Lab Interpretation Schemas ---

class LabInterpretationBase(BaseModel):
    interpretation_text: str
    ai_generated: bool = True

class LabInterpretationCreate(LabInterpretationBase):
    result_id: int

class LabInterpretation(LabInterpretationBase):
    interpretation_id: int
    result_id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Analysis Schemas ---

class BloodGasInput(BaseModel):
    ph: float = Field(..., ge=6.5, le=8.0)
    pco2: float = Field(..., ge=0, le=150)
    hco3: float = Field(..., ge=0, le=60)
    po2: Optional[float] = Field(None, ge=0, le=800)
    o2sat: Optional[float] = Field(None, ge=0, le=100)
    be: Optional[float] = None  # Base Excess
    lactate: Optional[float] = Field(None, ge=0)
    patient_info: Optional[Dict[str, Any]] = None  # For demographics that affect reference ranges

class BloodGasResult(BaseModel):
    interpretation: str
    acid_base_status: str
    compensation_status: str
    oxygenation_status: Optional[str] = None
    recommendations: Optional[List[str]] = None
    is_critical: bool = False
    details: Optional[Dict[str, Any]] = None

# Electrolyte Analysis
class ElectrolyteInput(BaseModel):
    sodium: Optional[float] = Field(None, ge=100, le=200)
    potassium: Optional[float] = Field(None, ge=0, le=10)
    chloride: Optional[float] = Field(None, ge=70, le=150)
    bicarbonate: Optional[float] = Field(None, ge=0, le=60)
    calcium: Optional[float] = Field(None, ge=0, le=20)
    magnesium: Optional[float] = Field(None, ge=0, le=10)
    phosphorus: Optional[float] = Field(None, ge=0, le=10)
    patient_info: Optional[Dict[str, Any]] = None

class ElectrolyteResult(BaseModel):
    interpretation: str
    abnormalities: List[str] = []
    is_critical: bool = False
    recommendations: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

# Hematology Analysis
class HematologyInput(BaseModel):
    hemoglobin: Optional[float] = None
    hematocrit: Optional[float] = None
    rbc: Optional[float] = None
    wbc: Optional[float] = None
    platelet: Optional[float] = None
    neutrophils: Optional[float] = None
    lymphocytes: Optional[float] = None
    monocytes: Optional[float] = None
    eosinophils: Optional[float] = None
    basophils: Optional[float] = None
    patient_info: Optional[Dict[str, Any]] = None

class HematologyResult(BaseModel):
    interpretation: str
    abnormalities: List[str] = []
    is_critical: bool = False
    recommendations: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

# Renal Function Analysis
class RenalInput(BaseModel):
    creatinine: Optional[float] = None
    urea: Optional[float] = None
    egfr: Optional[float] = None
    sodium: Optional[float] = None
    potassium: Optional[float] = None
    urine_output: Optional[float] = None  # mL/24h
    patient_info: Optional[Dict[str, Any]] = None

class RenalResult(BaseModel):
    interpretation: str
    kidney_function_status: str
    aki_stage: Optional[str] = None
    electrolyte_status: Optional[str] = None
    is_critical: bool = False
    recommendations: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

# Severity Score Calculation
class SofaInput(BaseModel):
    respiratory_pao2_fio2: Optional[float] = None
    coagulation_platelets: Optional[float] = None
    liver_bilirubin: Optional[float] = None
    cardiovascular_map: Optional[float] = None
    cardiovascular_vasopressors: Optional[bool] = None
    cardiovascular_vasopressor_dose: Optional[float] = None
    cns_glasgow: Optional[int] = Field(None, ge=3, le=15)
    renal_creatinine: Optional[float] = None
    renal_urine_output: Optional[float] = None

class QSofaInput(BaseModel):
    altered_mental_state: Optional[int] = Field(None, ge=3, le=15, description="Glasgow Coma Scale (valor < 15 = positivo)")
    respiratory_rate: Optional[float] = Field(None, ge=0, description="Frequência respiratória (≥22 = positivo)")
    systolic_bp: Optional[float] = Field(None, ge=0, description="Pressão arterial sistólica (≤100 = positivo)")

class ApacheIIInput(BaseModel):
    temperature: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    heart_rate: Optional[float] = None
    respiratory_rate: Optional[float] = None
    pao2: Optional[float] = None
    fio2: Optional[float] = None
    arterial_ph: Optional[float] = None
    sodium: Optional[float] = None
    potassium: Optional[float] = None
    creatinine: Optional[float] = None
    hematocrit: Optional[float] = None
    wbc: Optional[float] = None
    glasgow: Optional[int] = Field(None, ge=3, le=15)
    age: Optional[int] = None
    chronic_health_condition: Optional[bool] = False
    admission_type: Optional[str] = Field(None, description="Tipo de admissão: clinica, cirurgica_eletiva ou cirurgica_urgencia")

class ScoreResult(BaseModel):
    score: float
    category: str  # ex: "low", "moderate", "high", "very high"
    mortality_risk: Optional[float] = None  # estimated mortality percentage
    interpretation: str
    component_scores: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    abnormalities: Optional[List[str]] = []
    is_critical: bool = False
    details: Dict[str, Any] = {}

# --- Schemas para análise de arquivos ---
class TestResult(BaseModel):
    test_name: str
    value_numeric: float
    unit: str = ""
    reference_range_low: float = 0
    reference_range_high: float = 0
    id: Optional[str] = None

class AlertItem(BaseModel):
    category: str
    parameter: str
    message: str
    value: Optional[Union[str, float]] = None
    reference: Optional[str] = None
    severity: str
    interpretation: Optional[str] = None
    recommendation: Optional[str] = None
    date: Optional[str] = None

class AlertSummary(BaseModel):
    count: int
    by_severity: Dict[str, int]
    items: List[AlertItem] = []

class FileAnalysisResult(BaseModel):
    patient_name: str
    exam_date: str
    file_name: str
    analysis_results: Dict[str, Any]
    results: List[TestResult]

class HepaticResult(BaseModel):
    interpretation: str
    liver_function_status: str
    is_critical: bool = False
    recommendations: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

class MetabolicInput(BaseModel):
    glucose: Optional[float] = None
    hba1c: Optional[float] = None
    cholesterol_total: Optional[float] = None
    hdl: Optional[float] = None
    ldl: Optional[float] = None
    triglycerides: Optional[float] = None
    tsh: Optional[float] = None
    t4: Optional[float] = None
    patient_info: Optional[Dict[str, Any]] = None

class HepaticInput(BaseModel):
    alt: Optional[float] = None
    ast: Optional[float] = None
    ggt: Optional[float] = None
    total_bilirubin: Optional[float] = None
    direct_bilirubin: Optional[float] = None
    albumin: Optional[float] = None
    inr: Optional[float] = None
    patient_info: Optional[Dict[str, Any]] = None

# --- Clinical Notes Schemas ---

class NoteType(str, Enum):
    PROGRESS = "progress"
    SOAP = "soap"
    ADMISSION = "admission"
    DISCHARGE = "discharge"
    PROCEDURE = "procedure"
    OTHER = "other"

class ClinicalNoteBase(BaseModel):
    title: str
    content: str
    note_type: NoteType = NoteType.PROGRESS
    patient_id: UUID

class ClinicalNoteCreate(ClinicalNoteBase):
    pass

class ClinicalNote(ClinicalNoteBase):
    note_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ClinicalNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    note_type: Optional[NoteType] = None

class ClinicalNoteList(BaseModel):
    notes: List[ClinicalNote]
    total: int

# --- AI Chat Schemas ---

class AIChatConversationBase(BaseModel):
    title: str
    patient_id: Optional[UUID] = None

class AIChatConversationCreate(AIChatConversationBase):
    pass

class AIChatMessageBase(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    metadata: Optional[Dict[str, Any]] = None

class AIChatMessageCreate(AIChatMessageBase):
    conversation_id: UUID

class AIChatMessage(AIChatMessageBase):
    message_id: UUID
    conversation_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}

class AIChatConversationUpdate(BaseModel):
    title: Optional[str] = None

class AIChatConversationSummary(BaseModel):
    conversation_id: UUID
    title: str
    last_message_at: Optional[datetime] = None
    message_count: int
    
class AIChatConversation(AIChatConversationBase):
    conversation_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    messages: List[AIChatMessage] = []

    model_config = {"from_attributes": True}

class AIChatConversationList(BaseModel):
    conversations: List[AIChatConversationSummary]
    total: int

class SendMessageRequest(BaseModel):
    content: str
    use_web_search: bool = False
    enable_tools: bool = True

class SendMessageResponse(BaseModel):
    user_message: AIChatMessage
    assistant_message: AIChatMessage 