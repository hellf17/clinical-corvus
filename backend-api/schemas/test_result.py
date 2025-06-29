from pydantic import BaseModel, Field, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

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