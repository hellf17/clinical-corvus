from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging

from database import models
import schemas.patient as patient_schema
from database import get_db
from security import get_current_user_required
from utils import severity_scores
from routers.vital_signs import check_patient_access

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/patients/{patient_id}/scores",  # Remove /api prefix - it's added in main.py
    tags=["Severity Scores"],
    dependencies=[Depends(check_patient_access)]  # Apply patient access check to all routes here
)

# Define a response model (optional but good practice)
from pydantic import BaseModel, Field
from datetime import datetime # Ensure datetime is imported if not already

class ScoreComponent(BaseModel):
    value: Optional[float] = None
    points: int = 0

class SofaScoreDetail(BaseModel):
    respiratorio: int
    coagulacao: int
    hepatico: int
    cardiovascular: int
    neurologico: int
    renal: int

class ApacheIICscoreDetail(BaseModel):
    temperatura: int
    pressao_arterial_media: int
    frequencia_cardiaca: int
    frequencia_respiratoria: int
    oxigenacao: int
    ph_arterial: int
    sodio: int
    potassio: int
    creatinina: int
    hematocrito: int
    leucocitos: int
    glasgow: int
    idade: int
    saude_cronica: int
    # Add fc back for compatibility if tests need it
    fc: Optional[int] = None

class News2ScoreDetail(BaseModel):
    respiratory_rate: int
    oxygen_saturation: int
    supplemental_oxygen: int
    temperature: int
    systolic_bp: int
    heart_rate: int
    consciousness: int

class CalculatedScoresResponse(BaseModel):
    patient_id: int
    calculated_at: datetime
    sofa: Optional[Dict[str, Any]] = None
    qsofa: Optional[Dict[str, Any]] = None
    apache_ii: Optional[Dict[str, Any]] = None
    gfr_ckd_epi: Optional[Dict[str, Any]] = None
    news2: Optional[Dict[str, Any]] = None # Add NEWS2 field
    # Add placeholders for others if needed
    # saps3: Optional[Dict[str, Any]] = None
    # child_pugh: Optional[Dict[str, Any]] = None

@router.get("", response_model=CalculatedScoresResponse)
def get_patient_scores(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required) # Use corrected auth dependency
):
    """
    Calculates and returns various clinical severity scores for the patient
    based on the latest available data within a reasonable timeframe.
    """
    logger.info(f"User {current_user.user_id} requesting scores for patient {patient_id}")
    
    try:
        # 1. Gather parameters
        parametros = severity_scores.gather_score_parameters(db, patient_id)
        calculation_time = datetime.utcnow()

        # 2. Calculate Scores
        sofa_result = None
        qsofa_result = None
        apache_result = None
        gfr_result = None
        news2_result = None # Initialize NEWS2 result

        try:
            sofa_score, sofa_components, sofa_interp = severity_scores.calcular_sofa(parametros)
            sofa_result = {"score": sofa_score, "components": sofa_components, "interpretation": sofa_interp}
        except Exception as e:
            logger.error(f"SOFA calculation failed for patient {patient_id}: {e}", exc_info=False) # Reduce noise

        try:
            qsofa_score, qsofa_interp = severity_scores.calcular_qsofa(parametros)
            qsofa_result = {"score": qsofa_score, "interpretation": qsofa_interp}
        except Exception as e:
            logger.error(f"qSOFA calculation failed for patient {patient_id}: {e}", exc_info=False)

        try:
            apache_score, apache_components, apache_mortality, apache_interp = severity_scores.calcular_apache2(parametros)
            # Add fc back for compatibility if needed by response model/frontend
            if 'frequencia_cardiaca' in apache_components:
                apache_components['fc'] = apache_components['frequencia_cardiaca']
            apache_result = {
                "score": apache_score, 
                "components": apache_components, 
                "estimated_mortality": apache_mortality, 
                "interpretation": apache_interp
            }
        except Exception as e:
            logger.error(f"APACHE II calculation failed for patient {patient_id}: {e}", exc_info=False)
            
        try:
            tfg = severity_scores.calcular_tfg_ckd_epi_from_params(parametros)
            if tfg is not None:
                classification = severity_scores.classificar_tfg_kdigo(tfg)
                gfr_result = {"tfg_ml_min_173m2": tfg, "classification_kdigo": classification}
            else:
                 gfr_result = {"tfg_ml_min_173m2": None, "classification_kdigo": "Não foi possível calcular (dados insuficientes)"}
        except Exception as e:
            logger.error(f"GFR calculation failed for patient {patient_id}: {e}", exc_info=False)
            gfr_result = {"tfg_ml_min_173m2": None, "classification_kdigo": f"Erro no cálculo: {e}"}

        # Calculate NEWS2
        try:
            news2_score, news2_components, news2_interp = severity_scores.calcular_news(parametros)
            news2_result = {"score": news2_score, "components": news2_components, "interpretation": news2_interp}
        except Exception as e:
             logger.error(f"NEWS2 calculation failed for patient {patient_id}: {e}", exc_info=False)
             news2_result = None # Set to None on failure

        # 3. Construct Response
        response = CalculatedScoresResponse(
            patient_id=patient_id,
            calculated_at=calculation_time,
            sofa=sofa_result,
            qsofa=qsofa_result,
            apache_ii=apache_result,
            gfr_ckd_epi=gfr_result,
            news2=news2_result # Add NEWS2 result to response
        )
        
        return response

    except Exception as e:
        # Log the detailed gathering error if it occurs
        logger.error(f"Failed to gather parameters or calculate scores for patient {patient_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Could not calculate scores: {e}"
        ) 