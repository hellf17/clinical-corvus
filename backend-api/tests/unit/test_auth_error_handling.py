"""
Unit tests for authentication error handling in Clinical Corvus.
This module tests the proper error handling for authentication failures.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from security import (
    get_verified_clerk_session_data,
    get_current_user,
    get_current_user_required,
    get_current_user_with_groups
)
from models import User
from utils.group_authorization import invalidate_user_group_cache


@pytest.fixture
def mock_request():
    """Create a mock request object."""
    request = Mock(spec=Request)
    request.headers = {}
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
    user.clerk_user_id = "user_123"
    user.email = "test@example.com"
    user.name = "Test User"
    user.role = "doctor"
    return user


@patch('security.clerk_client')
async def test_get_verified_clerk_session_data_success(
    mock_clerk_client,
    mock_request
):
    """Test successful Clerk session data verification."""
    # Arrange
    mock_request.headers = {"Authorization": "Bearer test_token"}

    mock_session = Mock()
    mock_session.user_id = "user_123"
    mock_session.id = "session_123"

    mock_clerk_client.sessions.verify_session.return_value = mock_session

    # Create mock token credentials
    mock_token_credentials = Mock()
    mock_token_credentials.credentials = "test_token"

    # Act
    result = await get_verified_clerk_session_data(mock_request, mock_token_credentials)

    # Assert
    assert result is not None
    assert result["user_id"] == "user_123"
    assert result["session_id"] == "session_123"


@patch('security.clerk_client')
async def test_get_verified_clerk_session_data_invalid_token(
    mock_clerk_client,
    mock_request
):
    """Test Clerk session data verification with invalid token."""
    # Arrange
    mock_request.headers = {}  # No JWT token to force session verification
    mock_request.cookies = {"__session": "invalid_session_token"}

    mock_clerk_client.sessions.verify_session.side_effect = Exception("Invalid token")

    # Create mock token credentials
    mock_token_credentials = None  # No JWT credentials

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_verified_clerk_session_data(mock_request, mock_token_credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid or expired token" in exc_info.value.detail


@patch('security.clerk_client')
async def test_get_verified_clerk_session_data_clerk_error(
    mock_clerk_client,
    mock_request
):
    """Test Clerk session data verification with Clerk error."""
    # Arrange
    mock_request.headers = {}  # No JWT token to force session verification
    mock_request.cookies = {"__session": "test_session_token"}

    mock_clerk_client.sessions.verify_session.side_effect = Exception("Internal server error")

    # Create mock token credentials
    mock_token_credentials = None  # No JWT credentials

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_verified_clerk_session_data(mock_request, mock_token_credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid or expired token" in exc_info.value.detail


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_success(
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db,
    mock_user
):
    """Test successful current user retrieval."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = mock_user
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result == mock_user
    mock_get_user_by_clerk_id.assert_called_once_with(mock_db, "user_123")


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_sync_success(
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db,
    mock_user
):
    """Test successful current user retrieval with sync."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = None
    mock_sync_clerk_user.return_value = mock_user
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result == mock_user
    mock_sync_clerk_user.assert_called_once_with(db=mock_db, clerk_session_data=mock_verified_session_data)


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_sync_failure(
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db
):
    """Test current user retrieval when sync fails."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = None
    mock_sync_clerk_user.return_value = None
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result is None


@patch('security.get_current_user')
async def test_get_current_user_required_success(
    mock_get_current_user, 
    mock_user
):
    """Test successful required current user retrieval."""
    # Arrange
    mock_get_current_user.return_value = mock_user
    
    # Act
    result = await get_current_user_required(mock_user)
    
    # Assert
    assert result == mock_user


@patch('security.get_current_user')
async def test_get_current_user_required_failure(
    mock_get_current_user
):
    """Test required current user retrieval when user is None."""
    # Arrange
    mock_get_current_user.return_value = None
    
    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_required(None)
    
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Authentication required" in exc_info.value.detail


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
@patch('security.get_user_group_memberships')
async def test_get_current_user_with_groups_success(
    mock_get_user_group_memberships,
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db,
    mock_user
):
    """Test successful current user with groups retrieval."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = mock_user
    mock_get_user_group_memberships.return_value = []
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user_with_groups(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result == mock_user
    assert hasattr(result, 'group_memberships')
    assert result.group_memberships == []


@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_invalidate_user_group_cache_success(
    mock_group_membership_cache
):
    """Test successful user group cache invalidation."""
    # Arrange
    user_id = 1
    cache_key = f"user_groups:{user_id}"
    mock_group_membership_cache.__contains__.return_value = True
    
    # Act
    invalidate_user_group_cache(user_id)
    
    # Assert
    mock_group_membership_cache.__delitem__.assert_called_once_with(cache_key)


@patch('utils.group_authorization.GROUP_MEMBERSHIP_CACHE')
def test_invalidate_user_group_cache_not_found(
    mock_group_membership_cache
):
    """Test user group cache invalidation when cache key not found."""
    # Arrange
    user_id = 1
    cache_key = f"user_groups:{user_id}"
    mock_group_membership_cache.__contains__.return_value = False
    
    # Act
    invalidate_user_group_cache(user_id)
    
    # Assert
    mock_group_membership_cache.__delitem__.assert_not_called()


@patch('security.get_verified_clerk_session_data')
@patch('security.get_current_user')
async def test_get_current_user_with_groups_no_session(
    mock_get_current_user,
    mock_get_verified_clerk_session_data,
    mock_db
):
    """Test current user with groups retrieval when no session data."""
    # Arrange
    mock_get_verified_clerk_session_data.return_value = None

    # Act
    result = await get_current_user_with_groups(Mock(), None, mock_db)

    # Assert
    assert result is None


@patch('security.get_verified_clerk_session_data')
@patch('security.get_current_user')
async def test_get_current_user_with_groups_no_user_id(
    mock_get_current_user,
    mock_get_verified_clerk_session_data,
    mock_db
):
    """Test current user with groups retrieval when no user ID in session."""
    # Arrange
    mock_get_verified_clerk_session_data.return_value = {}

    # Act
    result = await get_current_user_with_groups(Mock(), {}, mock_db)

    # Assert
    assert result is None


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_sync_http_exception(
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db
):
    """Test current user retrieval when sync raises HTTPException."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = None
    mock_sync_clerk_user.side_effect = HTTPException(status_code=404, detail="User not found")
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result is None


@patch('security.get_user_by_clerk_id')
@patch('security.sync_clerk_user')
async def test_get_current_user_sync_unexpected_exception(
    mock_sync_clerk_user,
    mock_get_user_by_clerk_id,
    mock_db
):
    """Test current user retrieval when sync raises unexpected exception."""
    # Arrange
    mock_get_user_by_clerk_id.return_value = None
    mock_sync_clerk_user.side_effect = Exception("Unexpected error")
    mock_verified_session_data = {"user_id": "user_123"}

    # Act
    result = await get_current_user(Mock(), mock_verified_session_data, mock_db)

    # Assert
    assert result is None