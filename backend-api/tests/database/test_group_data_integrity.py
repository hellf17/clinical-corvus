"""
Database data integrity tests for group operations in Clinical Corvus.
"""

import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError
from database.models import User, Group, GroupMembership, GroupPatient, GroupInvitation, Patient
from datetime import datetime, timedelta


class TestGroupDataIntegrity:
    """Test cases for group data integrity."""

    def test_group_name_uniqueness(self, sqlite_session):
        """Test that group names must be unique."""
        # Create first group
        group1 = Group(
            name="Unique Name Group",
            description="First group with unique name"
        )
        sqlite_session.add(group1)
        sqlite_session.commit()

        # Try to create second group with same name
        group2 = Group(
            name="Unique Name Group",  # Same name
            description="Second group with same name"
        )
        sqlite_session.add(group2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Verify only first group exists
        groups = sqlite_session.query(Group).filter_by(name="Unique Name Group").all()
        assert len(groups) == 1
        assert groups[0].id == group1.id

    def test_group_name_not_null(self, sqlite_session):
        """Test that group name cannot be null."""
        # Try to create group without name
        group = Group(
            # name is missing
            description="Group without name"
        )
        sqlite_session.add(group)

        # This should raise an IntegrityError due to NOT NULL constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_name_not_empty(self, sqlite_session):
        """Test that group name cannot be empty."""
        # Try to create group with empty name
        group = Group(
            name="",  # Empty name
            description="Group with empty name"
        )
        sqlite_session.add(group)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_max_patients_positive(self, sqlite_session):
        """Test that group max_patients must be positive."""
        # Try to create group with negative max_patients
        group = Group(
            name="Negative Max Patients Group",
            description="Group with negative max_patients",
            max_patients=-1  # Negative value
        )
        sqlite_session.add(group)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Try to create group with zero max_patients
        group2 = Group(
            name="Zero Max Patients Group",
            description="Group with zero max_patients",
            max_patients=0  # Zero value
        )
        sqlite_session.add(group2)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_max_members_positive(self, sqlite_session):
        """Test that group max_members must be positive."""
        # Try to create group with negative max_members
        group = Group(
            name="Negative Max Members Group",
            description="Group with negative max_members",
            max_members=-1  # Negative value
        )
        sqlite_session.add(group)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Try to create group with zero max_members
        group2 = Group(
            name="Zero Max Members Group",
            description="Group with zero max_members",
            max_members=0  # Zero value
        )
        sqlite_session.add(group2)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_membership_unique_constraint(self, sqlite_session):
        """Test that a user can only be a member of a group once."""
        # Create test users
        user = User(
            email="unique_membership_user@example.com",
            name="Unique Membership User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Unique Membership Group",
            description="Group for unique membership testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create first membership
        membership1 = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add(membership1)
        sqlite_session.commit()

        # Try to create second membership for same user and group
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="admin",  # Different role
            invited_by=user.user_id
        )
        sqlite_session.add(membership2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Verify only first membership exists
        memberships = sqlite_session.query(GroupMembership).filter_by(
            group_id=group.id, user_id=user.user_id
        ).all()
        assert len(memberships) == 1
        assert memberships[0].id == membership1.id
        assert memberships[0].role == "member"

    def test_group_membership_role_valid_values(self, sqlite_session):
        """Test that group membership role must be valid."""
        # Create test user
        user = User(
            email="valid_role_user@example.com",
            name="Valid Role User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Valid Role Group",
            description="Group for valid role testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create membership with invalid role
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="invalid_role",  # Invalid role
            invited_by=user.user_id
        )
        sqlite_session.add(membership)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test valid roles
        valid_roles = ["admin", "member"]
        for role in valid_roles:
            membership = GroupMembership(
                group_id=group.id,
                user_id=user.user_id,
                role=role,  # Valid role
                invited_by=user.user_id
            )
            sqlite_session.add(membership)
            sqlite_session.commit()
            sqlite_session.delete(membership)
            sqlite_session.commit()

    def test_group_membership_invited_by_references_user(self, sqlite_session):
        """Test that invited_by references an existing user."""
        # Create test user
        user = User(
            email="invited_by_user@example.com",
            name="Invited By User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Invited By Group",
            description="Group for invited_by testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create membership with non-existent invited_by
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=999999  # Non-existent user ID
        )
        sqlite_session.add(membership)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_patient_unique_constraint(self, sqlite_session):
        """Test that a patient can only be assigned to a group once."""
        # Create test users
        user = User(
            email="unique_patient_user@example.com",
            name="Unique Patient User",
            role="doctor"
        )
        patient_user = User(
            email="unique_patient_patient@example.com",
            name="Unique Patient Patient",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Unique Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Unique Patient Group",
            description="Group for unique patient testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create first assignment
        assignment1 = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(assignment1)
        sqlite_session.commit()

        # Try to create second assignment for same patient and group
        assignment2 = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(assignment2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Verify only first assignment exists
        assignments = sqlite_session.query(GroupPatient).filter_by(
            group_id=group.id, patient_id=patient.patient_id
        ).all()
        assert len(assignments) == 1
        assert assignments[0].id == assignment1.id

    def test_group_patient_assigned_by_references_user(self, sqlite_session):
        """Test that assigned_by references an existing user."""
        # Create test users
        user = User(
            email="assigned_by_user@example.com",
            name="Assigned By User",
            role="doctor"
        )
        patient_user = User(
            email="assigned_by_patient@example.com",
            name="Assigned By Patient",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Assigned By Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Assigned By Group",
            description="Group for assigned_by testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create assignment with non-existent assigned_by
        assignment = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=999999  # Non-existent user ID
        )
        sqlite_session.add(assignment)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_invitation_token_uniqueness(self, sqlite_session):
        """Test that group invitation tokens must be unique."""
        # Create test user
        user = User(
            email="unique_token_user@example.com",
            name="Unique Token User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Unique Token Group",
            description="Group for unique token testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create first invitation
        invitation1 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee1@example.com",
            role="member",
            token="unique-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation1)
        sqlite_session.commit()

        # Try to create second invitation with same token
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee2@example.com",
            role="member",
            token="unique-token-123",  # Same token
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Verify only first invitation exists
        invitations = sqlite_session.query(GroupInvitation).filter_by(token="unique-token-123").all()
        assert len(invitations) == 1
        assert invitations[0].id == invitation1.id

    def test_group_invitation_email_format(self, sqlite_session):
        """Test that group invitation email must be valid."""
        # Create test user
        user = User(
            email="valid_email_user@example.com",
            name="Valid Email User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Valid Email Group",
            description="Group for valid email testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create invitation with invalid email format
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invalid-email-format",  # Invalid email
            role="member",
            token="invalid-email-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_invitation_role_valid_values(self, sqlite_session):
        """Test that group invitation role must be valid."""
        # Create test user
        user = User(
            email="valid_invitation_role_user@example.com",
            name="Valid Invitation Role User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Valid Invitation Role Group",
            description="Group for valid invitation role testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create invitation with invalid role
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee@example.com",
            role="invalid_role",  # Invalid role
            token="invalid-role-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test valid roles
        valid_roles = ["admin", "member"]
        for role in valid_roles:
            invitation = GroupInvitation(
                group_id=group.id,
                invited_by_user_id=user.user_id,
                email="invitee@example.com",
                role=role,  # Valid role
                token=f"valid-role-token-{role}",
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            sqlite_session.add(invitation)
            sqlite_session.commit()
            sqlite_session.delete(invitation)
            sqlite_session.commit()

    def test_group_invitation_invited_by_references_user(self, sqlite_session):
        """Test that invited_by_user_id references an existing user."""
        # Create test user
        user = User(
            email="invitation_invited_by_user@example.com",
            name="Invitation Invited By User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Invitation Invited By Group",
            description="Group for invitation invited_by testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create invitation with non-existent invited_by_user_id
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=999999,  # Non-existent user ID
            email="invitee@example.com",
            role="member",
            token="nonexistent-invited-by-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_invitation_expires_at_future(self, sqlite_session):
        """Test that group invitation expires_at must be in the future."""
        # Create test user
        user = User(
            email="expires_at_user@example.com",
            name="Expires At User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Expires At Group",
            description="Group for expires_at testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create invitation with past expires_at
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee@example.com",
            role="member",
            token="past-expires-at-token",
            expires_at=datetime.utcnow() - timedelta(days=1)  # Past date
        )
        sqlite_session.add(invitation)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test with future expires_at (should work)
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee2@example.com",
            role="member",
            token="future-expires-at-token",
            expires_at=datetime.utcnow() + timedelta(days=7)  # Future date
        )
        sqlite_session.add(invitation2)
        sqlite_session.commit()

        # Verify invitation was created successfully
        db_invitation = sqlite_session.query(GroupInvitation).filter_by(token="future-expires-at-token").first()
        assert db_invitation is not None
        assert db_invitation.email == "invitee2@example.com"

    def test_group_invitation_cascade_delete_group(self, sqlite_session):
        """Test that deleting a group cascades to its invitations."""
        # Create test user
        user = User(
            email="cascade_delete_user@example.com",
            name="Cascade Delete User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Cascade Delete Group",
            description="Group for cascade delete testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group invitations
        invitation1 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee1@example.com",
            role="member",
            token="cascade-delete-token-1",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee2@example.com",
            role="member",
            token="cascade-delete-token-2",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add_all([invitation1, invitation2])
        sqlite_session.commit()

        # Verify invitations exist
        invitations_before = sqlite_session.query(GroupInvitation).filter_by(group_id=group.id).count()
        assert invitations_before == 2

        # Delete the group
        sqlite_session.delete(group)
        sqlite_session.commit()

        # Verify invitations were cascaded
        invitations_after = sqlite_session.query(GroupInvitation).filter_by(group_id=group.id).count()
        assert invitations_after == 0

    def test_group_membership_cascade_delete_group(self, sqlite_session):
        """Test that deleting a group cascades to its memberships."""
        # Create test users
        user1 = User(
            email="cascade_membership_user1@example.com",
            name="Cascade Membership User 1",
            role="doctor"
        )
        user2 = User(
            email="cascade_membership_user2@example.com",
            name="Cascade Membership User 2",
            role="doctor"
        )
        sqlite_session.add_all([user1, user2])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Cascade Membership Group",
            description="Group for cascade membership testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group memberships
        membership1 = GroupMembership(
            group_id=group.id,
            user_id=user1.user_id,
            role="admin",
            invited_by=user2.user_id
        )
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=user2.user_id,
            role="member",
            invited_by=user1.user_id
        )
        sqlite_session.add_all([membership1, membership2])
        sqlite_session.commit()

        # Verify memberships exist
        memberships_before = sqlite_session.query(GroupMembership).filter_by(group_id=group.id).count()
        assert memberships_before == 2

        # Delete the group
        sqlite_session.delete(group)
        sqlite_session.commit()

        # Verify memberships were cascaded
        memberships_after = sqlite_session.query(GroupMembership).filter_by(group_id=group.id).count()
        assert memberships_after == 0

        # Verify users still exist
        users_after = sqlite_session.query(User).count()
        assert users_after == 2

    def test_group_patient_cascade_delete_group(self, sqlite_session):
        """Test that deleting a group cascades to its patient assignments."""
        # Create test users
        user = User(
            email="cascade_patient_user@example.com",
            name="Cascade Patient User",
            role="doctor"
        )
        patient_user = User(
            email="cascade_patient_patient@example.com",
            name="Cascade Patient Patient",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Cascade Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Cascade Patient Group",
            description="Group for cascade patient testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group-patient assignment
        assignment = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(assignment)
        sqlite_session.commit()

        # Verify assignment exists
        assignments_before = sqlite_session.query(GroupPatient).filter_by(group_id=group.id).count()
        assert assignments_before == 1

        # Delete the group
        sqlite_session.delete(group)
        sqlite_session.commit()

        # Verify assignment was cascaded
        assignments_after = sqlite_session.query(GroupPatient).filter_by(group_id=group.id).count()
        assert assignments_after == 0

        # Verify patient still exists
        patient_after = sqlite_session.query(Patient).filter_by(patient_id=patient.patient_id).first()
        assert patient_after is not None

    def test_group_membership_cascade_delete_user(self, sqlite_session):
        """Test that deleting a user cascades to their memberships."""
        # Create test users
        user_to_delete = User(
            email="delete_membership_user@example.com",
            name="Delete Membership User",
            role="doctor"
        )
        other_user = User(
            email="other_membership_user@example.com",
            name="Other Membership User",
            role="doctor"
        )
        sqlite_session.add_all([user_to_delete, other_user])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Delete Membership Group",
            description="Group for delete membership testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group memberships
        membership1 = GroupMembership(
            group_id=group.id,
            user_id=user_to_delete.user_id,
            role="admin",
            invited_by=other_user.user_id
        )
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=other_user.user_id,
            role="member",
            invited_by=other_user.user_id
        )
        sqlite_session.add_all([membership1, membership2])
        sqlite_session.commit()

        # Verify memberships exist
        memberships_before = sqlite_session.query(GroupMembership).count()
        assert memberships_before == 2

        # Delete the user
        sqlite_session.delete(user_to_delete)
        sqlite_session.commit()

        # Verify only one membership remains
        memberships_after = sqlite_session.query(GroupMembership).count()
        assert memberships_after == 1

        # Verify the remaining membership is for the other user
        remaining_membership = sqlite_session.query(GroupMembership).first()
        assert remaining_membership.user_id == other_user.user_id
        assert remaining_membership.role == "member"

    def test_group_patient_cascade_delete_patient(self, sqlite_session):
        """Test that deleting a patient cascades to their group assignments."""
        # Create test users
        user = User(
            email="delete_patient_user@example.com",
            name="Delete Patient User",
            role="doctor"
        )
        patient_user_to_delete = User(
            email="delete_patient_patient@example.com",
            name="Delete Patient Patient",
            role="patient"
        )
        other_patient_user = User(
            email="other_patient_patient@example.com",
            name="Other Patient Patient",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user_to_delete, other_patient_user])
        sqlite_session.commit()

        # Create test patients
        patient_to_delete = Patient(
            user_id=patient_user_to_delete.user_id,
            name="Delete Test Patient"
        )
        other_patient = Patient(
            user_id=other_patient_user.user_id,
            name="Other Test Patient"
        )
        sqlite_session.add_all([patient_to_delete, other_patient])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Delete Patient Group",
            description="Group for delete patient testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group-patient assignments
        assignment1 = GroupPatient(
            group_id=group.id,
            patient_id=patient_to_delete.patient_id,
            assigned_by=user.user_id
        )
        assignment2 = GroupPatient(
            group_id=group.id,
            patient_id=other_patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add_all([assignment1, assignment2])
        sqlite_session.commit()

        # Verify assignments exist
        assignments_before = sqlite_session.query(GroupPatient).count()
        assert assignments_before == 2

        # Delete the patient
        sqlite_session.delete(patient_to_delete)
        sqlite_session.commit()

        # Verify only one assignment remains
        assignments_after = sqlite_session.query(GroupPatient).count()
        assert assignments_after == 1

        # Verify the remaining assignment is for the other patient
        remaining_assignment = sqlite_session.query(GroupPatient).first()
        assert remaining_assignment.patient_id == other_patient.patient_id

    def test_group_invitation_cascade_delete_user(self, sqlite_session):
        """Test that deleting a user cascades to their invitations (as inviter)."""
        # Create test users
        user_to_delete = User(
            email="delete_invitation_user@example.com",
            name="Delete Invitation User",
            role="doctor"
        )
        other_user = User(
            email="other_invitation_user@example.com",
            name="Other Invitation User",
            role="doctor"
        )
        sqlite_session.add_all([user_to_delete, other_user])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Delete Invitation Group",
            description="Group for delete invitation testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group invitations
        invitation1 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user_to_delete.user_id,  # User to be deleted is inviter
            email="invitee1@example.com",
            role="member",
            token="delete-invitation-token-1",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=other_user.user_id,  # Other user is inviter
            email="invitee2@example.com",
            role="member",
            token="delete-invitation-token-2",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add_all([invitation1, invitation2])
        sqlite_session.commit()

        # Verify invitations exist
        invitations_before = sqlite_session.query(GroupInvitation).count()
        assert invitations_before == 2

        # Delete the user
        sqlite_session.delete(user_to_delete)
        sqlite_session.commit()

        # Verify only one invitation remains
        invitations_after = sqlite_session.query(GroupInvitation).count()
        assert invitations_after == 1

        # Verify the remaining invitation is from the other user
        remaining_invitation = sqlite_session.query(GroupInvitation).first()
        assert remaining_invitation.invited_by_user_id == other_user.user_id
        assert remaining_invitation.token == "delete-invitation-token-2"

    def test_group_name_length_limits(self, sqlite_session):
        """Test that group name has appropriate length limits."""
        # Try to create group with very long name
        long_name = "A" * 300  # Very long name
        group = Group(
            name=long_name,
            description="Group with very long name"
        )
        sqlite_session.add(group)

        # This should raise a DataError due to length constraint
        with pytest.raises(DataError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test with reasonable length name (should work)
        reasonable_name = "A" * 100  # Reasonable length
        group2 = Group(
            name=reasonable_name,
            description="Group with reasonable name length"
        )
        sqlite_session.add(group2)
        sqlite_session.commit()

        # Verify group was created successfully
        db_group = sqlite_session.query(Group).filter_by(name=reasonable_name).first()
        assert db_group is not None
        assert db_group.description == "Group with reasonable name length"

    def test_group_description_length_limits(self, sqlite_session):
        """Test that group description has appropriate length limits."""
        # Try to create group with very long description
        long_description = "A" * 10000  # Very long description
        group = Group(
            name="Long Description Group",
            description=long_description
        )
        sqlite_session.add(group)

        # This should raise a DataError due to length constraint
        with pytest.raises(DataError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test with reasonable length description (should work)
        reasonable_description = "A" * 1000  # Reasonable length
        group2 = Group(
            name="Reasonable Description Group",
            description=reasonable_description
        )
        sqlite_session.add(group2)
        sqlite_session.commit()

        # Verify group was created successfully
        db_group = sqlite_session.query(Group).filter_by(name="Reasonable Description Group").first()
        assert db_group is not None
        assert len(db_group.description) == 1000

    def test_group_invitation_email_length_limits(self, sqlite_session):
        """Test that group invitation email has appropriate length limits."""
        # Create test user
        user = User(
            email="email_length_user@example.com",
            name="Email Length User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Email Length Group",
            description="Group for email length testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Try to create invitation with very long email
        long_email = "A" * 300 + "@example.com"  # Very long email
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email=long_email,
            role="member",
            token="long-email-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)

        # This should raise a DataError due to length constraint
        with pytest.raises(DataError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test with reasonable length email (should work)
        reasonable_email = "A" * 100 + "@example.com"  # Reasonable length
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email=reasonable_email,
            role="member",
            token="reasonable-email-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation2)
        sqlite_session.commit()

        # Verify invitation was created successfully
        db_invitation = sqlite_session.query(GroupInvitation).filter_by(token="reasonable-email-token").first()
        assert db_invitation is not None
        assert db_invitation.email == reasonable_email

    def test_group_membership_role_default_value(self, sqlite_session):
        """Test that group membership role has appropriate default value."""
        # Create test user
        user = User(
            email="default_role_user@example.com",
            name="Default Role User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Default Role Group",
            description="Group for default role testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create membership without specifying role (should use default)
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            invited_by=user.user_id
            # role is not specified, should use default
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Verify membership was created with default role
        db_membership = sqlite_session.query(GroupMembership).first()
        assert db_membership is not None
        assert db_membership.role == "member"  # Default value

    def test_group_max_limits_default_values(self, sqlite_session):
        """Test that group max limits have appropriate default values."""
        # Create group without specifying max limits (should use defaults)
        group = Group(
            name="Default Limits Group",
            description="Group for default limits testing"
            # max_patients and max_members not specified, should use defaults
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Verify group was created with default limits
        db_group = sqlite_session.query(Group).filter_by(name="Default Limits Group").first()
        assert db_group is not None
        assert db_group.max_patients == 100  # Default value
        assert db_group.max_members == 10   # Default value

    def test_group_timestamps_auto_population(self, sqlite_session):
        """Test that group timestamps are auto-populated."""
        # Create group
        group = Group(
            name="Timestamps Group",
            description="Group for timestamps testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Verify timestamps were auto-populated
        db_group = sqlite_session.query(Group).filter_by(name="Timestamps Group").first()
        assert db_group is not None
        assert db_group.created_at is not None
        assert db_group.updated_at is not None
        assert isinstance(db_group.created_at, datetime)
        assert isinstance(db_group.updated_at, datetime)

        # Store original timestamps
        original_created_at = db_group.created_at
        original_updated_at = db_group.updated_at

        # Update group
        db_group.description = "Updated description"
        sqlite_session.commit()

        # Verify updated_at was updated but created_at remained the same
        assert db_group.created_at == original_created_at
        assert db_group.updated_at > original_updated_at

    def test_group_membership_timestamps_auto_population(self, sqlite_session):
        """Test that group membership timestamps are auto-populated."""
        # Create test user
        user = User(
            email="membership_timestamps_user@example.com",
            name="Membership Timestamps User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Membership Timestamps Group",
            description="Group for membership timestamps testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Verify timestamps were auto-populated
        db_membership = sqlite_session.query(GroupMembership).first()
        assert db_membership is not None
        assert db_membership.joined_at is not None
        assert isinstance(db_membership.joined_at, datetime)

    def test_group_patient_timestamps_auto_population(self, sqlite_session):
        """Test that group-patient timestamps are auto-populated."""
        # Create test users
        user = User(
            email="patient_timestamps_user@example.com",
            name="Patient Timestamps User",
            role="doctor"
        )
        patient_user = User(
            email="patient_timestamps_patient@example.com",
            name="Patient Timestamps Patient",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Patient Timestamps Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Patient Timestamps Group",
            description="Group for patient timestamps testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create assignment
        assignment = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(assignment)
        sqlite_session.commit()

        # Verify timestamps were auto-populated
        db_assignment = sqlite_session.query(GroupPatient).first()
        assert db_assignment is not None
        assert db_assignment.assigned_at is not None
        assert isinstance(db_assignment.assigned_at, datetime)

    def test_group_invitation_timestamps_auto_population(self, sqlite_session):
        """Test that group invitation timestamps are auto-populated."""
        # Create test user
        user = User(
            email="invitation_timestamps_user@example.com",
            name="Invitation Timestamps User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Invitation Timestamps Group",
            description="Group for invitation timestamps testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create invitation
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee@example.com",
            role="member",
            token="timestamps-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Verify timestamps were auto-populated
        db_invitation = sqlite_session.query(GroupInvitation).filter_by(token="timestamps-test-token").first()
        assert db_invitation is not None
        assert db_invitation.created_at is not None
        assert isinstance(db_invitation.created_at, datetime)

        # Test that accepted_at, declined_at, and revoked_at are initially None
        assert db_invitation.accepted_at is None
        assert db_invitation.declined_at is None
        assert db_invitation.revoked_at is None

        # Test updating accepted_at
        db_invitation.accepted_at = datetime.utcnow()
        sqlite_session.commit()
        assert db_invitation.accepted_at is not None
        assert isinstance(db_invitation.accepted_at, datetime)

    def test_data_integrity_across_transactions(self, sqlite_session):
        """Test that data integrity is maintained across transactions."""
        # Start first transaction
        # Create test users
        user1 = User(
            email="transaction_user1@example.com",
            name="Transaction User 1",
            role="doctor"
        )
        user2 = User(
            email="transaction_user2@example.com",
            name="Transaction User 2",
            role="doctor"
        )
        sqlite_session.add_all([user1, user2])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Transaction Test Group",
            description="Group for transaction testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=user1.user_id,
            role="admin",
            invited_by=user2.user_id
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Verify data integrity in first transaction
        db_group = sqlite_session.query(Group).filter_by(name="Transaction Test Group").first()
        assert db_group is not None
        assert len(db_group.memberships) == 1
        assert db_group.memberships[0].role == "admin"
        assert db_group.memberships[0].user.email == "transaction_user1@example.com"

        # Start second transaction (simulate by just doing more operations)
        # Update membership role
        db_membership = sqlite_session.query(GroupMembership).first()
        db_membership.role = "member"
        sqlite_session.commit()

        # Verify data integrity in second transaction
        db_group = sqlite_session.query(Group).filter_by(name="Transaction Test Group").first()
        assert db_group.memberships[0].role == "member"

        # Add another membership
        new_membership = GroupMembership(
            group_id=group.id,
            user_id=user2.user_id,
            role="member",
            invited_by=user1.user_id
        )
        sqlite_session.add(new_membership)
        sqlite_session.commit()

        # Verify data integrity with multiple memberships
        db_group = sqlite_session.query(Group).filter_by(name="Transaction Test Group").first()
        assert len(db_group.memberships) == 2
        
        # Check roles
        roles = [m.role for m in db_group.memberships]
        assert roles.count("admin") == 0
        assert roles.count("member") == 2

        # Verify user relationships are intact
        db_user1 = sqlite_session.query(User).filter_by(email="transaction_user1@example.com").first()
        assert len(db_user1.group_memberships) == 1
        assert db_user1.group_memberships[0].role == "member"
        assert db_user1.group_memberships[0].group.name == "Transaction Test Group"

        db_user2 = sqlite_session.query(User).filter_by(email="transaction_user2@example.com").first()
        assert len(db_user2.group_memberships) == 1
        assert db_user2.group_memberships[0].role == "member"
        assert db_user2.group_memberships[0].group.name == "Transaction Test Group"


if __name__ == "__main__":
    pytest.main([__file__])