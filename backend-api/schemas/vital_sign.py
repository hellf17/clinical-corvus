from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from pydantic.config import ConfigDict

# Base model for Vital Sign data points
class VitalSignBase(BaseModel):
    timestamp: datetime = Field(..., description="Timestamp when vitals were recorded")
    temperature_c: Optional[float] = Field(None, description="Body temperature in Celsius")
    heart_rate: Optional[int] = Field(None, description="Heart rate in beats per minute")
    respiratory_rate: Optional[int] = Field(None, description="Respiratory rate in breaths per minute")
    systolic_bp: Optional[int] = Field(None, description="Systolic blood pressure in mmHg")
    diastolic_bp: Optional[int] = Field(None, description="Diastolic blood pressure in mmHg")
    oxygen_saturation: Optional[float] = Field(None, description="Oxygen saturation (SpO2) in percentage")
    glasgow_coma_scale: Optional[int] = Field(None, ge=3, le=15, description="Glasgow Coma Scale score (3-15)")
    fio2_input: Optional[float] = Field(None, ge=0.21, le=1.0, description="Fraction of inspired oxygen (FiO2) as decimal (0.21-1.0)")

# Model for creating a Vital Sign record (patient_id comes from path)
class VitalSignCreate(VitalSignBase):
    pass

# Model representing a Vital Sign read from DB
class VitalSign(VitalSignBase):
    vital_id: int
    patient_id: int
    created_at: datetime
    # recorded_by_user_id: Optional[int] # Include if added to model

    model_config = ConfigDict(from_attributes=True)