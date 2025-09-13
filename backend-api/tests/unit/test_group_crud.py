"""
Tests for group CRUD operations in Clinical Corvus.
"""

import pytest
import sys
import os
from datetime import datetime
from sqlalchemy.exc import IntegrityError

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import database models and schemas
import database.models as models
from schemas.group import GroupCreate, GroupUpdate, GroupMembershipCreate, GroupPatientCreate

# Import CRUD modules
from crud import groups


def test_create_group(sqlite_session):
    """Test creating a new group."""
    # Create a test user first
    user = models.User(
        email="group_creator@example.com",
        name="Group Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Test group creation
    group_data = GroupCreate(
        name="Test Group",
        description="A test group for collaboration",
        max_patients=50,
        max_members=10
    )
    
    new_group = groups.create_group(
        db=sqlite_session,
        group_data=group_data,
        creator_user_id=user.user_id
    )
    
    # Verify group was created with correct attributes
    assert new_group.name == "Test Group"
    assert new_group.description == "A test group for collaboration"
    assert new_group.max_patients == 50
    assert new_group.max_members == 10
    assert new_group.id is not None
    assert new_group.created_at is not None
    assert new_group.updated_at is not None
    
    # Verify creator was automatically added as admin
    membership = sqlite_session.query(models.GroupMembership).filter_by(
        group_id=new_group.id,
        user_id=user.user_id
    ).first()
    assert membership is not None
    assert membership.role == "admin"


def test_create_group_duplicate_name(sqlite_session):
    """Test creating a group with duplicate name raises error."""
    # Create a test user
    user = models.User(
        email="duplicate_group@example.com",
        name="Duplicate Group Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create first group
    group_data1 = GroupCreate(
        name="Unique Group",
        description="First group"
    )
    groups.create_group(
        db=sqlite_session,
        group_data=group_data1,
        creator_user_id=user.user_id
    )
    
    # Try to create another group with the same name
    group_data2 = GroupCreate(
        name="Unique Group",
        description="Second group"
    )
    
    # This should raise an IntegrityError due to unique constraint
    with pytest.raises(IntegrityError):
        groups.create_group(
            db=sqlite_session,
            group_data=group_data2,
            creator_user_id=user.user_id
        )


def test_get_group(sqlite_session):
    """Test getting a specific group by ID."""
    # Create a test user
    user = models.User(
        email="get_group@example.com",
        name="Get Group Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Retrieval Test Group",
        description="A test group for retrieval"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Test getting group by ID
    retrieved_group = groups.get_group(
        db=sqlite_session,
        group_id=group.id
    )
    
    assert retrieved_group is not None
    assert retrieved_group.id == group.id
    assert retrieved_group.name == "Retrieval Test Group"


def test_get_group_not_found(sqlite_session):
    """Test getting a non-existent group returns None."""
    # Test getting non-existent group
    retrieved_group = groups.get_group(
        db=sqlite_session,
        group_id=999999
    )
    
    assert retrieved_group is None


def test_get_group_by_name(sqlite_session):
    """Test getting a group by name."""
    # Create a test user
    user = models.User(
        email="get_group_by_name@example.com",
        name="Get Group By Name Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Name Retrieval Test Group",
        description="A test group for name retrieval"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Test getting group by name
    retrieved_group = groups.get_group_by_name(
        db=sqlite_session,
        name="Name Retrieval Test Group"
    )
    
    assert retrieved_group is not None
    assert retrieved_group.name == "Name Retrieval Test Group"
    assert retrieved_group.id == group.id


def test_get_group_by_name_not_found(sqlite_session):
    """Test getting a non-existent group by name returns None."""
    # Test getting non-existent group by name
    retrieved_group = groups.get_group_by_name(
        db=sqlite_session,
        name="Non-existent Group"
    )
    
    assert retrieved_group is None


def test_update_group(sqlite_session):
    """Test updating an existing group."""
    # Create a test user
    user = models.User(
        email="update_group@example.com",
        name="Update Group Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Original Group",
        description="Original description",
        max_patients=25,
        max_members=8
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Test updating group
    update_data = GroupUpdate(
        name="Updated Group Name",
        description="Updated description",
        max_patients=40
    )
    
    updated_group = groups.update_group(
        db=sqlite_session,
        group_id=group.id,
        group_update=update_data
    )
    
    # Verify group was updated
    assert updated_group.name == "Updated Group Name"
    assert updated_group.description == "Updated description"
    assert updated_group.max_patients == 40
    assert updated_group.max_members == 8 # Unchanged
    assert updated_group.updated_at > group.updated_at


def test_update_group_not_found(sqlite_session):
    """Test updating a non-existent group returns None."""
    # Test updating non-existent group
    update_data = GroupUpdate(
        name="Should Not Work"
    )
    
    result = groups.update_group(
        db=sqlite_session,
        group_id=999999,
        group_update=update_data
    )
    
    assert result is None


def test_delete_group(sqlite_session):
    """Test deleting a group."""
    # Create a test user
    user = models.User(
        email="delete_group@example.com",
        name="Delete Group Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Group to Delete",
        description="This group will be deleted"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Test deleting group
    result = groups.delete_group(
        db=sqlite_session,
        group_id=group.id
    )
    
    assert result is True
    
    # Verify group was deleted
    deleted_check = groups.get_group(
        db=sqlite_session,
        group_id=group.id
    )
    assert deleted_check is None


def test_delete_group_not_found(sqlite_session):
    """Test deleting a non-existent group returns False."""
    # Test deleting non-existent group
    result = groups.delete_group(
        db=sqlite_session,
        group_id=999999
    )
    
    assert result is False


def test_get_groups(sqlite_session):
    """Test getting groups with pagination and search."""
    # Create a test user
    user = models.User(
        email="get_groups@example.com",
        name="Get Groups Creator",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test groups
    groups_list = [
        models.Group(
            name=f"Test Group {i}",
            description=f"Test group {i} for collaboration"
        )
        for i in range(5)
    ]
    sqlite_session.add_all(groups_list)
    sqlite_session.commit()
    
    # Add user as member to all groups
    memberships = [
        models.GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        for group in groups_list
    ]
    sqlite_session.add_all(memberships)
    sqlite_session.commit()
    
    # Test getting all groups for user
    user_groups, total = groups.get_user_groups(
        db=sqlite_session,
        user_id=user.user_id
    )
    
    assert len(user_groups) == 5
    assert total == 5
    
    # Test pagination
    paginated_groups, total = groups.get_user_groups(
        db=sqlite_session,
        user_id=user.user_id,
        skip=2,
        limit=2
    )
    
    assert len(paginated_groups) == 2
    assert total == 5
    
    # Test search
    search_groups, total = groups.get_groups(
        db=sqlite_session,
        search="Test Group 1"
    )
    
    assert len(search_groups) == 1
    assert total == 1
    assert search_groups[0].name == "Test Group 1"


def test_add_user_to_group(sqlite_session):
    """Test adding a user to a group."""
    # Create test users
    admin_user = models.User(
        email="admin_user@example.com",
        name="Admin User",
        role="doctor"
    )
    member_user = models.User(
        email="member_user@example.com",
        name="Member User",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Membership Test Group",
        description="A test group for membership"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add admin user as admin
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(admin_membership)
    sqlite_session.commit()
    
    # Test adding user to group
    membership_data = GroupMembershipCreate(
        user_id=member_user.user_id,
        role="member"
    )
    
    new_membership = groups.add_user_to_group(
        db=sqlite_session,
        group_id=group.id,
        membership_data=membership_data,
        invited_by=admin_user.user_id
    )
    
    # Verify membership was created
    assert new_membership is not None
    assert new_membership.group_id == group.id
    assert new_membership.user_id == member_user.user_id
    assert new_membership.role == "member"
    assert new_membership.invited_by == admin_user.user_id


def test_add_user_to_group_already_member(sqlite_session):
    """Test adding a user who is already a member."""
    # Create test users
    admin_user = models.User(
        email="admin_user2@example.com",
        name="Admin User 2",
        role="doctor"
    )
    member_user = models.User(
        email="member_user2@example.com",
        name="Member User 2",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Already Member Test Group",
        description="A test group for already member testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add admin user as admin
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(admin_membership)
    
    # Add member user as member
    existing_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(existing_membership)
    sqlite_session.commit()
    
    # Test adding user who is already a member
    membership_data = GroupMembershipCreate(
        user_id=member_user.user_id,
        role="member"
    )
    
    with pytest.raises(ValueError, match="User is already a member of this group"):
        groups.add_user_to_group(
            db=sqlite_session,
            group_id=group.id,
            membership_data=membership_data,
            invited_by=admin_user.user_id
        )


def test_add_user_to_group_nonexistent(sqlite_session):
    """Test adding a user to a non-existent group."""
    # Create test user
    user = models.User(
        email="nonexistent_group@example.com",
        name="Nonexistent Group User",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Test adding user to non-existent group
    membership_data = GroupMembershipCreate(
        user_id=user.user_id,
        role="member"
    )
    
    result = groups.add_user_to_group(
        db=sqlite_session,
        group_id=999999,
        membership_data=membership_data,
        invited_by=user.user_id
    )
    
    assert result is None


def test_remove_user_from_group(sqlite_session):
    """Test removing a user from a group."""
    # Create test users
    admin_user = models.User(
        email="admin_user3@example.com",
        name="Admin User 3",
        role="doctor"
    )
    member_user = models.User(
        email="member_user3@example.com",
        name="Member User 3",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Removal Test Group",
        description="A test group for removal"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add admin user as admin
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(admin_membership)
    
    # Add member user as member
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(member_membership)
    sqlite_session.commit()
    
    # Test removing user from group
    result = groups.remove_user_from_group(
        db=sqlite_session,
        user_id=member_user.user_id,
        group_id=group.id
    )
    
    assert result is True
    
    # Verify user was removed
    membership_check = sqlite_session.query(models.GroupMembership).filter_by(
        user_id=member_user.user_id,
        group_id=group.id
    ).first()
    assert membership_check is None


def test_remove_user_from_group_not_found(sqlite_session):
    """Test removing a non-member user from a group."""
    # Create test user
    user = models.User(
        email="not_member@example.com",
        name="Not Member User",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Not Member Test Group",
        description="A test group for not member testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Test removing non-member user from group
    result = groups.remove_user_from_group(
        db=sqlite_session,
        user_id=user.user_id,
        group_id=group.id
    )
    
    assert result is False


def test_assign_patient_to_group(sqlite_session):
    """Test assigning a patient to a group."""
    # Create test users
    user = models.User(
        email="assign_patient@example.com",
        name="Assign Patient User",
        role="doctor"
    )
    patient_user = models.User(
        email="patient_user@example.com",
        name="Patient User",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Test Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Patient Assignment Test Group",
        description="A test group for patient assignment"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Test assigning patient to group
    assignment_data = GroupPatientCreate(
        patient_id=patient.patient_id
    )
    
    new_assignment = groups.assign_patient_to_group(
        db=sqlite_session,
        group_id=group.id,
        assignment_data=assignment_data,
        assigned_by=user.user_id
    )
    
    # Verify assignment was created
    assert new_assignment is not None
    assert new_assignment.group_id == group.id
    assert new_assignment.patient_id == patient.patient_id
    assert new_assignment.assigned_by == user.user_id


def test_assign_patient_to_group_already_assigned(sqlite_session):
    """Test assigning a patient who is already assigned to the group."""
    # Create test users
    user = models.User(
        email="already_assigned@example.com",
        name="Already Assigned User",
        role="doctor"
    )
    patient_user = models.User(
        email="already_assigned_patient@example.com",
        name="Already Assigned Patient User",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Already Assigned Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Already Assigned Test Group",
        description="A test group for already assigned testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    
    # Create existing assignment
    existing_assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(existing_assignment)
    sqlite_session.commit()
    
    # Test assigning patient who is already assigned
    assignment_data = GroupPatientCreate(
        patient_id=patient.patient_id
    )
    
    with pytest.raises(ValueError, match="Patient is already assigned to this group"):
        groups.assign_patient_to_group(
            db=sqlite_session,
            group_id=group.id,
            assignment_data=assignment_data,
            assigned_by=user.user_id
        )


def test_assign_patient_to_group_nonexistent(sqlite_session):
    """Test assigning a patient to a non-existent group."""
    # Create test users
    user = models.User(
        email="nonexistent_group2@example.com",
        name="Nonexistent Group User 2",
        role="doctor"
    )
    patient_user = models.User(
        email="nonexistent_patient@example.com",
        name="Nonexistent Patient User",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Nonexistent Group Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Test assigning patient to non-existent group
    assignment_data = GroupPatientCreate(
        patient_id=patient.patient_id
    )
    
    result = groups.assign_patient_to_group(
        db=sqlite_session,
        group_id=999999,
        assignment_data=assignment_data,
        assigned_by=user.user_id
    )
    
    assert result is None


def test_remove_patient_from_group(sqlite_session):
    """Test removing a patient from a group."""
    # Create test users
    user = models.User(
        email="remove_patient@example.com",
        name="Remove Patient User",
        role="doctor"
    )
    patient_user = models.User(
        email="remove_patient_user@example.com",
        name="Remove Patient Patient User",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Remove Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Patient Removal Test Group",
        description="A test group for patient removal"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    
    # Create patient assignment
    assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(assignment)
    sqlite_session.commit()
    
    # Test removing patient from group
    result = groups.remove_patient_from_group(
        db=sqlite_session,
        patient_id=patient.patient_id,
        group_id=group.id
    )
    
    assert result is True
    
    # Verify patient was removed
    assignment_check = sqlite_session.query(models.GroupPatient).filter_by(
        patient_id=patient.patient_id,
        group_id=group.id
    ).first()
    assert assignment_check is None


def test_remove_patient_from_group_not_found(sqlite_session):
    """Test removing a non-assigned patient from a group."""
    # Create test users
    user = models.User(
        email="not_assigned@example.com",
        name="Not Assigned User",
        role="doctor"
    )
    patient_user = models.User(
        email="not_assigned_patient@example.com",
        name="Not Assigned Patient User",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Not Assigned Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Not Assigned Test Group",
        description="A test group for not assigned testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Test removing non-assigned patient from group
    result = groups.remove_patient_from_group(
        db=sqlite_session,
        patient_id=patient.patient_id,
        group_id=group.id
    )
    
    assert result is False


def test_get_group_with_members_and_patients(sqlite_session):
    """Test getting a group with its members and patients."""
    # Create test users
    admin_user = models.User(
        email="group_detail_admin@example.com",
        name="Group Detail Admin",
        role="doctor"
    )
    member_user = models.User(
        email="group_detail_member@example.com",
        name="Group Detail Member",
        role="doctor"
    )
    patient_user = models.User(
        email="group_detail_patient@example.com",
        name="Group Detail Patient",
        role="patient"
    )
    sqlite_session.add_all([admin_user, member_user, patient_user])
    sqlite_session.commit()
    
    # Create test patient
    patient = models.Patient(
        user_id=patient_user.user_id,
        name="Group Detail Patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Detailed Group",
        description="A test group with members and patients"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add users as members
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add_all([admin_membership, member_membership])
    
    # Assign patient to group
    assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=admin_user.user_id
    )
    sqlite_session.add(assignment)
    sqlite_session.commit()
    
    # Test getting group with members and patients
    detailed_group = groups.get_group_with_members_and_patients(
        db=sqlite_session,
        group_id=group.id
    )
    
    assert detailed_group is not None
    assert detailed_group.id == group.id
    assert detailed_group.name == "Detailed Group"


def test_is_user_member_of_group(sqlite_session):
    """Test checking if a user is a member of a group."""
    # Create test users
    member_user = models.User(
        email="is_member@example.com",
        name="Is Member User",
        role="doctor"
    )
    non_member_user = models.User(
        email="not_member2@example.com",
        name="Not Member User 2",
        role="doctor"
    )
    sqlite_session.add_all([member_user, non_member_user])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Membership Check Group",
        description="A test group for membership checking"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add member user as member
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=member_user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Test member check
    is_member = groups.is_user_member_of_group(
        db=sqlite_session,
        user_id=member_user.user_id,
        group_id=group.id
    )
    assert is_member is True
    
    # Test non-member check
    is_not_member = groups.is_user_member_of_group(
        db=sqlite_session,
        user_id=non_member_user.user_id,
        group_id=group.id
    )
    assert is_not_member is False


def test_is_user_admin_of_group(sqlite_session):
    """Test checking if a user is an admin of a group."""
    # Create test users
    admin_user = models.User(
        email="is_admin@example.com",
        name="Is Admin User",
        role="doctor"
    )
    member_user = models.User(
        email="is_member_not_admin@example.com",
        name="Is Member Not Admin User",
        role="doctor"
    )
    non_member_user = models.User(
        email="not_member3@example.com",
        name="Not Member User 3",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user, non_member_user])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Admin Check Group",
        description="A test group for admin checking"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add admin user as admin
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(admin_membership)
    
    # Add member user as member
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(member_membership)
    sqlite_session.commit()
    
    # Test admin check
    is_admin = groups.is_user_admin_of_group(
        db=sqlite_session,
        user_id=admin_user.user_id,
        group_id=group.id
    )
    assert is_admin is True
    
    # Test member (not admin) check
    is_member_not_admin = groups.is_user_admin_of_group(
        db=sqlite_session,
        user_id=member_user.user_id,
        group_id=group.id
    )
    assert is_member_not_admin is False
    
    # Test non-member check
    is_not_member = groups.is_user_admin_of_group(
        db=sqlite_session,
        user_id=non_member_user.user_id,
        group_id=group.id
    )
    assert is_not_member is False


def test_get_group_memberships(sqlite_session):
    """Test getting all memberships for a group."""
    # Create test users
    admin_user = models.User(
        email="memberships_admin@example.com",
        name="Memberships Admin",
        role="doctor"
    )
    member_user1 = models.User(
        email="memberships_member1@example.com",
        name="Memberships Member 1",
        role="doctor"
    )
    member_user2 = models.User(
        email="memberships_member2@example.com",
        name="Memberships Member 2",
        role="doctor"
    )
    sqlite_session.add_all([admin_user, member_user1, member_user2])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Memberships Test Group",
        description="A test group for memberships"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add users as members
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin",
        invited_by=admin_user.user_id
    )
    member_membership1 = models.GroupMembership(
        group_id=group.id,
        user_id=member_user1.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    member_membership2 = models.GroupMembership(
        group_id=group.id,
        user_id=member_user2.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add_all([admin_membership, member_membership1, member_membership2])
    sqlite_session.commit()
    
    # Test getting all memberships
    memberships, total = groups.get_group_memberships(
        db=sqlite_session,
        group_id=group.id
    )
    
    assert len(memberships) == 3
    assert total == 3
    
    # Test pagination
    paginated_memberships, total = groups.get_group_memberships(
        db=sqlite_session,
        group_id=group.id,
        skip=1,
        limit=1
    )
    
    assert len(paginated_memberships) == 1
    assert total == 3


def test_get_group_patients(sqlite_session):
    """Test getting all patients assigned to a group."""
    # Create test users
    user = models.User(
        email="group_patients@example.com",
        name="Group Patients User",
        role="doctor"
    )
    patient_user1 = models.User(
        email="group_patient1@example.com",
        name="Group Patient 1",
        role="patient"
    )
    patient_user2 = models.User(
        email="group_patient2@example.com",
        name="Group Patient 2",
        role="patient"
    )
    sqlite_session.add_all([user, patient_user1, patient_user2])
    sqlite_session.commit()
    
    # Create test patients
    patient1 = models.Patient(
        user_id=patient_user1.user_id,
        name="Group Patient 1"
    )
    patient2 = models.Patient(
        user_id=patient_user2.user_id,
        name="Group Patient 2"
    )
    sqlite_session.add_all([patient1, patient2])
    sqlite_session.commit()
    
    # Create a test group
    group = models.Group(
        name="Group Patients Test Group",
        description="A test group for group patients"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add user as admin
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    
    # Assign patients to group
    assignment1 = models.GroupPatient(
        group_id=group.id,
        patient_id=patient1.patient_id,
        assigned_by=user.user_id
    )
    assignment2 = models.GroupPatient(
        group_id=group.id,
        patient_id=patient2.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add_all([assignment1, assignment2])
    sqlite_session.commit()
    
    # Test getting all patients
    patients, total = groups.get_group_patients(
        db=sqlite_session,
        group_id=group.id
    )
    
    assert len(patients) == 2
    assert total == 2
    
    # Test pagination
    paginated_patients, total = groups.get_group_patients(
        db=sqlite_session,
        group_id=group.id,
        skip=1,
        limit=1
    )
    
    assert len(paginated_patients) == 1
    assert total == 2