"""
Database configuration and data access layer for Clinical Helper.
This module handles SQLAlchemy setup and provides functions for database operations.
"""

import os
import time
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.exc import OperationalError
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database connection string from environment variables
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not found in environment variables. Using SQLite for development.")
    DATABASE_URL = "sqlite:///./clinical_helper.db"

# Create SQLAlchemy engine with retry logic for Docker environments
def get_engine(max_retries=5, retry_interval=2):
    """Create database engine with retry logic for container startups."""
    retries = 0
    while retries < max_retries:
        try:
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Verifica se a conexão está ativa antes de usá-la
                pool_recycle=3600,   # Recicla conexões após 1 hora
            )
            # Test connection - using sqlalchemy.text() for raw SQL in SQLAlchemy 2.0
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                conn.commit()
            logger.info("Database connection established successfully")
            return engine
        except OperationalError as e:
            retries += 1
            if retries < max_retries:
                wait_time = retry_interval * retries
                logger.warning(f"Database connection failed. Retrying in {wait_time} seconds... ({retries}/{max_retries})")
                logger.warning(f"Error: {str(e)}")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts: {str(e)}")
                raise

# Initialize engine
try:
    engine = get_engine()
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create base class for ORM models
    Base = declarative_base()
except Exception as e:
    logger.error(f"Error initializing database: {str(e)}")
    raise

@contextmanager
def get_db_session():
    """Provide a transactional scope around a series of operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        session.close()

def create_tables():
    """Create all tables in the database."""
    try:
        # Import here to avoid circular imports
        from src.db_models import User, Patient, LabResult, TestCategory, Medication, ClinicalScore, LabInterpretation
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise

# User Management Functions
def get_or_create_user(db_session: Session, email: str, name: str):
    """Get an existing user or create a new one if not found."""
    # Import here to avoid circular imports
    from src.db_models import User
    
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        logger.info(f"Created new user: {email}")
    return user

# Patient Management Functions
def add_patient(db_session: Session, patient_data: Dict[str, Any], user_id: int):
    """Add a new patient for the specified user."""
    # Import here to avoid circular imports
    from src.db_models import Patient
    
    patient = Patient(
        user_id=user_id,
        name=patient_data.get("name"),
        idade=patient_data.get("idade"),
        sexo=patient_data.get("sexo"),
        peso=patient_data.get("peso"),
        altura=patient_data.get("altura"),
        etnia=patient_data.get("etnia"),
        data_internacao=patient_data.get("data_internacao"),
        diagnostico=patient_data.get("diagnostico")
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    logger.info(f"Added new patient for user {user_id}: {patient.name}")
    return patient

def get_patients_for_user(db_session: Session, user_id: int):
    """Get all patients for the specified user."""
    # Import here to avoid circular imports
    from src.db_models import Patient
    
    return db_session.query(Patient).filter(Patient.user_id == user_id).all()

def get_patient_by_id(db_session: Session, patient_id: int, user_id: int):
    """Get a patient by ID, ensuring the user owns the patient."""
    # Import here to avoid circular imports
    from src.db_models import Patient
    
    return db_session.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.user_id == user_id
    ).first()

# Lab Results Functions
def get_or_create_test_category(db_session: Session, name: str, description: str = None):
    """Get or create a test category."""
    # Import here to avoid circular imports
    from src.db_models import TestCategory
    
    category = db_session.query(TestCategory).filter(TestCategory.name == name).first()
    if not category:
        category = TestCategory(name=name, description=description)
        db_session.add(category)
        db_session.commit()
        db_session.refresh(category)
    return category

def add_lab_results_batch(
    db_session: Session, 
    results_dict: Dict[str, Any], 
    patient_id: int, 
    user_id: int, 
    result_timestamp: datetime
):
    """Add a batch of lab results for a patient."""
    # Import here to avoid circular imports
    from src.db_models import LabResult
    
    added_results = []
    
    for test_name, test_data in results_dict.items():
        # Determine the category based on test name
        category_name = determine_test_category(test_name)
        category = get_or_create_test_category(db_session, category_name)
        
        result = LabResult(
            patient_id=patient_id,
            user_id=user_id,
            test_name=test_name,
            value_numeric=test_data.get("value"),
            value_text=str(test_data.get("value")) if not isinstance(test_data.get("value"), (int, float)) else None,
            unit=test_data.get("unit"),
            timestamp=result_timestamp,
            reference_range_low=test_data.get("reference_low"),
            reference_range_high=test_data.get("reference_high"),
            category_id=category.category_id
        )
        db_session.add(result)
        added_results.append(result)
    
    db_session.commit()
    logger.info(f"Added {len(added_results)} lab results for patient {patient_id}")
    return added_results

def determine_test_category(test_name: str) -> str:
    """Determine the category of a test based on its name."""
    test_name_lower = test_name.lower()
    
    categories = {
        "Gasometria": ["ph", "pco2", "po2", "hco3", "be", "so2"],
        "Eletrólitos": ["sódio", "potássio", "cálcio", "magnésio", "fósforo", "cloro"],
        "Hemograma": ["hemoglobina", "hematócrito", "leucócitos", "plaquetas", "hemácias"],
        "Função Renal": ["ureia", "creatinina", "clearance", "tgo", "tgp"],
        "Função Hepática": ["ast", "alt", "bilirrubina", "ggt", "fosfatase"],
        "Marcadores Cardíacos": ["troponina", "cpk", "ck-mb", "ldh"],
        "Inflamatórios": ["pcr", "vhs", "procalcitonina"],
        "Microbiologia": ["cultura", "antibiograma"]
    }
    
    for category, keywords in categories.items():
        if any(keyword in test_name_lower for keyword in keywords):
            return category
    
    return "Outros"

def get_lab_results_for_patient(
    db_session: Session, 
    patient_id: int, 
    user_id: int,
    category_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get lab results for a patient with optional filtering."""
    # Import here to avoid circular imports
    from src.db_models import LabResult
    
    query = db_session.query(LabResult).filter(
        LabResult.patient_id == patient_id,
        LabResult.user_id == user_id
    )
    
    if category_id:
        query = query.filter(LabResult.category_id == category_id)
    
    if start_date:
        query = query.filter(LabResult.timestamp >= start_date)
    
    if end_date:
        query = query.filter(LabResult.timestamp <= end_date)
    
    return query.order_by(LabResult.timestamp.desc()).all()

