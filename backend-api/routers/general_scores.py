from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import logging

from schemas.lab_analysis import SofaInput, QSofaInput, ApacheIIInput
from utils import severity_scores

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scores",
    tags=["General Scores"]
)

@router.post("/sofa")
async def calculate_sofa_score(input_data: SofaInput) -> Dict[str, Any]:
    """
    Calculates the SOFA score based on provided parameters.
    """
    try:
        sofa_score, sofa_components, sofa_interp = severity_scores.calcular_sofa(input_data.dict())
        return {
            "score": sofa_score,
            "interpretation": sofa_interp,
            "component_scores": sofa_components
        }
    except Exception as e:
        logger.error(f"Error calculating SOFA score: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/qsofa")
async def calculate_qsofa_score(input_data: QSofaInput) -> Dict[str, Any]:
    """
    Calculates the qSOFA score based on provided parameters.
    """
    try:
        qsofa_score, qsofa_interp = severity_scores.calcular_qsofa(input_data.dict())
        return {
            "score": qsofa_score,
            "interpretation": qsofa_interp
        }
    except Exception as e:
        logger.error(f"Error calculating qSOFA score: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/apache2")
async def calculate_apache2_score(input_data: ApacheIIInput) -> Dict[str, Any]:
    """
    Calculates the APACHE II score based on provided parameters.
    """
    try:
        apache_score, apache_components, apache_mortality, apache_interp = severity_scores.calcular_apache2(input_data.dict())
        return {
            "score": apache_score,
            "interpretation": apache_interp,
            "mortality_risk": apache_mortality,
            "component_scores": apache_components
        }
    except Exception as e:
        logger.error(f"Error calculating APACHE II score: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))