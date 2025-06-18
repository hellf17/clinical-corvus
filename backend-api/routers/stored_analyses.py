from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID

from database import get_db
from database.models import Analysis, Patient
from schemas.stored_analyses import AnalysisCreate, AnalysisUpdate, Analysis as AnalysisSchema, AnalysisList
from security import get_current_user
from sqlalchemy import or_

# Create router
router = APIRouter()

@router.post("/analyses/", status_code=201, response_model=AnalysisSchema)
def create_analysis(
    analysis_data: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Create a new analysis."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        # Convert patient_id from string to integer
        patient_id = int(analysis_data.patient_id)

        # Create new analysis record
        analysis = Analysis(
            patient_id=patient_id,
            user_id=current_user.user_id,
            title=analysis_data.title,
            content=analysis_data.content
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        # Return analysis
        return analysis
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid patient_id format. Must be an integer."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating analysis: {str(e)}"
        )

@router.get("/analyses/_search", response_model=List[AnalysisSchema])
def search_analyses(
    query: str = Query(...),
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Search for analyses by title or content."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    search_query = f"%{query}%"
    analyses = db.query(Analysis).filter(
        or_(
            Analysis.title.ilike(search_query),
            Analysis.content.ilike(search_query)
        )
    ).all()
    
    return analyses

@router.get("/analyses/patient/{patient_id}", response_model=List[AnalysisSchema])
def get_patient_analyses(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Get all analyses for a specific patient."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    analyses = db.query(Analysis).filter(Analysis.patient_id == patient_id).all()
    
    return analyses

@router.get("/analyses/{analysis_id}", response_model=AnalysisSchema)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Get a specific analysis by ID."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return analysis

@router.put("/analyses/{analysis_id}", response_model=AnalysisSchema)
def update_analysis(
    analysis_id: int,
    analysis_data: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Update an existing analysis."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    try:
        # Update fields
        if analysis_data.title is not None:
            analysis.title = analysis_data.title
        if analysis_data.content is not None:
            analysis.content = analysis_data.content
        
        db.commit()
        db.refresh(analysis)
        
        return analysis
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating analysis: {str(e)}"
        )

@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: Patient = Depends(get_current_user)
):
    """Delete an analysis."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    try:
        db.delete(analysis)
        db.commit()
        
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting analysis: {str(e)}"
        ) 