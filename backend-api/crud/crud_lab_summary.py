from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict
from datetime import date, timedelta, datetime
from collections import defaultdict

# from database import models
import database.models as models # Corrected
# from schemas import lab_summary as schemas
import schemas.lab_summary as lab_summary_schemas # Corrected


def get_lab_summary_for_user(
    db: Session, user_id: int, days_limit: int = 90, max_trends: int = 10
) -> lab_summary_schemas.LabSummary:
    """Generate a lab summary with basic trend analysis for a specific user."""
    today = date.today()
    
    # 1. Fetch associated patient
    patient = db.query(models.Patient).filter(models.Patient.user_id == user_id).first()
    if not patient:
        return lab_summary_schemas.LabSummary(summary_date=today, overall_status="No patient data found", recent_trends=[])

    patient_id = patient.patient_id
    cutoff_datetime = datetime.now() - timedelta(days=days_limit)

    # 2. Fetch recent labs, ordered for trend analysis
    recent_labs = (
        db.query(models.LabResult)
        .filter(
            models.LabResult.patient_id == patient_id,
            models.LabResult.timestamp >= cutoff_datetime # Use datetime for comparison
        )
        .order_by(models.LabResult.test_name, desc(models.LabResult.timestamp))
        .all()
    )

    if not recent_labs:
        return lab_summary_schemas.LabSummary(summary_date=today, overall_status="No recent lab data", recent_trends=[])

    # 3. Process labs to find trends
    trends_dict: Dict[str, lab_summary_schemas.LabTrendItem] = {}
    lab_values_history: Dict[str, List[float]] = defaultdict(list)
    processed_tests_count = 0
    requires_attention_count = 0

    for lab in recent_labs:
        # Store numeric value history for trend calculation
        if lab.value_numeric is not None:
            lab_values_history[lab.test_name].append(lab.value_numeric)
        
        # If we haven't processed this test name yet for the summary
        if lab.test_name not in trends_dict:
            # Basic trend calculation
            trend = "stable"
            history = lab_values_history[lab.test_name]
            if len(history) >= 2:
                # Simple comparison of last two numeric values
                # TODO: Add threshold for stability?
                if history[0] > history[1]:
                    trend = "increasing"
                elif history[0] < history[1]:
                    trend = "decreasing"
            
            # Reference range string
            ref_range = lab.reference_text
            if not ref_range and lab.reference_range_low is not None and lab.reference_range_high is not None:
                 ref_range = f"{lab.reference_range_low} - {lab.reference_range_high}"
            elif not ref_range and lab.reference_range_low is not None:
                 ref_range = f">= {lab.reference_range_low}"
            elif not ref_range and lab.reference_range_high is not None:
                 ref_range = f"<= {lab.reference_range_high}"

            trend_item = lab_summary_schemas.LabTrendItem(
                test_name=lab.test_name,
                latest_value=str(lab.value_numeric) if lab.value_numeric is not None else lab.value_text,
                trend=trend,
                reference_range=ref_range,
                unit=lab.unit
            )
            trends_dict[lab.test_name] = trend_item
            processed_tests_count += 1

            # Basic check for attention needed
            if lab.is_abnormal and trend != "stable":
                 requires_attention_count += 1

            # Limit the number of trends generated
            if processed_tests_count >= max_trends:
                break
                
    # 7. Determine overall status (simplified)
    overall_status = "stable"
    if requires_attention_count > 0:
        overall_status = "requires attention"
    elif not trends_dict: # If loop finished but no trends added (e.g., no numeric values)
        overall_status = "data available, trends pending"
        
    # 8. Construct final summary
    summary = lab_summary_schemas.LabSummary(
        summary_date=today,
        overall_status=overall_status,
        recent_trends=list(trends_dict.values())
    )
    
    return summary 