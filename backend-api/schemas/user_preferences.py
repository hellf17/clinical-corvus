from pydantic import BaseModel, Field
from typing import Optional


class NotificationPreferences(BaseModel):
    emailClinicalAlerts: bool = Field(default=True)
    emailGroupUpdates: bool = Field(default=True)
    productUpdates: bool = Field(default=False)


class UserPreferencesOut(BaseModel):
    notifications: NotificationPreferences
    language: str = Field(default="pt-BR")
    timezone: str = Field(default="UTC")


class UserPreferencesIn(BaseModel):
    notifications: Optional[NotificationPreferences] = None
    language: Optional[str] = None
    timezone: Optional[str] = None

