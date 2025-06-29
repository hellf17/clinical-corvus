from sqlalchemy.orm import Session, selectinload
from sqlalchemy import exists, and_
from database.models import User, Patient, doctor_patient_association

def is_doctor_assigned_to_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
    """Checks if a specific doctor is assigned to a specific patient."""
    association_exists = db.query(
        exists().where(
            and_(
                doctor_patient_association.c.doctor_user_id == doctor_user_id,
                doctor_patient_association.c.patient_patient_id == patient_patient_id
            )
        )
    ).scalar()
    return association_exists

def assign_doctor_to_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
    """Assigns a doctor to a patient if not already assigned. Returns True if assigned, False otherwise."""
    doctor = db.query(User).filter(User.user_id == doctor_user_id, User.role == 'doctor').first()
    patient = db.query(Patient).filter(Patient.patient_id == patient_patient_id).first()

    if not doctor or not patient:
        print(f"Error assigning: Doctor ({doctor_user_id}) or Patient ({patient_patient_id}) not found or invalid role.")
        return False

    if is_doctor_assigned_to_patient(db, doctor_user_id, patient_patient_id):
        print(f"Assignment already exists: Doctor ({doctor_user_id}) to Patient ({patient_patient_id}).")
        return True

    try:
        doctor.managed_patients.append(patient)
        db.commit()
        print(f"Successfully assigned Doctor ({doctor_user_id}) to Patient ({patient_patient_id}).")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error during assignment: {e}")
        return False

def remove_doctor_from_patient(db: Session, doctor_user_id: int, patient_patient_id: int) -> bool:
    """Removes the assignment of a doctor from a patient. Returns True if removed, False otherwise."""
    doctor = db.query(User).options(
        selectinload(User.managed_patients)
    ).filter(User.user_id == doctor_user_id, User.role == 'doctor').first()
    
    patient = db.query(Patient).filter(Patient.patient_id == patient_patient_id).first()

    if not doctor or not patient:
        print(f"Error removing assignment: Doctor ({doctor_user_id}) or Patient ({patient_patient_id}) not found.")
        return False

    if patient in doctor.managed_patients:
        try:
            doctor.managed_patients.remove(patient)
            db.commit()
            print(f"Successfully removed assignment: Doctor ({doctor_user_id}) from Patient ({patient_patient_id}).")
            return True
        except Exception as e:
            db.rollback()
            print(f"Error during assignment removal: {e}")
            return False
    else:
        print(f"Assignment not found: Doctor ({doctor_user_id}) to Patient ({patient_patient_id}). Cannot remove.")
        return False 