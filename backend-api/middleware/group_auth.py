"""
Group authentication and authorization middleware for Clinical Corvus.

This module provides middleware functions for group-based authentication and authorization,
including group context extraction, permission checking, and secure error handling.
"""

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from database import get_db
from models import User, Group, GroupMembership
from security import get_current_user_required
from utils.group_authorization import is_user_member_of_group, is_user_authorized_for_patient
from utils.group_permissions import is_user_admin_of_group
from schemas.group import GroupRole

logger = logging.getLogger(__name__)

# Group context model
class GroupContext:
    """Represents the group context for the current request."""
    
    def __init__(self, group_id: int, user_role: GroupRole, is_admin: bool):
        self.group_id = group_id
        self.user_role = user_role
        self.is_admin = is_admin

async def extract_group_context(
    request: Request,
    group_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
) -> GroupContext:
    """
    Extract group context from the request.
    
    Args:
        request: The incoming request
        group_id: The ID of the group being accessed
        current_user: The authenticated user
        db: Database session
        
    Returns:
        GroupContext: The group context for the current request
        
    Raises:
        HTTPException: If the user is not authorized to access the group
    """
    try:
        # Check if user is a member of the group
        if not is_user_member_of_group(db, current_user.user_id, group_id):
            logger.warning(f"User {current_user.user_id} attempted to access group {group_id} without membership")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Get user's role in the group
        membership = db.query(GroupMembership).filter(
            GroupMembership.user_id == current_user.user_id,
            GroupMembership.group_id == group_id
        ).first()
        
        if not membership:
            logger.error(f"Group membership not found for user {current_user.user_id} in group {group_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Group membership not found"
            )
        
        # Check if user is an admin
        is_admin = membership.role == GroupRole.ADMIN
        
        # Create group context
        group_context = GroupContext(
            group_id=group_id,
            user_role=membership.role,
            is_admin=is_admin
        )
        
        # Add group context to request state for use in route handlers
        request.state.group_context = group_context
        
        logger.info(f"Successfully extracted group context for user {current_user.user_id} in group {group_id}")
        return group_context
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error extracting group context: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract group context"
        )

def require_group_admin(
    group_context: GroupContext = Depends(extract_group_context)
) -> GroupContext:
    """
    Dependency that requires the user to be an admin of the group.
    
    Args:
        group_context: The group context
        
    Returns:
        GroupContext: The group context if the user is an admin
        
    Raises:
        HTTPException: If the user is not an admin of the group
    """
    if not group_context.is_admin:
        logger.warning(f"User attempted admin action without admin privileges in group {group_context.group_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can perform this action"
        )
    
    return group_context

def require_group_membership(
    group_context: GroupContext = Depends(extract_group_context)
) -> GroupContext:
    """
    Dependency that requires the user to be a member of the group.
    
    Args:
        group_context: The group context
        
    Returns:
        GroupContext: The group context if the user is a member
        
    Raises:
        HTTPException: If the user is not a member of the group
    """
    # Membership is already verified in extract_group_context
    return group_context

async def verify_group_patient_access(
    patient_id: int,
    group_context: GroupContext = Depends(extract_group_context),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to verify that the current user has access to a patient through group membership.
    
    Args:
        patient_id: The ID of the patient being accessed
        group_context: The group context
        current_user: The authenticated user
        db: Database session
        
    Returns:
        User: The authenticated user if authorized
        
    Raises:
        HTTPException: If the user is not authorized to access the patient
    """
    try:
        # Check if patient is assigned to the group
        from database.models import GroupPatient
        patient_in_group = db.query(GroupPatient).filter(
            GroupPatient.patient_id == patient_id,
            GroupPatient.group_id == group_context.group_id
        ).first()
        
        if not patient_in_group:
            logger.warning(f"Patient {patient_id} is not assigned to group {group_context.group_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient is not assigned to this group"
            )
        
        # User is authorized through group membership
        logger.info(f"User {current_user.user_id} authorized to access patient {patient_id} through group {group_context.group_id}")
        return current_user
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error verifying group patient access: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify patient access"
        )

def get_current_group_context(
    request: Request
) -> Optional[GroupContext]:
    """
    Get the current group context from the request state.
    
    Args:
        request: The incoming request
        
    Returns:
        GroupContext or None: The group context if available
    """
    return getattr(request.state, 'group_context', None)


# --- Security Headers Middleware ---

async def add_security_headers(request: Request, call_next):
    """
    Add security headers to group-based requests.
    
    Args:
        request: The incoming request
        call_next: Function to call the next middleware
        
    Returns:
        Response: The response with security headers added
    """
    try:
        # Call the next middleware
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Add group-specific security headers
        group_context = get_current_group_context(request)
        if group_context:
            response.headers["X-Group-ID"] = str(group_context.group_id)
            response.headers["X-Group-Role"] = group_context.user_role
        
        return response
    except Exception as e:
        print(f"Error adding security headers: {e}")
        # Continue with the response even if we can't add headers
        return await call_next(request)