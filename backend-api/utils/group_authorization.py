"""
Utility functions for group-based authorization in Clinical Corvus.
This module provides functions to check if a user has access to a patient through group membership.
Includes caching mechanisms for improved performance.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import exists, and_, or_
from typing import List, Optional, Dict, Set
from database.models import User, Patient, GroupMembership, GroupPatient, doctor_patient_association
from crud.associations import is_doctor_assigned_to_patient
from functools import lru_cache
import time

# Simple in-memory cache for group membership
# In a production environment, this should be replaced with Redis or similar
GROUP_MEMBERSHIP_CACHE: Dict[int, Dict] = {}
CACHE_TTL = 30  # 5 minutes cache TTL

def _get_cache_key(user_id: int) -> str:
    """Generate a cache key for user group memberships."""
    return f"user_groups:{user_id}"

def _is_cache_valid(cache_entry: Dict) -> bool:
    """Check if a cache entry is still valid based on TTL."""
    if not cache_entry or 'timestamp' not in cache_entry:
        return False
    return time.time() - cache_entry['timestamp'] < CACHE_TTL

def _cache_user_groups(user_id: int, group_ids: List[int]) -> None:
    """Cache user group memberships."""
    GROUP_MEMBERSHIP_CACHE[_get_cache_key(user_id)] = {
        'group_ids': group_ids,
        'timestamp': time.time()
    }

def _get_cached_user_groups(user_id: int) -> Optional[List[int]]:
    """Get cached user group memberships if available and valid."""
    cache_key = _get_cache_key(user_id)
    cache_entry = GROUP_MEMBERSHIP_CACHE.get(cache_key)
    
    if cache_entry and _is_cache_valid(cache_entry):
        return cache_entry['group_ids']
    return None

def _invalidate_user_cache(user_id: int) -> None:
    """Invalidate cache for a specific user."""
    cache_key = _get_cache_key(user_id)
    if cache_key in GROUP_MEMBERSHIP_CACHE:
        del GROUP_MEMBERSHIP_CACHE[cache_key]

# Audit logging function
def log_group_access(user_id: int, patient_id: int, access_type: str, authorized: bool, details: Optional[str] = None) -> None:
    """
    Log group-based access attempts for audit purposes.
    
    Args:
        user_id: ID of the user attempting access
        patient_id: ID of the patient being accessed
        access_type: Type of access (e.g., 'read', 'write', 'delete')
        authorized: Whether the access was authorized
        details: Additional details about the access attempt
    """
    import logging
    logger = logging.getLogger(__name__)
    
    status = "AUTHORIZED" if authorized else "DENIED"
    log_message = f"Group Access {status}: User {user_id} attempted {access_type} access to patient {patient_id}"
    if details:
        log_message += f" | Details: {details}"
    
    if authorized:
        logger.info(log_message)
    else:
        logger.warning(log_message)


def is_user_member_of_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user is a member of a specific group.
    
    Args:
        db: Database session
        user_id: User ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if user is a member of the group, False otherwise
    """
    membership_exists = db.query(
        exists().where(
            and_(
                GroupMembership.user_id == user_id,
                GroupMembership.group_id == group_id
            )
        )
    ).scalar()
    return membership_exists


def is_patient_in_group(db: Session, patient_id: int, group_id: int) -> bool:
    """
    Check if a patient is assigned to a specific group.
    
    Args:
        db: Database session
        patient_id: Patient ID to check
        group_id: Group ID to check
        
    Returns:
        bool: True if patient is assigned to the group, False otherwise
    """
    assignment_exists = db.query(
        exists().where(
            and_(
                GroupPatient.patient_id == patient_id,
                GroupPatient.group_id == group_id
            )
        )
    ).scalar()
    return assignment_exists


def get_user_group_ids(db: Session, user_id: int) -> List[int]:
    """
    Get all group IDs that a user is a member of.
    Uses caching to improve performance.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List[int]: List of group IDs
    """
    # Check cache first
    cached_groups = _get_cached_user_groups(user_id)
    if cached_groups is not None:
        return cached_groups
    
    # If not in cache, fetch from database
    group_memberships = db.query(GroupMembership.group_id).filter(
        GroupMembership.user_id == user_id
    ).all()
    
    group_ids = [group_id for (group_id,) in group_memberships]
    
    # Cache the result
    _cache_user_groups(user_id, group_ids)
    
    return group_ids


def is_user_authorized_for_patient(db: Session, user: User, patient_id: int) -> bool:
    """
    Check if a user is authorized to access a patient through either:
    1. Direct doctor-patient assignment
    2. Group membership where the patient is assigned to the group
    
    Args:
        db: Database session
        user: User object
        patient_id: Patient ID to check access for
        
    Returns:
        bool: True if user is authorized, False otherwise
    """
    # Admins have access to all patients
    if user.role == "admin":
        log_group_access(user.user_id, patient_id, "admin", True, "Admin access granted")
        return True
    
    # Check direct doctor-patient assignment
    if user.role == "doctor":
        if is_doctor_assigned_to_patient(db, user.user_id, patient_id):
            log_group_access(user.user_id, patient_id, "doctor", True, "Direct doctor-patient assignment")
            return True
    
    # Check if user is a patient accessing their own record
    if user.role == "patient":
        patient_record = db.query(Patient).filter(Patient.user_id == user.user_id).first()
        if patient_record and patient_record.patient_id == patient_id:
            log_group_access(user.user_id, patient_id, "patient", True, "Patient accessing own record")
            return True
    
    # Check group-based access for doctors
    if user.role == "doctor":
        # Get all groups the user is a member of
        user_groups = get_user_group_ids(db, user.user_id)
        
        # Check if patient is in any of these groups
        if user_groups:
            patient_in_group = db.query(
                exists().where(
                    and_(
                        GroupPatient.patient_id == patient_id,
                        GroupPatient.group_id.in_(user_groups)
                    )
                )
            ).scalar()
            
            if patient_in_group:
                log_group_access(user.user_id, patient_id, "doctor", True, "Access through group membership")
                return True
    
    # Log unauthorized access attempts
    log_group_access(user.user_id, patient_id, "unauthorized", False, f"User role: {user.role}")
    return False


