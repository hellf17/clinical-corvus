"""
Tests for group invitations service functions.
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import services.group_invitations as group_invitations_service
import database.models as models


def test_generate_invitation_token():
    """Test generating unique invitation tokens."""
    token1 = group_invitations_service.generate_invitation_token()
    token2 = group_invitations_service.generate_invitation_token()
    
    assert isinstance(token1, str)
    assert len(token1) > 0
    assert token1 != token2  # Should be unique


def test_get_invitation_by_id(sqlite_session):
    """Test getting an invitation by ID."""
    # Create test user
    user = models.User(
        email="get_by_id_inviter@example.com",
        name="Get By ID Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Get By ID Test Group",
        description="A test group for get by ID testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="getbyid@example.com",
        role="member",
        token="getbyid-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Test getting invitation by ID
    result = group_invitations_service.get_invitation_by_id(sqlite_session, invitation.id)
    assert result is not None
    assert result.id == invitation.id
    assert result.email == "getbyid@example.com"
    
    # Test getting non-existent invitation
    result = group_invitations_service.get_invitation_by_id(sqlite_session, 999999)
    assert result is None


def test_get_invitation_by_token(sqlite_session):
    """Test getting an invitation by token."""
    # Create test user
    user = models.User(
        email="get_by_token_inviter@example.com",
        name="Get By Token Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Get By Token Test Group",
        description="A test group for get by token testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="getbytoken@example.com",
        role="member",
        token="unique-test-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Test getting invitation by token
    result = group_invitations_service.get_invitation_by_token(sqlite_session, "unique-test-token-123")
    assert result is not None
    assert result.token == "unique-test-token-123"
    assert result.email == "getbytoken@example.com"
    
    # Test getting non-existent invitation
    result = group_invitations_service.get_invitation_by_token(sqlite_session, "non-existent-token")
    assert result is None


def test_create_group_invitation(sqlite_session):
    """Test creating a group invitation."""
    # Create test user
    user = models.User(
        email="create_inviter@example.com",
        name="Create Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Create Test Group",
        description="A test group for creation testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Test creating invitation
    invitation_data = MagicMock()
    invitation_data.group_id = group.id
    invitation_data.email = "newinvitee@example.com"
    invitation_data.role = "member"
    
    result = group_invitations_service.create_group_invitation(sqlite_session, invitation_data, user.user_id)
    
    assert result is not None
    assert result.group_id == group.id
    assert result.email == "newinvitee@example.com"
    assert result.role == "member"
    assert result.invited_by_user_id == user.user_id
    assert result.token is not None
    assert len(result.token) > 0
    assert result.expires_at is not None


def test_create_group_invitation_group_not_found(sqlite_session):
    """Test creating a group invitation with non-existent group."""
    # Create test user
    user = models.User(
        email="create_inviter2@example.com",
        name="Create Inviter 2",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Test creating invitation with non-existent group
    invitation_data = MagicMock()
    invitation_data.group_id = 999999  # Non-existent group
    invitation_data.email = "newinvitee2@example.com"
    invitation_data.role = "member"
    
    with pytest.raises(ValueError, match="Group not found"):
        group_invitations_service.create_group_invitation(sqlite_session, invitation_data, user.user_id)


def test_accept_group_invitation(sqlite_session):
    """Test accepting a group invitation."""
    # Create test users
    inviter = models.User(
        email="accept_inviter@example.com",
        name="Accept Inviter",
        role="doctor"
    )
    invitee = models.User(
        email="accept_invitee@example.com",
        name="Accept Invitee",
        role="doctor"
    )
    sqlite_session.add_all([inviter, invitee])
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Accept Test Group",
        description="A test group for acceptance testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=inviter.user_id,
        email="accept_invitee@example.com",
        role="member",
        token="accept-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Test accepting invitation
    result = group_invitations_service.accept_group_invitation(sqlite_session, "accept-token-123", invitee.user_id)
    
    assert result is not None
    assert result.token == "accept-token-123"
    assert result.accepted_at is not None
    assert result.is_accepted == True
    
    # Verify membership was created
    membership = sqlite_session.query(models.GroupMembership).filter_by(
        group_id=group.id, user_id=invitee.user_id
    ).first()
    assert membership is not None
    assert membership.role == "member"


def test_decline_group_invitation(sqlite_session):
    """Test declining a group invitation."""
    # Create test user
    user = models.User(
        email="decline_inviter@example.com",
        name="Decline Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Decline Test Group",
        description="A test group for decline testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="decline_invitee@example.com",
        role="member",
        token="decline-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Test declining invitation
    result = group_invitations_service.decline_group_invitation(sqlite_session, "decline-token-123")
    
    assert result is not None
    assert result.token == "decline-token-123"
    assert result.declined_at is not None
    assert result.is_declined == True


def test_revoke_group_invitation(sqlite_session):
    """Test revoking a group invitation."""
    # Create test user
    user = models.User(
        email="revoke_inviter@example.com",
        name="Revoke Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Revoke Test Group",
        description="A test group for revoke testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create invitation
    invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="revoke_invitee@example.com",
        role="member",
        token="revoke-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    sqlite_session.add(invitation)
    sqlite_session.commit()
    
    # Test revoking invitation
    result = group_invitations_service.revoke_group_invitation(sqlite_session, invitation.id)
    
    assert result is not None
    assert result.id == invitation.id
    assert result.revoked_at is not None
    assert result.is_revoked == True


def test_delete_expired_invitations(sqlite_session):
    """Test deleting expired invitations."""
    # Create test user
    user = models.User(
        email="cleanup_inviter@example.com",
        name="Cleanup Inviter",
        role="doctor"
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    # Create test group
    group = models.Group(
        name="Cleanup Test Group",
        description="A test group for cleanup testing"
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Create expired invitation
    expired_invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="expired@example.com",
        role="member",
        token="expired-token-123",
        expires_at=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
    )
    
    # Create active invitation
    active_invitation = models.GroupInvitation(
        group_id=group.id,
        invited_by_user_id=user.user_id,
        email="active@example.com",
        role="member",
        token="active-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)  # Expires in 7 days
    )
    
    sqlite_session.add_all([expired_invitation, active_invitation])
    sqlite_session.commit()
    
    # Verify both invitations exist
    all_invitations = sqlite_session.query(models.GroupInvitation).all()
    assert len(all_invitations) == 2
    
    # Test deleting expired invitations
    count = group_invitations_service.delete_expired_invitations(sqlite_session)
    
    assert count == 1  # Should have deleted 1 expired invitation
    
    # Verify only active invitation remains
    remaining_invitations = sqlite_session.query(models.GroupInvitation).all()
    assert len(remaining_invitations) == 1
    assert remaining_invitations[0].token == "active-token-123"