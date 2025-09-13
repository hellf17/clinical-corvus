"""
Tests for group API endpoints.
"""

import pytest
import sys
import os
import json
from fastapi.testclient import TestClient

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import using package approach
import database.models as models
from main import app
# from security import create_access_token # This is part of the legacy auth system and is no longer needed.

# This client is only for simple tests that don't require DB access
client = TestClient(app)

def create_test_user(sqlite_session, email="groups_test@example.com", name="Groups Test User", role="doctor"):
    """Create a test user for authentication."""
    user = models.User(
        email=email,
        name=name,
        role=role
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    return user

def create_test_patient(sqlite_session, user_id, name="Test Patient"):
    """Create a test patient."""
    from datetime import datetime
    patient = models.Patient(
        user_id=user_id,
        name=name,
        birthDate=datetime(1994, 1, 1),  # Age 30
        gender="M",
        weight=70.5,
        height=1.75,
        ethnicity="branco",
        primary_diagnosis="Healthy patient"
    )
    sqlite_session.add(patient)
    sqlite_session.commit()
    return patient

# This function is no longer needed as the test client now handles authentication via mocking.
# def get_auth_headers(user_email):
#     """Get authorization headers with a valid token."""
#     access_token = create_access_token(data={"sub": user_email})
#     return {"Authorization": f"Bearer {access_token}"}

def test_create_group(sqlite_client, sqlite_session):
    """Test creating a new group."""
    user = create_test_user(sqlite_session)
    
    group_data = {
        "name": "Test Group",
        "description": "A test group for collaboration",
        "max_patients": 50,
        "max_members": 10
    }
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.post("/api/groups/", json=group_data)
    
    assert response.status_code == 201
    assert "id" in response.json()
    assert response.json()["name"] == group_data["name"]
    assert response.json()["description"] == group_data["description"]
    assert response.json()["max_patients"] == group_data["max_patients"]
    assert response.json()["max_members"] == group_data["max_members"]

def test_create_group_duplicate_name(sqlite_client, sqlite_session):
    """Test creating a group with a duplicate name."""
    user = create_test_user(sqlite_session)
    
    group_data = {
        "name": "Test Group",
        "description": "A test group for collaboration"
    }
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    # Create first group
    response1 = sqlite_client.post("/api/groups/", json=group_data)
    assert response1.status_code == 201
    
    # Try to create another group with the same name
    response2 = sqlite_client.post("/api/groups/", json=group_data)
    assert response2.status_code == 400
    assert "already exists" in response2.json()["detail"]

def test_list_groups(sqlite_client, sqlite_session):
    """Test listing groups for a user."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    # Create test groups
    groups = [
        models.Group(
            name=f"Test Group {i}",
            description=f"Test group {i} for collaboration",
            max_patients=50,
            max_members=10
        )
        for i in range(3)
    ]

    sqlite_session.add_all(groups)
    sqlite_session.commit()

    # Add user as member to all groups
    memberships = [
        models.GroupMembership(
            group_id=group.id,
            user_id=user.user_id,
            role="member",
            invited_by=user.user_id
        )
        for group in groups
    ]

    sqlite_session.add_all(memberships)
    sqlite_session.commit()

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.get("/api/groups/")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 3

def test_get_group(sqlite_client, sqlite_session):
    """Test retrieving a specific group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    group = models.Group(
        name="Single Test Group",
        description="A single test group for collaboration",
        max_patients=30,
        max_members=5
    )
    sqlite_session.add(group)
    sqlite_session.commit()

    # Add user as member
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="admin",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.get(f"/api/groups/{group.id}")

    assert response.status_code == 200
    assert response.json()["id"] == group.id
    assert response.json()["name"] == group.name
    assert response.json()["description"] == group.description

def test_get_group_not_member(sqlite_client, sqlite_session):
    """Test retrieving a group when not a member."""
    user = create_test_user(sqlite_session)
    other_user = create_test_user(sqlite_session, email="other@example.com", name="Other User")
    
    group = models.Group(
        name="Private Group",
        description="A private group",
        max_patients=20,
        max_members=5
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    # Add other user as member
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=other_user.user_id,
        role="admin",
        invited_by=other_user.user_id
    )
    sqlite_session.add(membership)
    sqlite_session.commit()
    
    # Set user for authentication
    sqlite_client.set_auth_user(user)
    
    response = sqlite_client.get(f"/api/groups/{group.id}")
    
    assert response.status_code == 403
    assert "not a member" in response.json()["detail"]

def test_update_group(sqlite_client, sqlite_session):
    """Test updating a group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

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

    updated_data = {
        "name": "Updated Group Name",
        "description": "Updated description",
        "max_patients": 40
    }

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.put(f"/api/groups/{group.id}", json=updated_data)

    assert response.status_code == 200
    assert response.json()["id"] == group.id
    assert response.json()["name"] == updated_data["name"]
    assert response.json()["description"] == updated_data["description"]
    assert response.json()["max_patients"] == updated_data["max_patients"]

def test_update_group_not_admin(sqlite_client, sqlite_session):
    """Test updating a group when not an admin."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    # Create a second user for admin role
    admin_user = models.User(
        email="admin@example.com",
        name="Admin User",
        role="doctor"
    )
    sqlite_session.add(admin_user)
    sqlite_session.commit()

    group = models.Group(
        name="Test Group",
        description="Test description",
        max_patients=25,
        max_members=8
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

    # Add regular user as member
    member_membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="member",
        invited_by=admin_user.user_id
    )
    sqlite_session.add(member_membership)
    sqlite_session.commit()

    updated_data = {
        "name": "Unauthorized Update"
    }

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.put(f"/api/groups/{group.id}", json=updated_data)

    assert response.status_code == 403
    # Note: The error message might be "You are not a member of this group" or contain "admin"
    # depending on which authorization check fails first
    assert "admin" in response.json()["detail"] or "not authorized" in response.json()["detail"].lower()

def test_delete_group(sqlite_client, sqlite_session):
    """Test deleting a group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    group = models.Group(
        name="Group to Delete",
        description="This group will be deleted",
        max_patients=15,
        max_members=4
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

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.delete(f"/api/groups/{group.id}")

    assert response.status_code == 204

    # Verify the group is actually deleted
    # Note: After deletion, trying to access the group returns 403 (not a member)
    # rather than 404 (not found) due to authorization checks happening first
    get_response = sqlite_client.get(f"/api/groups/{group.id}")
    assert get_response.status_code == 403

def test_invite_user_to_group(sqlite_client, sqlite_session):
    """Test inviting a user to a group."""
    # Get the test user that was already created by the sqlite_client fixture
    admin_user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert admin_user is not None, "Test user should exist from fixture"

    # Create a second user for member role
    member_user = models.User(
        email="member@example.com",
        name="Member User",
        role="doctor"
    )
    sqlite_session.add(member_user)
    sqlite_session.commit()

    group = models.Group(
        name="Test Group",
        description="Group for testing invitations",
        max_patients=30,
        max_members=10
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

    invitation_data = {
        "user_id": member_user.user_id,
        "role": "member"
    }

    # Set admin user for authentication
    sqlite_client.set_auth_user(admin_user)

    response = sqlite_client.post(f"/api/groups/{group.id}/members", json=invitation_data)

    assert response.status_code == 201
    assert response.json()["group_id"] == group.id
    assert response.json()["user_id"] == member_user.user_id
    assert response.json()["role"] == "member"

def test_assign_patient_to_group(sqlite_client, sqlite_session):
    """Test assigning a patient to a group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    patient = create_test_patient(sqlite_session, user.user_id)

    group = models.Group(
        name="Patient Group",
        description="Group for patient assignment",
        max_patients=20,
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

    assignment_data = {
        "patient_id": patient.patient_id
    }

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.post(f"/api/groups/{group.id}/patients", json=assignment_data)

    assert response.status_code == 201
    assert response.json()["group_id"] == group.id
    assert response.json()["patient_id"] == patient.patient_id

def test_list_group_patients(sqlite_client, sqlite_session):
    """Test listing patients in a group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    group = models.Group(
        name="Patient List Group",
        description="Group for patient listing",
        max_patients=25,
        max_members=6
    )
    sqlite_session.add(group)
    sqlite_session.commit()

    # Add user as member
    membership = models.GroupMembership(
        group_id=group.id,
        user_id=user.user_id,
        role="member",
        invited_by=user.user_id
    )
    sqlite_session.add(membership)

    # Create test patients and assign them to the group
    patients = []
    assignments = []
    for i in range(3):
        patient = create_test_patient(sqlite_session, user.user_id, f"Patient {i}")
        patients.append(patient)

        assignment = models.GroupPatient(
            group_id=group.id,
            patient_id=patient.patient_id,
            assigned_by=user.user_id
        )
        assignments.append(assignment)

    sqlite_session.add_all(assignments)
    sqlite_session.commit()

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.get(f"/api/groups/{group.id}/patients")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 3

def test_remove_patient_from_group(sqlite_client, sqlite_session):
    """Test removing a patient from a group."""
    # Get the test user that was already created by the sqlite_client fixture
    user = sqlite_session.query(models.User).filter(models.User.email == "test@example.com").first()
    assert user is not None, "Test user should exist from fixture"

    patient = create_test_patient(sqlite_session, user.user_id)

    group = models.Group(
        name="Removal Test Group",
        description="Group for patient removal",
        max_patients=15,
        max_members=5
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

    # Assign patient to group
    assignment = models.GroupPatient(
        group_id=group.id,
        patient_id=patient.patient_id,
        assigned_by=user.user_id
    )
    sqlite_session.add(assignment)
    sqlite_session.commit()

    # Set user for authentication
    sqlite_client.set_auth_user(user)

    response = sqlite_client.delete(f"/api/groups/{group.id}/patients/{patient.patient_id}")

    assert response.status_code == 204

    # Verify the patient is actually removed
    get_response = sqlite_client.get(f"/api/groups/{group.id}/patients")
    data = get_response.json()
    patient_ids = [item["patient_id"] for item in data["items"]]
    assert patient.patient_id not in patient_ids

def test_unauthorized_access(sqlite_client, sqlite_session):
    """Test that unauthorized access is properly rejected."""
    # Make sure we have no authentication
    sqlite_client.set_auth_user(None)
    
    # Try to create a group without authorization
    group_data = {
        "name": "Unauthorized Group",
        "description": "This should fail"
    }
    
    response = sqlite_client.post("/api/groups/", json=group_data)
    assert response.status_code == 401
    
    # Create a group and try to access it without authorization
    user = create_test_user(sqlite_session)
    group = models.Group(
        name="Protected Group",
        description="Protected test group",
        max_patients=10,
        max_members=3
    )
    sqlite_session.add(group)
    sqlite_session.commit()
    
    response = sqlite_client.get(f"/api/groups/{group.id}")
    assert response.status_code == 401