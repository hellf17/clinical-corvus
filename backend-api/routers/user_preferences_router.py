from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, models
from security import get_current_user_required
from schemas.user_preferences import (
    UserPreferencesOut,
    UserPreferencesIn,
    NotificationPreferences,
)


router = APIRouter(tags=["User Preferences"])


def to_out(pref: Optional[models.UserPreferences]) -> UserPreferencesOut:
    if not pref:
        return UserPreferencesOut(
            notifications=NotificationPreferences(),
            language="pt-BR",
            timezone="UTC",
        )
    return UserPreferencesOut(
        notifications=NotificationPreferences(
            emailClinicalAlerts=pref.email_clinical_alerts,
            emailGroupUpdates=pref.email_group_updates,
            productUpdates=pref.product_updates,
        ),
        language=pref.language or "pt-BR",
        timezone=pref.timezone or "UTC",
    )


@router.get("/preferences", response_model=UserPreferencesOut)
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
):
    pref = db.query(models.UserPreferences).filter(models.UserPreferences.user_id == current_user.user_id).first()
    return to_out(pref)


@router.post("/preferences", response_model=UserPreferencesOut, status_code=status.HTTP_200_OK)
async def save_preferences(
    body: UserPreferencesIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
):
    pref = db.query(models.UserPreferences).filter(models.UserPreferences.user_id == current_user.user_id).first()
    if not pref:
        pref = models.UserPreferences(user_id=current_user.user_id)
        db.add(pref)

    # Merge updates with defaults/existing
    if body.notifications is not None:
        pref.email_clinical_alerts = bool(body.notifications.emailClinicalAlerts)
        pref.email_group_updates = bool(body.notifications.emailGroupUpdates)
        pref.product_updates = bool(body.notifications.productUpdates)
    if body.language is not None:
        pref.language = body.language
    if body.timezone is not None:
        pref.timezone = body.timezone

    db.commit()
    db.refresh(pref)
    return to_out(pref)

