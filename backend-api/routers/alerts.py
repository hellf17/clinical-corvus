from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

from database import get_db, models
from utils.alert_system import AlertSystem
from crud import patients as patients_crud
from crud import alerts as alerts_crud
import schemas.alert as alert_schemas
from schemas.alert import AlertCreate, AlertUpdate, AlertListResponse, Alert, AlertGenerateResponse, AlertStats
from security import get_current_user_required, verify_doctor_patient_access
from crud import is_doctor_assigned_to_patient
# from ..crud import crud_alert # Likely unused
# from ..crud import crud_patients # Likely unused

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=Alert, status_code=201) # Use imported Alert schema
def create_alert(
    alert: AlertCreate, # Use imported AlertCreate schema
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required) # Use models.User
):
    """Create a new alert (Authorization logic needs review)."""
    # Verify patient exists
    patient = db.query(models.Patient).filter(models.Patient.patient_id == alert.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
    # Authorization check:
    authorized = False
    if current_user.role == 'doctor':
        # Check if doctor is assigned to this patient
        if is_doctor_assigned_to_patient(db, doctor_user_id=current_user.user_id, patient_patient_id=alert.patient_id):
            authorized = True
    elif current_user.role == 'patient':
        # Check if patient is creating alert for themselves
        if patient.user_id == current_user.user_id:
             authorized = True # Potentially allow patients to create certain alert types?

    if not authorized:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create an alert for this patient."
        )

    # Set user_id/created_by based on current user
    alert_data_dict = alert.model_dump()
    alert_data_dict['user_id'] = current_user.user_id # Who the alert is *for* (often the patient)
    alert_data_dict['created_by'] = current_user.user_id # Who *created* the alert
    
    # Use Pydantic model to recreate with updated IDs
    alert_data = AlertCreate(**alert_data_dict)
    
    db_alert = alerts_crud.create_alert(db, alert_data)
    return db_alert