def get_patients_accessible_to_user(db: Session, user: User, search: Optional[str] = None) -> List[Patient]:
    """
    Get all patients accessible to a user through either:
    1. Direct doctor-patient assignment
    2. Group membership where patients are assigned to the groups
    
    Args:
        db: Database session
        user: User object
        search: Optional search term for patient names
        
    Returns:
        List[Patient]: List of accessible patients
    """
    from sqlalchemy import func
    
    # Admins can access all patients
    if user.role == "admin":
        query = db.query(Patient)
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(func.lower(Patient.name).like(search_term))
        return query.all()
    
    # Patients can only access their own record
    if user.role == "patient":
        patient_record = db.query(Patient).filter(Patient.user_id == user.user_id).first()
        if patient_record:
            # Apply search filter if provided
            if search:
                search_term = f"%{search.lower()}%"
                if search_term in patient_record.name.lower():
                    return [patient_record]
                else:
                    return []
            return [patient_record]
        return []
    
    # Doctors can access:
    # 1. Patients directly assigned to them
    # 2. Patients assigned to groups they are members of
    if user.role == "doctor":
        # Get patient IDs from direct assignment
        direct_patient_ids = db.query(doctor_patient_association.c.patient_patient_id).filter(
            doctor_patient_association.c.doctor_user_id == user.user_id
        ).subquery()

        # Get patient IDs from group membership
        user_groups = get_user_group_ids(db, user.user_id)
        group_patient_ids = db.query(GroupPatient.patient_id).filter(
            GroupPatient.group_id.in_(user_groups)
        ).subquery()
        
        # Combine patient IDs
        accessible_patient_ids = db.query(direct_patient_ids.c.patient_patient_id).union(
            db.query(group_patient_ids.c.patient_id)
        ).subquery()

        # Final query for patients
        query = db.query(Patient).filter(Patient.patient_id.in_(accessible_patient_ids))

        # Apply search filter if provided
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(func.lower(Patient.name).like(search_term))
        
        return query.all()
    
    # Other roles have no access
    return []


def get_patient_count_accessible_to_user(db: Session, user: User, search: Optional[str] = None) -> int:
    """
    Get the count of patients accessible to a user.
    
    Args:
        db: Database session
        user: User object
        search: Optional search term for patient names
        
    Returns:
        int: Count of accessible patients
    """
    from sqlalchemy import func
    
    # Admins can access all patients
    if user.role == "admin":
        query = db.query(func.count(Patient.patient_id))
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(func.lower(Patient.name).like(search_term))
        return query.scalar()
    
    # Patients can only access their own record
    if user.role == "patient":
        patient_record = db.query(Patient).filter(Patient.user_id == user.user_id).first()
        if patient_record:
            # Apply search filter if provided
            if search:
                search_term = f"%{search.lower()}%"
                if search_term in patient_record.name.lower():
                    return 1
            return 1
        return 0
    
    # Doctors can access:
    # 1. Patients directly assigned to them
    # 2. Patients assigned to groups they are members of
    if user.role == "doctor":
        # Get count of patients directly assigned to the doctor
        direct_count_query = db.query(func.count(Patient.patient_id)).join(
            Patient.managing_doctors
        ).filter(
            User.user_id == user.user_id
        )
        
        # Apply search filter to direct patients if provided
        if search:
            search_term = f"%{search.lower()}%"
            direct_count_query = direct_count_query.filter(
                func.lower(Patient.name).like(search_term)
            )
        
        direct_count = direct_count_query.scalar()
        
        # Get count of patients from groups the doctor is a member of
        user_groups = get_user_group_ids(db, user.user_id)
        group_count = 0
        
        if user_groups:
            group_count_query = db.query(func.count(Patient.patient_id.distinct())).join(
                GroupPatient, Patient.patient_id == GroupPatient.patient_id
            ).filter(
                GroupPatient.group_id.in_(user_groups)
            )
            
            # Apply search filter to group patients if provided
            if search:
                search_term = f"%{search.lower()}%"
                group_count_query = group_count_query.filter(
                    func.lower(Patient.name).like(search_term)
                )
            
            group_count = group_count_query.scalar()
        
        # Note: This might count patients twice if they are both directly assigned and in a group
        # For a more accurate count, we would need to do a more complex query
        return direct_count + group_count
    
    # Other roles have no access
    return 0

def invalidate_user_group_cache(user_id: int) -> None:
    """
    Invalidate the cache for a specific user's group memberships.
    Should be called when group memberships change.
    
    Args:
        user_id: User ID whose cache should be invalidated
    """
    _invalidate_user_cache(user_id)

def clear_all_caches() -> None:
    """
    Clear all group membership caches.
    Should be used sparingly, e.g., when there are system-wide changes.
    """
    global GROUP_MEMBERSHIP_CACHE
    GROUP_MEMBERSHIP_CACHE = {}