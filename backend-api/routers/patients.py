from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_, func
from datetime import datetime

from database import get_db
import schemas.patient as patient_schemas
import schemas.lab_result as lab_result_schemas
from security import get_current_user, get_current_user_required
from database.models import User as UserModel, Patient as PatientModel
from crud import patients as crud_patients
from crud import is_doctor_assigned_to_patient, assign_doctor_to_patient, remove_doctor_from_patient
from crud import crud_lab_result
from pydantic import BaseModel
from utils.group_authorization import is_user_authorized_for_patient, get_patients_accessible_to_user, get_patient_count_accessible_to_user

router = APIRouter()

# --- Operações CRUD para pacientes ---

@router.get("/", response_model=patient_schemas.PatientListResponse)
async def read_patients_paginated(
    request: Request,
    search: Optional[str] = Query(None, description="Search term for patient name (case-insensitive)"),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Retorna a lista paginada de pacientes.
    - Se admin: retorna todos os pacientes.
    - Se médico: retorna os pacientes a ele associados diretamente ou através de grupos.
    - Se paciente: retorna apenas seus próprios dados (em formato de lista).
    """
    if current_user.role == 'admin':
        # Admin: Fetch all patients with pagination and search
        patients, total = crud_patients.get_patients(
            db=db,
            search=search,
            skip=skip,
            limit=limit
        )
    elif current_user.role == 'doctor':
        # Doctor: Fetch patients assigned to this doctor or through groups
        patients = get_patients_accessible_to_user(db, current_user, search)
        # For pagination, we need to manually slice the list
        total = len(patients)
        patients = patients[skip:skip+limit]
    elif current_user.role == 'patient':
        # Patient: Fetch their own patient record
        patient_record = db.query(PatientModel).filter(PatientModel.user_id == current_user.user_id).first()
        if patient_record:
            # Apply search filter even for single patient?
            if search and search.lower() not in patient_record.name.lower():
                patients = []
                total = 0
            else:
                patients = [patient_record]
                total = 1
        else:
            patients = []
            total = 0
    else:
        # Other roles deny access
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        
    patient_summaries = [patient_schemas.PatientSummary.model_validate(p) for p in patients]
    
    return patient_schemas.PatientListResponse(items=patient_summaries, total=total)

@router.post("/", response_model=patient_schemas.Patient, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient: patient_schemas.PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Cria um novo registro de Paciente associado ao médico autenticado.
    Apenas usuários com role 'doctor' podem usar este endpoint.
    O novo paciente é automaticamente associado ao médico (doctor_id) via JWT.
    Se um group_id for fornecido, o paciente também será atribuído ao grupo.
    """
    if current_user.role != 'doctor':
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="Apenas médicos podem criar novos pacientes via este endpoint."
         )

    # The CRUD function now handles group assignment atomically.
    try:
        db_patient = crud_patients.create_patient_record(
            db=db,
            patient_data=patient,
            user_id=current_user.user_id
        )
        return db_patient
    except Exception as e:
        # The CRUD function will re-raise exceptions on failure.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create patient: {str(e)}"
        )

