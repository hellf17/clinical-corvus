"""
Tests for database models using SQLAlchemy ORM.
"""

import pytest
import sys
import os
from sqlalchemy.exc import IntegrityError
from datetime import datetime

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models

def test_user_model_creation(sqlite_session):
    """Test creating a User model instance."""
    # Create a new user
    new_user = models.User(
        email="test@example.com",
        name="Test User",
        role="doctor"
    )
    
    # Add to database
    sqlite_session.add(new_user)
    sqlite_session.commit()
    
    # Query the user
    db_user = sqlite_session.query(models.User).filter_by(email="test@example.com").first()
    
    # Assertions
    assert db_user is not None
    assert db_user.email == "test@example.com"
    assert db_user.name == "Test User"
    assert db_user.role == "doctor"
    assert db_user.user_id is not None
    assert db_user.created_at is not None

def test_user_unique_email_constraint(sqlite_session):
    """Test that user email must be unique."""
    # Create a user
    user1 = models.User(
        email="duplicate@example.com",
        name="First User"
    )
    sqlite_session.add(user1)
    sqlite_session.commit()
    
    # Try to create another user with the same email
    user2 = models.User(
        email="duplicate@example.com",
        name="Second User"
    )
    sqlite_session.add(user2)
    
    # This should raise an IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    
    # Rollback the failed transaction
    sqlite_session.rollback()

def test_patient_model_creation(sqlite_session):
    """Test creating a Patient model instance with proper relationships."""
    # Create a test user first
    user = models.User(
        email="patient_test@example.com",
        name="Doctor Test",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient associated with the user
    patient = models.Patient(
        user_id=user.user_id,
        name="Patient Name",
        idade=45,
        sexo="M",
        peso=70.5,
        altura=1.75,
        etnia="branco",
        diagnostico="Test diagnosis",
        data_internacao=datetime.now()
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Query the patient
    db_patient = sqlite_session.query(models.Patient).filter_by(name="Patient Name").first()
    
    # Assertions
    assert db_patient is not None
    assert db_patient.name == "Patient Name"
    assert db_patient.user_id == user.user_id
    assert db_patient.idade == 45
    assert db_patient.sexo == "M"
    assert db_patient.peso == 70.5
    assert db_patient.altura == 1.75
    assert db_patient.etnia == "branco"
    assert db_patient.diagnostico == "Test diagnosis"
    assert db_patient.created_at is not None
    assert db_patient.updated_at is not None

def test_lab_result_relationships(sqlite_session):
    """Test creating lab results with relationships to patients and categories."""
    # Create test user first
    user = models.User(
        email="lab_test@example.com",
        name="Lab Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Lab Patient",
        idade=50
    )
    sqlite_session.add(patient)
    
    # Create test category
    category = models.TestCategory(
        name="Hematology",
        description="Blood tests"
    )
    sqlite_session.add(category)
    sqlite_session.commit()
    
    # Create lab result
    lab_result = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_category_id=category.category_id,
        test_name="Hemoglobin",
        value_numeric=14.5,
        unit="g/dL",
        timestamp=datetime.now(),
        reference_range_low=12.0,
        reference_range_high=16.0
    )
    sqlite_session.add(lab_result)
    sqlite_session.commit()
    
    # Create an interpretation for the lab result
    interpretation = models.LabInterpretation(
        result_id=lab_result.result_id,
        user_id=user.user_id,
        interpretation_text="Normal hemoglobin level",
        ai_generated=True
    )
    sqlite_session.add(interpretation)
    sqlite_session.commit()
    
    # Query and test relationships
    db_result = sqlite_session.query(models.LabResult).filter_by(test_name="Hemoglobin").first()
    assert db_result is not None
    assert db_result.patient.name == "Lab Patient"
    assert db_result.test_category is not None
    assert db_result.test_category.name == "Hematology"
    
    # Test back-references
    assert len(db_result.interpretations) == 1
    assert db_result.interpretations[0].interpretation_text == "Normal hemoglobin level"
    
    patient_results = sqlite_session.query(models.Patient).filter_by(patient_id=patient.patient_id).first().lab_results
    assert len(patient_results) == 1
    assert patient_results[0].test_name == "Hemoglobin"

def test_cascade_delete(sqlite_session):
    """Test that deleting a patient cascades to its related lab results."""
    # Create test user
    user = models.User(
        email="cascade@example.com",
        name="Cascade Test",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Delete Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create lab results for the patient
    lab1 = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_name="Test1",
        value_numeric=1.0,
        timestamp=datetime.now()
    )
    lab2 = models.LabResult(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        test_name="Test2",
        value_numeric=2.0,
        timestamp=datetime.now()
    )
    sqlite_session.add(lab1)
    sqlite_session.add(lab2)
    sqlite_session.commit()
    
    # Verify lab results exist
    count_before = sqlite_session.query(models.LabResult).filter_by(patient_id=patient.patient_id).count()
    assert count_before == 2
    
    # Delete the patient
    sqlite_session.delete(patient)
    sqlite_session.commit()
    
    # Verify lab results were cascaded
    count_after = sqlite_session.query(models.LabResult).filter_by(patient_id=patient.patient_id).count()
    assert count_after == 0 