from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Optional, Tuple
from database.models import LabResult, Patient
# from schemas.lab_result import LabResultCreate, LabResult as LabResultSchema
import schemas.lab_result as lab_result_schemas
from collections import defaultdict
from datetime import datetime
import logging

# Assuming frontend type LabSummary = LabTrendItem[]
# where LabTrendItem = { name: string; [key: string]: string | number | undefined; }
# We will format the output to match this structure.

logger = logging.getLogger(__name__)

def get_lab_summary_for_patient(db: Session, patient_id: int, limit_days: int = 90) -> List[Dict[str, any]]:
    """
    Retrieve and format recent lab results for summary trend chart.
    Groups results by date and formats them for Recharts.
    Focuses on common numeric tests like Glicemia, HbA1c for now.
    """
    try:
        # Calculate date limit
        # Example: Look back 90 days. Adjust as needed.
        # start_date = datetime.utcnow() - timedelta(days=limit_days)
        
        # Fetch recent lab results for the patient
        # TODO: Make filtering more robust (e.g., filter by specific test names)
        results = (
            db.query(LabResult)
            .filter(LabResult.patient_id == patient_id)
            # .filter(LabResult.timestamp >= start_date) # Filter by date if needed
            .filter(LabResult.value_numeric.isnot(None))
            .order_by(LabResult.timestamp.asc())
            .all()
        )

        if not results:
            return []

        # Group results by date (YYYY-MM-DD)
        grouped_results = defaultdict(dict)
        for res in results:
            # Use timestamp as date key (or collection_datetime if available and preferred)
            date_str = res.timestamp.strftime('%Y-%m-%d')
            # Only include specific tests relevant for the summary chart
            # TODO: Make this list configurable or dynamically determined
            if res.test_name in ['Glicemia', 'HbA1c', 'Creatinina']: # Example tests
                # Store numeric value, prioritizing value_numeric
                numeric_value = res.value_numeric
                if numeric_value is not None:
                     # Add test name and its value to the dict for that date
                    grouped_results[date_str]['name'] = date_str # X-axis label
                    grouped_results[date_str][res.test_name] = numeric_value

        # Convert grouped results into a list suitable for Recharts
        chart_data = list(grouped_results.values())

        # Ensure chronological order (though query already sorts)
        chart_data.sort(key=lambda x: datetime.strptime(x['name'], '%Y-%m-%d'))

        return chart_data

    except Exception as e:
        logger.error(f"Error generating lab summary for patient {patient_id}: {e}", exc_info=True)
        # Depending on requirements, you might raise the exception,
        # return an empty list, or return a specific error structure.
        return []

# New function to create a lab result
def create_lab_result(db: Session, result_data: lab_result_schemas.LabResultCreate, patient_id: int, user_id: int, exam_id: Optional[int] = None) -> LabResult:
    """Creates a new lab result record in the database."""
    
    # Prepare data using the schema to ensure correct fields
    db_result_data = result_data.model_dump()
    db_result_data['patient_id'] = patient_id
    db_result_data['user_id'] = user_id # Assuming the user initiating is the creator? Or pass creator_id separately
    if exam_id is not None:
        db_result_data['exam_id'] = exam_id
    # Optionally set created_by if different from user_id
    # db_result_data['created_by'] = user_id 
    
    # Ensure timestamp is set if not provided
    if 'timestamp' not in db_result_data or db_result_data['timestamp'] is None:
        db_result_data['timestamp'] = datetime.utcnow()

    db_lab_result = LabResult(**db_result_data)
    db.add(db_lab_result)
    db.commit()
    db.refresh(db_lab_result)
    logger.info(f"Created lab result ID {db_lab_result.result_id} for patient {patient_id}")
    return db_lab_result

# New function to get all lab results for a patient
def get_lab_results_for_patient(
    db: Session, 
    patient_id: int, 
    skip: int = 0, 
    limit: int = 1000 # Default to a high limit, or adjust as needed
) -> Tuple[List[LabResult], int]:
    """Retrieves all lab results for a specific patient with pagination."""
    
    query = (
        db.query(LabResult)
        .filter(LabResult.patient_id == patient_id)
        .order_by(LabResult.timestamp.desc()) # Order by most recent first
    )
    
    total_count = query.count()
    
    items = query.offset(skip).limit(limit).all()
    
    return items, total_count

# Potentially add a bulk create function if needed for efficiency
# def create_lab_results_bulk(db: Session, results_data: List[LabResultCreate], patient_id: int, user_id: int) -> List[LabResult]:
#    ... implementation ... 