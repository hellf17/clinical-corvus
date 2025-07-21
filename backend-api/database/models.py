"""
Database models for Clinical Helper.
This module defines all SQLAlchemy ORM models for the application database.
All models should be defined here to avoid duplication and conflicts.
"""

from datetime import datetime
import enum
import uuid
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON, Enum as SQLAlchemyEnum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine import Engine
from sqlalchemy import event

from . import Base
from .types import GUID

# Add SQLite UUID handling for testing
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Check if using SQLite (for testing)
def is_sqlite_dialect():
    from sqlalchemy import inspect
    try:
        insp = inspect(Base.metadata.bind)
        return insp.dialect.name == 'sqlite'
    except:
        return False

# ================ ENUM DEFINITIONS ================

class MedicationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"

class MedicationRoute(str, enum.Enum):
    ORAL = "oral"
    INTRAVENOUS = "intravenous"
    INTRAMUSCULAR = "intramuscular"
    SUBCUTANEOUS = "subcutaneous"
    TOPICAL = "topical"
    INHALATION = "inhalation"
    RECTAL = "rectal"
    OTHER = "other"

class MedicationFrequency(str, enum.Enum):
    ONCE = "once"
    DAILY = "daily"
    BID = "bid"  # twice a day 
    TID = "tid"  # three times a day
    QID = "qid"  # four times a day
    CONTINUOUS = "continuous"
    AS_NEEDED = "as_needed"
    OTHER = "other"
    # Add human-readable names for compatibility with test data
    ONCE_DAILY = "Once daily"
    TWICE_DAILY = "Twice daily"
    THREE_TIMES_DAILY = "Three times daily"
    FOUR_TIMES_DAILY = "Four times daily"

class NoteType(str, enum.Enum):
    PROGRESS = "progress"
    ADMISSION = "admission"
    DISCHARGE = "discharge"
    PROCEDURE = "procedure"
    CONSULTATION = "consultation"
    OTHER = "other"

class ExamStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    ERROR = "error"

# ================ USER & PATIENT MODELS ================

