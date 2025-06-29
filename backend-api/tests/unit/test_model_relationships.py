"""
Tests for database model relationships.
This file specifically focuses on testing all relationships between models,
beyond the basic model creation tests in test_models.py.
"""

import pytest
import sys
import os
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import uuid

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import database models
import database.models as models

def test_user_patient_relationship(sqlite_session):
    """Test the one-to-many relationship between User and Patient."""
    # Create a test user
    user = models.User(
        email="relationship_test@example.com",
        name="Relationship Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create multiple patients for this user
    patient1 = models.Patient(
        user_id=user.user_id,
        name="Patient One",
        idade=35,
        sexo="F"
    )
    patient2 = models.Patient(
        user_id=user.user_id,
        name="Patient Two",
        idade=42,
        sexo="M"
    )
    
    # Add to session and commit
    sqlite_session.add_all([patient1, patient2])
    sqlite_session.commit()
    
    # Query user and check relationships
    db_user = sqlite_session.query(models.User).filter_by(email="relationship_test@example.com").first()
    
    # Verify one-to-many relationship
    assert len(db_user.patients) == 2
    
    # Check if patients are correctly associated
    patient_names = [p.name for p in db_user.patients]
    assert "Patient One" in patient_names
    assert "Patient Two" in patient_names
    
    # Verify bidirectional relationship
    for patient in db_user.patients:
        assert patient.user.email == "relationship_test@example.com"

def test_medication_relationships(sqlite_session):
    """Test relationships between Medication, Patient and User models."""
    # Create a test user
    user = models.User(
        email="medication_test@example.com",
        name="Med Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Med Patient",
        idade=50
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create medications with different routes and statuses
    medication1 = models.Medication(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        name="Medication One",
        dosage="10mg",
        frequency="Once daily",
        route=models.MedicationRoute.ORAL,
        start_date=datetime.now(),
        status=models.MedicationStatus.ACTIVE,
        notes="Test medication notes"
    )
    
    medication2 = models.Medication(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        name="Medication Two",
        dosage="50mg",
        frequency="Twice daily",
        route=models.MedicationRoute.INTRAVENOUS,
        start_date=datetime.now() - timedelta(days=5),
        end_date=datetime.now() + timedelta(days=2),
        status=models.MedicationStatus.SUSPENDED,
        prescriber="Dr. Example"
    )
    
    # Add to session and commit
    sqlite_session.add_all([medication1, medication2])
    sqlite_session.commit()
    
    # Retrieve patient with medications
    db_patient = sqlite_session.query(models.Patient).filter_by(name="Med Patient").first()
    
    # Verify medications
    assert len(db_patient.medications) == 2
    
    # Check specific medication details
    medication_names = [m.name for m in db_patient.medications]
    assert "Medication One" in medication_names
    assert "Medication Two" in medication_names
    
    # Verify specific medication properties and relationships
    for med in db_patient.medications:
        if med.name == "Medication One":
            assert med.route == models.MedicationRoute.ORAL
            assert med.status == models.MedicationStatus.ACTIVE
            assert med.notes == "Test medication notes"
            assert med.patient.name == "Med Patient"
            assert med.user.name == "Med Doctor"
        elif med.name == "Medication Two":
            assert med.route == models.MedicationRoute.INTRAVENOUS
            assert med.status == models.MedicationStatus.SUSPENDED
            assert med.prescriber == "Dr. Example"
            assert med.end_date is not None

def test_clinical_notes_relationships(sqlite_session):
    """Test relationships between ClinicalNote, Patient and User models."""
    # Create a test user
    user = models.User(
        email="notes_test@example.com",
        name="Notes Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Notes Patient",
        idade=65
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create clinical notes of different types
    note1 = models.ClinicalNote(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        title="Admission Note",
        content="Patient admitted with symptoms of...",
        note_type=models.NoteType.ADMISSION
    )
    
    note2 = models.ClinicalNote(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        title="Progress Note",
        content="Patient showing improvement...",
        note_type=models.NoteType.PROGRESS
    )
    
    # Add to session and commit
    sqlite_session.add_all([note1, note2])
    sqlite_session.commit()
    
    # Retrieve patient and check notes
    db_patient = sqlite_session.query(models.Patient).filter_by(name="Notes Patient").first()
    
    # Verify clinical notes
    assert len(db_patient.clinical_notes) == 2
    
    # Check note details
    for note in db_patient.clinical_notes:
        assert note.user.email == "notes_test@example.com"
        if note.title == "Admission Note":
            assert note.note_type == models.NoteType.ADMISSION
        elif note.title == "Progress Note":
            assert note.note_type == models.NoteType.PROGRESS

def test_ai_chat_conversation_relationships(sqlite_session):
    """Test relationships between AIChatConversation, AIChatMessage, Patient and User models."""
    # Create a test user
    user = models.User(
        email="chat_test@example.com",
        name="Chat Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Chat Patient",
        idade=40
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create an AI chat conversation
    conversation = models.AIChatConversation(
        user_id=user.user_id,
        patient_id=patient.patient_id,
        title="Test Conversation",
        last_message_content="Last message in the conversation"
    )
    sqlite_session.add(conversation)
    sqlite_session.commit()
    
    # Create messages for the conversation
    message1 = models.AIChatMessage(
        conversation_id=conversation.id,
        role="user",
        content="What do these lab results mean?",
        message_metadata={"timestamp": datetime.now().isoformat()}
    )
    
    message2 = models.AIChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content="Based on your lab results, I can see...",
        message_metadata={"timestamp": datetime.now().isoformat()}
    )
    
    # Add to session and commit
    sqlite_session.add_all([message1, message2])
    sqlite_session.commit()
    
    # Retrieve conversation and check messages
    db_conversation = sqlite_session.query(models.AIChatConversation).filter_by(id=conversation.id).first()
    
    # Verify conversation properties
    assert db_conversation.user.name == "Chat Doctor"
    assert db_conversation.patient.name == "Chat Patient"
    assert db_conversation.last_message_content == "Last message in the conversation"
    
    # Verify messages
    assert len(db_conversation.messages) == 2
    
    # Check bidirectional relationship
    for message in db_conversation.messages:
        assert message.conversation.id == conversation.id
        if message.role == "user":
            assert message.content == "What do these lab results mean?"
        elif message.role == "assistant":
            assert message.content == "Based on your lab results, I can see..."

def test_alert_relationships(sqlite_session):
    """Test relationships between Alert, Patient and User models."""
    # Create a test user
    user = models.User(
        email="alert_test@example.com",
        name="Alert Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a patient
    patient = models.Patient(
        user_id=user.user_id,
        name="Alert Patient",
        idade=55
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create alerts with different severities
    alert1 = models.Alert(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        created_by=user.user_id,
        alert_type="lab_abnormal",
        message="Critical potassium level detected",
        severity="critical",
        details={"test": "Potassium", "value": 6.8, "reference": "3.5-5.0"}
    )
    
    alert2 = models.Alert(
        patient_id=patient.patient_id,
        user_id=user.user_id,
        created_by=user.user_id,
        alert_type="medication_reminder",
        message="Medication schedule updated",
        severity="info",
        is_read=True
    )
    
    # Add to session and commit
    sqlite_session.add_all([alert1, alert2])
    sqlite_session.commit()
    
    # Retrieve patient and check alerts
    db_patient = sqlite_session.query(models.Patient).filter_by(name="Alert Patient").first()
    
    # Verify alerts
    assert len(db_patient.alerts) == 2
    
    # Check alert details and relationships
    for alert in db_patient.alerts:
        assert alert.user.email == "alert_test@example.com"
        if alert.message == "Critical potassium level detected":
            assert alert.severity == "critical"
            assert alert.is_read == False
            assert alert.details["test"] == "Potassium"
        elif alert.message == "Medication schedule updated":
            assert alert.severity == "info"
            assert alert.is_read == True

def test_multi_level_relationships(sqlite_session):
    """Test complex multi-level relationships across multiple models."""
    # Create a test user
    user = models.User(
        email="complex_test@example.com",
        name="Complex Test Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create two patients
    patient1 = models.Patient(
        user_id=user.user_id,
        name="Complex Patient One",
        idade=60,
        sexo="M"
    )
    patient2 = models.Patient(
        user_id=user.user_id,
        name="Complex Patient Two",
        idade=45,
        sexo="F"
    )
    sqlite_session.add_all([patient1, patient2])
    sqlite_session.commit()
    
    # Create test category
    category = models.TestCategory(
        name="Complex Labs",
        description="Complex test category"
    )
    sqlite_session.add(category)
    sqlite_session.commit()
    
    # Create lab results for each patient
    lab1 = models.LabResult(
        patient_id=patient1.patient_id,
        user_id=user.user_id,
        created_by=user.user_id,
        test_category_id=category.category_id,
        test_name="Complex Test 1",
        value_numeric=120,
        unit="mg/dL",
        timestamp=datetime.now(),
        reference_range_low=70,
        reference_range_high=110
    )
    
    lab2 = models.LabResult(
        patient_id=patient2.patient_id,
        user_id=user.user_id,
        created_by=user.user_id,
        test_category_id=category.category_id,
        test_name="Complex Test 2",
        value_numeric=95,
        unit="mg/dL",
        timestamp=datetime.now(),
        reference_range_low=70,
        reference_range_high=110
    )
    
    sqlite_session.add_all([lab1, lab2])
    sqlite_session.commit()
    
    # Create interpretations for lab results
    interp1 = models.LabInterpretation(
        result_id=lab1.result_id,
        user_id=user.user_id,
        interpretation_text="Elevated levels, requires attention",
        ai_generated=True
    )
    
    interp2 = models.LabInterpretation(
        result_id=lab2.result_id,
        user_id=user.user_id,
        interpretation_text="Normal levels",
        ai_generated=True
    )
    
    sqlite_session.add_all([interp1, interp2])
    sqlite_session.commit()
    
    # Create alerts based on lab results
    alert = models.Alert(
        patient_id=patient1.patient_id,
        user_id=user.user_id,
        created_by=user.user_id,
        alert_type="abnormal_lab",
        message="Abnormal Complex Test result",
        severity="warning",
        details={"lab_id": lab1.result_id, "test": "Complex Test 1"}
    )
    
    sqlite_session.add(alert)
    sqlite_session.commit()
    
    # Now query and verify complex relationships
    
    # 1. Get all lab results for a user through patients
    user_labs = []
    for patient in user.patients:
        user_labs.extend(patient.lab_results)
    
    assert len(user_labs) == 2
    
    # 2. Navigate from lab to interpretation to user
    lab_interp_user = sqlite_session.query(models.LabResult).filter_by(result_id=lab1.result_id).first()
    assert lab_interp_user.interpretations[0].user.email == "complex_test@example.com"
    
    # 3. Navigate from patient to lab to category
    patient_lab_category = sqlite_session.query(models.Patient).filter_by(patient_id=patient1.patient_id).first()
    assert patient_lab_category.lab_results[0].test_category.name == "Complex Labs"
    
    # 4. Check alert associated with specific lab result
    abnormal_lab_id = alert.details["lab_id"]
    abnormal_lab = sqlite_session.query(models.LabResult).filter_by(result_id=abnormal_lab_id).first()
    assert abnormal_lab.test_name == "Complex Test 1"
    assert abnormal_lab.value_numeric > abnormal_lab.reference_range_high 