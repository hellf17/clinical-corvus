from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from database.models import User, Patient, Exam, ExamStatus
import schemas.exam as exam_schemas
from security import get_current_user_required
from crud import crud_exam

router = APIRouter()

# Get all exams for a patient
@router.get("/{patient_id}/exams", response_model=exam_schemas.ExamListResponse)
async def get_patient_exams(
    patient_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Retrieve paginated exams for a specific patient.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    exams, total = crud_exam.get_exams_by_patient(db, patient_id, skip, limit)
    return {"exams": exams, "total": total}

# Get a specific exam
@router.get("/{patient_id}/exams/{exam_id}", response_model=exam_schemas.Exam)
async def get_exam(
    patient_id: int,
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Retrieve a specific exam by ID.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    exam = crud_exam.get_exam(db, exam_id)
    if not exam or exam.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exame não encontrado")
    
    return exam

# Create a new exam
@router.post("/{patient_id}/exams", response_model=exam_schemas.Exam, status_code=status.HTTP_201_CREATED)
async def create_exam(
    patient_id: int,
    exam_data: exam_schemas.ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Create a new exam record for a patient.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    # Create the exam
    exam = crud_exam.create_exam(db, exam_data, patient_id, current_user.user_id)
    return exam

# Update an exam
@router.put("/{patient_id}/exams/{exam_id}", response_model=exam_schemas.Exam)
async def update_exam(
    patient_id: int,
    exam_id: int,
    exam_data: exam_schemas.ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Update an existing exam record.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    # Check if exam exists
    exam = crud_exam.get_exam(db, exam_id)
    if not exam or exam.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exame não encontrado")
    
    # Update the exam
    updated_exam = crud_exam.update_exam(db, exam_id, exam_data)
    if not updated_exam:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao atualizar exame")
    
    return updated_exam

# Delete an exam
@router.delete("/{patient_id}/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    patient_id: int,
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Delete an exam record.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    # Check if exam exists
    exam = crud_exam.get_exam(db, exam_id)
    if not exam or exam.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exame não encontrado")
    
    # Delete the exam
    deleted_exam = crud_exam.delete_exam(db, exam_id)
    if not deleted_exam:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao excluir exame")
    
    return None

# Upload exam file (PDF) and process it
@router.post("/{patient_id}/exams/upload", response_model=dict)
async def upload_exam_file(
    patient_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Upload a PDF file with exam results for a patient.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    # Check if file is PDF
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Somente arquivos PDF são aceitos")
    
    # Import the file processing function from files router
    from routers.files import process_pdf_file
    import os
    import uuid
    import tempfile
    
    # Create temporary directory for file upload
    TEMP_UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "clinical_helper_uploads")
    os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(TEMP_UPLOAD_DIR, unique_filename)
    
    # Save file temporarily
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo muito grande. O tamanho máximo é 10MB.")
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    # Create exam record first
    exam_data = exam_schemas.ExamCreate(
        exam_timestamp=datetime.utcnow(),  # Default to current time
        exam_type="Exame Laboratorial",  # Default type
        source_file_name=file.filename
    )
    
    exam = crud_exam.create_exam(db, exam_data, patient_id, current_user.user_id)
    
    # Process file in background
    background_tasks.add_task(
        process_pdf_file,
        file_path=file_path,
        patient_id=patient_id,
        user_id=current_user.user_id,
        db=db
    )
    
    return {
        "status": "success",
        "message": "Arquivo enviado e sendo processado",
        "exam_id": exam.exam_id,
        "filename": file.filename
    }

# Update exam processing status
@router.patch("/{patient_id}/exams/{exam_id}/status", response_model=exam_schemas.Exam)
async def update_exam_status(
    patient_id: int,
    exam_id: int,
    status: ExamStatus,
    processing_log: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """
    Update the processing status of an exam.
    """
    # Check if patient exists and user has access
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")
    
    # Check if user has permission to access this patient's data
    if current_user.role == "doctor":
        # Doctors can only access patients assigned to them
        if patient not in current_user.managed_patients and patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role == "patient":
        # Patients can only access their own data
        if patient.user_account != current_user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    elif current_user.role != "admin":
        # Other roles denied
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    
    # Check if exam exists
    exam = crud_exam.get_exam(db, exam_id)
    if not exam or exam.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exame não encontrado")
    
    # Update exam status
    updated_exam = crud_exam.update_exam_status(db, exam_id, status, processing_log)
    if not updated_exam:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha ao atualizar status do exame")
    
    return updated_exam