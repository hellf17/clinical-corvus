"""
Unit tests for Pydantic schemas.
"""

import pytest
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import sys
import os
from pydantic import ValidationError

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import schemas
from schemas import (
    MedicationStatus, MedicationRoute, MedicationFrequency,
    MedicationCreate, MedicationUpdate, Medication,
    NoteType, ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNote,
    PatientCreate, PatientUpdate, Patient,
    UserCreate, User
)

#
# Medication Schema Tests
#
def test_medication_create_schema():
    """Test MedicationCreate schema validation."""
    # Valid data
    patient_id = uuid4()
    user_id = uuid4()
    valid_data = {
        "patient_id": patient_id,
        "user_id": user_id,
        "name": "Aspirin",
        "dosage": "100mg",
        "route": MedicationRoute.ORAL,
        "frequency": MedicationFrequency.DAILY,
        "start_date": datetime.now(),
        "end_date": datetime.now() + timedelta(days=30),
        "status": MedicationStatus.ACTIVE,
        "instructions": "Take with food",
        "notes": "For pain relief"
    }
    
    medication = MedicationCreate(**valid_data)
    assert medication.patient_id == patient_id
    assert medication.user_id == user_id
    assert medication.name == "Aspirin"
    assert medication.dosage == "100mg"
    assert medication.route == MedicationRoute.ORAL
    assert medication.frequency == MedicationFrequency.DAILY
    assert medication.status == MedicationStatus.ACTIVE
    
    # Test with missing required fields
    with pytest.raises(ValidationError):
        MedicationCreate(
            name="Aspirin",
            dosage="100mg",
            # Missing patient_id
            # Missing route
            # Missing frequency
            # Missing start_date
        )
    
    # Test with invalid enum values
    with pytest.raises(ValidationError):
        MedicationCreate(
            patient_id=patient_id,
            name="Aspirin",
            dosage="100mg",
            route="invalid_route",  # Invalid route
            frequency=MedicationFrequency.DAILY,
            start_date=datetime.now()
        )

def test_medication_update_schema():
    """Test MedicationUpdate schema validation."""
    # All fields are optional in update
    update = MedicationUpdate(name="Updated Name")
    assert update.name == "Updated Name"
    assert update.dosage is None
    
    # Test with invalid enum value
    with pytest.raises(ValidationError):
        MedicationUpdate(status="invalid_status")

def test_medication_schema():
    """Test the Medication model schema."""
    # Valid data including id and timestamps
    medication_id = 12345  # Use integer instead of UUID
    patient_id = 67890  # Use integer instead of UUID
    user_id = 11111
    created_at = datetime.now() - timedelta(days=1)
    updated_at = datetime.now()

    medication = Medication(
        medication_id=medication_id,
        patient_id=patient_id,
        user_id=user_id,
        name="Lisinopril",
        dosage="10mg",
        route=MedicationRoute.ORAL,
        frequency=MedicationFrequency.DAILY,
        start_date=datetime.now(),
        end_date=None,
        status=MedicationStatus.ACTIVE,
        notes="For blood pressure",
        created_at=created_at,
        updated_at=updated_at
    )

    assert medication.medication_id == medication_id
    assert medication.patient_id == patient_id
    assert medication.user_id == user_id
    assert medication.name == "Lisinopril"
    assert medication.created_at == created_at
    assert medication.updated_at == updated_at

#
# Clinical Note Schema Tests
#
def test_clinical_note_create_schema():
    """Test ClinicalNoteCreate schema validation."""
    # Valid data
    patient_id = uuid4()
    valid_data = {
        "patient_id": patient_id,
        "title": "Follow-up Visit",
        "content": "Patient reports feeling better. Blood pressure is normal.",
        "note_type": NoteType.EVOLUTION
    }
    
    note = ClinicalNoteCreate(**valid_data)
    assert note.patient_id == patient_id
    assert note.title == "Follow-up Visit"
    assert note.content == "Patient reports feeling better. Blood pressure is normal."
    assert note.note_type == NoteType.EVOLUTION
    
    # Test with missing required fields
    with pytest.raises(ValidationError):
        ClinicalNoteCreate(
            patient_id=patient_id,
            # Missing title
            # Missing content
        )
    
    # Test with invalid enum value
    with pytest.raises(ValidationError):
        ClinicalNoteCreate(
            patient_id=patient_id,
            title="Follow-up Visit",
            content="Patient reports feeling better.",
            note_type="invalid_type"
        )

def test_clinical_note_update_schema():
    """Test ClinicalNoteUpdate schema validation."""
    # All fields are optional in update
    update = ClinicalNoteUpdate(
        title="Updated Title",
        content="Updated content with new observations."
    )
    assert update.title == "Updated Title"
    assert update.content == "Updated content with new observations."
    
    # Test with invalid enum value
    with pytest.raises(ValidationError):
        ClinicalNoteUpdate(note_type="invalid_type")

#
# Patient Schema Tests
#
def test_patient_create_schema():
    """Test PatientCreate schema validation."""
    # Valid data
    valid_data = {
        "name": "John Doe",
        "birthDate": datetime(1984, 1, 1),  # 40 years old
        "gender": "M",
        "weight": 75.5,
        "height": 1.80,
        "ethnicity": "branco"
    }

    patient = PatientCreate(**valid_data)
    assert patient.name == "John Doe"
    assert patient.birthDate == datetime(1984, 1, 1).date()  # Compare with date object
    assert patient.gender == "M"
    assert patient.weight == 75.5
    assert patient.height == 1.80

    # Test with missing required fields
    with pytest.raises(ValidationError):
        PatientCreate(
            # Missing name
            birthDate=datetime(1984, 1, 1),
            gender="M"
        )

def test_patient_update_schema():
    """Test PatientUpdate schema validation."""
    # All fields are optional in update
    update = PatientUpdate(
        weight=80.0,
        height=1.82
    )
    assert update.weight == 80.0
    assert update.height == 1.82
    assert update.name is None

#
# User Schema Tests
#
def test_user_create_schema():
    """Test UserCreate schema validation."""
    # Valid data
    valid_data = {
        "email": "test@example.com",
        "name": "Test User"
    }
    
    user = UserCreate(**valid_data)
    assert user.email == "test@example.com"
    assert user.name == "Test User"
    
    # Test with missing required fields
    with pytest.raises(ValidationError):
        UserCreate(
            # Missing email
            name="Test User"
        )
    
    # Test with invalid email
    with pytest.raises(ValidationError):
        UserCreate(
            email="invalid-email",
            name="Test User"
        )

def test_user_schema():
    """Test User schema validation."""
    # Valid data
    user_id = 12345  # Use integer instead of UUID
    created_at = datetime.now()
    
    user = User(
        user_id=user_id,
        email="doctor@example.com",
        name="Dr. Smith",
        role="doctor",
        created_at=created_at
    )
    
    assert user.user_id == user_id
    assert user.email == "doctor@example.com"
    assert user.name == "Dr. Smith"
    assert user.role == "doctor"
    assert user.created_at == created_at 