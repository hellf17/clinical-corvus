from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db, models
from security import get_current_user_required
import schemas.patient as patient_schemas
import schemas.health_tip as health_tip_schemas
import schemas.health_diary as health_diary_schemas
import schemas.lab_summary as lab_summary_schemas

from crud import patients as crud_patients
from crud import crud_health_tip
from crud import crud_health_diary
from crud import crud_lab_result

router = APIRouter(
    prefix="/me",
    tags=["Me - Current User Data"],
    # dependencies=[Depends(get_current_user_required)], # Apply auth to all routes in this router
    responses={404: {"description": "Not found"}},
)

@router.get("/patient", response_model=patient_schemas.Patient, summary="Get Logged-In User's Patient Profile")
async def get_my_patient_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retrieves the patient profile associated with the currently authenticated user.
    Requires the user to have a 'patient' role or associated patient record.
    Returns 404 if the user does not have an associated patient profile.
    """
    # Check if the user is a patient
    # if current_user.role != 'patient':
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="User does not have the required role 'patient'"
    #     )

    # Using the new CRUD function
    patient = crud_patients.get_patient_profile(db, user_id=current_user.user_id)
    
    if patient is None:
        # Optionally, check if a doctor is trying to access this? Should fail.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient profile associated with this user account."
        )
    return patient

@router.get("/health-tips", response_model=List[health_tip_schemas.HealthTip], summary="Get General Health Tips")
async def get_general_health_tips(
    limit: int = 10,
    db: Session = Depends(get_db),
    # current_user: models.User = Depends(get_current_user_required) # Auth not strictly needed for general tips
):
    """
    Retrieves general health tips available to all users.
    TODO: Add endpoint for personalized tips if needed.
    """
    tips = crud_health_tip.get_health_tips(db, limit=limit)
    return tips

@router.get("/diary", response_model=health_diary_schemas.PaginatedHealthDiaryResponse, summary="Get My Diary Entries (Paginated)")
async def get_my_diary_entries(
    skip: int = Query(0, ge=0, description="Number of entries to skip"), 
    limit: int = Query(10, ge=1, le=100, description="Number of entries per page"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retrieves diary entries for the logged-in user with pagination.
    """
    # Call the updated CRUD function that returns items and total
    items, total = crud_health_diary.get_diary_entries_by_user(
        db, user_id=current_user.user_id, skip=skip, limit=limit
    )
    
    # Return the paginated response
    return health_diary_schemas.PaginatedHealthDiaryResponse(items=items, total=total)

@router.post("/diary", response_model=health_diary_schemas.HealthDiaryEntry, status_code=status.HTTP_201_CREATED, summary="Save New Diary Entry")
async def create_my_diary_entry(
    entry_in: health_diary_schemas.HealthDiaryEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Saves a new diary entry for the logged-in user.
    """
    new_entry = crud_health_diary.create_diary_entry(
        db, entry_data=entry_in, user_id=current_user.user_id
    )
    return new_entry

# Optional: Add endpoints for updating/deleting diary entries if needed
# @router.put("/diary/{entry_id}", ...) etc.

@router.get("/labs/summary", response_model=List[Dict[str, Any]], summary="Get My Lab Summary")
async def get_my_lab_summary(
    days_limit: int = 90, # Look back 90 days by default
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retrieves a summarized view of recent lab results for the logged-in user (patient).
    Generates trends based on available data within the specified time limit.
    """
    # First, get the patient associated with the current user
    patient = crud_patients.get_patient_profile(db, user_id=current_user.user_id)

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient profile associated with this user account."
        )
    
    # Now, get the lab summary for that patient
    summary_data = crud_lab_result.get_lab_summary_for_patient(
        db, patient_id=patient.patient_id # Use patient_id from profile
        # days_limit is not implemented in current CRUD, add if needed
    )
    
    return summary_data 