from pydantic import BaseModel, Field, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Blood Gas Analysis Schemas ---
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

# --- Electrolyte Analysis Schemas ---
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

# --- Hematology Analysis Schemas ---
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

# --- Renal Analysis Schemas ---
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

# --- SOFA Score Schemas ---
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

# --- qSOFA Score Schemas ---
class QSofaInput(BaseModel):
    altered_mental_state: Optional[int] = Field(None, ge=3, le=15, description="Glasgow Coma Scale (valor < 15 = positivo)")
    respiratory_rate: Optional[float] = Field(None, ge=0, description="Frequência respiratória (≥22 = positivo)")
    systolic_bp: Optional[float] = Field(None, ge=0, description="Pressão arterial sistólica (≤100 = positivo)")

# --- APACHE II Score Schemas ---
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

# --- Hepatic Analysis Schemas ---
class HepaticInput(BaseModel):
    alt: Optional[float] = None
    ast: Optional[float] = None
    ggt: Optional[float] = None
    total_bilirubin: Optional[float] = None
    direct_bilirubin: Optional[float] = None
    albumin: Optional[float] = None
    inr: Optional[float] = None
    patient_info: Optional[Dict[str, Any]] = None

class HepaticResult(BaseModel):
    interpretation: str
    liver_function_status: str
    is_critical: bool = False
    recommendations: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

# --- Metabolic Analysis Schemas ---
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

# --- General Score Result Schema ---
class ScoreResult(BaseModel):
    score_name: str
    score: int
    interpretation: str
    component_scores: Optional[Dict[str, Any]] = None
    is_critical: Optional[bool] = False
    recommendations: Optional[List[str]] = None

# --- File Analysis Schemas ---
class ExtractedLabValue(BaseModel):
    test_name: str
    value: Any # Can be string or numeric
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    is_abnormal: Optional[bool] = False
    comment: Optional[str] = None

class FileAnalysisResult(BaseModel):
    filename: str
    patient_name: Optional[str] = None
    collection_date: Optional[str] = None
    analysis_results: Dict[str, List[ExtractedLabValue]]
    summary: str
    critical_alerts: List[Dict[str, Any]]