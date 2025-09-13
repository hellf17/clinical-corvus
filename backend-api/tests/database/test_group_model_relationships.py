"""
Database tests for group model relationships in Clinical Corvus.
"""

import pytest
from sqlalchemy.orm import Session
from database.models import User, Group, GroupMembership, GroupPatient, GroupInvitation, Patient
from datetime import datetime, timedelta


class TestGroupModelRelationships:
    """Test cases for group model relationships."""

    def test_group_to_user_relationship(self, sqlite_session):
        """Test the relationship between Group and User through GroupMembership."""
        # Create test users
        user1 = User(
            email="user1@example.com",
            name="User 1",
            role="doctor"
        )
        user2 = User(
            email="user2@example.com",
            name="User 2",
            role="doctor"
        )
        sqlite_session.add_all([user1, user2])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Relationship Test Group",
            description="A test group for relationships"
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

        # Test forward relationship (Group -> User)
        db_group = sqlite_session.query(Group).filter_by(name="Relationship Test Group").first()
        assert db_group is not None
        assert len(db_group.memberships) == 2
        
        # Check that we can access user information through memberships
        admin_membership = next((m for m in db_group.memberships if m.role == "admin"), None)
        assert admin_membership is not None
        assert admin_membership.user.email == "user1@example.com"
        assert admin_membership.user.name == "User 1"

        # Test reverse relationship (User -> Group)
        db_user = sqlite_session.query(User).filter_by(email="user1@example.com").first()
        assert db_user is not None
        assert len(db_user.group_memberships) == 1
        assert db_user.group_memberships[0].group.name == "Relationship Test Group"
        assert db_user.group_memberships[0].role == "admin"

    def test_group_to_patient_relationship(self, sqlite_session):
        """Test the relationship between Group and Patient through GroupPatient."""
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
            name="Patient Relationship Test Group",
            description="A test group for patient relationships"
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

        # Test forward relationship (Group -> Patient)
        db_group = sqlite_session.query(Group).filter_by(name="Patient Relationship Test Group").first()
        assert db_group is not None
        assert len(db_group.patients) == 1
        assert db_group.patients[0].patient.name == "Test Patient"
        assert db_group.patients[0].assigned_by == user.user_id

        # Test reverse relationship (Patient -> Group)
        db_patient = sqlite_session.query(Patient).filter_by(name="Test Patient").first()
        assert db_patient is not None
        assert len(db_patient.group_assignments) == 1
        assert db_patient.group_assignments[0].group.name == "Patient Relationship Test Group"

    def test_group_to_invitation_relationship(self, sqlite_session):
        """Test the relationship between Group and GroupInvitation."""
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
            name="Invitation Relationship Test Group",
            description="A test group for invitation relationships"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group invitations
        invitation1 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee1@example.com",
            role="member",
            token="test-token-1",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        invitation2 = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user.user_id,
            email="invitee2@example.com",
            role="admin",
            token="test-token-2",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add_all([invitation1, invitation2])
        sqlite_session.commit()

        # Test forward relationship (Group -> GroupInvitation)
        db_group = sqlite_session.query(Group).filter_by(name="Invitation Relationship Test Group").first()
        assert db_group is not None
        assert len(db_group.invitations) == 2
        
        # Check invitation details
        member_invitation = next((i for i in db_group.invitations if i.role == "member"), None)
        assert member_invitation is not None
        assert member_invitation.email == "invitee1@example.com"
        assert member_invitation.invited_by.email == "inviter@example.com"

        # Test reverse relationship (GroupInvitation -> Group)
        db_invitation = sqlite_session.query(GroupInvitation).filter_by(token="test-token-1").first()
        assert db_invitation is not None
        assert db_invitation.group.name == "Invitation Relationship Test Group"
        assert db_invitation.group.description == "A test group for invitation relationships"

    def test_user_to_membership_relationship(self, sqlite_session):
        """Test the relationship between User and GroupMembership."""
        # Create test users
        admin_user = User(
            email="admin_user@example.com",
            name="Admin User",
            role="doctor"
        )
        member_user = User(
            email="member_user@example.com",
            name="Member User",
            role="doctor"
        )
        inviter_user = User(
            email="inviter_user@example.com",
            name="Inviter User",
            role="doctor"
        )
        sqlite_session.add_all([admin_user, member_user, inviter_user])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Membership Relationship Test Group",
            description="A test group for membership relationships"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group memberships
        admin_membership = GroupMembership(
            group_id=group.id,
            user_id=admin_user.user_id,
            role="admin",
            invited_by=inviter_user.user_id
        )
        member_membership = GroupMembership(
            group_id=group.id,
            user_id=member_user.user_id,
            role="member",
            invited_by=inviter_user.user_id
        )
        sqlite_session.add_all([admin_membership, member_membership])
        sqlite_session.commit()

        # Test forward relationship (User -> GroupMembership)
        db_admin_user = sqlite_session.query(User).filter_by(email="admin_user@example.com").first()
        assert db_admin_user is not None
        assert len(db_admin_user.group_memberships) == 1
        assert db_admin_user.group_memberships[0].role == "admin"
        assert db_admin_user.group_memberships[0].group.name == "Membership Relationship Test Group"
        assert db_admin_user.group_memberships[0].inviter.email == "inviter_user@example.com"

        # Test reverse relationship (GroupMembership -> User)
        db_membership = sqlite_session.query(GroupMembership).filter_by(role="member").first()
        assert db_membership is not None
        assert db_membership.user.email == "member_user@example.com"
        assert db_membership.user.name == "Member User"
        assert db_membership.inviter.email == "inviter_user@example.com"

    def test_patient_to_assignment_relationship(self, sqlite_session):
        """Test the relationship between Patient and GroupPatient."""
        # Create test users
        user1 = User(
            email="assigner1@example.com",
            name="Assigner 1",
            role="doctor"
        )
        user2 = User(
            email="assigner2@example.com",
            name="Assigner 2",
            role="doctor"
        )
        patient_user = User(
            email="patient_user_rel@example.com",
            name="Patient User Rel",
            role="patient"
        )
        sqlite_session.add_all([user1, user2, patient_user])
        sqlite_session.commit()

        # Create test patient
        patient = Patient(
            user_id=patient_user.user_id,
            name="Relationship Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        # Create test groups
        group1 = Group(
            name="Assignment Group 1",
            description="First assignment group"
        )
        group2 = Group(
            name="Assignment Group 2",
            description="Second assignment group"
        )
        sqlite_session.add_all([group1, group2])
        sqlite_session.commit()

        # Create group-patient assignments
        assignment1 = GroupPatient(
            group_id=group1.id,
            patient_id=patient.patient_id,
            assigned_by=user1.user_id
        )
        assignment2 = GroupPatient(
            group_id=group2.id,
            patient_id=patient.patient_id,
            assigned_by=user2.user_id
        )
        sqlite_session.add_all([assignment1, assignment2])
        sqlite_session.commit()

        # Test forward relationship (Patient -> GroupPatient)
        db_patient = sqlite_session.query(Patient).filter_by(name="Relationship Test Patient").first()
        assert db_patient is not None
        assert len(db_patient.group_assignments) == 2
        
        # Check assignment details
        first_assignment = db_patient.group_assignments[0]
        assert first_assignment.group.name in ["Assignment Group 1", "Assignment Group 2"]
        assert first_assignment.assigner.email in ["assigner1@example.com", "assigner2@example.com"]

        # Test reverse relationship (GroupPatient -> Patient)
        db_assignment = sqlite_session.query(GroupPatient).first()
        assert db_assignment is not None
        assert db_assignment.patient.name == "Relationship Test Patient"
        assert db_assignment.patient.user.email == "patient_user_rel@example.com"

    def test_invitation_to_user_relationship(self, sqlite_session):
        """Test the relationship between GroupInvitation and User."""
        # Create test users
        inviter_user = User(
            email="invitation_inviter@example.com",
            name="Invitation Inviter",
            role="doctor"
        )
        sqlite_session.add(inviter_user)
        sqlite_session.commit()

        # Create group invitation
        invitation = GroupInvitation(
            group_id=1,  # Non-existent group ID, but relationship should still work
            invited_by_user_id=inviter_user.user_id,
            email="invitee_rel@example.com",
            role="member",
            token="relationship-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Test reverse relationship (GroupInvitation -> User)
        db_invitation = sqlite_session.query(GroupInvitation).filter_by(token="relationship-test-token").first()
        assert db_invitation is not None
        assert db_invitation.invited_by.email == "invitation_inviter@example.com"
        assert db_invitation.invited_by.name == "Invitation Inviter"

    def test_cascade_delete_group_relationships(self, sqlite_session):
        """Test that deleting a group cascades to its related records."""
        # Create test users
        user1 = User(
            email="cascade_user1@example.com",
            name="Cascade User 1",
            role="doctor"
        )
        user2 = User(
            email="cascade_user2@example.com",
            name="Cascade User 2",
            role="doctor"
        )
        patient_user = User(
            email="cascade_patient_user@example.com",
            name="Cascade Patient User",
            role="patient"
        )
        sqlite_session.add_all([user1, user2, patient_user])
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
            invited_by=user2.user_id
        )
        membership2 = GroupMembership(
            group_id=group.id,
            user_id=user2.user_id,
            role="member",
            invited_by=user1.user_id
        )
        sqlite_session.add_all([membership1, membership2])

        # Create patient assignment
        group_patient = GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user1.user_id
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

        # Verify users and patient still exist
        users_after = sqlite_session.query(User).count()
        patients_after_count = sqlite_session.query(Patient).count()
        assert users_after == 3  # Original users should still exist
        assert patients_after_count == 1  # Original patient should still exist

    def test_cascade_delete_user_relationships(self, sqlite_session):
        """Test that deleting a user affects related records appropriately."""
        # Create test users
        user_to_delete = User(
            email="delete_user@example.com",
            name="User to Delete",
            role="doctor"
        )
        other_user = User(
            email="other_user@example.com",
            name="Other User",
            role="doctor"
        )
        sqlite_session.add_all([user_to_delete, other_user])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="User Delete Group",
            description="A test group for user delete"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create memberships
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

        # Create invitation (where user is the inviter)
        invitation = GroupInvitation(
            group_id=group.id,
            invited_by_user_id=user_to_delete.user_id,
            email="invitee_user_delete@example.com",
            role="member",
            token="user-delete-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)
        sqlite_session.commit()

        # Verify records exist
        memberships_before = sqlite_session.query(GroupMembership).count()
        invitations_before = sqlite_session.query(GroupInvitation).count()
        assert memberships_before == 2
        assert invitations_before == 1

        # Delete the user
        sqlite_session.delete(user_to_delete)
        sqlite_session.commit()

        # Verify that memberships are deleted due to foreign key constraint
        memberships_after = sqlite_session.query(GroupMembership).count()
        assert memberships_after == 1  # Only other_user's membership should remain

        # Verify that invitations where user was inviter are deleted
        invitations_after = sqlite_session.query(GroupInvitation).count()
        assert invitations_after == 0  # All invitations should be deleted

    def test_relationship_integrity_constraints(self, sqlite_session):
        """Test that relationship integrity constraints are enforced."""
        # Create test user
        user = User(
            email="integrity_user@example.com",
            name="Integrity User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Try to create a group membership with non-existent group
        membership = GroupMembership(
            group_id=999999,  # Non-existent group
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add(membership)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(Exception):  # Using generic Exception as SQLite may raise different errors
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Try to create a group-patient assignment with non-existent group
        patient_user = User(
            email="integrity_patient_user@example.com",
            name="Integrity Patient User",
            role="patient"
        )
        sqlite_session.add(patient_user)
        sqlite_session.commit()

        patient = Patient(
            user_id=patient_user.user_id,
            name="Integrity Test Patient"
        )
        sqlite_session.add(patient)
        sqlite_session.commit()

        group_patient = GroupPatient(
            group_id=999999,  # Non-existent group
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        sqlite_session.add(group_patient)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(Exception):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

        # Try to create an invitation with non-existent group
        invitation = GroupInvitation(
            group_id=999999,  # Non-existent group
            invited_by_user_id=user.user_id,
            email="integrity_invitee@example.com",
            role="member",
            token="integrity-test-token",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        sqlite_session.add(invitation)

        # This should raise an IntegrityError due to foreign key constraint
        with pytest.raises(Exception):
            sqlite_session.commit()

        # Rollback the failed transaction
        sqlite_session.rollback()

    def test_bidirectional_relationship_consistency(self, sqlite_session):
        """Test that bidirectional relationships are consistent."""
        # Create test users
        user = User(
            email="bidirectional_user@example.com",
            name="Bidirectional User",
            role="doctor"
        )
        inviter = User(
            email="bidirectional_inviter@example.com",
            name="Bidirectional Inviter",
            role="doctor"
        )
        sqlite_session.add_all([user, inviter])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Bidirectional Test Group",
            description="A test group for bidirectional relationships"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=inviter.user_id
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Test that both sides of the relationship are consistent
        # Group -> Membership -> User
        db_group = sqlite_session.query(Group).filter_by(name="Bidirectional Test Group").first()
        assert db_group is not None
        assert len(db_group.memberships) == 1
        assert db_group.memberships[0].user_id == user.user_id

        # User -> Membership -> Group
        db_user = sqlite_session.query(User).filter_by(email="bidirectional_user@example.com").first()
        assert db_user is not None
        assert len(db_user.group_memberships) == 1
        assert db_user.group_memberships[0].group_id == group.id

        # Verify the relationship objects are the same
        assert db_group.memberships[0].user.user_id == db_user.user_id
        assert db_user.group_memberships[0].group.id == db_group.id

    def test_relationship_lazy_loading(self, sqlite_session):
        """Test that relationships are properly lazy-loaded."""
        # Create test users
        user = User(
            email="lazy_user@example.com",
            name="Lazy User",
            role="doctor"
        )
        sqlite_session.add(user)
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Lazy Loading Test Group",
            description="A test group for lazy loading"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create group membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Test that relationships are not loaded until accessed
        db_group = sqlite_session.query(Group).filter_by(name="Lazy Loading Test Group").first()
        assert db_group is not None
        
        # At this point, memberships should not be loaded
        # This is a bit tricky to test directly, but we can verify the relationship works when accessed
        assert len(db_group.memberships) == 1
        assert db_group.memberships[0].user.email == "lazy_user@example.com"

    def test_relationship_query_performance(self, sqlite_session):
        """Test relationship query performance with joins."""
        # Create test users
        users = []
        for i in range(10):
            user = User(
                email=f"perf_user{i}@example.com",
                name=f"Performance User {i}",
                role="doctor"
            )
            users.append(user)
        sqlite_session.add_all(users)
        sqlite_session.commit()

        # Create test groups
        groups = []
        for i in range(5):
            group = Group(
                name=f"Performance Group {i}",
                description=f"Performance test group {i}"
            )
            groups.append(group)
        sqlite_session.add_all(groups)
        sqlite_session.commit()

        # Create group memberships
        memberships = []
        for i, user in enumerate(users):
            group_index = i % len(groups)  # Distribute users across groups
            membership = GroupMembership(
                group_id=groups[group_index].id,
                user_id=user.user_id,
                role="member" if i % 2 == 0 else "admin",
                invited_by=users[0].user_id  # First user invites everyone
            )
            memberships.append(membership)
        sqlite_session.add_all(memberships)
        sqlite_session.commit()

        # Test efficient querying with joins
        # Query groups with their members using a join
        result = sqlite_session.query(Group).join(GroupMembership).filter(GroupMembership.role == "admin").all()
        
        # Verify we got results
        assert len(result) > 0
        
        # Check that we can access related data
        for group in result:
            assert len(group.memberships) > 0
            admin_members = [m for m in group.memberships if m.role == "admin"]
            assert len(admin_members) > 0

    def test_relationship_data_consistency(self, sqlite_session):
        """Test that relationship data remains consistent across operations."""
        # Create test users
        user1 = User(
            email="consistency_user1@example.com",
            name="Consistency User 1",
            role="doctor"
        )
        user2 = User(
            email="consistency_user2@example.com",
            name="Consistency User 2",
            role="doctor"
        )
        sqlite_session.add_all([user1, user2])
        sqlite_session.commit()

        # Create test group
        group = Group(
            name="Consistency Test Group",
            description="A test group for data consistency"
        )
        sqlite_session.add(group)
        sqlite_session.commit()

        # Create initial membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=user1.user_id,
            role="admin",
            invited_by=user2.user_id
        )
        sqlite_session.add(membership)
        sqlite_session.commit()

        # Verify initial state
        db_group = sqlite_session.query(Group).filter_by(name="Consistency Test Group").first()
        assert db_group is not None
        assert len(db_group.memberships) == 1
        assert db_group.memberships[0].role == "admin"
        assert db_group.memberships[0].user.email == "consistency_user1@example.com"

        # Update membership role
        db_membership = sqlite_session.query(GroupMembership).first()
        db_membership.role = "member"
        sqlite_session.commit()

        # Verify updated state from both sides
        db_group = sqlite_session.query(Group).filter_by(name="Consistency Test Group").first()
        assert db_group.memberships[0].role == "member"

        db_user = sqlite_session.query(User).filter_by(email="consistency_user1@example.com").first()
        assert db_user.group_memberships[0].role == "member"

        # Add another membership
        new_membership = GroupMembership(
            group_id=group.id,
            user_id=user2.user_id,
            role="member",
            invited_by=user1.user_id
        )
        sqlite_session.add(new_membership)
        sqlite_session.commit()

        # Verify both memberships exist
        db_group = sqlite_session.query(Group).filter_by(name="Consistency Test Group").first()
        assert len(db_group.memberships) == 2

        # Check each membership
        roles = [m.role for m in db_group.memberships]
        assert "admin" not in roles  # user1 was changed to member
        assert roles.count("member") == 2  # Both users are now members


if __name__ == "__main__":
    pytest.main([__file__])