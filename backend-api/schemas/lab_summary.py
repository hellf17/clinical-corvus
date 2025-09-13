from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date

class LabTrendItem(BaseModel):
    test_name: str
    latest_value: Optional[str] = None # Keep as string for flexibility
    trend: Optional[str] = None # e.g., 'increasing', 'decreasing', 'stable'
    reference_range: Optional[str] = None
    unit: Optional[str] = None

class LabSummary(BaseModel):
    summary_date: date
    overall_status: Optional[str] = None # e.g., 'stable', 'requires attention'
    recent_trends: List[LabTrendItem] = []

    model_config = ConfigDict(from_attributes=True)