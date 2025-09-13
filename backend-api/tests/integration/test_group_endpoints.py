"""
Integration tests for group endpoints with permission enforcement in Clinical Corvus.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch
from main import app
from database.models import User, Group, GroupMembership

# Create a test client
client = TestClient(app)

class TestGroupEndpoints:
    """Test cases for group endpoints with permission enforcement."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user."""
        user = User()
        user.user_id = 1
        user.email = "test@example.com"
        user.name = "Test User"
        return user

    @pytest.fixture
    def mock_group(self):
        """Create a mock group."""
        group = Group()
        group.id = 1
        group.name = "Test Group"
        return group

    @pytest.fixture
    def mock_admin_membership(self):
        """Create a mock admin membership."""
        membership = GroupMembership()
        membership.user_id = 1
        membership.group_id = 1
        membership.role = "admin"
        return membership

    @pytest.fixture
    def mock_member_membership(self):
        """Create a mock member membership."""
        membership = GroupMembership()
        membership.user_id = 2
        membership.group_id = 1
        membership.role = "member"
        return membership

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_create_group_success(self, mock_get_db, mock_get_current_user, mock_user):
        """Test successful group creation."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_group = Group()
        mock_group.id = 1
        mock_group.name = "Test Group"
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = mock_group

        # Act
        response = client.post("/api/groups/", json={"name": "Test Group"})

        # Assert
        assert response.status_code == 201
        assert response.json()["name"] == "Test Group"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_group, mock_admin_membership):
        """Test successful group update by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_admin_membership, mock_group, mock_group]
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = mock_group

        # Act
        response = client.put("/api/groups/1", json={"name": "Updated Group"})

        # Assert
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Group"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_group_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test group update forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.put("/api/groups/1", json={"name": "Updated Group"})

        # Assert
        assert response.status_code == 403
        assert "Only group admins can update group information" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_delete_group_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_group, mock_admin_membership):
        """Test successful group deletion by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_admin_membership, mock_group]
        mock_db.delete.return_value = None
        mock_db.commit.return_value = None

        # Act
        response = client.delete("/api/groups/1")

        # Assert
        assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_delete_group_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test group deletion forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.delete("/api/groups/1")

        # Assert
        assert response.status_code == 403
        assert "Only group admins can delete the group" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful user invitation by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_admin_membership, mock_user]

        # Mock the add_user_to_group function
        with patch('crud.groups.add_user_to_group') as mock_add_user:
            mock_membership = GroupMembership()
            mock_membership.id = 1
            mock_membership.group_id = 1
            mock_membership.user_id = 2
            mock_membership.role = "member"
            mock_add_user.return_value = mock_membership

            # Act
            response = client.post("/api/groups/1/members", json={"user_id": 2, "role": "member"})

            # Assert
            assert response.status_code == 201
            assert response.json()["user_id"] == 2

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_invite_user_to_group_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test user invitation forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.post("/api/groups/1/members", json={"user_id": 2, "role": "member"})

        # Assert
        assert response.status_code == 403
        assert "Only group admins can invite users" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_member_role_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful member role update by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_admin_membership,  # Current user is admin
            mock_member_membership  # Target user membership
        ]

        # Mock the update_group_membership function
        with patch('crud.groups.update_group_membership') as mock_update_membership:
            mock_updated_membership = GroupMembership()
            mock_updated_membership.id = 1
            mock_updated_membership.group_id = 1
            mock_updated_membership.user_id = 2
            mock_updated_membership.role = "admin"
            mock_update_membership.return_value = mock_updated_membership

            # Act
            response = client.put("/api/groups/1/members/2", json={"role": "admin"})

            # Assert
            assert response.status_code == 200
            assert response.json()["role"] == "admin"

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_update_member_role_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_membership):
        """Test member role update forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.put("/api/groups/1/members/2", json={"role": "admin"})

        # Assert
        assert response.status_code == 403
        assert "Only group admins can update member roles" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_member_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful member removal by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_admin_membership,  # Current user is admin
            mock_member_membership  # Target user membership
        ]

        # Mock the remove_user_from_group function
        with patch('crud.groups.remove_user_from_group') as mock_remove_user:
            mock_remove_user.return_value = True

            # Act
            response = client.delete("/api/groups/1/members/2")

            # Assert
            assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_member_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test member removal forbidden for member (removing another member)."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_member_membership,  # Current user is member
            mock_member_membership # Target user membership
        ]

        # Act
        response = client.delete("/api/groups/1/members/3")

        # Assert
        assert response.status_code == 403
        assert "You do not have permission to remove this member" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful patient assignment by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_admin_membership,  # Current user is admin
            Mock()  # Patient exists
        ]

        # Mock the assign_patient_to_group function
        with patch('crud.groups.assign_patient_to_group') as mock_assign_patient:
            mock_assignment = Mock()
            mock_assignment.id = 1
            mock_assignment.group_id = 1
            mock_assignment.patient_id = 1
            mock_assign_patient.return_value = mock_assignment

            # Act
            response = client.post("/api/groups/1/patients", json={"patient_id": 1})

            # Assert
            assert response.status_code == 201
            assert response.json()["patient_id"] == 1

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_assign_patient_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test patient assignment forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.post("/api/groups/1/patients", json={"patient_id": 1})

        # Assert
        assert response.status_code == 403
        assert "Only group admins can assign patients" in response.json()["detail"]

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_patient_admin_success(self, mock_get_db, mock_get_current_user, mock_user, mock_admin_membership):
        """Test successful patient removal by admin."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_admin_membership,  # Current user is admin
            Mock()  # Patient assignment exists
        ]

        # Mock the remove_patient_from_group function
        with patch('crud.groups.remove_patient_from_group') as mock_remove_patient:
            mock_remove_patient.return_value = True

            # Act
            response = client.delete("/api/groups/1/patients/1")

            # Assert
            assert response.status_code == 204

    @patch('security.get_current_user_required')
    @patch('database.get_db')
    def test_remove_patient_member_forbidden(self, mock_get_db, mock_get_current_user, mock_user, mock_member_membership):
        """Test patient removal forbidden for member."""
        # Arrange
        mock_get_current_user.return_value = mock_user
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = mock_member_membership

        # Act
        response = client.delete("/api/groups/1/patients/1")

        # Assert
        assert response.status_code == 403
        assert "Only group admins can remove patients" in response.json()["detail"]

if __name__ == "__main__":
    pytest.main([__file__])