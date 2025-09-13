from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class HealthTipBase(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    source: Optional[str] = None

class HealthTipCreate(HealthTipBase):
    pass # Or specific fields for creation if different

class HealthTipUpdate(HealthTipBase):
    # Allow partial updates
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None

class HealthTip(HealthTipBase):
    tip_id: int
    created_at: datetime
    is_general: bool = True # Tip can be general or user-specific (future?)

    model_config = ConfigDict(from_attributes=True)

class HealthTipList(BaseModel):
    tips: list[HealthTip] 