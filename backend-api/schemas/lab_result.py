from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from pydantic.config import ConfigDict

# --- Test Category Schemas ---
class TestCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class TestCategoryCreate(TestCategoryBase):
    pass

class TestCategory(TestCategoryBase):
    category_id: int

    model_config = ConfigDict(from_attributes=True)

# --- Lab Result Schemas ---
class LabResultBase(BaseModel):
    test_name: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None
    timestamp: datetime
    reference_range_low: Optional[float] = None
    reference_range_high: Optional[float] = None
    exam_id: Optional[int] = None

    @field_validator('value_numeric', 'value_text', mode='before')
    @classmethod
    def validate_value_presence(cls, v, info):
        """Validate that at least one value (numeric or text) is provided."""
        if v is None and info.data.get('value_numeric') is None and info.data.get('value_text') is None:
            raise ValueError("Either value_numeric or value_text must be provided")
        return v

class LabResultCreate(LabResultBase):
    patient_id: int
    category_id: Optional[int] = None

class LabResult(LabResultBase):
    result_id: int
    patient_id: int
    user_id: Optional[int] = None
    category_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

class LabResultWithInterpretations(LabResult):
    interpretations: List[LabInterpretation] = []

    model_config = ConfigDict(from_attributes=True)