# Many-to-Many association table for Doctors and Patients
doctor_patient_association = Table(
    'doctor_patient_association',
    Base.metadata,
    Column('doctor_user_id', Integer, ForeignKey('users.user_id', ondelete="CASCADE"), primary_key=True),
    Column('patient_patient_id', Integer, ForeignKey('patients.patient_id', ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    """User model representing healthcare professionals using the application."""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(50), default="guest")  # "doctor", "patient", or "guest"
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    # Relationship for a patient user to their own patient data
    patient_data = relationship("Patient", uselist=False, back_populates="user_account", foreign_keys="Patient.user_id") 
    
    # Relationship for a doctor user to the patients they manage
    managed_patients = relationship(
        "Patient",
        secondary=doctor_patient_association,
        back_populates="managing_doctors",
        lazy="selectin" # Use selectin loading for efficiency
    )
    
    # Keep other existing relationships
    lab_results = relationship("LabResult", back_populates="user", foreign_keys="[LabResult.user_id]")
    created_lab_results = relationship("LabResult", back_populates="creator", foreign_keys="[LabResult.created_by]")
    medications = relationship("Medication", back_populates="user")
    clinical_scores = relationship("ClinicalScore", back_populates="user")
    lab_interpretations = relationship("LabInterpretation", back_populates="user")
    alerts = relationship("Alert", foreign_keys="[Alert.user_id]", back_populates="user")
    health_diary_entries = relationship("HealthDiaryEntry", back_populates="user") # Added via backref previously
    # Add backrefs if not explicitly defined elsewhere (check other models)
    # clinical_notes = relationship("ClinicalNote", back_populates="user") # Example
    # analyses = relationship("Analysis", back_populates="user") # Example
    # ai_chat_conversations = relationship("AIChatConversation", back_populates="user") # Example


class Patient(Base):
    """Patient model containing demographic and clinical information."""
    __tablename__ = "patients"
    
    patient_id = Column(Integer, primary_key=True, index=True)
    # This links the patient record to the user account representing the patient themselves
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, unique=True) # Ensure one Patient record per User
    name = Column(String(255))
    idade = Column(Integer)
    sexo = Column(String(1))
    peso = Column(Float)
    altura = Column(Float)
    etnia = Column(String(50))
    data_internacao = Column(DateTime)
    diagnostico = Column(Text)
    exames = Column(Text)  # Add field for lab tests/results as text
    medicacoes = Column(Text)  # Add field for medications as text
    exame_fisico = Column(Text)  # Add field for physical examination
    historia_familiar = Column(Text)  # Add field for family history
    historia_clinica = Column(Text)  # Add field for clinical history
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    # Link back to the User account that IS this patient
    user_account = relationship("User", back_populates="patient_data", foreign_keys=[user_id])
    
    # Link back to the Doctor users who manage this patient
    managing_doctors = relationship(
        "User",
        secondary=doctor_patient_association,
        back_populates="managed_patients",
        lazy="selectin"
    )

    # Keep other existing relationships
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    clinical_scores = relationship("ClinicalScore", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient")
    # Add backrefs if not explicitly defined elsewhere
    # clinical_notes = relationship("ClinicalNote", back_populates="patient") # Example
    # analyses = relationship("Analysis", back_populates="patient") # Example
    # ai_chat_conversations = relationship("AIChatConversation", back_populates="patient") # Example
    vital_signs = relationship("VitalSign", back_populates="patient", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="patient", cascade="all, delete-orphan")

# --- NEW VitalSign Model ---
class VitalSign(Base):
    """Model for storing timestamped vital signs for a patient."""
    __tablename__ = "vital_signs"
    
    vital_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature_c = Column(Float, nullable=True) # Temperature in Celsius
    heart_rate = Column(Integer, nullable=True) # Beats per minute
    respiratory_rate = Column(Integer, nullable=True) # Breaths per minute
    systolic_bp = Column(Integer, nullable=True) # Systolic blood pressure (mmHg)
    diastolic_bp = Column(Integer, nullable=True) # Diastolic blood pressure (mmHg)
    oxygen_saturation = Column(Float, nullable=True) # SpO2 (%)
    # Add Glasgow Coma Scale
    glasgow_coma_scale = Column(Integer, nullable=True) # GCS score (3-15)
    
    # Potentially add FiO2 if manually recorded with vitals
    fio2_input = Column(Float, nullable=True) # FiO2 as decimal (0.21-1.0) or percentage?
    
    created_at = Column(DateTime, default=func.now())
    # Add user_id to track who recorded the vitals?
    # recorded_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # Relationship
    patient = relationship("Patient", back_populates="vital_signs")
    # recorder = relationship("User") # If recorded_by_user_id is added

# ================ EXAM MODELS ====================

class Exam(Base):
    """Model for storing metadata about an exam upload and its context."""
    __tablename__ = "exams"

    exam_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False) # User who uploaded/initiated
    
    exam_timestamp = Column(DateTime, nullable=False, index=True) # Actual date/time of the exam from PDF or report
    upload_timestamp = Column(DateTime, default=func.now()) # When the exam was uploaded
    
    exam_type = Column(String(100), nullable=True) # E.g., "Blood Panel", "Urinalysis", "Pathology Report"
    source_file_name = Column(String(255), nullable=True) # Original name of the uploaded file
    source_file_path = Column(String(512), nullable=True) # Path to archived PDF, if stored
    processing_status = Column(SQLAlchemyEnum(ExamStatus), default=ExamStatus.PENDING, nullable=False)
    processing_log = Column(Text, nullable=True) # To store any errors or messages during processing

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="exams")
    uploader = relationship("User", foreign_keys=[user_id]) # User who uploaded the exam
    lab_results = relationship("LabResult", back_populates="exam", cascade="all, delete-orphan")

# ================ LABORATORY MODELS ================

class TestCategory(Base):
    """Model for categorizing laboratory tests."""
    __tablename__ = "test_categories"
    
    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships com especificação explícita de qual coluna usar
    lab_results = relationship(
        "LabResult", 
        back_populates="test_category",
        foreign_keys="[LabResult.test_category_id]"  # Especifica explicitamente qual coluna ForeignKey usar
    )