# Medication Functions
def add_medication(
    db_session: Session, 
    patient_id: int, 
    user_id: int, 
    name: str, 
    dosage: str,
    frequency: str,
    start_date: datetime,
    end_date: Optional[datetime] = None,
    active: bool = True
):
    """Add a medication for a patient."""
    # Import here to avoid circular imports
    from src.db_models import Medication
    
    medication = Medication(
        patient_id=patient_id,
        user_id=user_id,
        name=name,
        dosage=dosage,
        frequency=frequency,
        start_date=start_date,
        end_date=end_date,
        active=active
    )
    db_session.add(medication)
    db_session.commit()
    db_session.refresh(medication)
    return medication

def get_medications_for_patient(
    db_session: Session, 
    patient_id: int, 
    user_id: int,
    active_only: bool = False
):
    """Get medications for a patient."""
    # Import here to avoid circular imports
    from src.db_models import Medication
    
    query = db_session.query(Medication).filter(
        Medication.patient_id == patient_id,
        Medication.user_id == user_id
    )
    
    if active_only:
        query = query.filter(Medication.active == True)
    
    return query.order_by(Medication.start_date.desc()).all()

# Clinical Score Functions
def add_clinical_score(
    db_session: Session,
    patient_id: int,
    user_id: int,
    score_type: str,
    value: float,
    timestamp: datetime
):
    """Add a clinical score for a patient."""
    # Import here to avoid circular imports
    from src.db_models import ClinicalScore
    
    score = ClinicalScore(
        patient_id=patient_id,
        user_id=user_id,
        score_type=score_type,
        value=value,
        timestamp=timestamp
    )
    db_session.add(score)
    db_session.commit()
    db_session.refresh(score)
    return score

def get_clinical_scores_for_patient(
    db_session: Session,
    patient_id: int,
    user_id: int,
    score_type: Optional[str] = None
):
    """Get clinical scores for a patient."""
    # Import here to avoid circular imports
    from src.db_models import ClinicalScore
    
    query = db_session.query(ClinicalScore).filter(
        ClinicalScore.patient_id == patient_id,
        ClinicalScore.user_id == user_id
    )
    
    if score_type:
        query = query.filter(ClinicalScore.score_type == score_type)
    
    return query.order_by(ClinicalScore.timestamp.desc()).all()

# Lab Interpretation Functions
def add_lab_interpretation(
    db_session: Session,
    result_id: int,
    user_id: int,
    interpretation_text: str,
    ai_generated: bool = True
):
    """Add an interpretation for a lab result."""
    # Import here to avoid circular imports
    from src.db_models import LabInterpretation
    
    interpretation = LabInterpretation(
        result_id=result_id,
        user_id=user_id,
        interpretation_text=interpretation_text,
        ai_generated=ai_generated
    )
    db_session.add(interpretation)
    db_session.commit()
    db_session.refresh(interpretation)
    return interpretation

def get_interpretations_for_result(
    db_session: Session,
    result_id: int,
    user_id: int
):
    """Get interpretations for a lab result."""
    # Import here to avoid circular imports
    from src.db_models import LabInterpretation
    
    return db_session.query(LabInterpretation).filter(
        LabInterpretation.result_id == result_id,
        LabInterpretation.user_id == user_id
    ).order_by(LabInterpretation.created_at.desc()).all() 