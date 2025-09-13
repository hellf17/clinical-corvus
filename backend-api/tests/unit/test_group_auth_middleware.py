"""
Unit tests for group authentication middleware in Clinical Corvus.
This module tests the group authentication and authorization middleware functions.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

from middleware.group_auth import (
    extract_group_context,
    require_group_admin,
    require_group_membership,
    verify_group_patient_access,
    get_current_group_context
)
from models import User, Group, GroupMembership
from schemas.group import GroupRole


@pytest.fixture
def mock_request():
    """Create a mock request object."""
    request = Mock(spec=Request)
    request.state = Mock()
    return request


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return Mock(spec=Session)


@pytest.fixture
def mock_user():
    """Create a mock user object."""
    user = Mock(spec=User)
    user.user_id = 1
    return user


@pytest.fixture
def mock_group_membership():
    """Create a mock group membership object."""
    membership = Mock(spec=GroupMembership)
    membership.group_id = 1
    membership.role = GroupRole.MEMBER
    return membership


@pytest.fixture
def mock_group_context():
    """Create a mock group context object."""
    from middleware.group_auth import GroupContext
    context = Mock(spec=GroupContext)
    context.group_id = 1
    context.user_role = GroupRole.MEMBER
    context.is_admin = False
    return context


@patch('middleware.group_auth.is_user_member_of_group')
@patch('middleware.group_auth.db')
async def test_extract_group_context_success(
    mock_db_module, 
    mock_is_user_member_of_group, 
    mock_request, 
    mock_db, 
    mock_user
):
    """Test successful group context extraction."""
    # Arrange
    mock_is_user_member_of_group.return_value = True
    
    with patch('middleware.group_auth.GroupMembership') as mock_group_membership_model:
        mock_membership = Mock()
        mock_membership.role = GroupRole.MEMBER
        mock_group_membership_model.query().filter().first.return_value = mock_membership
        
        # Act
        result = await extract_group_context(mock_request, 1, mock_user, mock_db)
        
        # Assert
        assert result is not None
        assert result.group_id == 1
        assert result.user_role == GroupRole.MEMBER
        assert result.is_admin is False
        assert hasattr(mock_request.state, 'group_context')


@patch('middleware.group_auth.is_user_member_of_group')
async def test_extract_group_context_user_not_member(
    mock_is_user_member_of_group, 
    mock_request, 
    mock_db, 
    mock_user
):
    """Test group context extraction when user is not a member."""
    # Arrange
    mock_is_user_member_of_group.return_value = False
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await extract_group_context(mock_request, 1, mock_user, mock_db)
    
    assert exc_info.value.status_code == 403
    assert "not a member" in exc_info.value.detail


@patch('middleware.group_auth.is_user_member_of_group')
async def test_extract_group_context_membership_not_found(
    mock_is_user_member_of_group, 
    mock_request, 
    mock_db, 
    mock_user
):
    """Test group context extraction when membership is not found."""
    # Arrange
    mock_is_user_member_of_group.return_value = True
    
    with patch('middleware.group_auth.GroupMembership') as mock_group_membership_model:
        mock_group_membership_model.query().filter().first.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await extract_group_context(mock_request, 1, mock_user, mock_db)
        
        assert exc_info.value.status_code == 403
        assert "not found" in exc_info.value.detail


def test_require_group_admin_success(mock_group_context):
    """Test successful admin requirement check."""
    # Arrange
    mock_group_context.is_admin = True
    
    # Act
    result = require_group_admin(mock_group_context)
    
    # Assert
    assert result == mock_group_context


def test_require_group_admin_failure(mock_group_context):
    """Test admin requirement check when user is not an admin."""
    # Arrange
    mock_group_context.is_admin = False
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        require_group_admin(mock_group_context)
    
    assert exc_info.value.status_code == 403
    assert "admin" in exc_info.value.detail


def test_require_group_membership_success(mock_group_context):
    """Test successful membership requirement check."""
    # Act
    result = require_group_membership(mock_group_context)
    
    # Assert
    assert result == mock_group_context


@patch('middleware.group_auth.is_patient_assigned_to_group')
async def test_verify_group_patient_access_success(
    mock_is_patient_assigned_to_group, 
    mock_request, 
    mock_db, 
    mock_user, 
    mock_group_context
):
    """Test successful group patient access verification."""
    # Arrange
    mock_is_patient_assigned_to_group.return_value = True
    
    with patch('middleware.group_auth.GroupPatient') as mock_group_patient_model:
        mock_assignment = Mock()
        mock_group_patient_model.query().filter().first.return_value = mock_assignment
        
        # Act
        result = await verify_group_patient_access(1, mock_group_context, mock_user, mock_db)
        
        # Assert
        assert result == mock_user


@patch('middleware.group_auth.is_patient_assigned_to_group')
async def test_verify_group_patient_access_failure(
    mock_is_patient_assigned_to_group, 
    mock_request, 
    mock_db, 
    mock_user, 
    mock_group_context
):
    """Test group patient access verification when patient is not assigned to group."""
    # Arrange
    mock_is_patient_assigned_to_group.return_value = False
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await verify_group_patient_access(1, mock_group_context, mock_user, mock_db)
    
    assert exc_info.value.status_code == 403
    assert "not assigned" in exc_info.value.detail


def test_get_current_group_context_success(mock_request):
    """Test successful retrieval of current group context."""
    # Arrange
    mock_group_context = Mock()
    mock_request.state.group_context = mock_group_context
    
    # Act
    result = get_current_group_context(mock_request)
    
    # Assert
    assert result == mock_group_context


def test_get_current_group_context_none(mock_request):
    """Test retrieval of current group context when none exists."""
    # Arrange
    delattr(mock_request.state, 'group_context')
    
    # Act
    result = get_current_group_context(mock_request)
    
    # Assert
    assert result is None