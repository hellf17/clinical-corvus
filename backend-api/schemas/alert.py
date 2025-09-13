from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Dict, Optional, Any, List
from datetime import datetime

class AlertBase(BaseModel):
    alert_type: str = Field(..., description="Type or category of the alert (e.g., 'lab_critical', 'medication_due')")
    message: str = Field(..., description="Descriptive message for the alert")
    severity: str = Field(..., description="Severity level (e.g., 'critical', 'warning', 'info')")
    details: Optional[Dict[str, Any]] = Field(None, description="Optional JSON blob for additional context")
    parameter: Optional[str] = Field(None, description="Specific parameter triggering the alert (e.g., 'Potassium')")
    category: Optional[str] = Field(None, description="Category of the parameter (e.g., 'Electrolytes')")
    value: Optional[float] = Field(None, description="Value that triggered the alert")
    reference: Optional[str] = Field(None, description="Reference range associated with the alert")
    status: Optional[str] = Field('active', description="Status of the alert (e.g., 'active', 'acknowledged', 'resolved')")
    interpretation: Optional[str] = Field(None, description="Brief interpretation related to the alert")
    recommendation: Optional[str] = Field(None, description="Recommended action for the alert")

    @field_validator('severity')
    @classmethod
    def validate_severity(cls, v):
        if v not in ["low", "medium", "high", "critical", "severe", "moderate", "mild", "warning", "info", "normal"]:
            raise ValueError("Severity must be one of the allowed values")
        return v

class AlertCreate(AlertBase):
    patient_id: int
    user_id: Optional[int] = None # User the alert is primarily for (e.g., assigned doctor)
    created_by: Optional[int] = None # User/system that created the alert

class AlertUpdate(BaseModel):
    is_read: Optional[bool] = None
    status: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

class AlertInDBBase(AlertBase):
    alert_id: int
    patient_id: int
    user_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    created_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    patient_name: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Alert(AlertInDBBase):
    pass

class AlertResponse(Alert):
    pass

class AlertGenerateResponse(BaseModel):
    count: int
    alerts: List[AlertResponse]

class AlertStats(BaseModel):
    total: int
    unread: int
    by_severity: Dict[str, int]

# Response schema for lists of alerts with pagination
class AlertListResponse(BaseModel):
    items: List[Alert]
    total: int 