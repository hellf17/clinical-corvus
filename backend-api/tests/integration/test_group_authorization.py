"""
Integration tests for group-based authorization in Clinical Corvus.
This module tests the group authorization flows and access control mechanisms.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from main import app
from database import get_db
from models import User, Group, GroupMembership, Patient, GroupPatient
from schemas.group import GroupRole

# Create a test client
client = TestClient(app)


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    with patch('database.get_db') as mock_get_db:
        mock_db = MagicMock(spec=Session)
        mock_get_db.return_value = mock_db
        yield mock_db


@pytest.fixture
def mock_current_user():
    """Create a mock current user."""
    user = MagicMock(spec=User)
    user.user_id = 1
    user.email = "test@example.com"
    user.name = "Test User"
    user.role = "doctor"
    return user


@pytest.fixture
def mock_group():
    """Create a mock group."""
    group = MagicMock(spec=Group)
    group.id = 1
    group.name = "Test Group"
    group.description = "A test group for testing"
    return group


@pytest.fixture
def mock_group_membership():
    """Create a mock group membership."""
    membership = MagicMock(spec=GroupMembership)
    membership.group_id = 1
    membership.user_id = 1
    membership.role = GroupRole.MEMBER
    return membership


@pytest.fixture
def mock_patient():
    """Create a mock patient."""
    patient = MagicMock(spec=Patient)
    patient.patient_id = 1
    patient.name = "Test Patient"
    patient.user_id = 2
    return patient


@pytest.fixture
def mock_group_patient():
    """Create a mock group-patient assignment."""
    group_patient = MagicMock(spec=GroupPatient)
    group_patient.group_id = 1
    group_patient.patient_id = 1
    return group_patient


def test_create_group_success(
    mock_db_session, 
    mock_current_user
):
    """Test successful group creation."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.create_group') as mock_create_group:
            mock_create_group.return_value = MagicMock(id=1, name="Test Group")
            
            # Act
            response = client.post(
                "/api/groups/",
                json={
                    "name": "Test Group",
                    "description": "A test group"
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 201
            assert response.json()["name"] == "Test Group"


def test_create_group_unauthorized():
    """Test group creation without authentication."""
    # Act
    response = client.post(
        "/api/groups/",
        json={
            "name": "Test Group",
            "description": "A test group"
        }
    )
    
    # Assert
    assert response.status_code == 401


def test_list_groups_success(
    mock_db_session, 
    mock_current_user
):
    """Test successful group listing."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.get_user_groups') as mock_get_user_groups:
            mock_get_user_groups.return_value = ([MagicMock()], 1)
            
            # Act
            response = client.get(
                "/api/groups/",
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 200
            assert "items" in response.json()


def test_get_group_success(
    mock_db_session, 
    mock_current_user, 
    mock_group
):
    """Test successful group retrieval."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=True):
            with patch('routers.groups.groups_crud.get_group_with_members_and_patients') as mock_get_group:
                mock_get_group.return_value = mock_group
                
                # Act
                response = client.get(
                    "/api/groups/1",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == 200
                assert response.json()["id"] == 1


def test_get_group_not_member(
    mock_db_session, 
    mock_current_user
):
    """Test group retrieval when user is not a member."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=False):
            
            # Act
            response = client.get(
                "/api/groups/1",
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 403
            assert "not a member" in response.json()["detail"]


def test_update_group_success(
    mock_db_session, 
    mock_current_user, 
    mock_group
):
    """Test successful group update."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=True):
            with patch('routers.groups.groups_crud.is_user_admin_of_group', return_value=True):
                with patch('routers.groups.groups_crud.update_group') as mock_update_group:
                    mock_update_group.return_value = mock_group
                    
                    # Act
                    response = client.put(
                        "/api/groups/1",
                        json={
                            "name": "Updated Group Name",
                            "description": "Updated description"
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert response.status_code == 200
                    assert response.json()["id"] == 1


def test_update_group_not_admin(
    mock_db_session, 
    mock_current_user
):
    """Test group update when user is not an admin."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=True):
            with patch('routers.groups.groups_crud.is_user_admin_of_group', return_value=False):
                
                # Act
                response = client.put(
                    "/api/groups/1",
                    json={
                        "name": "Updated Group Name",
                        "description": "Updated description"
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == 403
                assert "admin" in response.json()["detail"]


def test_delete_group_success(
    mock_db_session, 
    mock_current_user
):
    """Test successful group deletion."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=True):
            with patch('routers.groups.groups_crud.is_user_admin_of_group', return_value=True):
                with patch('routers.groups.groups_crud.delete_group', return_value=True):
                    
                    # Act
                    response = client.delete(
                        "/api/groups/1",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert response.status_code == 204


def test_delete_group_not_admin(
    mock_db_session, 
    mock_current_user
):
    """Test group deletion when user is not an admin."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.groups_crud.is_user_member_of_group', return_value=True):
            with patch('routers.groups.groups_crud.is_user_admin_of_group', return_value=False):
                
                # Act
                response = client.delete(
                    "/api/groups/1",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == 403
                assert "admin" in response.json()["detail"]


def test_add_user_to_group_success(
    mock_db_session, 
    mock_current_user, 
    mock_group_membership
):
    """Test successful addition of user to group."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_invite_members', return_value=True):
            with patch('routers.groups.groups_crud.add_user_to_group') as mock_add_user:
                with patch('routers.groups.invalidate_user_group_cache'):
                    mock_add_user.return_value = mock_group_membership
                    
                    # Act
                    response = client.post(
                        "/api/groups/1/members",
                        json={
                            "user_id": 2,
                            "role": "member"
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert response.status_code == 201
                    assert response.json()["group_id"] == 1


def test_add_user_to_group_not_authorized(
    mock_db_session, 
    mock_current_user
):
    """Test addition of user to group when not authorized."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_invite_members', return_value=False):
            
            # Act
            response = client.post(
                "/api/groups/1/members",
                json={
                    "user_id": 2,
                    "role": "member"
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 403
            assert "admin" in response.json()["detail"]


def test_remove_user_from_group_success(
    mock_db_session, 
    mock_current_user
):
    """Test successful removal of user from group."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_remove_members', return_value=True):
            with patch('routers.groups.groups_crud.remove_user_from_group', return_value=True):
                with patch('routers.groups.invalidate_user_group_cache'):
                    
                    # Act
                    response = client.delete(
                        "/api/groups/1/members/2",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert response.status_code == 204


def test_remove_user_from_group_not_authorized(
    mock_db_session, 
    mock_current_user
):
    """Test removal of user from group when not authorized."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_remove_members', return_value=False):
            
            # Act
            response = client.delete(
                "/api/groups/1/members/2",
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 403
            assert "permission" in response.json()["detail"]


def test_assign_patient_to_group_success(
    mock_db_session, 
    mock_current_user,
    mock_group_patient
):
    """Test successful assignment of patient to group."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_assign_patients', return_value=True):
            with patch('routers.groups.groups_crud.assign_patient_to_group') as mock_assign_patient:
                mock_assign_patient.return_value = mock_group_patient
                
                # Act
                response = client.post(
                    "/api/groups/1/patients",
                    json={
                        "patient_id": 1
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == 201
                assert response.json()["group_id"] == 1


def test_assign_patient_to_group_not_authorized(
    mock_db_session, 
    mock_current_user
):
    """Test assignment of patient to group when not authorized."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_assign_patients', return_value=False):
            
            # Act
            response = client.post(
                "/api/groups/1/patients",
                json={
                    "patient_id": 1
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 403
            assert "admin" in response.json()["detail"]


def test_remove_patient_from_group_success(
    mock_db_session, 
    mock_current_user
):
    """Test successful removal of patient from group."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_remove_patients', return_value=True):
            with patch('routers.groups.groups_crud.remove_patient_from_group', return_value=True):
                
                # Act
                response = client.delete(
                    "/api/groups/1/patients/1",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == 204


def test_remove_patient_from_group_not_authorized(
    mock_db_session, 
    mock_current_user
):
    """Test removal of patient from group when not authorized."""
    # Arrange
    with patch('routers.groups.get_current_user_required', return_value=mock_current_user):
        with patch('routers.groups.can_user_remove_patients', return_value=False):
            
            # Act
            response = client.delete(
                "/api/groups/1/patients/1",
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == 403
            assert "admin" in response.json()["detail"]