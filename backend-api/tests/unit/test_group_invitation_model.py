"""
Tests for group invitation database models using SQLAlchemy ORM.
"""

import pytest
import sys
import os
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models


def test_group_invitation_model_creation(sqlite_session):
    """Test creating a GroupInvitation model instance."""
    # Create test user
    user = models.User(
        email="inviter@example.com",
        name="Test Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Test Group for Invitation",
        description="A test group for invitation testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create group invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="invitee@example.com",
        role="member",
        token="test-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Query the invitation
    db_invitation = sqlite_session.query(models.GroupInvitation).first()
    
    # Assertions
    assert db_invitation is not None
    assert db_invitation.group_id == group.id
    assert db_invitation.invited_by_user_id == user.user_id
    assert db_invitation.email == "invitee@example.com"
    assert db_invitation.role == "member"
    assert db_invitation.token == "test-token-123"
    assert db_invitation.expires_at is not None
    assert db_invitation.accepted_at is None
    assert db_invitation.declined_at is None
    assert db_invitation.revoked_at is None
    assert db_invitation.created_at is not None
    assert db_invitation.id is not None


def test_group_invitation_unique_token_constraint(sqlite_session):
    """Test that invitation token must be unique."""
    # Create test user
    user = models.User(
        email="unique_inviter@example.com",
        name="Unique Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Unique Token Group",
        description="A test group for unique token testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create first invitation
    invitation1 = models.GroupInvitation(
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
    invitation2 = models.GroupInvitation(
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


def test_group_invitation_status_properties(sqlite_session):
    """Test the status properties of GroupInvitation."""
    # Create test user
    user = models.User(
        email="status_inviter@example.com",
        name="Status Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Status Test Group",
        description="A test group for status testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Test pending invitation
    pending_invitation = models.GroupInvitation(
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
    accepted_invitation = models.GroupInvitation(
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
    declined_invitation = models.GroupInvitation(
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
    revoked_invitation = models.GroupInvitation(
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
    expired_invitation = models.GroupInvitation(
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


def test_group_invitation_action_methods(sqlite_session):
    """Test the action methods of GroupInvitation."""
    # Create test user
    user = models.User(
        email="action_inviter@example.com",
        name="Action Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Action Test Group",
        description="A test group for action testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
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
    invitation2 = models.GroupInvitation(
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
    invitation3 = models.GroupInvitation(
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


def test_group_invitation_relationships(sqlite_session):
    """Test relationships between group invitation models."""
    # Create test users
    inviter_user = models.User(
        email="relationship_inviter@example.com",
        name="Relationship Inviter",
        role="doctor"
    )
    sqlite_session.add(inviter_user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Relationship Test Group",
        description="A test group for relationship testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create group invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=inviter_user.user_id,
        email="relationship@example.com",
        role="member",
        token="relationship-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Query and test relationships
    db_invitation = sqlite_session.query(models.GroupInvitation).first()
    assert db_invitation is not None
    assert db_invitation.group.name == "Relationship Test Group"
    assert db_invitation.invited_by.email == "relationship_inviter@example.com"


def test_group_invitation_cascade_delete(sqlite_session):
    """Test that deleting a group cascades to its invitations."""
    # Create test user
    user = models.User(
        email="cascade_inviter@example.com",
        name="Cascade Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create a group
    group = models.Group(
        name="Cascade Delete Group for Invitations",
        description="A test group for cascade delete testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitations
    invitation1 = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="cascade1@example.com",
        role="member",
        token="cascade-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    invitation2 = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="cascade2@example.com",
        role="member",
        token="cascade-token-456",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add_all([invitation1, invitation2])
    sqlite_session.commit()
    
    # Verify records exist
    invitations_before = sqlite_session.query(models.GroupInvitation).filter_by(group_id=group.id).count()
    assert invitations_before == 2
    
    # Delete the group
    sqlite_session.delete(group)
    sqlite_session.commit()
    
    # Verify records were cascaded
    invitations_after = sqlite_session.query(models.GroupInvitation).filter_by(group_id=group.id).count()
    assert invitations_after == 0