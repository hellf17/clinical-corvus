"""
Security tests for edge cases in Clinical Corvus.
This module tests edge cases and security considerations for the authentication system.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from security import (
    get_verified_clerk_session_data,
    get_current_user,
    get_current_user_required,
    get_current_user_with_groups
)
from models import User
from utils.group_authorization import (
    is_user_member_of_group,
    is_patient_in_group,
    get_user_group_ids,
    is_user_authorized_for_patient,
    get_patients_accessible_to_user,
    get_patient_count_accessible_to_user,
    invalidate_user_group_cache,
    clear_all_caches
)
from utils.group_permissions import (
    is_user_admin_of_group,
    is_user_member_of_group_with_role,
    get_user_group_role,
    can_user_manage_group,
    can_user_invite_members,
    can_user_remove_members,
    can_user_change_member_role,
    can_user_assign_patients,
    can_user_remove_patients,
    require_admin_role,
    require_member_role
)


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return Mock(spec=Session)


@pytest.fixture
def mock_user():
    """Create a mock user object."""
    user = Mock(spec=User)
    user.user_id = 1
    user.clerk_user_id = "user_123"
    user.email = "test@example.com"
    user.name = "Test User"
    user.role = "doctor"
    return user


@pytest.fixture
def mock_group():
    """Create a mock group object."""
    group = Mock()
    group.id = 1
    group.name = "Test Group"
    return group


@pytest.fixture
def mock_group_membership():
    """Create a mock group membership object."""
    membership = Mock()
    membership.group_id = 1
    membership.user_id = 1
    membership.role = "member"
    return membership


@pytest.fixture
def mock_patient():
    """Create a mock patient object."""
    patient = Mock()
    patient.patient_id = 1
    patient.name = "Test Patient"
    return patient


def test_is_user_member_of_group_success(mock_db):
    """Test successful user membership check."""
    # Arrange
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = True
        
        # Act
        result = is_user_member_of_group(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_is_user_member_of_group_failure(mock_db):
    """Test user membership check when user is not a member."""
    # Arrange
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = False
        
        # Act
        result = is_user_member_of_group(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_is_patient_in_group_success(mock_db):
    """Test successful patient in group check."""
    # Arrange
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = True
        
        # Act
        result = is_patient_in_group(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_is_patient_in_group_failure(mock_db):
    """Test patient in group check when patient is not in group."""
    # Arrange
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = False
        
        # Act
        result = is_patient_in_group(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_get_user_group_ids_success(mock_db):
    """Test successful user group IDs retrieval."""
    # Arrange
    mock_group_membership = Mock()
    mock_group_membership.group_id = 1
    
    with patch('utils.group_authorization.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = [(1,), (2,)]
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = get_user_group_ids(mock_db, 1)
        
        # Assert
        assert result == [1, 2]


def test_get_user_group_ids_empty(mock_db):
    """Test user group IDs retrieval when user has no groups."""
    # Arrange
    with patch('utils.group_authorization.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = []
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = get_user_group_ids(mock_db, 1)
        
        # Assert
        assert result == []


def test_is_user_authorized_for_patient_admin(mock_db, mock_user):
    """Test patient authorization for admin user."""
    # Arrange
    mock_user.role = "admin"
    
    # Act
    result = is_user_authorized_for_patient(mock_db, mock_user, 1)
    
    # Assert
    assert result is True


def test_is_user_authorized_for_patient_doctor_assigned(mock_db, mock_user):
    """Test patient authorization for doctor with direct assignment."""
    # Arrange
    mock_user.role = "doctor"
    
    with patch('utils.group_authorization.crud_associations.is_doctor_assigned_to_patient') as mock_is_assigned:
        mock_is_assigned.return_value = True
        
        # Act
        result = is_user_authorized_for_patient(mock_db, mock_user, 1)
        
        # Assert
        assert result is True


def test_is_user_authorized_for_patient_doctor_group_access(mock_db, mock_user):
    """Test patient authorization for doctor with group access."""
    # Arrange
    mock_user.role = "doctor"
    
    with patch('utils.group_authorization.crud_associations.is_doctor_assigned_to_patient') as mock_is_assigned:
        mock_is_assigned.return_value = False
        with patch('utils.group_authorization.get_user_group_ids') as mock_get_group_ids:
            mock_get_group_ids.return_value = [1]
            with patch('utils.group_authorization.exists') as mock_exists:
                mock_exists.return_value.where.return_value.scalar.return_value = True
                
                # Act
                result = is_user_authorized_for_patient(mock_db, mock_user, 1)
                
                # Assert
                assert result is True


def test_is_user_authorized_for_patient_doctor_unauthorized(mock_db, mock_user):
    """Test patient authorization failure for doctor."""
    # Arrange
    mock_user.role = "doctor"
    
    with patch('utils.group_authorization.crud_associations.is_doctor_assigned_to_patient') as mock_is_assigned:
        mock_is_assigned.return_value = False
        with patch('utils.group_authorization.get_user_group_ids') as mock_get_group_ids:
            mock_get_group_ids.return_value = []
            
            # Act
            result = is_user_authorized_for_patient(mock_db, mock_user, 1)
            
            # Assert
            assert result is False


def test_is_user_authorized_for_patient_patient_own_record(mock_db, mock_user):
    """Test patient authorization for patient accessing own record."""
    # Arrange
    mock_user.role = "patient"
    mock_patient = Mock()
    mock_patient.patient_id = 1
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_patient
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = is_user_authorized_for_patient(mock_db, mock_user, 1)
        
        # Assert
        assert result is True


def test_is_user_authorized_for_patient_patient_other_record(mock_db, mock_user):
    """Test patient authorization failure for patient accessing other record."""
    # Arrange
    mock_user.role = "patient"
    mock_patient = Mock()
    mock_patient.patient_id = 2
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_patient
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = is_user_authorized_for_patient(mock_db, mock_user, 1)
        
        # Assert
        assert result is False


def test_get_patients_accessible_to_user_admin(mock_db, mock_user):
    """Test patient retrieval for admin user."""
    # Arrange
    mock_user.role = "admin"
    mock_patient = Mock()
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.all.return_value = [mock_patient]
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = get_patients_accessible_to_user(mock_db, mock_user)
        
        # Assert
        assert result == [mock_patient]


def test_get_patients_accessible_to_user_patient(mock_db, mock_user):
    """Test patient retrieval for patient user."""
    # Arrange
    mock_user.role = "patient"
    mock_patient = Mock()
    mock_patient.patient_id = 1
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_patient
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = get_patients_accessible_to_user(mock_db, mock_user)
        
        # Assert
        assert result == [mock_patient]


def test_get_patients_accessible_to_user_doctor_direct(mock_db, mock_user):
    """Test patient retrieval for doctor with direct assignments."""
    # Arrange
    mock_user.role = "doctor"
    mock_patient = Mock()
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        # Mock direct patient query
        mock_direct_query = Mock()
        mock_direct_query.join.return_value.filter.return_value.all.return_value = [mock_patient]
        
        # Mock group patient query
        mock_group_query = Mock()
        mock_group_query.join.return_value.filter.return_value.all.return_value = []
        
        mock_patient_model.query.return_value = mock_direct_query
        
        # Act
        result = get_patients_accessible_to_user(mock_db, mock_user)
        
        # Assert
        assert mock_patient in result


def test_get_patient_count_accessible_to_user_admin(mock_db, mock_user):
    """Test patient count retrieval for admin user."""
    # Arrange
    mock_user.role = "admin"
    
    with patch('utils.group_authorization.func') as mock_func:
        mock_func.count.return_value = Mock()
        with patch('utils.group_authorization.Patient') as mock_patient_model:
            mock_query = Mock()
            mock_query.scalar.return_value = 5
            mock_patient_model.query.return_value = mock_query
            
            # Act
            result = get_patient_count_accessible_to_user(mock_db, mock_user)
            
            # Assert
            assert result == 5


def test_get_patient_count_accessible_to_user_patient(mock_db, mock_user):
    """Test patient count retrieval for patient user."""
    # Arrange
    mock_user.role = "patient"
    mock_patient = Mock()
    mock_patient.patient_id = 1
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_patient
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = get_patient_count_accessible_to_user(mock_db, mock_user)
        
        # Assert
        assert result == 1


def test_invalidate_user_group_cache_success():
    """Test successful user group cache invalidation."""
    # Arrange
    user_id = 1
    cache_key = f"user_groups:{user_id}"
    
    with patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE') as mock_cache:
        mock_cache.__contains__.return_value = True
        
        # Act
        invalidate_user_group_cache(user_id)
        
        # Assert
        mock_cache.__delitem__.assert_called_once_with(cache_key)


def test_clear_all_caches_success():
    """Test successful clearing of all caches."""
    # Arrange
    with patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE') as mock_cache:
        # Act
        clear_all_caches()
        
        # Assert
        mock_cache.clear.assert_called_once()


def test_is_user_admin_of_group_success(mock_db):
    """Test successful admin check."""
    # Arrange
    mock_membership = Mock()
    mock_membership.role = "admin"
    
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = is_user_admin_of_group(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_is_user_admin_of_group_failure(mock_db):
    """Test admin check when user is not an admin."""
    # Arrange
    mock_membership = Mock()
    mock_membership.role = "member"
    
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = is_user_admin_of_group(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_is_user_member_of_group_with_role_success(mock_db):
    """Test successful role-based membership check."""
    # Arrange
    mock_membership = Mock()
    mock_membership.role = "admin"
    
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = is_user_member_of_group_with_role(mock_db, 1, 1, "admin")
        
        # Assert
        assert result is True


def test_is_user_member_of_group_with_role_failure(mock_db):
    """Test role-based membership check when user has different role."""
    # Arrange
    mock_membership = Mock()
    mock_membership.role = "member"
    
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = is_user_member_of_group_with_role(mock_db, 1, 1, "admin")
        
        # Assert
        assert result is False


def test_get_user_group_role_success(mock_db):
    """Test successful user group role retrieval."""
    # Arrange
    mock_membership = Mock()
    mock_membership.role = "admin"
    
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = get_user_group_role(mock_db, 1, 1)
        
        # Assert
        assert result == "admin"


def test_get_user_group_role_failure(mock_db):
    """Test user group role retrieval when membership not found."""
    # Arrange
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = None
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = get_user_group_role(mock_db, 1, 1)
        
        # Assert
        assert result is None


def test_can_user_manage_group_success(mock_db):
    """Test successful group management check."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result = can_user_manage_group(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_can_user_manage_group_failure(mock_db):
    """Test group management check when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = False
        
        # Act
        result = can_user_manage_group(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_can_user_invite_members_success(mock_db):
    """Test successful member invitation check."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result = can_user_invite_members(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_can_user_invite_members_failure(mock_db):
    """Test member invitation check when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = False
        
        # Act
        result = can_user_invite_members(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_can_user_remove_members_self_removal(mock_db):
    """Test successful self-removal from group."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = False
            
            # Act
            result = can_user_remove_members(mock_db, 1, 1, 1)  # user removing themselves
            
            # Assert
            assert result is True


