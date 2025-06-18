"""Simple test for schemas without using pytest."""
import os
import sys
from datetime import datetime, timedelta
from uuid import UUID, uuid4

# Add the root directory to the Python path
parentdir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parentdir not in sys.path:
    sys.path.insert(0, parentdir)

try:
    # Import schemas
    from schemas.medication import (
        MedicationStatus, MedicationRoute, MedicationFrequency,
        MedicationCreate, MedicationUpdate, Medication
    )
    from schemas.clinical_note import NoteType, ClinicalNoteCreate

    def test_medication():
        print("Testing Medication schema...", flush=True)
        # Valid data including id and timestamps
        medication_id = uuid4()
        patient_id = uuid4()
        created_at = datetime.now() - timedelta(days=1)
        updated_at = datetime.now()
        
        medication = Medication(
            id=medication_id,
            patient_id=patient_id,
            name="Lisinopril",
            dosage="10mg",
            route=MedicationRoute.ORAL,
            frequency=MedicationFrequency.DAILY,
            start_date=datetime.now(),
            end_date=None,
            status=MedicationStatus.ACTIVE,
            instructions="Take in the morning",
            notes="For blood pressure",
            created_at=created_at,
            updated_at=updated_at
        )
        
        print(f"Created medication with id: {medication.id}")
        print(f"Patient ID: {medication.patient_id}")
        print(f"Medication name: {medication.name}")
        print(f"Model has from_attributes: {medication.model_config.get('from_attributes')}")
        
        assert medication.id == medication_id, "ID does not match"
        assert medication.name == "Lisinopril", "Name does not match"
        print("Medication schema test passed!\n", flush=True)

    def test_clinical_note():
        print("Testing ClinicalNote schema...", flush=True)
        patient_id = uuid4()
        note = ClinicalNoteCreate(
            patient_id=patient_id,
            title="Follow-up Visit",
            content="Patient reports feeling better. Blood pressure is normal.",
            note_type=NoteType.EVOLUTION
        )
        
        print(f"Created note with title: {note.title}")
        print(f"Note type: {note.note_type}")
        
        assert note.patient_id == patient_id, "Patient ID does not match"
        assert note.note_type == NoteType.EVOLUTION, "Note type does not match"
        print("ClinicalNote schema test passed!", flush=True)

    if __name__ == "__main__":
        test_medication()
        test_clinical_note()
        print("All tests passed!")

except Exception as e:
    print(f"Error testing schemas: {e}", flush=True)
    import traceback
    traceback.print_exc() 