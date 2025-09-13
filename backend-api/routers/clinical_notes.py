from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

import schemas.clinical_note as clinical_note_schemas
from database import get_db
from database.models import User, Patient, ClinicalNote as ClinicalNoteModel
from crud import clinical_note as notes_crud
from crud import is_doctor_assigned_to_patient
from security import get_current_user_required, verify_doctor_patient_access
from utils.group_authorization import is_user_authorized_for_patient

"""
IMPORTANTE: Sobre a ordem das rotas no FastAPI

O FastAPI avalia as rotas na ordem em que são definidas. Rotas mais específicas devem sempre
vir antes de rotas com parâmetros dinâmicos, caso contrário, a rota dinâmica capturará todas as 
solicitações.

Ordem recomendada para definição de rotas:
1. Rotas estáticas e específicas primeiro (ex: "/search", "/specific-action")
2. Rotas com parâmetros fixos (ex: "/patient/{patient_id}")
3. Rotas com parâmetros dinâmicos genéricos por último (ex: "/{note_id}")

Sem essa ordem correta, endpoints como "/search" seriam interpretados como "/{note_id}" 
com note_id = "search", resultando em erros 422 Unprocessable Entity.
"""

# Auth dependency
# Renamed to avoid conflict with get_current_user_required, use the main one
# def get_auth_user(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
#     return current_user

router = APIRouter(tags=["clinical_notes"]) # Remove prefix to avoid double prefixing

# Remove generic POST / as it's less useful than patient-specific one
# @router.post("/", response_model=ClinicalNote, status_code=status.HTTP_201_CREATED)
# def create_note(
#     note: ClinicalNoteCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user_required)
# ):
#     """Create a new clinical note."""
#     return notes_crud.create_note(db=db, note=note, user_id=current_user.user_id)


