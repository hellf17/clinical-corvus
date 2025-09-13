"""
Integration tests for group-based patient access control.
These tests verify that doctors can access patients through group membership.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from database import models
from security import create_access_token
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

def create_test_token(user_id, email, name):
    """Create a test JWT token for a specific user."""
    from datetime import timedelta
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={
            "sub": email,  # The email is expected in the 'sub' field
            "user_id": user_id,  # User ID is required
            "name": name  # Name is optional but useful
        },
        expires_delta=access_token_expires
    )
    return {"Authorization": f"Bearer {access_token}"}

@pytest.mark.integration
def test_doctor_access_patient_through_group(pg_client, pg_session):
    """
    Test that a doctor can access a patient through group membership.
    """
    # Create a doctor user
    doctor = models.User(
        email="group_doctor@example.com",
        name="Group Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="group_patient@example.com",
        name="Group Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Group Test Patient",
        patient_id=1001,
        user_id=patient_user.user_id,
        idade=45,
        sexo="M",
        diagnostico="Hypertension"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a group
    group = models.Group(
        name="Test Group",
        description="A test group for collaboration",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group)
    pg_session.commit()
    pg_session.refresh(group)
    
    # Add doctor as admin member of the group
    doctor_membership = models.GroupMembership(
        group_id=group.id,
        user_id=doctor.user_id,
        role="admin",
        invited_by=doctor.user_id
    )
    pg_session.add(doctor_membership)
    
    # Assign patient to the group
    patient_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(patient_assignment)
    pg_session.commit()
    
    # Set the doctor as authenticated for the test
    pg_client.set_auth_user(doctor)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(doctor.user_id, doctor.email, doctor.name)
    
    # Doctor should be able to access patient data through group membership
    response = pg_client.get(
        f"/api/patients/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Should be successful
    assert response.status_code == 200
    assert response.json()["name"] == patient.name
    assert response.json()["patient_id"] == patient.patient_id

@pytest.mark.integration
def test_doctor_cannot_access_patient_without_group_membership(pg_client, pg_session):
    """
    Test that a doctor cannot access a patient without direct or group-based assignment.
    """
    # Create a doctor user
    doctor = models.User(
        email="unauthorized_doctor@example.com",
        name="Unauthorized Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create another doctor user
    authorized_doctor = models.User(
        email="authorized_doctor@example.com",
        name="Authorized Doctor",
        role="doctor"
    )
    pg_session.add(authorized_doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="unauthorized_patient@example.com",
        name="Unauthorized Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(doctor)
    pg_session.refresh(authorized_doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Unauthorized Test Patient",
        patient_id=1002,
        user_id=patient_user.user_id,
        idade=35,
        sexo="F",
        diagnostico="Diabetes"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a group
    group = models.Group(
        name="Authorized Group",
        description="A group for authorized doctors",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group)
    pg_session.commit()
    pg_session.refresh(group)
    
    # Add authorized doctor as admin member of the group
    authorized_membership = models.GroupMembership(
        group_id=group.id,
        user_id=authorized_doctor.user_id,
        role="admin",
        invited_by=authorized_doctor.user_id
    )
    pg_session.add(authorized_membership)
    
    # Assign patient to the group
    patient_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=authorized_doctor.user_id
    )
    pg_session.add(patient_assignment)
    pg_session.commit()
    
    # Set the unauthorized doctor as authenticated for the test
    pg_client.set_auth_user(doctor)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(doctor.user_id, doctor.email, doctor.name)
    
    # Unauthorized doctor should NOT be able to access patient data
    response = pg_client.get(
        f"/api/patients/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Should be forbidden
    assert response.status_code == 403
    assert "negado" in response.json()["detail"].lower() or "denied" in response.json()["detail"].lower()

@pytest.mark.integration
def test_patient_list_includes_group_patients(pg_client, pg_session):
    """
    Test that a doctor's patient list includes patients from groups they belong to.
    """
    # Create a doctor user
    doctor = models.User(
        email="listing_doctor@example.com",
        name="Listing Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="listing_patient@example.com",
        name="Listing Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Listing Test Patient",
        patient_id=1003,
        user_id=patient_user.user_id,
        idade=50,
        sexo="M",
        diagnostico="Heart Disease"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a group
    group = models.Group(
        name="Listing Group",
        description="A group for patient listing tests",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group)
    pg_session.commit()
    pg_session.refresh(group)
    
    # Add doctor as member of the group
    doctor_membership = models.GroupMembership(
        group_id=group.id,
        user_id=doctor.user_id,
        role="member",
        invited_by=doctor.user_id
    )
    pg_session.add(doctor_membership)
    
    # Assign patient to the group
    patient_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(patient_assignment)
    pg_session.commit()
    
    # Set the doctor as authenticated for the test
    pg_client.set_auth_user(doctor)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(doctor.user_id, doctor.email, doctor.name)
    
    # Doctor should see the patient in their patient list
    response = pg_client.get(
        "/api/patients/",
        headers=auth_headers
    )
    
    # Should be successful
    assert response.status_code == 200
    patients_list = response.json()["items"]
    
    # Should contain the group patient
    group_patient = next((p for p in patients_list if p["patient_id"] == patient.patient_id), None)
    assert group_patient is not None
    assert group_patient["name"] == patient.name

@pytest.mark.integration
def test_direct_assignment_takes_precedence_over_group(pg_client, pg_session):
    """
    Test that direct doctor-patient assignment takes precedence over group assignment.
    """
    # Create a doctor user
    doctor = models.User(
        email="precedence_doctor@example.com",
        name="Precedence Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="precedence_patient@example.com",
        name="Precedence Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Precedence Test Patient",
        patient_id=1004,
        user_id=patient_user.user_id,
        idade=55,
        sexo="F",
        diagnostico="Arthritis"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Directly assign doctor to patient
    direct_assignment = models.DoctorPatientAssociation(
        doctor_user_id=doctor.user_id,
        patient_patient_id=patient.patient_id
    )
    pg_session.add(direct_assignment)
    
    # Create a group
    group = models.Group(
        name="Precedence Group",
        description="A group for precedence tests",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group)
    pg_session.commit()
    pg_session.refresh(group)
    
    # Add doctor as member of the group
    doctor_membership = models.GroupMembership(
        group_id=group.id,
        user_id=doctor.user_id,
        role="member",
        invited_by=doctor.user_id
    )
    pg_session.add(doctor_membership)
    
    # Assign patient to the group
    patient_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(patient_assignment)
    pg_session.commit()
    
    # Set the doctor as authenticated for the test
    pg_client.set_auth_user(doctor)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(doctor.user_id, doctor.email, doctor.name)
    
    # Doctor should be able to access patient data (through direct assignment)
    response = pg_client.get(
        f"/api/patients/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Should be successful
    assert response.status_code == 200
    assert response.json()["name"] == patient.name

@pytest.mark.integration
def test_patient_access_through_multiple_groups(pg_client, pg_session):
    """
    Test that a patient can be accessed through multiple group memberships.
    """
    # Create a doctor user
    doctor = models.User(
        email="multi_group_doctor@example.com",
        name="Multi-Group Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="multi_group_patient@example.com",
        name="Multi-Group Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Multi-Group Test Patient",
        patient_id=1005,
        user_id=patient_user.user_id,
        idade=60,
        sexo="M",
        diagnostico="COPD"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create two groups
    group1 = models.Group(
        name="Group 1",
        description="First group for multi-group test",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group1)
    
    group2 = models.Group(
        name="Group 2",
        description="Second group for multi-group test",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group2)
    pg_session.commit()
    pg_session.refresh(group1)
    pg_session.refresh(group2)
    
    # Add doctor as member of both groups
    membership1 = models.GroupMembership(
        group_id=group1.id,
        user_id=doctor.user_id,
        role="member",
        invited_by=doctor.user_id
    )
    pg_session.add(membership1)
    
    membership2 = models.GroupMembership(
        group_id=group2.id,
        user_id=doctor.user_id,
        role="member",
        invited_by=doctor.user_id
    )
    pg_session.add(membership2)
    
    # Assign patient to both groups
    assignment1 = models.GroupPatient(
        group_id=group1.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(assignment1)
    
    assignment2 = models.GroupPatient(
        group_id=group2.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(assignment2)
    pg_session.commit()
    
    # Set the doctor as authenticated for the test
    pg_client.set_auth_user(doctor)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(doctor.user_id, doctor.email, doctor.name)
    
    # Doctor should be able to access patient data through either group
    response = pg_client.get(
        f"/api/patients/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Should be successful
    assert response.status_code == 200
    assert response.json()["name"] == patient.name

@pytest.mark.integration
def test_admin_access_to_group_patients(pg_client, pg_session):
    """
    Test that admin users can access all patients, including those in groups.
    """
    # Create an admin user
    admin = models.User(
        email="admin_user@example.com",
        name="Admin User",
        role="admin"
    )
    pg_session.add(admin)
    
    # Create a doctor user
    doctor = models.User(
        email="admin_test_doctor@example.com",
        name="Admin Test Doctor",
        role="doctor"
    )
    pg_session.add(doctor)
    
    # Create a patient user
    patient_user = models.User(
        email="admin_test_patient@example.com",
        name="Admin Test Patient User",
        role="patient"
    )
    pg_session.add(patient_user)
    pg_session.commit()
    pg_session.refresh(admin)
    pg_session.refresh(doctor)
    pg_session.refresh(patient_user)
    
    # Create a patient record linked to the patient user
    patient = models.Patient(
        name="Admin Test Patient",
        patient_id=1006,
        user_id=patient_user.user_id,
        idade=40,
        sexo="F",
        diagnostico="Migraine"
    )
    pg_session.add(patient)
    pg_session.commit()
    pg_session.refresh(patient)
    
    # Create a group
    group = models.Group(
        name="Admin Test Group",
        description="A group for admin access tests",
        max_patients=50,
        max_members=10
    )
    pg_session.add(group)
    pg_session.commit()
    pg_session.refresh(group)
    
    # Add doctor as member of the group
    doctor_membership = models.GroupMembership(
        group_id=group.id,
        user_id=doctor.user_id,
        role="member",
        invited_by=doctor.user_id
    )
    pg_session.add(doctor_membership)
    
    # Assign patient to the group
    patient_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=doctor.user_id
    )
    pg_session.add(patient_assignment)
    pg_session.commit()
    
    # Set the admin as authenticated for the test
    pg_client.set_auth_user(admin)
    
    # Create auth token for this specific user
    auth_headers = create_test_token(admin.user_id, admin.email, admin.name)
    
    # Admin should be able to access patient data regardless of group membership
    response = pg_client.get(
        f"/api/patients/{patient.patient_id}",
        headers=auth_headers
    )
    
    # Should be successful
    assert response.status_code == 200
    assert response.json()["name"] == patient.name