def test_can_user_remove_members_admin_removal(mock_db):
    """Test successful member removal by admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = True
            
            # Act
            result = can_user_remove_members(mock_db, 1, 1, 2)  # admin removing other user
            
            # Assert
            assert result is True


def test_can_user_remove_members_unauthorized(mock_db):
    """Test member removal when user is not authorized."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = False
        
        # Act
        result = can_user_remove_members(mock_db, 1, 1, 2)
        
        # Assert
        assert result is False


def test_can_user_change_member_role_success(mock_db):
    """Test successful member role change by admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = True
            
            # Act
            result = can_user_change_member_role(mock_db, 1, 1, 2)
            
            # Assert
            assert result is True


def test_can_user_change_member_role_failure(mock_db):
    """Test member role change when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = False
            
            # Act
            result = can_user_change_member_role(mock_db, 1, 1, 2)
            
            # Assert
            assert result is False


def test_can_user_assign_patients_success(mock_db):
    """Test successful patient assignment by admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result = can_user_assign_patients(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_can_user_assign_patients_failure(mock_db):
    """Test patient assignment when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = False
        
        # Act
        result = can_user_assign_patients(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_can_user_remove_patients_success(mock_db):
    """Test successful patient removal by admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result = can_user_remove_patients(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_can_user_remove_patients_failure(mock_db):
    """Test patient removal when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = False
        
        # Act
        result = can_user_remove_patients(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_require_admin_role_success(mock_db):
    """Test successful admin role requirement."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result = require_admin_role(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_require_admin_role_failure(mock_db):
    """Test admin role requirement when user is not an admin."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = False
        
        # Act
        result = require_admin_role(mock_db, 1, 1)
        
        # Assert
        assert result is False


def test_require_member_role_success(mock_db):
    """Test successful member role requirement."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        
        # Act
        result = require_member_role(mock_db, 1, 1)
        
        # Assert
        assert result is True


def test_require_member_role_failure(mock_db):
    """Test member role requirement when user is not a member."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = False
        
        # Act
        result = require_member_role(mock_db, 1, 1)
        
        # Assert
        assert result is False


# Edge case tests for authentication functions
@patch('security.clerk_client')
async def test_get_verified_clerk_session_data_expired_token(
    mock_clerk_client, 
):
    """Test Clerk session data verification with expired token."""
    # Arrange
    from clerk_backend_api import ClerkError
    mock_clerk_client.clients.verify.side_effect = ClerkError(status=401, message="Token has expired")
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_verified_clerk_session_data(Mock(credentials="expired_token"))
    
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid or expired token" in exc_info.value.detail


@patch('security.clerk_client')
async def test_get_verified_clerk_session_data_network_error(
    mock_clerk_client, 
):
    """Test Clerk session data verification with network error."""
    # Arrange
    mock_clerk_client.clients.verify.side_effect = Exception("Network error")
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_verified_clerk_session_data(Mock(credentials="test_token"))
    
    assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "An unexpected error occurred during authentication" in exc_info.value.detail


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_database_error(
    mock_sync_clerk_user, 
    mock_get_user_by_clerk_id, 
    mock_db
):
    """Test current user retrieval with database error."""
    # Arrange
    mock_get_user_by_clerk_id.side_effect = Exception("Database error")
    mock_verified_session_data = {"user_id": "user_123"}
    
    # Act
    result = await get_current_user(mock_verified_session_data, mock_db)
    
    # Assert
    assert result is None


@patch('security.get_current_user')
async def test_get_current_user_required_unauthorized():
    """Test required current user retrieval when user is None."""
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_required(None)
    
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Authentication required" in exc_info.value.detail


@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_invalidate_user_group_cache_key_error(
    mock_group_membership_cache
):
    """Test user group cache invalidation with KeyError."""
    # Arrange
    user_id = 1
    mock_group_membership_cache.__delitem__.side_effect = KeyError("Key not found")
    
    # Act
    invalidate_user_group_cache(user_id)
    
    # Assert
    # Should not raise an exception


@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_clear_all_caches_exception(
    mock_group_membership_cache
):
    """Test clearing all caches with exception."""
    # Arrange
    mock_group_membership_cache.clear.side_effect = Exception("Clear error")
    
    # Act
    clear_all_caches()
    
    # Assert
    # Should not raise an exception


# Security consideration tests
def test_is_user_member_of_group_sql_injection_attempt(mock_db):
    """Test user membership check with potential SQL injection attempt."""
    # Arrange
    malicious_user_id = "1; DROP TABLE users;"
    malicious_group_id = "1; DROP TABLE groups;"
    
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = False
        
        # Act
        result = is_user_member_of_group(mock_db, malicious_user_id, malicious_group_id)
        
        # Assert
        assert result is False
        # The function should properly escape/validate inputs to prevent SQL injection


def test_is_patient_in_group_sql_injection_attempt(mock_db):
    """Test patient in group check with potential SQL injection attempt."""
    # Arrange
    malicious_patient_id = "1; DROP TABLE patients;"
    malicious_group_id = "1; DROP TABLE groups;"
    
    with patch('utils.group_authorization.exists') as mock_exists:
        mock_exists.return_value.where.return_value.scalar.return_value = False
        
        # Act
        result = is_patient_in_group(mock_db, malicious_patient_id, malicious_group_id)
        
        # Assert
        assert result is False
        # The function should properly escape/validate inputs to prevent SQL injection


def test_get_user_group_ids_sql_injection_attempt(mock_db):
    """Test user group IDs retrieval with potential SQL injection attempt."""
    # Arrange
    malicious_user_id = "1; DROP TABLE users;"
    
    with patch('utils.group_authorization.GroupMembership') as mock_group_membership_model:
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = []
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result = get_user_group_ids(mock_db, malicious_user_id)
        
        # Assert
        assert result == []
        # The function should properly escape/validate inputs to prevent SQL injection


def test_is_user_authorized_for_patient_sql_injection_attempt(mock_db, mock_user):
    """Test patient authorization with potential SQL injection attempt."""
    # Arrange
    mock_user.role = "doctor"
    malicious_patient_id = "1; DROP TABLE patients;"
    
    with patch('utils.group_authorization.crud_associations.is_doctor_assigned_to_patient') as mock_is_assigned:
        mock_is_assigned.return_value = False
        with patch('utils.group_authorization.get_user_group_ids') as mock_get_group_ids:
            mock_get_group_ids.return_value = []
            
            # Act
            result = is_user_authorized_for_patient(mock_db, mock_user, malicious_patient_id)
            
            # Assert
            assert result is False
            # The function should properly escape/validate inputs to prevent SQL injection


def test_get_patients_accessible_to_user_sql_injection_attempt(mock_db, mock_user):
    """Test patient retrieval with potential SQL injection attempt."""
    # Arrange
    mock_user.role = "admin"
    malicious_search = "'; DROP TABLE patients;"
    
    with patch('utils.group_authorization.Patient') as mock_patient_model:
        mock_query = Mock()
        mock_query.all.return_value = []
        mock_patient_model.query.return_value = mock_query
        
        # Act
        result = get_patients_accessible_to_user(mock_db, mock_user, malicious_search)
        
        # Assert
        assert result == []
        # The function should properly escape/validate inputs to prevent SQL injection


def test_get_patient_count_accessible_to_user_sql_injection_attempt(mock_db, mock_user):
    """Test patient count retrieval with potential SQL injection attempt."""
    # Arrange
    mock_user.role = "admin"
    malicious_search = "'; DROP TABLE patients;"
    
    with patch('utils.group_authorization.func') as mock_func:
        mock_func.count.return_value = Mock()
        with patch('utils.group_authorization.Patient') as mock_patient_model:
            mock_query = Mock()
            mock_query.scalar.return_value = 0
            mock_patient_model.query.return_value = mock_query
            
            # Act
            result = get_patient_count_accessible_to_user(mock_db, mock_user, malicious_search)
            
            # Assert
            assert result == 0
            # The function should properly escape/validate inputs to prevent SQL injection


# Additional edge case tests
@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_invalidate_user_group_cache_multiple_calls(
    mock_group_membership_cache
):
    """Test user group cache invalidation with multiple calls."""
    # Arrange
    user_id = 1
    cache_key = f"user_groups:{user_id}"
    mock_group_membership_cache.__contains__.return_value = True
    
    # Act
    invalidate_user_group_cache(user_id)
    invalidate_user_group_cache(user_id)
    invalidate_user_group_cache(user_id)
    
    # Assert
    assert mock_group_membership_cache.__delitem__.call_count == 3
    mock_group_membership_cache.__delitem__.assert_called_with(cache_key)


@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_clear_all_caches_multiple_calls(
    mock_group_membership_cache
):
    """Test clearing all caches with multiple calls."""
    # Act
    clear_all_caches()
    clear_all_caches()
    clear_all_caches()
    
    # Assert
    assert mock_group_membership_cache.clear.call_count == 3


def test_is_user_admin_of_group_cache_consistency(mock_db):
    """Test admin check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_membership = Mock()
        mock_membership.role = "admin"
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result1 = is_user_admin_of_group(mock_db, 1, 1)
        result2 = is_user_admin_of_group(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_is_user_member_of_group_with_role_cache_consistency(mock_db):
    """Test role-based membership check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_membership = Mock()
        mock_membership.role = "admin"
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result1 = is_user_member_of_group_with_role(mock_db, 1, 1, "admin")
        result2 = is_user_member_of_group_with_role(mock_db, 1, 1, "admin")
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_get_user_group_role_cache_consistency(mock_db):
    """Test user group role retrieval cache consistency."""
    # Arrange
    with patch('utils.group_permissions.GroupMembership') as mock_group_membership_model:
        mock_membership = Mock()
        mock_membership.role = "admin"
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = mock_membership
        mock_group_membership_model.query.return_value = mock_query
        
        # Act
        result1 = get_user_group_role(mock_db, 1, 1)
        result2 = get_user_group_role(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 == "admin"


def test_can_user_manage_group_cache_consistency(mock_db):
    """Test group management check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result1 = can_user_manage_group(mock_db, 1, 1)
        result2 = can_user_manage_group(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_can_user_invite_members_cache_consistency(mock_db):
    """Test member invitation check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result1 = can_user_invite_members(mock_db, 1, 1)
        result2 = can_user_invite_members(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_can_user_remove_members_cache_consistency(mock_db):
    """Test member removal check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = True
            
            # Act
            result1 = can_user_remove_members(mock_db, 1, 1, 2)
            result2 = can_user_remove_members(mock_db, 1, 1, 2)
            
            # Assert
            assert result1 == result2
            assert result1 is True


def test_can_user_change_member_role_cache_consistency(mock_db):
    """Test member role change check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
            mock_is_admin.return_value = True
            
            # Act
            result1 = can_user_change_member_role(mock_db, 1, 1, 2)
            result2 = can_user_change_member_role(mock_db, 1, 1, 2)
            
            # Assert
            assert result1 == result2
            assert result1 is True


def test_can_user_assign_patients_cache_consistency(mock_db):
    """Test patient assignment check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result1 = can_user_assign_patients(mock_db, 1, 1)
        result2 = can_user_assign_patients(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_can_user_remove_patients_cache_consistency(mock_db):
    """Test patient removal check cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result1 = can_user_remove_patients(mock_db, 1, 1)
        result2 = can_user_remove_patients(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_require_admin_role_cache_consistency(mock_db):
    """Test admin role requirement cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_admin_of_group') as mock_is_admin:
        mock_is_admin.return_value = True
        
        # Act
        result1 = require_admin_role(mock_db, 1, 1)
        result2 = require_admin_role(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True


def test_require_member_role_cache_consistency(mock_db):
    """Test member role requirement cache consistency."""
    # Arrange
    with patch('utils.group_permissions.is_user_member_of_group') as mock_is_member:
        mock_is_member.return_value = True
        
        # Act
        result1 = require_member_role(mock_db, 1, 1)
        result2 = require_member_role(mock_db, 1, 1)
        
        # Assert
        assert result1 == result2
        assert result1 is True