@router.get("/{alert_id}", response_model=Alert) # Use imported Alert schema
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get a specific alert by ID (Authorization logic needs review)."""
    alert = alerts_crud.get_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    # Authorization Check:
    patient_id = alert.patient_id
    authorized = False
    if patient_id: # Only check if alert is linked to a patient
        if current_user.role == 'doctor':
            if is_doctor_assigned_to_patient(db, doctor_user_id=current_user.user_id, patient_patient_id=patient_id):
                authorized = True
        elif current_user.role == 'patient':
            patient_record = db.query(models.Patient.patient_id).filter(models.Patient.user_id == current_user.user_id).first()
            if patient_record and patient_record.patient_id == patient_id:
                authorized = True
    else:
        # If alert is not linked to a patient, maybe it's a system alert?
        # Allow access based on role? Or specific user_id match?
        # For now, assume non-patient alerts are accessible if user_id matches
        if alert.user_id == current_user.user_id:
             authorized = True 
             
    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this alert"
        )
    
    return alert

@router.get("/patient/{patient_id}", response_model=AlertListResponse)
async def read_alerts_for_patient(
    patient_id: int,
    only_active: bool = Query(True, description="Filter for active (non-acknowledged/resolved) alerts"),
    skip: int = Query(0, ge=0, description="Number of alerts to skip"),
    limit: int = Query(100, ge=1, description="Maximum number of alerts to return"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retrieves paginated alerts for a specific patient.
    Requires admin access, or doctor assigned to patient, or the patient themselves.
    """
    # Authorization Check (similar to accessing other patient data)
    patient = patients_crud.get_patient(db, patient_id=patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não encontrado")

    if current_user.role == 'admin':
        pass 
    elif current_user.role == 'doctor':
        if not is_doctor_assigned_to_patient(db, doctor_user_id=current_user.user_id, patient_patient_id=patient_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Médico não associado a este paciente.")
    elif current_user.role == 'patient':
        if patient.user_id != current_user.user_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: Paciente só pode acessar seus próprios alertas.")
    else:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")

    items, total = alerts_crud.get_alerts_for_patient(
        db=db, patient_id=patient_id, only_active=only_active, skip=skip, limit=limit
    )
    return AlertListResponse(items=items, total=total)

@router.patch("/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Updates an alert's status (e.g., mark as read).
    Requires user to have permission to view the alert (checks underlying patient access).
    """
    db_alert = alerts_crud.get_alert_by_id(db, alert_id)
    if not db_alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado")

    # Authorization Check: Can the current user access the patient associated with this alert?
    patient_id = db_alert.patient_id
    patient = patients_crud.get_patient(db, patient_id=patient_id)
    if patient is None: # Should not happen if alert exists, but defensive check
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente associado ao alerta não encontrado")

    can_access = False
    if current_user.role == 'admin':
        can_access = True 
    elif current_user.role == 'doctor':
        if is_doctor_assigned_to_patient(db, doctor_user_id=current_user.user_id, patient_patient_id=patient_id):
            can_access = True
    elif current_user.role == 'patient':
        if patient.user_id == current_user.user_id:
             can_access = True
             
    if not can_access:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado para modificar este alerta.")

    # Perform the update
    updated_alert = alerts_crud.update_alert_status(
        db=db, alert_id=alert_id, update_data=alert_update, user_id=current_user.user_id
    )
    if not updated_alert:
        # This case should be caught by the initial get_alert_by_id check
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado durante atualização.")
         
    return updated_alert

@router.get("/", response_model=AlertListResponse, tags=["Alerts"])
async def read_alerts(
    status: Optional[str] = Query(None, description="Filter by status: 'read' or 'unread'"),
    patient_id: Optional[int] = Query(None, description="Filter by patient ID (requires access)"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(10, ge=1, le=200, description="Pagination limit"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retrieves a paginated list of alerts based on user role and assignments.
    - Doctors see alerts for assigned patients.
    - Patients see their own alerts.
    Optionally filtered by status and specific patient ID (if authorized).
    """
    # Validate status parameter
    if status and status.lower() not in ['read', 'unread']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status filter. Use 'read' or 'unread'."
        )

    # Call the updated CRUD function, passing the current user
    alerts, total = alerts_crud.get_alerts(
        db=db,
        current_user=current_user,
        status=status.lower() if status else None,
        patient_id=patient_id, # CRUD function handles auth if patient_id is specified
        skip=skip,
        limit=limit
    )

    return AlertListResponse(items=alerts, total=total)

@router.post("/generate-from-lab-results/{patient_id}", response_model=AlertGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_alerts_from_lab_results(
    patient_id: int,
    db: Session = Depends(get_db),
    # Apply doctor-patient access verification
    current_user: models.User = Depends(verify_doctor_patient_access)
):
    """
    Generate alerts from abnormal lab results for a specific patient.
    Requires the current user to be a doctor assigned to the patient.
    """
    # Authorization is handled by the verify_doctor_patient_access dependency
    # No need to fetch patient separately here for auth check

    # Fetch abnormal lab results (logic remains the same)
    abnormal_results = db.query(models.LabResult).filter(
        models.LabResult.patient_id == patient_id,
        models.LabResult.is_abnormal == True
    ).all()
    
    generated_alerts = []
    
    for lab_result in abnormal_results:
        # Determine severity (logic remains the same)
        severity = "medium"  # Default
        
        if lab_result.value_numeric is not None and lab_result.reference_range_high is not None:
            # Para valores mais altos que o limite superior
            if lab_result.value_numeric > lab_result.reference_range_high:
                deviation = (lab_result.value_numeric - lab_result.reference_range_high) / lab_result.reference_range_high
                if deviation > 0.5:
                    severity = "severe"
                elif deviation > 0.2:
                    severity = "high"
        
        elif lab_result.value_numeric is not None and lab_result.reference_range_low is not None:
            # Para valores mais baixos que o limite inferior
            if lab_result.value_numeric < lab_result.reference_range_low:
                deviation = (lab_result.reference_range_low - lab_result.value_numeric) / lab_result.reference_range_low
                if deviation > 0.5:
                    severity = "severe"
                elif deviation > 0.2:
                    severity = "high"
        
        # Criar mensagem de alerta
        message = f"Abnormal {lab_result.test_name}: {lab_result.value_numeric} {lab_result.unit}"
        if lab_result.reference_range_low is not None and lab_result.reference_range_high is not None:
            message += f" (Reference: {lab_result.reference_range_low}-{lab_result.reference_range_high})"
        
        # Create alert data
        alert_data = AlertCreate(
            patient_id=patient_id,
            user_id=current_user.user_id,
            alert_type="lab_result",
            message=message,
            severity=severity,
            is_read=False,
            details={
                "lab_result_id": lab_result.result_id,
                "test_name": lab_result.test_name,
                "value": lab_result.value_numeric,
                "unit": lab_result.unit,
                "reference_range_low": lab_result.reference_range_low,
                "reference_range_high": lab_result.reference_range_high,
                "timestamp": lab_result.timestamp.isoformat() if lab_result.timestamp else None
            },
            created_by=current_user.user_id
        )
        
        # Use CRUD function to create alert
        db_alert = alerts_crud.create_alert(db, alert_data)
        generated_alerts.append(db_alert)
    
    return {"count": len(generated_alerts), "alerts": generated_alerts}

@router.get("/stats", response_model=AlertStats)
def get_alert_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Get alert statistics for the current user.
    """
    # Total de alertas
    total = db.query(func.count(models.Alert.alert_id)).filter(
        models.Alert.user_id == current_user.user_id
    ).scalar()
    
    # Alertas não lidos
    unread = db.query(func.count(models.Alert.alert_id)).filter(
        models.Alert.user_id == current_user.user_id,
        models.Alert.is_read == False
    ).scalar()
    
    # Alertas por severidade
    severity_counts = db.query(
        models.Alert.severity,
        func.count(models.Alert.alert_id)
    ).filter(
        models.Alert.user_id == current_user.user_id
    ).group_by(models.Alert.severity).all()
    
    by_severity = {severity: count for severity, count in severity_counts}
    
    return {
        "total": total,
        "unread": unread,
        "by_severity": by_severity
    }

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Delete an alert.
    """
    # Get the alert first
    alert = alerts_crud.get_alert(db, alert_id)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    # Check if alert belongs to current user
    if alert.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this alert"
        )
    
    # Use CRUD function to delete alert
    success = alerts_crud.delete_alert(db, alert_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert"
        )
    
    return None

@router.get("/summary/{patient_id}")
async def get_alert_summary(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retorna um resumo dos alertas por severidade e categoria.
    
    - **patient_id**: ID do paciente
    """
    # Buscar alertas do paciente
    patient = patients_crud.get_patient(db, patient_id=patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    
    # Verificar se o paciente tem exames
    if not patient.exams or len(patient.exams) == 0:
        return {
            "by_severity": {},
            "by_category": {},
            "total": 0,
            "message": "Paciente não possui exames cadastrados"
        }
    
    # Preparar dados do paciente para o cálculo de TFG
    patient_data = {
        "idade": patient.idade,
        "sexo": patient.sexo,
        "etnia": patient.etnia
    }
    
    # Transformar exames para o formato esperado pelo AlertSystem
    formatted_exams = []
    for exam in patient.exams:
        exam_dict = exam.dict() if hasattr(exam, "dict") else {
            "date": exam.date,
            "type": exam.type,
            "results": []
        }
        
        # Adicionar resultados do exame
        for result in exam.results:
            result_dict = result.dict() if hasattr(result, "dict") else {
                "test": result.test,
                "value": result.value,
                "unit": result.unit,
                "referenceRange": result.reference_range,
                "isAbnormal": result.is_abnormal
            }
            result_dict["date"] = exam.date  # Adicionar data do exame ao resultado
            formatted_exams.append(result_dict)
    
    # Gerar alertas
    alerts = AlertSystem.generate_alerts(formatted_exams, patient_data)
    
    # Contabilizar alertas por severidade
    severity_counts = {
        "critical": 0,
        "severe": 0,
        "moderate": 0,
        "warning": 0,
        "info": 0,
        "normal": 0
    }
    
    # Contabilizar alertas por categoria
    category_counts = {}
    
    # Preencher contagens
    for alert in alerts:
        # Por severidade
        severity = alert.get("severity", "normal").lower()
        if severity in severity_counts:
            severity_counts[severity] += 1
        
        # Por categoria
        category = alert.get("category", "Outros")
        if category in category_counts:
            category_counts[category] += 1
        else:
            category_counts[category] = 1
    
    return {
        "by_severity": severity_counts,
        "by_category": category_counts,
        "total": len(alerts),
        "patient_id": str(patient_id)
    }

@router.get("/history/{patient_id}")
async def get_alert_history(
    patient_id: str,
    days: Optional[int] = Query(30, description="Número de dias para analisar (padrão: 30)"),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Retorna a evolução histórica de alertas para um paciente, agrupados por data.
    Útil para visualizar tendências e evolução do estado clínico ao longo do tempo.
    
    - **patient_id**: ID do paciente
    - **days**: Número de dias do histórico a considerar
    - **category**: Filtrar por categoria específica
    """
    # Buscar paciente no banco de dados
    patient = patients_crud.get_patient(db, patient_id=patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    
    # Verificar se o paciente tem exames
    if not patient.exams or len(patient.exams) == 0:
        return {"history": [], "message": "Paciente não possui exames cadastrados"}
    
    # Preparar dados do paciente para o cálculo de TFG
    patient_data = {
        "idade": patient.idade,
        "sexo": patient.sexo,
        "etnia": patient.etnia
    }
    
    # Calcular data limite
    date_limit = datetime.now() - timedelta(days=days)
    
    # Agrupar exames por data
    exams_by_date = {}
    
    for exam in patient.exams:
        # Converter string para data se necessário
        exam_date = exam.date
        if isinstance(exam_date, str):
            try:
                exam_date = datetime.fromisoformat(exam_date.replace('Z', '+00:00'))
            except ValueError:
                try:
                    exam_date = datetime.strptime(exam_date, "%Y-%m-%d")
                except ValueError:
                    # Se não conseguir converter, usar a data atual
                    exam_date = datetime.now()
        
        # Ignorar exames antigos
        if exam_date < date_limit:
            continue
            
        # Normalizar para data sem hora
        date_key = exam_date.strftime("%Y-%m-%d")
        
        if date_key not in exams_by_date:
            exams_by_date[date_key] = []
        
        # Adicionar resultados do exame
        for result in exam.results:
            result_dict = {
                "test": result.test,
                "value": result.value,
                "unit": result.unit,
                "referenceRange": result.reference_range,
                "isAbnormal": result.is_abnormal,
                "date": date_key
            }
            exams_by_date[date_key].append(result_dict)
    
    # Gerar alertas por data
    history = []
    
    for date_key, exams in sorted(exams_by_date.items()):
        # Gerar alertas para os exames desta data
        alerts = AlertSystem.generate_alerts(exams, patient_data)
        
        # Filtrar por categoria se necessário
        if category:
            alerts = [alert for alert in alerts if alert.get("category", "").lower() == category.lower()]
        
        # Contar alertas por severidade
        severity_counts = {
            "critical": 0,
            "severe": 0,
            "moderate": 0,
            "warning": 0,
            "info": 0,
            "normal": 0
        }
        
        for alert in alerts:
            severity = alert.get("severity", "normal").lower()
            if severity in severity_counts:
                severity_counts[severity] += 1
        
        # Adicionar ao histórico
        history.append({
            "date": date_key,
            "alerts_count": len(alerts),
            "by_severity": severity_counts,
            "critical_alerts": [a for a in alerts if a.get("severity") == "critical"][:3]  # Incluir até 3 alertas críticos
        })
    
    return {
        "history": history,
        "days_analyzed": days,
        "patient_id": str(patient_id)
    } 