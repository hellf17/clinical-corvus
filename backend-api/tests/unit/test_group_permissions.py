"""
Unit tests for group permission utilities in Clinical Corvus.
"""

import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from database.models import GroupMembership
from utils.group_permissions import (
    is_user_admin_of_group,
    is_user_member_of_group_with_role,
    get_user_group_role,
    can_user_manage_group,
    can_user_invite_members,
    can_user_remove_members,
    can_user_change_member_role,
    can_user_assign_patients,
    can_user_remove_patients
)

class TestGroupPermissions:
    """Test cases for group permission utilities."""

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_membership(self):
        """Create a mock group membership."""
        membership = Mock(spec=GroupMembership)
        membership.role = "admin"
        return membership

    def test_is_user_admin_of_group_true(self, mock_db_session, mock_membership):
        """Test is_user_admin_of_group returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = is_user_admin_of_group(mock_db_session, user_id, group_id)

        # Assert
        assert result is True
        mock_db_session.query.assert_called_once_with(GroupMembership)
        mock_db_session.query.return_value.filter.assert_called_once()

    def test_is_user_admin_of_group_false(self, mock_db_session):
        """Test is_user_admin_of_group returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = is_user_admin_of_group(mock_db_session, user_id, group_id)

        # Assert
        assert result is False

    def test_is_user_member_of_group_with_role_true(self, mock_db_session, mock_membership):
        """Test is_user_member_of_group_with_role returns True when user has required role."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1
        required_role = "admin"

        # Act
        result = is_user_member_of_group_with_role(mock_db_session, user_id, group_id, required_role)

        # Assert
        assert result is True

    def test_is_user_member_of_group_with_role_false(self, mock_db_session):
        """Test is_user_member_of_group_with_role returns False when user doesn't have required role."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1
        required_role = "admin"

        # Act
        result = is_user_member_of_group_with_role(mock_db_session, user_id, group_id, required_role)

        # Assert
        assert result is False

    def test_get_user_group_role_with_membership(self, mock_db_session, mock_membership):
        """Test get_user_group_role returns role when user is member."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = get_user_group_role(mock_db_session, user_id, group_id)

        # Assert
        assert result == "admin"

    def test_get_user_group_role_no_membership(self, mock_db_session):
        """Test get_user_group_role returns None when user is not member."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = get_user_group_role(mock_db_session, user_id, group_id)

        # Assert
        assert result is None

    def test_can_user_manage_group_true(self, mock_db_session, mock_membership):
        """Test can_user_manage_group returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = can_user_manage_group(mock_db_session, user_id, group_id)

        # Assert
        assert result is True

    def test_can_user_manage_group_false(self, mock_db_session):
        """Test can_user_manage_group returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = can_user_manage_group(mock_db_session, user_id, group_id)

        # Assert
        assert result is False

    def test_can_user_invite_members_true(self, mock_db_session, mock_membership):
        """Test can_user_invite_members returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = can_user_invite_members(mock_db_session, user_id, group_id)

        # Assert
        assert result is True

    def test_can_user_invite_members_false(self, mock_db_session):
        """Test can_user_invite_members returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = can_user_invite_members(mock_db_session, user_id, group_id)

        # Assert
        assert result is False

    def test_can_user_remove_members_admin(self, mock_db_session, mock_membership):
        """Test can_user_remove_members returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1
        target_user_id = 2

        # Act
        result = can_user_remove_members(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is True

    def test_can_user_remove_members_self(self, mock_db_session):
        """Test can_user_remove_members returns True when user removes themselves."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1
        target_user_id = 1  # Same as user_id

        # Act
        result = can_user_remove_members(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is True

    def test_can_user_remove_members_other_member(self, mock_db_session):
        """Test can_user_remove_members returns False when member tries to remove another member."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1
        target_user_id = 2  # Different from user_id

        # Act
        result = can_user_remove_members(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is False

    def test_can_user_change_member_role_admin(self, mock_db_session, mock_membership):
        """Test can_user_change_member_role returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1
        target_user_id = 2

        # Act
        result = can_user_change_member_role(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is True

    def test_can_user_change_member_role_not_admin(self, mock_db_session):
        """Test can_user_change_member_role returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1
        target_user_id = 2

        # Act
        result = can_user_change_member_role(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is False

    def test_can_user_change_member_role_self(self, mock_db_session, mock_membership):
        """Test can_user_change_member_role returns False when admin tries to change their own role."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1
        target_user_id = 1  # Same as user_id

        # Act
        result = can_user_change_member_role(mock_db_session, user_id, group_id, target_user_id)

        # Assert
        assert result is False

    def test_can_user_assign_patients_true(self, mock_db_session, mock_membership):
        """Test can_user_assign_patients returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = can_user_assign_patients(mock_db_session, user_id, group_id)

        # Assert
        assert result is True

    def test_can_user_assign_patients_false(self, mock_db_session):
        """Test can_user_assign_patients returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = can_user_assign_patients(mock_db_session, user_id, group_id)

        # Assert
        assert result is False

    def test_can_user_remove_patients_true(self, mock_db_session, mock_membership):
        """Test can_user_remove_patients returns True when user is admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_membership
        user_id = 1
        group_id = 1

        # Act
        result = can_user_remove_patients(mock_db_session, user_id, group_id)

        # Assert
        assert result is True

    def test_can_user_remove_patients_false(self, mock_db_session):
        """Test can_user_remove_patients returns False when user is not admin."""
        # Arrange
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        user_id = 1
        group_id = 1

        # Act
        result = can_user_remove_patients(mock_db_session, user_id, group_id)

        # Assert
        assert result is False

if __name__ == "__main__":
    pytest.main([__file__])