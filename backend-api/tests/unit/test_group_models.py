"""
Tests for group collaboration database models using SQLAlchemy ORM.
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


def test_group_model_creation(sqlite_session):
    """Test creating a Group model instance."""
    # Create a new group
    new_group = models.Group(
        name="Test Group",
        description="A test group for collaboration",
        max_patients=50,
        max_members=20
    )
    
    # Add to database
    sqlite_session.add(new_group)
    sqlite_session.commit()
    
    # Query the group
    db_group = sqlite_session.query(models.Group).filter_by(name="Test Group").first()
    
    # Assertions
    assert db_group is not None
    assert db_group.name == "Test Group"
    assert db_group.description == "A test group for collaboration"
    assert db_group.max_patients == 50
    assert db_group.max_members == 20
    assert db_group.id is not None
    assert db_group.created_at is not None
    assert db_group.updated_at is not None


def test_group_unique_name_constraint(sqlite_session):
    """Test that group name must be unique."""
    # Create a group
    group1 = models.Group(
        name="Unique Group",
        description="First group"
    )
    sqlite_session.add(group1)
    sqlite_session.commit()
    
    # Try to create another group with the same name
    group2 = models.Group(
        name="Unique Group",
        description="Second group"
    )
    sqlite_session.add(group2)
    
    # This should raise an IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    
    # Rollback the failed transaction
    sqlite_session.rollback()


def test_group_membership_creation(sqlite_session):
    """Test creating a GroupMembership model instance."""
    # Create test user
    user = models.User(
        email="member_test@example.com",
        name="Test Member",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Membership Test Group",
        description="A test group for membership"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create group membership
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin"
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Query the membership
    db_membership = sqlite_session.query(models.GroupMembership).first()
    
    # Assertions
    assert db_membership is not None
    assert db_membership.group_id == group.id
    assert db_membership.user_id == user.user_id
    assert db_membership.role == "admin"
    assert db_membership.joined_at is not None
    assert db_membership.id is not None


def test_group_membership_unique_constraint(sqlite_session):
    """Test that a user can only be a member of a group once."""
    # Create test user
    user = models.User(
        email="unique_member@example.com",
        name="Unique Member",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Unique Membership Group",
        description="A test group for unique membership"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create first membership
    membership1 = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="member"
    )
    sqlite_session.add(membership1)
    sqlite_session.commit()
    
    # Try to create another membership for the same user and group
    membership2 = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin"
    )
    sqlite_session.add(membership2)
    
    # This should raise an IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    
    # Rollback the failed transaction
    sqlite_session.rollback()


def test_group_patient_creation(sqlite_session):
    """Test creating a GroupPatient model instance."""
    # Create test user
    user = models.User(
        email="patient_assign@example.com",
        name="Test Assigner",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test patient
    patient_user = models.User(
        email="patient_user@example.com",
        name="Patient User",
        role="patient"
    )
    sqlite_session.add(patient_user)
    sqlite_session.commit()
    
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Test Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Patient Assignment Group",
        description="A test group for patient assignment"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create group patient assignment
    group_patient = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(group_patient)
    sqlite_session.commit()
    
    # Query the group patient assignment
    db_group_patient = sqlite_session.query(models.GroupPatient).first()
    
    # Assertions
    assert db_group_patient is not None
    assert db_group_patient.group_id == group.id
    assert db_group_patient.patient_id == patient.patient_id
    assert db_group_patient.assigned_by == user.user_id
    assert db_group_patient.assigned_at is not None
    assert db_group_patient.id is not None


def test_group_patient_unique_constraint(sqlite_session):
    """Test that a patient can only be assigned to a group once."""
    # Create test user
    user = models.User(
        email="unique_assign@example.com",
        name="Unique Assigner",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test patient
    patient_user = models.User(
        email="unique_patient_user@example.com",
        name="Unique Patient User",
        role="patient"
    )
    sqlite_session.add(patient_user)
    sqlite_session.commit()
    
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Unique Test Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Unique Assignment Group",
        description="A test group for unique assignment"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create first assignment
    group_patient1 = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(group_patient1)
    sqlite_session.commit()
    
    # Try to create another assignment for the same patient and group
    group_patient2 = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(group_patient2)
    
    # This should raise an IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    
    # Rollback the failed transaction
    sqlite_session.rollback()


def test_group_relationships(sqlite_session):
    """Test relationships between group models."""
    # Create test users
    admin_user = models.User(
        email="admin@example.com",
        name="Admin User",
        role="doctor"
    )
    member_user = models.User(
        email="member@example.com",
        name="Member User",
        role="doctor"
    )
    assigner_user = models.User(
        email="assigner@example.com",
        name="Assigner User",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user, assigner_user])
    sqlite_session.commit()
    
    # Create test patient
    patient_user = models.User(
        email="relationship_patient@example.com",
        name="Relationship Patient",
        role="patient"
    )
    sqlite_session.add(patient_user)
    sqlite_session.commit()
    
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Relationship Test Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Relationship Test Group",
        description="A test group for relationship testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create group memberships
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=assigner_user.user_id
    )
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=assigner_user.user_id
    )
    sqlite_session.add_all([admin_membership, member_membership])
    sqlite_session.commit()
    
    # Create group patient assignment
    group_patient = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=assigner_user.user_id
    )
    sqlite_session.add(group_patient)
    sqlite_session.commit()
    
    # Query and test relationships
    db_group = sqlite_session.query(models.Group).filter_by(name="Relationship Test Group").first()
    assert db_group is not None
    assert len(db_group.memberships) == 2
    assert len(db_group.patients) == 1
    
    # Test membership relationships
    admin_membership_db = sqlite_session.query(models.GroupMembership).filter_by(user_id=admin_user.user_id).first()
    assert admin_membership_db is not None
    assert admin_membership_db.group.name == "Relationship Test Group"
    assert admin_membership_db.user.email == "admin@example.com"
    assert admin_membership_db.inviter.email == "assigner@example.com"
    
    # Test patient assignment relationships
    group_patient_db = sqlite_session.query(models.GroupPatient).first()
    assert group_patient_db is not None
    assert group_patient_db.group.name == "Relationship Test Group"
    assert group_patient_db.patient.name == "Relationship Test Patient"
    assert group_patient_db.assigner.email == "assigner@example.com"


def test_cascade_delete_group(sqlite_session):
    """Test that deleting a group cascades to its memberships and patient assignments."""
    # Create test users
    user1 = models.User(
        email="cascade1@example.com",
        name="Cascade User 1",
        role="doctor"
    )
    user2 = models.User(
        email="cascade2@example.com",
        name="Cascade User 2",
        role="doctor"
    )
    assigner = models.User(
        email="cascade_assigner@example.com",
        name="Cascade Assigner",
        role="doctor"
    )
    sqlite_session.add_all([user1, user2, assigner])
    sqlite_session.commit()
    
    # Create test patient
    patient_user = models.User(
        email="cascade_patient@example.com",
        name="Cascade Patient",
        role="patient"
    )
    sqlite_session.add(patient_user)
    sqlite_session.commit()
    
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Cascade Test Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a group
    group = models.Group(
        name="Cascade Delete Group",
        description="A test group for cascade delete"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create memberships
    membership1 = models.GroupMembership(
        group_id=group.id,
        user_id=user1.user_id,
        role="admin"
    )
    membership2 = models.GroupMembership(
        group_id=group.id,
        user_id=user2.user_id,
        role="member"
    )
    sqlite_session.add_all([membership1, membership2])
    
    # Create patient assignment
    group_patient = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=assigner.user_id
    )
    sqlite_session.add(group_patient)
    sqlite_session.commit()
    
    # Verify records exist
    memberships_before = sqlite_session.query(models.GroupMembership).filter_by(group_id=group.id).count()
    patients_before = sqlite_session.query(models.GroupPatient).filter_by(group_id=group.id).count()
    assert memberships_before == 2
    assert patients_before == 1
    
    # Delete the group
    sqlite_session.delete(group)
    sqlite_session.commit()
    
    # Verify records were cascaded
    memberships_after = sqlite_session.query(models.GroupMembership).filter_by(group_id=group.id).count()
    patients_after = sqlite_session.query(models.GroupPatient).filter_by(group_id=group.id).count()
    assert memberships_after == 0
    assert patients_after == 0