@router.get("/{patient_id}", response_model=patient_schemas.Patient)
async def read_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Retorna um paciente específico pelo ID.
    - Se admin: acesso permitido.
    - Se médico: requer que o médico esteja associado ao paciente diretamente ou através de grupos.
    - Se paciente: requer que o patient_id corresponda ao seu próprio registro.
    """
    patient = crud_patients.get_patient_basic(db, patient_id=patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    # Allow admin access unconditionally
    if current_user.role == 'admin':
        pass # Admin can access any patient
    elif current_user.role == 'doctor':
        # Doctor access: Check direct association or group membership
        if not is_user_authorized_for_patient(db, current_user, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Médico não associado a este paciente diretamente ou através de grupos."
            )
    elif current_user.role == 'patient':
        # Patient access: Check if it's their own record
        if patient.user_id != current_user.user_id:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Paciente só pode acessar seus próprios dados."
            )
    else:
        # Other roles (guest, etc.) deny access
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")
        
    return patient

@router.put("/{patient_id}", response_model=patient_schemas.Patient)
async def update_patient(
    patient_id: int,
    patient_update: patient_schemas.PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    # Inject current_user instead of specific auth dependency
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Atualiza um paciente existente pelo ID.
    - Se admin: acesso permitido.
    - Se médico: requer que o médico esteja associado ao paciente diretamente ou através de grupos.
    - Pacientes não podem usar este endpoint.
    """
    # Check if patient exists first (implicit in get_patient call below)
    target_patient = crud_patients.get_patient(db, patient_id=patient_id)
    if target_patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    # Authorize based on role
    if current_user.role == 'admin':
        pass # Admin can update any patient
    elif current_user.role == 'doctor':
        if not is_user_authorized_for_patient(db, current_user, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Médico não associado a este paciente diretamente ou através de grupos para atualização."
            )
    else: # Includes patients and other roles
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada para atualizar este paciente.")

    # Perform the update
    db_patient = crud_patients.update_patient(db, patient_id=patient_id, patient_update=patient_update)
    # The previous check should prevent this, but double-check
    if db_patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado durante a atualização.")
    return db_patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    # Inject current_user instead of specific auth dependency
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Exclui um paciente pelo ID.
    - Se admin: acesso permitido.
    - Se médico: requer que o médico esteja associado ao paciente diretamente ou através de grupos.
    - Pacientes não podem usar este endpoint.
    """
    # Check if patient exists first to provide 404 before 403
    target_patient = crud_patients.get_patient(db, patient_id=patient_id)
    if target_patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    # Authorize based on role
    if current_user.role == 'admin':
        pass # Admin can delete any patient
    elif current_user.role == 'doctor':
         if not is_user_authorized_for_patient(db, current_user, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Médico não associado a este paciente diretamente ou através de grupos para exclusão."
            )
    else: # Includes patients and other roles
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada para excluir este paciente.")

    # Perform the delete
    deleted = crud_patients.delete_patient(db, patient_id=patient_id)
    if not deleted:
         # Should not happen if target_patient was found, but defensive check
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao excluir paciente após verificação.")
         
    return None

# --- Endpoint for Patient Lab Results ---

class LabResultListResponse(BaseModel):
     items: List[lab_result_schemas.LabResult]
     total: int

@router.get("/{patient_id}/lab_results", response_model=LabResultListResponse)
async def read_patient_lab_results(
    patient_id: int,
    request: Request,
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    limit: int = Query(1000, ge=1, description="Maximum number of results to return"), # High limit default
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Retrieves paginated lab results for a specific patient.
    Requires admin access, or doctor assigned to patient directly or through groups, or the patient themselves.
    """
    # Authorization Check (similar to read_patient)
    patient = crud_patients.get_patient(db, patient_id=patient_id) # Check patient exists
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    if current_user.role == 'admin':
        pass # Admin can access labs for any patient
    elif current_user.role == 'doctor':
        if not is_user_authorized_for_patient(db, current_user, patient_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Médico não associado a este paciente diretamente ou através de grupos.")
    elif current_user.role == 'patient':
        if patient.user_id != current_user.user_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Paciente só pode acessar seus próprios dados.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")

    # Fetch lab results using CRUD
    items, total = crud_lab_result.get_lab_results_for_patient(
        db=db, patient_id=patient_id, skip=skip, limit=limit
    )
    
    return LabResultListResponse(items=items, total=total)

# --- NEW Endpoint for Manual Lab Result Entry ---

@router.post("/{patient_id}/lab_results", response_model=lab_result_schemas.LabResult, status_code=status.HTTP_201_CREATED)
async def create_manual_lab_result(
    patient_id: int,
    lab_result_data: lab_result_schemas.LabResultCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Creates a single lab result record manually for a specific patient.
    Requires admin access, or doctor assigned to patient directly or through groups, or the patient themselves.
    The user making the request is set as the creator (user_id) of the lab record.
    """
    # Authorization Check (same as reading lab results)
    patient = crud_patients.get_patient(db, patient_id=patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    if current_user.role == 'admin':
        pass
    elif current_user.role == 'doctor':
        if not is_user_authorized_for_patient(db, current_user, patient_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Médico não associado a este paciente diretamente ou através de grupos.")
    elif current_user.role == 'patient':
        if patient.user_id != current_user.user_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Paciente só pode adicionar resultados para si mesmo.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")

    # Call CRUD function to create the lab result
    # Pass the current user's ID as the 'user_id' for the lab record
    try:
        # Ensure timestamp is present, default if needed (CRUD might also do this)
        if not lab_result_data.timestamp:
             lab_result_data.timestamp = datetime.utcnow()
             
        db_lab_result = crud_lab_result.create_lab_result(
            db=db,
            result_data=lab_result_data,
            patient_id=patient_id,
            user_id=current_user.user_id # User creating the record
        )
        return db_lab_result
    except Exception as e:
        # Catch potential DB errors or validation errors during creation
        print(f"Error creating manual lab result: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao salvar resultado: {e}"
        )

# --- Endpoints de Associação Médico-Paciente (Admin Only - OK as is) ---

@router.post("/{patient_id}/assign-doctor/{doctor_id}", status_code=status.HTTP_201_CREATED)
async def assign_doctor_endpoint(
    patient_id: int,
    doctor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """Endpoint para associar um médico a um paciente (requer role 'admin')."""
    if current_user.role != 'admin':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem associar médicos.")

    success = assign_doctor_to_patient(db, doctor_user_id=doctor_id, patient_patient_id=patient_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao associar médico ao paciente. Verifique se os IDs são válidos e se a associação já não existe.")
    return {"detail": "Médico associado com sucesso."}

@router.delete("/{patient_id}/remove-doctor/{doctor_id}", status_code=status.HTTP_200_OK)
async def remove_doctor_endpoint(
    patient_id: int,
    doctor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """Endpoint para remover a associação de um médico a um paciente (requer role 'admin')."""
    if current_user.role != 'admin':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem remover associações.")
         
    success = remove_doctor_from_patient(db, doctor_user_id=doctor_id, patient_patient_id=patient_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao remover associação. Verifique se os IDs são válidos e se a associação existe.")
    return {"detail": "Associação removida com sucesso."}

# Endpoint de Análise de Convidado removido, pois a lógica de autenticação mudou.
# @router.post("/analyze", response_model=Patient)
# async def analyze_patient_guest(...): ...