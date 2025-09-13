"""
Utility functions for group-based permissions in Clinical Corvus.
This module provides functions to check user permissions within groups.
"""

from sqlalchemy.orm import Session
from typing import Optional
from database.models import User, GroupMembership
from utils.group_authorization import is_user_member_of_group, log_group_access
import logging

logger = logging.getLogger(__name__)

def is_user_admin_of_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user is an admin of a specific group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user is an admin of the group, False otherwise
    """
    membership = db.query(GroupMembership).filter(
        GroupMembership.user_id == user_id,
        GroupMembership.group_id == group_id,
        GroupMembership.role == "admin"
    ).first()
    
    is_admin = membership is not None
    
    # Log the access check
    log_group_access(user_id, group_id, "admin_check", is_admin, f"User admin check for group {group_id}")
    
    return is_admin

def is_user_member_of_group_with_role(db: Session, user_id: int, group_id: int, required_role: str) -> bool:
    """
    Check if a user is a member of a specific group with a specific role.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        required_role: Required role ("admin" or "member")
        
    Returns:
        bool: True if user is a member with the required role, False otherwise
    """
    membership = db.query(GroupMembership).filter(
        GroupMembership.user_id == user_id,
        GroupMembership.group_id == group_id,
        GroupMembership.role == required_role
    ).first()
    
    return membership is not None

def get_user_group_role(db: Session, user_id: int, group_id: int) -> Optional[str]:
    """
    Get the role of a user in a specific group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        str or None: Role of the user in the group, or None if not a member
    """
    membership = db.query(GroupMembership).filter(
        GroupMembership.user_id == user_id,
        GroupMembership.group_id == group_id
    ).first()
    
    return membership.role if membership else None

def can_user_manage_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user can manage a group (i.e., is an admin).
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user can manage the group, False otherwise
    """
    return is_user_admin_of_group(db, user_id, group_id)

def can_user_invite_members(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user can invite members to a group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user can invite members, False otherwise
    """
    can_invite = is_user_admin_of_group(db, user_id, group_id)
    
    # Log the access check
    log_group_access(user_id, group_id, "invite_members", can_invite, f"User invite members check for group {group_id}")
    
    return can_invite

def can_user_remove_members(db: Session, user_id: int, group_id: int, target_user_id: int) -> bool:
    """
    Check if a user can remove a member from a group.
    
    Args:
        db: Database session
        user_id: User ID of the user attempting the action
        group_id: Group ID
        target_user_id: User ID of the member to be removed
        
    Returns:
        bool: True if user can remove the member, False otherwise
    """
    # User must be a member of the group
    if not is_user_member_of_group(db, user_id, group_id):
        log_group_access(user_id, group_id, "remove_member", False, f"User not member of group {group_id}")
        return False
    
    # Admins can remove any member
    if is_user_admin_of_group(db, user_id, group_id):
        log_group_access(user_id, group_id, "remove_member", True, f"Admin removing member {target_user_id} from group {group_id}")
        return True
    
    # Members can remove themselves
    if user_id == target_user_id:
        log_group_access(user_id, group_id, "remove_member", True, f"User {user_id} removing self from group {group_id}")
        return True
    
    log_group_access(user_id, group_id, "remove_member", False, f"User {user_id} not authorized to remove member {target_user_id} from group {group_id}")
    return False

def can_user_change_member_role(db: Session, user_id: int, group_id: int, target_user_id: int) -> bool:
    """
    Check if a user can change another member's role in a group.
    
    Args:
        db: Database session
        user_id: User ID of the user attempting the action
        group_id: Group ID
        target_user_id: User ID of the member whose role is to be changed
        
    Returns:
        bool: True if user can change the member's role, False otherwise
    """
    # User must be a member of the group
    if not is_user_member_of_group(db, user_id, group_id):
        log_group_access(user_id, group_id, "change_role", False, f"User not member of group {group_id}")
        return False
    
    # Only admins can change member roles
    if not is_user_admin_of_group(db, user_id, group_id):
        log_group_access(user_id, group_id, "change_role", False, f"User {user_id} not admin of group {group_id}")
        return False
    
    # Admins cannot change their own role
    if user_id == target_user_id:
        log_group_access(user_id, group_id, "change_role", False, f"Admin {user_id} cannot change own role in group {group_id}")
        return False
    
    log_group_access(user_id, group_id, "change_role", True, f"Admin {user_id} changing role of member {target_user_id} in group {group_id}")
    return True

def can_user_assign_patients(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user can assign patients to a group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user can assign patients, False otherwise
    """
    can_assign = is_user_admin_of_group(db, user_id, group_id)
    
    # Log the access check
    log_group_access(user_id, group_id, "assign_patients", can_assign, f"User assign patients check for group {group_id}")
    
    return can_assign

def can_user_remove_patients(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user can remove patients from a group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user can remove patients, False otherwise
    """
    can_remove = is_user_admin_of_group(db, user_id, group_id)
    
    # Log the access check
    log_group_access(user_id, group_id, "remove_patients", can_remove, f"User remove patients check for group {group_id}")
    
    return can_remove

def require_admin_role(db: Session, user_id: int, group_id: int) -> bool:
    """
    Require that a user is an admin of a group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user is an admin, False otherwise
    """
    return is_user_admin_of_group(db, user_id, group_id)

def require_member_role(db: Session, user_id: int, group_id: int) -> bool:
    """
    Require that a user is a member of a group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user is a member, False otherwise
    """
    return is_user_member_of_group(db, user_id, group_id)