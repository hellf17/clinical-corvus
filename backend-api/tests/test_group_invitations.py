"""
Integration tests for group invitation workflows.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from main import app
import database.models as models
from database import Base, get_db

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_group_invitations.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    """Create test database and tables."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def setup_test_data(test_db):
    """Set up test data."""
    db = TestingSessionLocal()
    
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
    invitee_user = models.User(
        email="invitee@example.com",
        name="Invitee User",
        role="doctor"
    )
    db.add_all([admin_user, member_user, invitee_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(member_user)
    db.refresh(invitee_user)
    
    # Create test group
    group = models.Group(
        name="Test Group for Integration",
        description="A test group for integration testing"
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Create group membership for admin
    admin_membership = models.GroupMembership(
        group_id=group.id,
        user_id=admin_user.user_id,
        role="admin"
    )
    db.add(admin_membership)
    
    # Create group membership for member
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=member_user.user_id,
        role="member"
    )
    db.add(member_membership)
    db.commit()
    
    yield {
        "admin_user": admin_user,
        "member_user": member_user,
        "invitee_user": invitee_user,
        "group": group
    }
    
    # Cleanup
    db.close()

def test_create_group_invitation(setup_test_data):
    """Test creating a group invitation."""
    data = setup_test_data
    group_id = data["group"].id
    admin_user_id = data["admin_user"].user_id
    
    # Login as admin (mocked)
    # In a real test, you would authenticate properly
    
    # Create invitation
    invitation_data = {
        "group_id": group_id,
        "email": "newinvitee@example.com",
        "role": "member"
    }
    
    response = client.post(
        f"/api/groups/{group_id}/invitations",
        json=invitation_data,
        headers={"Authorization": f"Bearer mock-token-for-user-{admin_user_id}"}
    )
    
    assert response.status_code == 201
    response_data = response.json()
    assert response_data["email"] == "newinvitee@example.com"
    assert response_data["role"] == "member"
    assert "token" in response_data
    assert response_data["token"] is not None

def test_list_group_invitations(setup_test_data):
    """Test listing group invitations."""
    data = setup_test_data
    group_id = data["group"].id
    admin_user_id = data["admin_user"].user_id
    
    # Create an invitation first
    invitation_data = {
        "group_id": group_id,
        "email": "listinvitee@example.com",
        "role": "member"
    }
    
    create_response = client.post(
        f"/api/groups/{group_id}/invitations",
        json=invitation_data,
        headers={"Authorization": f"Bearer mock-token-for-user-{admin_user_id}"}
    )
    
    assert create_response.status_code == 201
    
    # List invitations
    response = client.get(
        f"/api/groups/{group_id}/invitations",
        headers={"Authorization": f"Bearer mock-token-for-user-{admin_user_id}"}
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert "items" in response_data
    assert "total" in response_data
    assert response_data["total"] >= 1

def test_accept_group_invitation(setup_test_data):
    """Test accepting a group invitation."""
    data = setup_test_data
    group_id = data["group"].id
    invitee_user_id = data["invitee_user"].user_id
    
    # Create an invitation first
    db = TestingSessionLocal()
    invitation = models.GroupInvitation(
        group_id=group_id,
        invited_by_user_id=data["admin_user"].user_id,
        email="invitee@example.com",  # Same as invitee user email
        role="member",
        token="test-accept-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.close()
    
    # Accept invitation
    accept_data = {
        "token": "test-accept-token-123"
    }
    
    response = client.post(
        "/api/groups/invitations/accept",
        json=accept_data,
        headers={"Authorization": f"Bearer mock-token-for-user-{invitee_user_id}"}
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["token"] == "test-accept-token-123"
    assert response_data["accepted_at"] is not None

def test_decline_group_invitation(setup_test_data):
    """Test declining a group invitation."""
    data = setup_test_data
    group_id = data["group"].id
    
    # Create an invitation first
    db = TestingSessionLocal()
    invitation = models.GroupInvitation(
        group_id=group_id,
        invited_by_user_id=data["admin_user"].user_id,
        email="decline@example.com",
        role="member",
        token="test-decline-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.close()
    
    # Decline invitation
    decline_data = {
        "token": "test-decline-token-123"
    }
    
    response = client.post(
        "/api/groups/invitations/decline",
        json=decline_data,
        headers={"Authorization": f"Bearer mock-token-for-any-user"}
    )
    
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["token"] == "test-decline-token-123"
    assert response_data["declined_at"] is not None

def test_revoke_group_invitation(setup_test_data):
    """Test revoking a group invitation."""
    data = setup_test_data
    group_id = data["group"].id
    admin_user_id = data["admin_user"].user_id
    
    # Create an invitation first
    db = TestingSessionLocal()
    invitation = models.GroupInvitation(
        group_id=group_id,
        invited_by_user_id=admin_user_id,
        email="revoke@example.com",
        role="member",
        token="test-revoke-token-123",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    invitation_id = invitation.id
    db.close()
    
    # Revoke invitation
    response = client.delete(
        f"/api/groups/{group_id}/invitations/{invitation_id}",
        headers={"Authorization": f"Bearer mock-token-for-user-{admin_user_id}"}
    )
    
    assert response.status_code == 204

def test_non_admin_cannot_create_invitation(setup_test_data):
    """Test that non-admin users cannot create invitations."""
    data = setup_test_data
    group_id = data["group"].id
    member_user_id = data["member_user"].user_id
    
    # Try to create invitation as member
    invitation_data = {
        "group_id": group_id,
        "email": "unauthorized@example.com",
        "role": "member"
    }
    
    response = client.post(
        f"/api/groups/{group_id}/invitations",
        json=invitation_data,
        headers={"Authorization": f"Bearer mock-token-for-user-{member_user_id}"}
    )
    
    # This should fail with 403 Forbidden
    assert response.status_code == 403

def test_expired_invitation_cannot_be_accepted(setup_test_data):
    """Test that expired invitations cannot be accepted."""
    data = setup_test_data
    group_id = data["group"].id
    invitee_user_id = data["invitee_user"].user_id
    
    # Create an expired invitation
    db = TestingSessionLocal()
    invitation = models.GroupInvitation(
        group_id=group_id,
        invited_by_user_id=data["admin_user"].user_id,
        email="invitee@example.com",
        role="member",
        token="test-expired-token-123",
        expires_at=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
    )
    db.add(invitation)
    db.commit()
    db.close()
    
    # Try to accept expired invitation
    accept_data = {
        "token": "test-expired-token-123"
    }
    
    response = client.post(
        "/api/groups/invitations/accept",
        json=accept_data,
        headers={"Authorization": f"Bearer mock-token-for-user-{invitee_user_id}"}
    )
    
    # This should fail with 400 Bad Request
    assert response.status_code == 400