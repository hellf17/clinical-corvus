from pydantic import BaseModel, Field, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

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

    model_config = ConfigDict(from_attributes=True)

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