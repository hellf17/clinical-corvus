"""
Database integration tests for group models in Clinical Corvus.
"""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database.models import Group, GroupMembership, GroupPatient, GroupInvitation, User, Patient
from datetime import datetime, timedelta


class TestGroupDatabase:
    """Test cases for group database operations."""

    def test_group_creation(self, sqlite_session):
        """Test creating a group in the database."""
        # Create a group
        group = Group(
            name="Database Test Group",
            description="A test group for database operations",
            max_patients=30,
            max_members=15
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Verify the group was created
        db_group = sqlite_session.query(Group).filter_by(name="Database Test Group").first()
        assert db_group is not None
        assert db_group.name == "Database Test Group"
        assert db_group.description == "A test group for database operations"
        assert db_group.max_patients == 30
        assert db_group.max_members == 15
        assert db_group.id is not None
        assert db_group.created_at is not None
        assert db_group.updated_at is not None

    def test_group_unique_name_constraint(self, sqlite_session):
        """Test that group names must be unique."""
        # Create first group
        group1 = Group(
            name="Unique Name Group",
            description="First group"
        )
        sqlite_session.add(group1)
        sqlite_session.commit()

        # Try to create another group with the same name
        group2 = Group(
            name="Unique Name Group",
            description="Second group"
        )
        sqlite_session.add(group2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_membership_creation(self, sqlite_session):
        """Test creating a group membership in the database."""
        # Create test users
        user1 = User(
            email="member1@example.com",
            name="Member 1",
            role="doctor"
        )
        user2 = User(
            email="member2@example.com",
            name="Member 2",
            role="doctor"
        )
        sqlite_session.add_all([user1, user2])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Membership Test Group",
            description="A test group for membership"
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

        # Verify the membership was created
        db_membership = sqlite_session.query(GroupMembership).first()
        assert db_membership is not None
        assert db_membership.group_id == group.id
        assert db_membership.user_id == user1.user_id
        assert db_membership.role == "admin"
        assert db_membership.invited_by == user2.user_id
        assert db_membership.joined_at is not None
        assert db_membership.id is not None

    def test_group_membership_unique_constraint(self, sqlite_session):
        """Test that a user can only be a member of a group once."""
        # Create test user
        user = User(
            email="unique_member@example.com",
            name="Unique Member",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Unique Membership Group",
            description="A test group for unique membership"
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

        # Try to create another membership for the same user and group
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="admin",
            invited_by=user.user_id
        )
        sqlite_session.add(membership2)

        # This should raise an IntegrityError due to unique constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_patient_creation(self, sqlite_session):
        """Test creating a group-patient assignment in the database."""
        # Create test users
        user = User(
            email="assigner@example.com",
            name="Assigner",
            role="doctor"
        )
        patient_user = User(
            email="patient_user@example.com",
            name="Patient User",
            role="patient"
        )
        sqlite_session.add_all([user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Patient Assignment Group",
            description="A test group for patient assignment"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group-patient assignment
        group_patient = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(group_patient)
        sqlite_session.commit()

        # Verify the assignment was created
        db_group_patient = sqlite_session.query(GroupPatient).first()
        assert db_group_patient is not None
        assert db_group_patient.group_id == group.id
        assert db_group_patient.patient_id == patient.patient_id
        assert db_group_patient.assigned_by == user.user_id
        assert db_group_patient.assigned_at is not None
        assert db_group_patient.id is not None

    def test_group_patient_unique_constraint(self, sqlite_session):
        """Test that a patient can only be assigned to a group once."""
        # Create test users
        user = User(
            email="unique_assigner@example.com",
            name="Unique Assigner",
            role="doctor"
        )
        patient_user = User(
            email="unique_patient_user@example.com",
            name="Unique Patient User",
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
            name="Unique Assignment Group",
            description="A test group for unique assignment"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create first assignment
        group_patient1 = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(group_patient1)
        sqlite_session.commit()

        # Try to create another assignment for the same patient and group
        group_patient2 = GroupPatient(
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

    def test_group_invitation_creation(self, sqlite_session):
        """Test creating a group invitation in the database."""
        # Create test user
        user = User(
            email="inviter@example.com",
            name="Inviter",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Invitation Test Group",
            description="A test group for invitations"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group invitation
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee@example.com",
            role="member",
            token="test-invitation-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Verify the invitation was created
        db_invitation = sqlite_session.query(GroupInvitation).first()
        assert db_invitation is not None
        assert db_invitation.group_id == group.id
        assert db_invitation.invited_by_user_id == user.user_id
        assert db_invitation.email == "invitee@example.com"
        assert db_invitation.role == "member"
        assert db_invitation.token == "test-invitation-token"
        assert db_invitation.expires_at is not None
        assert db_invitation.accepted_at is None
        assert db_invitation.declined_at is None
        assert db_invitation.revoked_at is None
        assert db_invitation.created_at is not None
        assert db_invitation.id is not None

    def test_group_invitation_unique_token_constraint(self, sqlite_session):
        """Test that invitation tokens must be unique."""
        # Create test user
        user = User(
            email="unique_inviter@example.com",
            name="Unique Inviter",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Unique Token Group",
            description="A test group for unique tokens"
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

        # Try to create another invitation with the same token
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

    def test_group_relationships(self, sqlite_session):
        """Test relationships between group models."""
        # Create test users
        admin_user = User(
            email="admin@example.com",
            name="Admin User",
            role="doctor"
        )
        member_user = User(
            email="member@example.com",
            name="Member User",
            role="doctor"
        )
        assigner_user = User(
            email="assigner@example.com",
            name="Assigner User",
            role="doctor"
        )
        patient_user = User(
            email="patient@example.com",
            name="Patient User",
            role="patient"
        )
        sqlite_session.add_all([admin_user, member_user, assigner_user, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Relationship Test Group",
            description="A test group for relationships"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group memberships
        admin_membership = GroupMembership(
            group_id=group.id,
            user_id=admin_user.user_id,
            role="admin",
            invited_by=assigner_user.user_id
        )
        member_membership = GroupMembership(
            group_id=group.id,
            user_id=member_user.user_id,
            role="member",
            invited_by=assigner_user.user_id
        )
        sqlite_session.add_all([admin_membership, member_membership])
        sqlite_session.commit()

        # Create group-patient assignment
        group_patient = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=assigner_user.user_id
        )
        sqlite_session.add(group_patient)
        sqlite_session.commit()

        # Create group invitation
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=admin_user.user_id,
            email="newinvitee@example.com",
            role="member",
            token="relationship-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Query and test relationships
        db_group = sqlite_session.query(Group).filter_by(name="Relationship Test Group").first()
        assert db_group is not None
        assert len(db_group.memberships) == 2
        assert len(db_group.patients) == 1
        assert len(db_group.invitations) == 1

        # Test membership relationships
        admin_membership_db = sqlite_session.query(GroupMembership).filter_by(user_id=admin_user.user_id).first()
        assert admin_membership_db is not None
        assert admin_membership_db.group.name == "Relationship Test Group"
        assert admin_membership_db.user.email == "admin@example.com"
        assert admin_membership_db.inviter.email == "assigner@example.com"

        # Test patient assignment relationships
        group_patient_db = sqlite_session.query(GroupPatient).first()
        assert group_patient_db is not None
        assert group_patient_db.group.name == "Relationship Test Group"
        assert group_patient_db.patient.name == "Test Patient"
        assert group_patient_db.assigner.email == "assigner@example.com"

        # Test invitation relationships
        invitation_db = sqlite_session.query(GroupInvitation).first()
        assert invitation_db is not None
        assert invitation_db.group.name == "Relationship Test Group"
        assert invitation_db.invited_by.email == "admin@example.com"

    def test_cascade_delete_group(self, sqlite_session):
        """Test that deleting a group cascades to its memberships, patient assignments, and invitations."""
        # Create test users
        user1 = User(
            email="cascade1@example.com",
            name="Cascade User 1",
            role="doctor"
        )
        user2 = User(
            email="cascade2@example.com",
            name="Cascade User 2",
            role="doctor"
        )
        assigner = User(
            email="cascade_assigner@example.com",
            name="Cascade Assigner",
            role="doctor"
        )
        patient_user = User(
            email="cascade_patient@example.com",
            name="Cascade Patient",
            role="patient"
        )
        sqlite_session.add_all([user1, user2, assigner, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Cascade Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create a group
        group = Group(
            name="Cascade Delete Group",
            description="A test group for cascade delete"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create memberships
        membership1 = GroupMembership(
            group_id=group.id,
            user_id=user1.user_id,
            role="admin",
            invited_by=assigner.user_id
        )
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=user2.user_id,
            role="member",
            invited_by=assigner.user_id
        )
        sqlite_session.add_all([membership1, membership2])

        # Create patient assignment
        group_patient = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=assigner.user_id
        )
        sqlite_session.add(group_patient)

        # Create invitation
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user1.user_id,
            email="cascade_invitee@example.com",
            role="member",
            token="cascade-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Verify records exist
        memberships_before = sqlite_session.query(GroupMembership).filter_by(group_id=group.id).count()
        patients_before = sqlite_session.query(GroupPatient).filter_by(group_id=group.id).count()
        invitations_before = sqlite_session.query(GroupInvitation).filter_by(group_id=group.id).count()
        assert memberships_before == 2
        assert patients_before == 1
        assert invitations_before == 1

        # Delete the group
        sqlite_session.delete(group)
        sqlite_session.commit()

        # Verify records were cascaded
        memberships_after = sqlite_session.query(GroupMembership).filter_by(group_id=group.id).count()
        patients_after = sqlite_session.query(GroupPatient).filter_by(group_id=group.id).count()
        invitations_after = sqlite_session.query(GroupInvitation).filter_by(group_id=group.id).count()
        assert memberships_after == 0
        assert patients_after == 0
        assert invitations_after == 0

    def test_group_invitation_status_properties(self, sqlite_session):
        """Test the status properties of GroupInvitation."""
        # Create test user
        user = User(
            email="status_test@example.com",
            name="Status Test User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Status Test Group",
            description="A test group for status testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Test pending invitation
        pending_invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="pending@example.com",
            role="member",
            token="pending-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(pending_invitation)
        sqlite_session.commit()

        assert pending_invitation.is_pending == True
        assert pending_invitation.is_expired == False
        assert pending_invitation.is_accepted == False
        assert pending_invitation.is_declined == False
        assert pending_invitation.is_revoked == False

        # Test accepted invitation
        accepted_invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="accepted@example.com",
            role="member",
            token="accepted-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7),
            accepted_at=datetime.utcnow()
        )
        sqlite_session.add(accepted_invitation)
        sqlite_session.commit()

        assert accepted_invitation.is_pending == False
        assert accepted_invitation.is_expired == False
        assert accepted_invitation.is_accepted == True
        assert accepted_invitation.is_declined == False
        assert accepted_invitation.is_revoked == False

        # Test declined invitation
        declined_invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="declined@example.com",
            role="member",
            token="declined-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7),
            declined_at=datetime.utcnow()
        )
        sqlite_session.add(declined_invitation)
        sqlite_session.commit()

        assert declined_invitation.is_pending == False
        assert declined_invitation.is_expired == False
        assert declined_invitation.is_accepted == False
        assert declined_invitation.is_declined == True
        assert declined_invitation.is_revoked == False

        # Test revoked invitation
        revoked_invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="revoked@example.com",
            role="member",
            token="revoked-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7),
            revoked_at=datetime.utcnow()
        )
        sqlite_session.add(revoked_invitation)
        sqlite_session.commit()

        assert revoked_invitation.is_pending == False
        assert revoked_invitation.is_expired == False
        assert revoked_invitation.is_accepted == False
        assert revoked_invitation.is_declined == False
        assert revoked_invitation.is_revoked == True

        # Test expired invitation
        expired_invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="expired@example.com",
            role="member",
            token="expired-token-123",
            expires_at=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
        )
        sqlite_session.add(expired_invitation)
        sqlite_session.commit()

        assert expired_invitation.is_pending == False
        assert expired_invitation.is_expired == True
        assert expired_invitation.is_accepted == False
        assert expired_invitation.is_declined == False
        assert expired_invitation.is_revoked == False

    def test_group_invitation_action_methods(self, sqlite_session):
        """Test the action methods of GroupInvitation."""
        # Create test user
        user = User(
            email="action_test@example.com",
            name="Action Test User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Action Test Group",
            description="A test group for action testing"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create invitation
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="action@example.com",
            role="member",
            token="action-token-123",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Test accept method
        assert invitation.is_pending == True
        invitation.accept()
        assert invitation.is_pending == False
        assert invitation.is_accepted == True
        assert invitation.accepted_at is not None

        # Test decline method
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="action2@example.com",
            role="member",
            token="action-token-456",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation2)
        sqlite_session.commit()

        assert invitation2.is_pending == True
        invitation2.decline()
        assert invitation2.is_pending == False
        assert invitation2.is_declined == True
        assert invitation2.declined_at is not None

        # Test revoke method
        invitation3 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="action3@example.com",
            role="member",
            token="action-token-789",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation3)
        sqlite_session.commit()

        assert invitation3.is_pending == True
        invitation3.revoke()
        assert invitation3.is_pending == False
        assert invitation3.is_revoked == True
        assert invitation3.revoked_at is not None

    def test_group_limits_enforcement(self, sqlite_session):
        """Test that group limits are enforced."""
        # Create test user
        user = User(
            email="limits_test@example.com",
            name="Limits Test User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create a group with small limits
        group = Group(
            name="Limits Test Group",
            description="A test group for limits",
            max_patients=2,
            max_members=2
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Add user as admin
        admin_membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="admin",
            invited_by=user.user_id
        )
        sqlite_session.add(admin_membership)
        sqlite_session.commit()

        # Create test patients
        patient_user1 = User(
            email="patient1@example.com",
            name="Patient 1",
            role="patient"
        )
        patient_user2 = User(
            email="patient2@example.com",
            name="Patient 2",
            role="patient"
        )
        patient_user3 = User(
            email="patient3@example.com",
            name="Patient 3",
            role="patient"
        )
        sqlite_session.add_all([patient_user1, patient_user2, patient_user3])
        sqlite_session.commit()

        patient1 = Patient(
            user_id=patient_user1.user_id,
            name="Patient 1"
        )
        patient2 = Patient(
            user_id=patient_user2.user_id,
            name="Patient 2"
        )
        patient3 = Patient(
            user_id=patient_user3.user_id,
            name="Patient 3"
        )
        sqlite_session.add_all([patient1, patient2, patient3])
        sqlite_session.commit()

        # Assign first two patients (should succeed)
        assignment1 = GroupPatient(
            group_id=group.id,
            patient_id=patient1.patient_id,
            assigned_by=user.user_id
        )
        assignment2 = GroupPatient(
            group_id=group.id,
            patient_id=patient2.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add_all([assignment1, assignment2])
        sqlite_session.commit()

        # Try to assign third patient (should fail)
        assignment3 = GroupPatient(
            group_id=group.id,
            patient_id=patient3.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(assignment3)

        # This should raise an IntegrityError due to limit constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Create test members
        member_user1 = User(
            email="member1@example.com",
            name="Member 1",
            role="doctor"
        )
        member_user2 = User(
            email="member2@example.com",
            name="Member 2",
            role="doctor"
        )
        member_user3 = User(
            email="member3@example.com",
            name="Member 3",
            role="doctor"
        )
        sqlite_session.add_all([member_user1, member_user2, member_user3])
        sqlite_session.commit()

        # Add first two members (should succeed)
        membership1 = GroupMembership(
            group_id=group.id,
            user_id=member_user1.user_id,
            role="member",
            invited_by=user.user_id
        )
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=member_user2.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add_all([membership1, membership2])
        sqlite_session.commit()

        # Try to add third member (should fail)
        membership3 = GroupMembership(
            group_id=group.id,
            user_id=member_user3.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add(membership3)

        # This should raise an IntegrityError due to limit constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_group_data_integrity(self, sqlite_session):
        """Test data integrity constraints for groups."""
        # Test that group name cannot be null
        group = Group(
            # name is missing
            description="Test group without name"
        )
        sqlite_session.add(group)

        # This should raise an IntegrityError due to NOT NULL constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test that group name cannot be empty
        group2 = Group(
            name="",  # Empty name
            description="Test group with empty name"
        )
        sqlite_session.add(group2)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test that max_patients cannot be negative
        group3 = Group(
            name="Negative Patients Group",
            description="Test group with negative max_patients",
            max_patients=-1
        )
        sqlite_session.add(group3)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Test that max_members cannot be negative
        group4 = Group(
            name="Negative Members Group",
            description="Test group with negative max_members",
            max_members=-1
        )
        sqlite_session.add(group4)

        # This should raise an IntegrityError due to CHECK constraint
        with pytest.raises(IntegrityError):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()


if __name__ == "__main__":
    pytest.main([__file__])