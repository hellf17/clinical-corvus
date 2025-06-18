from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime

class AnalysisBase(BaseModel):
    title: str
    content: str

class AnalysisCreate(AnalysisBase):
    patient_id: str

class AnalysisUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class Analysis(AnalysisBase):
    id: int
    patient_id: Union[int, str]
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            int: lambda v: str(v)
        }
    }

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Always convert patient_id to string for API responses
        if data.get("patient_id") is not None:
            data["patient_id"] = str(data["patient_id"])
        return data

class AnalysisList(BaseModel):
    analyses: List[Analysis]
    total: int 