class LabResult(Base):
    """Laboratory test result model."""
    __tablename__ = "lab_results"
    
    result_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.exam_id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("test_categories.category_id"))
    test_name = Column(String(100), nullable=False)
    value_numeric = Column(Float)
    value_text = Column(String(255))
    unit = Column(String(50))
    timestamp = Column(DateTime, nullable=False)
    reference_range_low = Column(Float)
    reference_range_high = Column(Float)
    is_abnormal = Column(Boolean, default=False)  # Added to match test expectations
    collection_datetime = Column(DateTime)  # Added to match test expectations
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.user_id"))  # Added to match test expectations
    test_category_id = Column(Integer, ForeignKey("test_categories.category_id"), nullable=True)
    reference_text = Column(String, nullable=True)
    comments = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    report_datetime = Column(DateTime, nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="lab_results")
    exam = relationship("Exam", back_populates="lab_results")
    user = relationship("User", back_populates="lab_results", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])  # Changed from created_by_user to creator
    test_category = relationship("TestCategory", back_populates="lab_results", foreign_keys=[test_category_id])
    interpretations = relationship("LabInterpretation", back_populates="result", cascade="all, delete-orphan")


class LabInterpretation(Base):
    """Model for storing interpretations of lab results."""
    __tablename__ = "lab_interpretations"
    
    interpretation_id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("lab_results.result_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    interpretation_text = Column(Text, nullable=False)
    ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    result = relationship("LabResult", back_populates="interpretations")
    user = relationship("User", back_populates="lab_interpretations")

# ================ MEDICATION & TREATMENT MODELS ================

class Medication(Base):
    """Medication model for tracking patient medications."""
    __tablename__ = "medications"
    
    medication_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100))
    frequency = Column(SQLAlchemyEnum(MedicationFrequency), nullable=False)
    raw_frequency = Column(String(100), nullable=True)  # Store original frequency text
    route = Column(SQLAlchemyEnum(MedicationRoute), nullable=False, default=MedicationRoute.ORAL)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    active = Column(Boolean, default=True)
    prescriber = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(SQLAlchemyEnum(MedicationStatus), nullable=False, default=MedicationStatus.ACTIVE)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="medications")
    user = relationship("User", back_populates="medications")


class ClinicalScore(Base):
    """Model for clinical severity scores like SOFA, APACHE II, etc."""
    __tablename__ = "clinical_scores"
    
    score_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    score_type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="clinical_scores")
    user = relationship("User", back_populates="clinical_scores")


class ClinicalNote(Base):
    """Model for clinical notes about patients."""
    __tablename__ = "clinical_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(SQLAlchemyEnum(NoteType), nullable=False, default=NoteType.PROGRESS)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", backref="clinical_notes")
    user = relationship("User", backref="clinical_notes")

class Analysis(Base):
    """Model for clinical analyses and assessments."""
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", backref="analyses")
    user = relationship("User", backref="analyses")

# ================ AI CHAT MODELS ================

class AIChatConversation(Base):
    """Model for AI chat conversations."""
    __tablename__ = "ai_chat_conversations"
    
    # Using custom GUID type for cross-database compatibility
    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    last_message_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships with explicit foreign keys
    messages = relationship("AIChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    patient = relationship("Patient", backref="ai_chat_conversations", foreign_keys=[patient_id])
    user = relationship("User", backref="ai_chat_conversations", foreign_keys=[user_id])


class AIChatMessage(Base):
    """Model for messages in AI chat conversations."""
    __tablename__ = "ai_chat_messages"
    
    # Using custom GUID type for cross-database compatibility
    id = Column(GUID(), primary_key=True, index=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("ai_chat_conversations.id"), nullable=False)
    role = Column(String(50), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    conversation = relationship("AIChatConversation", back_populates="messages") 

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    alert_type = Column(String)
    message = Column(String)
    severity = Column(String)
    is_read = Column(Boolean, default=False)
    details = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    
    # Additional fields from test requirements
    parameter = Column(String, nullable=True)
    category = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    reference = Column(String, nullable=True)
    status = Column(String, default="active", nullable=True)
    interpretation = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    # Relacionamentos
    patient = relationship("Patient", back_populates="alerts")
    user = relationship("User", foreign_keys=[user_id], back_populates="alerts")
    creator = relationship("User", foreign_keys=[created_by]) 

# ================ HEALTH & WELLNESS MODELS ===============

class HealthTip(Base):
    """Model for storing general or user-specific health tips."""
    __tablename__ = "health_tips"

    tip_id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

# ================ HEALTH DIARY MODELS ================

class HealthDiaryEntry(Base):
    """Model for storing patient health diary entries."""
    __tablename__ = "health_diary_entries"

    entry_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False) # Link to the patient user
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="health_diary_entries")