# IMPORTANTE: Endpoint de busca movido para antes dos endpoints com parâmetros dinâmicos
@router.get("/search", response_model=List[clinical_note_schemas.ClinicalNote])
def search_clinical_notes(
    query: str,
    patient_id: Optional[int] = Query(None, description="Filter search by patient ID (requires access)"), # Allow filtering search by patient
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Search for clinical notes by title or content.
    If patient_id is provided, searches only notes for that patient (requires access).
    """
    from sqlalchemy import or_, and_

    # Base query
    search_term = f"%{query.lower()}%" # Case-insensitive search
    notes_query = db.query(ClinicalNoteModel).filter(
        or_(
            ClinicalNoteModel.title.ilike(search_term),
            ClinicalNoteModel.content.ilike(search_term)
        )
    )

    # Apply patient filter and authorization if patient_id is provided
    if patient_id is not None:
        # Authorization Check for the specified patient_id
        authorized = False
        if current_user.role == 'admin':
            authorized = True
        elif current_user.role == 'doctor':
            if is_user_authorized_for_patient(db, current_user, patient_id):
                authorized = True
        elif current_user.role == 'patient':
            patient_record = db.query(Patient.patient_id).filter(Patient.user_id == current_user.user_id).first()
            if patient_record and patient_record.patient_id == patient_id:
                authorized = True
        
        if not authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to search notes for this patient."
            )
        
        # Add patient filter to the query
        notes_query = notes_query.filter(ClinicalNoteModel.patient_id == patient_id)

    # Execute the query
    notes = notes_query.order_by(ClinicalNoteModel.created_at.desc()).all()
    return notes


# Patient-specific endpoints
@router.get("/patient/{patient_id}", response_model=clinical_note_schemas.ClinicalNoteList)
def get_patient_notes(
    patient_id: int,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user_required)
):
    """
    Get paginated clinical notes for a specific patient.
    Requires doctor to be assigned to patient, or user to be the patient.
    """
    # Authorization Check
    authorized = False
    if current_user.role == 'admin':
        authorized = True
    elif current_user.role == 'doctor':
        if is_user_authorized_for_patient(db, current_user, patient_id):
            authorized = True
    elif current_user.role == 'patient':
        patient_record = db.query(Patient.patient_id).filter(Patient.user_id == current_user.user_id).first()
        if patient_record and patient_record.patient_id == patient_id:
            authorized = True
    
    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access notes for this patient."
        )
        
    # Fetch notes AFTER authorization check
    notes, total = notes_crud.get_notes(db, patient_id=patient_id, skip=skip, limit=limit)
    return {"notes": notes, "total": total}

# Added POST endpoint for patient notes
@router.post("/patient/{patient_id}", response_model=clinical_note_schemas.ClinicalNote, status_code=status.HTTP_201_CREATED)
def create_note_for_patient(
    patient_id: int,
    note: clinical_note_schemas.ClinicalNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_doctor_patient_access) # Only assigned doctors can create notes
):
    """Create a new clinical note for a specific patient. Requires doctor assignment."""
    # Authorization handled by verify_doctor_patient_access dependency
    # The dependency ensures current_user is a doctor assigned to patient_id
    
    # Ensure patient exists (dependency only checks auth)
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Add patient_id to the note data before creation
    note_data = note.model_dump()
    note_data['patient_id'] = patient_id
    
    # Recreate schema object with patient_id included
    note_to_create = clinical_note_schemas.ClinicalNoteCreate(**note_data)
    
    return notes_crud.create_note(db=db, note=note_to_create, user_id=current_user.user_id)


# Endpoints with parameters dynamic general parameters are placed last
@router.get("/{note_id}", response_model=clinical_note_schemas.ClinicalNote)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Get a specific clinical note by ID.
    Requires access to the patient associated with the note.
    """
    db_note = notes_crud.get_note(db, note_id=note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    # Authorization Check
    patient_id = db_note.patient_id
    if patient_id is None: # Note not linked to a patient? Maybe admin/system note? Handle as needed.
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to non-patient note.")

    authorized = False
    if current_user.role == 'admin':
        authorized = True
    elif current_user.role == 'doctor':
        if is_user_authorized_for_patient(db, current_user, patient_id):
            authorized = True
    elif current_user.role == 'patient':
        patient_record = db.query(Patient.patient_id).filter(Patient.user_id == current_user.user_id).first()
        if patient_record and patient_record.patient_id == patient_id:
            authorized = True
    
    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this clinical note."
        )
        
    return db_note

@router.put("/{note_id}", response_model=clinical_note_schemas.ClinicalNote)
def update_note(
    note_id: int,
    note: clinical_note_schemas.ClinicalNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required) # Check manually after fetching note
):
    """
    Update an existing clinical note.
    Requires the user to be a doctor assigned to the note's patient.
    """
    db_note = notes_crud.get_note(db, note_id=note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    # Authorization Check: Only assigned doctors can update
    patient_id = db_note.patient_id
    if patient_id is None:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update non-patient note.")
         
    if current_user.role == 'admin':
        authorized = True
    elif current_user.role == 'doctor' and is_user_authorized_for_patient(db, current_user, patient_id):
        authorized = True
    else:
        authorized = False
        
    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned doctors can update this clinical note."
        )

    # Recreate schema object for update
    # note_data = note.model_dump(exclude_unset=True)
    note_to_update = clinical_note_schemas.ClinicalNoteUpdate(**note.model_dump(exclude_unset=True))
    
    return notes_crud.update_note(db=db, note_id=note_id, note_update=note_to_update)

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required) # Check manually after fetching note
):
    """
    Delete a clinical note.
    Requires the user to be a doctor assigned to the note's patient.
    """
    db_note = notes_crud.get_note(db, note_id=note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    # Authorization Check: Only assigned doctors can delete
    patient_id = db_note.patient_id
    if patient_id is None:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete non-patient note.")
         
    if current_user.role == 'admin':
        authorized = True
    elif current_user.role == 'doctor' and is_user_authorized_for_patient(db, current_user, patient_id):
        authorized = True
    else:
        authorized = False
        
    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned doctors can delete this clinical note."
        )

    success = notes_crud.delete_note(db=db, note_id=note_id)
    if not success:
        # Should have been caught by the initial get_note check
        raise HTTPException(status_code=404, detail="Clinical note not found during deletion.")

    return None