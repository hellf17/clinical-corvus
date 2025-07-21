from sqlalchemy.orm import Session
from typing import List, Optional

# from database import models
from database.models import HealthTip # Corrected and made specific
# from schemas import health_tip as schemas
import schemas.health_tip as health_tip_schemas # Corrected
# from database.models import HealthTip # This is now covered by the import above


def get_health_tips(db: Session, limit: int = 10) -> List[HealthTip]:
    """
    Retrieve a list of general health tips.
    Returns empty list if no tips are found.
    """
    try:
        tips = db.query(HealthTip).order_by(HealthTip.created_at.desc()).limit(limit).all()
        return tips or []
    except Exception as e:
        # Log the error and return empty list
        print(f"Error fetching health tips: {e}")
        return []

# Add functions for create/update/delete/get_specific if needed later
# def create_health_tip(db: Session, tip: health_tip_schemas.HealthTipCreate):
#     ... 