"""
Database models for Clinical Helper.
This module defines SQLAlchemy ORM models for all database tables.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.database import Base

class User(Base):
    """User model representing healthcare professionals using the application."""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    patients = relationship("Patient", back_populates="user", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="user")
    medications = relationship("Medication", back_populates="user")
    clinical_scores = relationship("ClinicalScore", back_populates="user")
    lab_interpretations = relationship("LabInterpretation", back_populates="user")


class Patient(Base):
    """Patient model containing demographic and clinical information."""
    __tablename__ = "patients"
    
    patient_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255))
    idade = Column(Integer)
    sexo = Column(String(1))
    peso = Column(Float)
    altura = Column(Float)
    etnia = Column(String(50))
    data_internacao = Column(DateTime)
    diagnostico = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="patients")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    clinical_scores = relationship("ClinicalScore", back_populates="patient", cascade="all, delete-orphan")


class TestCategory(Base):
    """Model for categorizing laboratory tests."""
    __tablename__ = "test_categories"
    
    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    
    # Relationships
    lab_results = relationship("LabResult", back_populates="category")


class LabResult(Base):
    """Laboratory test result model."""
    __tablename__ = "lab_results"
    
    result_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("test_categories.category_id"))
    test_name = Column(String(100), nullable=False)
    value_numeric = Column(Float)
    value_text = Column(String(255))
    unit = Column(String(50))
    timestamp = Column(DateTime, nullable=False)
    reference_range_low = Column(Float)
    reference_range_high = Column(Float)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="lab_results")
    user = relationship("User", back_populates="lab_results")
    category = relationship("TestCategory", back_populates="lab_results")
    interpretations = relationship("LabInterpretation", back_populates="result", cascade="all, delete-orphan")


class Medication(Base):
    """Medication model for tracking patient medications."""
    __tablename__ = "medications"
    
    medication_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100))
    frequency = Column(String(100))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    active = Column(Boolean, default=True)
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