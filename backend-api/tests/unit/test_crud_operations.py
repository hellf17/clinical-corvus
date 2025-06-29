"""
Tests for CRUD (Create, Read, Update, Delete) operations.
This file ensures all CRUD operations on major entities work correctly.
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from unittest.mock import MagicMock, patch

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import database models and schemas
from database import models
from database.models import User, Patient, Medication, ClinicalNote, AIChatConversation, AIChatMessage

# Import schemas
from schemas.patient import PatientCreate, PatientUpdate
from schemas.medication import MedicationCreate, MedicationUpdate
from schemas.clinical_note import ClinicalNoteCreate, ClinicalNoteUpdate
from schemas.ai_chat import AIChatConversationCreate, AIChatMessageCreate, AIChatConversationUpdate

# Import CRUD modules
from crud import patients, medication, clinical_note, ai_chat

def test_patient_crud_operations(sqlite_session):
    """Test CRUD operations for Patient model."""
    # Create a test user first
    user = models.User(
        email="patient_crud@example.com",
        name="CRUD Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # CREATE - Test patient creation
    patient_data = PatientCreate(
        name="Test Patient",
        idade=45,
        sexo="F",
        peso=65.5,
        altura=1.65,
        etnia="branco",
        diagnostico="Initial diagnosis",
        data_internacao=datetime.now()
    )
    
    new_patient = patients.create_patient(db=sqlite_session, user_id=user.user_id, patient=patient_data)
    
    # Verify patient was created with correct attributes
    assert new_patient.name == "Test Patient"
    assert new_patient.idade == 45
    assert new_patient.sexo == "F"
    assert new_patient.user_id == user.user_id
    
    # READ - Test get patient by ID
    retrieved_patient = patients.get_patient(db=sqlite_session, patient_id=new_patient.patient_id)
    assert retrieved_patient is not None
    assert retrieved_patient.patient_id == new_patient.patient_id
    
    # READ - Test get all patients for user
    user_patients = patients.get_patients_by_user(db=sqlite_session, user_id=user.user_id)
    assert len(user_patients) == 1
    assert user_patients[0].name == "Test Patient"
    
    # UPDATE - Test updating patient
    update_data = {
        "name": "Updated Patient Name",
        "idade": 46,
        "peso": 66.0,
        "diagnostico": "Updated diagnosis"
    }
    
    updated_patient = patients.update_patient(
        db=sqlite_session, 
        patient_id=new_patient.patient_id, 
        patient_data=update_data
    )
    
    # Verify patient was updated
    assert updated_patient.name == "Updated Patient Name"
    assert updated_patient.idade == 46
    assert updated_patient.peso == 66.0
    assert updated_patient.diagnostico == "Updated diagnosis"
    # Verify unchanged fields remain the same
    assert updated_patient.sexo == "F"
    assert updated_patient.altura == 1.65
    
    # DELETE - Test patient deletion
    result = patients.delete_patient(db=sqlite_session, patient_id=new_patient.patient_id)
    assert result is True
    
    # Verify patient was deleted
    deleted_check = patients.get_patient(db=sqlite_session, patient_id=new_patient.patient_id)
    assert deleted_check is None

def test_medication_crud_operations(sqlite_session):
    """Test CRUD operations for Medication model."""
    # Create a test user and patient first
    user = models.User(
        email="medication_crud@example.com",
        name="CRUD Med Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    test_patient = models.Patient(
        user_id=user.user_id,
        name="Med CRUD Patient",
        idade=50
    )
    sqlite_session.add(test_patient)
    sqlite_session.commit()
    
    # CREATE - Test medication creation
    med_data = MedicationCreate(
        name="Test Medication",
        dosage="10mg",
        frequency="daily",
        route="oral",
        patient_id=test_patient.patient_id,
        user_id=user.user_id,
        start_date=datetime.now(),
        notes="Initial medication notes",
        status="active",
        prescriber="Dr. Test"
    )
    
    new_medication = medication.create_medication(
        db=sqlite_session,
        medication=med_data
    )
    
    # Verify medication was created with correct attributes
    assert new_medication.name == "Test Medication"
    assert new_medication.dosage == "10mg"
    assert new_medication.route == models.MedicationRoute.ORAL
    assert new_medication.status == models.MedicationStatus.ACTIVE
    
    # READ - Test get medication by ID
    retrieved_med = medication.get_medication_by_id(
        db=sqlite_session, 
        medication_id=new_medication.medication_id
    )
    assert retrieved_med is not None
    assert retrieved_med.medication_id == new_medication.medication_id
    
    # READ - Test get all medications for patient
    patient_meds = medication.get_medications(
        db=sqlite_session, 
        patient_id=test_patient.patient_id
    )
    assert len(patient_meds) == 1
    assert patient_meds[0].name == "Test Medication"
    
    # UPDATE - Test updating medication
    update_data = {
        "name": "Updated Medication",
        "dosage": "20mg",
        "frequency": "Twice daily",
        "status": models.MedicationStatus.SUSPENDED,
        "notes": "Updated medication notes",
        "prescriber": "Dr. Test"
    }
    
    updated_med = medication.update_medication(
        db=sqlite_session, 
        medication_id=new_medication.medication_id, 
        medication_data=update_data
    )
    
    # Verify medication was updated
    assert updated_med.name == "Updated Medication"
    assert updated_med.dosage == "20mg"
    assert updated_med.frequency == "Twice daily"
    assert updated_med.status == models.MedicationStatus.SUSPENDED
    assert updated_med.notes == "Updated medication notes"
    # Verify unchanged fields remain the same
    assert updated_med.route == models.MedicationRoute.ORAL
    assert updated_med.prescriber == "Dr. Test"
    
    # DELETE - Test medication deletion
    result = medication.delete_medication(
        db=sqlite_session, 
        medication_id=new_medication.medication_id
    )
    assert result is True
    
    # Verify medication was deleted
    deleted_check = medication.get_medication_by_id(
        db=sqlite_session, 
        medication_id=new_medication.medication_id
    )
    assert deleted_check is None

def test_clinical_note_crud_operations(sqlite_session):
    """Test CRUD operations for ClinicalNote model."""
    # Create a test user and patient first
    user = models.User(
        email="notes_crud@example.com",
        name="CRUD Notes Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    test_patient = models.Patient(
        user_id=user.user_id,
        name="Notes CRUD Patient",
        idade=60
    )
    sqlite_session.add(test_patient)
    sqlite_session.commit()
    
    # CREATE - Test clinical note creation
    note_data = ClinicalNoteCreate(
        title="Test Clinical Note",
        content="This is a test clinical note content.",
        note_type=models.NoteType.PROGRESS,
        patient_id=test_patient.patient_id
    )
    
    new_note = clinical_note.create_note(
        db=sqlite_session,
        note=note_data,
        user_id=user.user_id
    )
    
    # Verify note was created with correct attributes
    assert new_note.title == "Test Clinical Note"
    assert new_note.content == "This is a test clinical note content."
    assert new_note.note_type == models.NoteType.PROGRESS
    
    # READ - Test get note by ID
    retrieved_note = clinical_note.get_note(
        db=sqlite_session, 
        note_id=new_note.id
    )
    assert retrieved_note is not None
    assert retrieved_note.id == new_note.id
    
    # READ - Test get all notes for patient
    patient_notes = clinical_note.get_notes(
        db=sqlite_session, 
        patient_id=test_patient.patient_id
    )
    assert len(patient_notes) == 1
    assert patient_notes[0].title == "Test Clinical Note"
    
    # UPDATE - Test updating note
    update_data = ClinicalNoteUpdate(
        title="Updated Clinical Note",
        content="This is updated content for the clinical note.",
        note_type=models.NoteType.CONSULTATION
    )
    
    updated_note = clinical_note.update_note(
        db=sqlite_session, 
        note_id=new_note.id, 
        note_update=update_data
    )
    
    # Verify note was updated
    assert updated_note.title == "Updated Clinical Note"
    assert updated_note.content == "This is updated content for the clinical note."
    assert updated_note.note_type == models.NoteType.CONSULTATION
    
    # DELETE - Test note deletion
    result = clinical_note.delete_note(
        db=sqlite_session, 
        note_id=new_note.id
    )
    assert result is True
    
    # Verify note was deleted
    deleted_check = clinical_note.get_note(
        db=sqlite_session, 
        note_id=new_note.id
    )
    assert deleted_check is None

def test_ai_chat_crud_operations(sqlite_session):
    """Test CRUD operations for AIChatConversation and AIChatMessage models."""
    # Create a test user and patient first
    user = models.User(
        email="chat_crud@example.com",
        name="CRUD Chat Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    test_patient = models.Patient(
        user_id=user.user_id,
        name="Chat CRUD Patient",
        idade=40
    )
    sqlite_session.add(test_patient)
    sqlite_session.commit()
    
    # CREATE - Test conversation creation
    conversation_data = AIChatConversationCreate(
        title="Test Conversation",
        patient_id=test_patient.patient_id,
        last_message_content="Initial message"
    )
    
    new_conversation = ai_chat.create_conversation(
        db=sqlite_session,
        conversation=conversation_data,
        user_id=user.user_id
    )
    
    # Verify conversation was created with correct attributes
    assert new_conversation.user_id == user.user_id
    assert new_conversation.patient_id == test_patient.patient_id
    assert new_conversation.last_message_content == "Initial message"
    
    # CREATE - Test message creation
    message_data = {
        "role": "user",
        "content": "Test message from user",
        "message_metadata": {"timestamp": datetime.now().isoformat()}
    }
    
    new_message = ai_chat.create_message(
        db=sqlite_session,
        conversation_id=new_conversation.id,
        message_data=message_data
    )
    
    # Verify message was created with correct attributes
    assert new_message.role == "user"
    assert new_message.content == "Test message from user"
    assert new_message.conversation_id == new_conversation.id
    
    # READ - Test get conversation by ID
    retrieved_conversation = ai_chat.get_conversation(
        db=sqlite_session, 
        conversation_id=new_conversation.id
    )
    assert retrieved_conversation is not None
    assert retrieved_conversation.id == new_conversation.id
    
    # READ - Test get all messages for a conversation
    conversation_messages = ai_chat.get_messages_by_conversation(
        db=sqlite_session, 
        conversation_id=new_conversation.id
    )
    assert len(conversation_messages) == 1
    assert conversation_messages[0].role == "user"
    assert conversation_messages[0].content == "Test message from user"
    
    # READ - Test get all conversations for a patient
    patient_conversations = ai_chat.get_conversations_by_patient(
        db=sqlite_session, 
        patient_id=test_patient.patient_id
    )
    assert len(patient_conversations) == 1
    assert patient_conversations[0].id == new_conversation.id
    
    # UPDATE - Test updating conversation
    update_data = {
        "last_message_content": "Updated message content"
    }
    
    updated_conversation = ai_chat.update_conversation(
        db=sqlite_session, 
        conversation_id=new_conversation.id, 
        conversation_data=update_data
    )
    
    # Verify conversation was updated
    assert updated_conversation.last_message_content == "Updated message content"
    
    # DELETE - Test message deletion
    message_result = ai_chat.delete_message(
        db=sqlite_session, 
        message_id=new_message.id
    )
    assert message_result is True
    
    # Verify message was deleted
    deleted_message_check = ai_chat.get_message(
        db=sqlite_session, 
        message_id=new_message.id
    )
    assert deleted_message_check is None
    
    # DELETE - Test conversation deletion
    conversation_result = ai_chat.delete_conversation(
        db=sqlite_session, 
        conversation_id=new_conversation.id
    )
    assert conversation_result is True
    
    # Verify conversation was deleted
    deleted_conversation_check = ai_chat.get_conversation(
        db=sqlite_session, 
        conversation_id=new_conversation.id
    )
    assert deleted_conversation_check is None

def test_crud_edge_cases_and_constraints(sqlite_session):
    """Test edge cases and constraints in CRUD operations."""
    # Create a test user and patient first
    user = models.User(
        email="edge_case@example.com",
        name="Edge Case Doctor",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    test_patient = models.Patient(
        user_id=user.user_id,
        name="Edge Case Patient",
        idade=55
    )
    sqlite_session.add(test_patient)
    sqlite_session.commit()
    
    # Test 1: Create medication with invalid date (end date before start date)
    start_date = datetime.now()
    end_date = start_date - timedelta(days=1)  # End date before start date
    
    invalid_med_data = MedicationCreate(
        name="Invalid Date Med",
        dosage="5mg",
        frequency="once",
        route="oral",
        patient_id=test_patient.patient_id,
        user_id=user.user_id,
        start_date=start_date,
        end_date=end_date,
        status="active"
    )
    
    # The validation should fail when we try to create the medication
    with pytest.raises(ValueError, match="End date cannot be before start date"):
        medication.create_medication(
            db=sqlite_session,
            medication=invalid_med_data
        )
    
    # Test 2: Update non-existent patient
    non_existent_result = patients.update_patient(
        db=sqlite_session,
        patient_id=9999,  # Non-existent ID
        patient_data={"name": "This should not work"}
    )
    assert non_existent_result is None
    
    # Test 3: Delete non-existent clinical note
    delete_result = clinical_note.delete_note(
        db=sqlite_session,
        note_id=9999  # Non-existent ID
    )
    assert delete_result is False
    
    # Test 4: Create patient with empty required fields
    with pytest.raises(ValueError):
        empty_patient_data = {
            # Missing name and other required fields
        }
        
        patients.create_patient(
            db=sqlite_session,
            user_id=user.user_id,
            patient=empty_patient_data
        )
    
    # Test 5: Update medication with invalid status
    # First create a valid medication
    valid_med_data = {
        "name": "Valid Medication",
        "dosage": "10mg",
        "route": models.MedicationRoute.ORAL,
        "start_date": datetime.now(),
        "status": models.MedicationStatus.ACTIVE,
        "frequency": models.MedicationFrequency.DAILY,  # Add required field
    }
    
    valid_med = medication.create_medication(
        db=sqlite_session,
        patient_id=test_patient.patient_id,
        user_id=user.user_id,
        medication_data=valid_med_data
    )
    
    # Then try to update with invalid status
    with pytest.raises(ValueError):
        invalid_update = {
            "status": "INVALID_STATUS"  # Not a valid enum value
        }
        
        medication.update_medication(
            db=sqlite_session,
            medication_id=valid_med.medication_id,
            medication_data=invalid_update
        )
    
    # Test 6: Create AI chat message without required fields
    # Database enforces NOT NULL constraint on content
    with pytest.raises(IntegrityError):
        # Create a valid conversation first
        valid_conversation = ai_chat.create_conversation(
            db=sqlite_session,
            user_id=user.user_id,
            patient_id=test_patient.patient_id,
            conversation=AIChatConversationCreate(
                title="Test Edge Case Conversation",
                patient_id=test_patient.patient_id,
                last_message_content="Initial message"
            )
        )
        
        # Try to create message without required content
        invalid_message = {
            "role": "assistant",
            "content": None  # This will cause an IntegrityError due to NOT NULL constraint
        }
        
        ai_chat.create_message(
            db=sqlite_session,
            conversation_id=valid_conversation.id,
            message_data=invalid_message
        ) 