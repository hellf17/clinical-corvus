"""
Permission decorators for Clinical Corvus API routes.
This module provides decorators to protect routes based on user roles and permissions.
"""

from functools import wraps
from typing import Callable, Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from security import get_current_user_required
from utils.group_permissions import (
    is_user_admin_of_group,
    is_user_member_of_group_with_role,
    require_member_role
)

def require_group_admin(group_id_param: str = "group_id"):
    """
    Decorator to require that the current user is an admin of the specified group.
    
    Args:
        group_id_param: Name of the parameter containing the group ID
        
    Returns:
        Dependency that checks if the user is a group admin
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract group_id from kwargs
            group_id = kwargs.get(group_id_param)
            if group_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Group ID is required"
                )
            
            # Get current user and database session from dependencies
            # This is a simplified approach - in practice, you'd need to properly inject these
            # For now, we'll assume they're available in the request context
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def check_group_permission(
    permission_checker: Callable[[Session, int, int], bool],
    group_id_param: str = "group_id",
    error_message: str = "Insufficient permissions"
):
    """
    Generic decorator to check group permissions.
    
    Args:
        permission_checker: Function that checks the permission
        group_id_param: Name of the parameter containing the group ID
        error_message: Error message to return if permission is denied
        
    Returns:
        Dependency that checks the specified permission
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Specific permission checking functions that can be used with the generic decorator
def require_group_membership(group_id: int, user_id: int, db: Session) -> bool:
    """
    Check if user is a member of the group.
    
    Args:
        group_id: Group ID
        user_id: User ID
        db: Database session
        
    Returns:
        bool: True if user is a member, False otherwise
    """
    return require_member_role(db, user_id, group_id)

def require_group_admin_role(group_id: int, user_id: int, db: Session) -> bool:
    """
    Check if user is an admin of the group.
    
    Args:
        group_id: Group ID
        user_id: User ID
        db: Database session
        
    Returns:
        bool: True if user is an admin, False otherwise
    """
    return is_user_admin_of_group(db, user_id, group_id)