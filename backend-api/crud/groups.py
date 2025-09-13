from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Tuple
from datetime import datetime

from database.models import Group, GroupMembership, GroupPatient, User, Patient
from schemas.group import GroupCreate, GroupUpdate, GroupMembershipCreate, GroupPatientCreate
import logging

logger = logging.getLogger(__name__)

# --- Group CRUD Operations ---

def get_groups(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Group], int]:
    """
    Get groups with optional search filter and pagination.
    """
    query = db.query(Group)
    
    # Apply search filter if provided (case-insensitive on name)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(func.lower(Group.name).like(search_term))
    
    # Get total count matching the query *before* pagination
    total = query.count()
    
    # Apply pagination and ordering
    groups = query.order_by(Group.name).offset(skip).limit(limit).all()
    
    return groups, total

def get_group(db: Session, group_id: int) -> Optional[Group]:
    """
    Get a specific group by ID.
    """
    return db.query(Group).filter(Group.id == group_id).first()

def get_group_by_name(db: Session, name: str) -> Optional[Group]:
    """
    Get a group by name.
    """
    return db.query(Group).filter(Group.name == name).first()

def create_group(db: Session, group_data: GroupCreate, creator_user_id: int) -> Group:
    """
    Create a new group.
    """
    # Create the group
    db_group = Group(
        name=group_data.name,
        description=group_data.description,
        max_patients=group_data.max_patients,
        max_members=group_data.max_members
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Add the creator as an admin member
    membership = GroupMembership(
        group_id=db_group.id,
        user_id=creator_user_id,
        role="admin",
        invited_by=creator_user_id
    )
    db.add(membership)
    db.commit()
    
    return db_group

def update_group(db: Session, group_id: int, group_update: GroupUpdate) -> Optional[Group]:
    """
    Update an existing group.
    """
    db_group = get_group(db, group_id=group_id)
    if db_group is None:
        return None
    
    update_data = group_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_group, key, value)
    
    db_group.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group(db: Session, group_id: int) -> bool:
    """
    Delete a group by ID.
    This will cascade delete memberships and patient assignments due to foreign key constraints.
    """
    db_group = get_group(db, group_id=group_id)
    if db_group is None:
        return False
    
    db.delete(db_group)
    db.commit()
    return True

# --- Group Membership CRUD Operations ---

def get_group_memberships(
    db: Session,
    group_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[GroupMembership], int]:
    """
    Get all memberships for a specific group.
    """
    query = db.query(GroupMembership).filter(GroupMembership.group_id == group_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    memberships = query.offset(skip).limit(limit).all()
    
    return memberships, total

def get_user_groups(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Group], int]:
    """
    Get all groups a user belongs to.
    """
    query = db.query(Group).join(GroupMembership).filter(GroupMembership.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    groups = query.offset(skip).limit(limit).all()
    
    return groups, total

def get_user_groups_with_counts(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[dict], int]:
    """
    Get all groups a user belongs to, including member and patient counts.
    """
    from sqlalchemy import func
    from database.models import GroupPatient
    
    query = (
        db.query(
            Group,
            func.count(GroupMembership.id.distinct()).label('member_count'),
            func.count(GroupPatient.id.distinct()).label('patient_count')
        )
        .join(GroupMembership, Group.id == GroupMembership.group_id)
        .outerjoin(GroupPatient, Group.id == GroupPatient.group_id)
        .filter(GroupMembership.user_id == user_id)
        .group_by(Group.id)
    )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    results = query.offset(skip).limit(limit).all()
    
    # Convert results to list of dictionaries
    groups_with_counts = []
    for group, member_count, patient_count in results:
        group_dict = {
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'max_patients': group.max_patients,
            'max_members': group.max_members,
            'created_at': group.created_at,
            'updated_at': group.updated_at,
            'member_count': member_count,
            'patient_count': patient_count
        }
        groups_with_counts.append(group_dict)
    
    return groups_with_counts, total

def get_group_membership(db: Session, membership_id: int) -> Optional[GroupMembership]:
    """
    Get a specific group membership by ID.
    """
    return db.query(GroupMembership).filter(GroupMembership.id == membership_id).first()

def get_user_membership_in_group(db: Session, user_id: int, group_id: int) -> Optional[GroupMembership]:
    """
    Get a user's membership in a specific group.
    """
    return db.query(GroupMembership).filter(
        and_(
            GroupMembership.user_id == user_id,
            GroupMembership.group_id == group_id
        )
    ).first()

def is_user_member_of_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user is a member of a group.
    """
    membership = get_user_membership_in_group(db, user_id, group_id)
    return membership is not None

def is_user_admin_of_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Check if a user is an admin of a group.
    """
    membership = get_user_membership_in_group(db, user_id, group_id)
    return membership is not None and membership.role == "admin"

def add_user_to_group(db: Session, group_id: int, membership_data: GroupMembershipCreate, invited_by: int) -> Optional[GroupMembership]:
    """
    Add a user to a group.
    """
    # Check if user is already a member
    existing_membership = get_user_membership_in_group(db, membership_data.user_id, group_id)
    if existing_membership:
        return existing_membership
    
    # Check if group exists
    group = get_group(db, group_id)
    if not group:
        return None
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == membership_data.user_id).first()
    if not user:
        return None
    
    # Check group member limit
    current_member_count = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).count()
    if current_member_count >= group.max_members:
        raise ValueError("Group member limit reached")
    
    # Create membership
    membership = GroupMembership(
        group_id=group_id,
        user_id=membership_data.user_id,
        role=membership_data.role,
        invited_by=invited_by
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership

def update_group_membership(db: Session, membership_id: int, membership_update: GroupMembershipCreate) -> Optional[GroupMembership]:
    """
    Update a group membership (role only).
    """
    membership = get_group_membership(db, membership_id)
    if not membership:
        return None
    
    membership.role = membership_update.role
    db.commit()
    db.refresh(membership)
    return membership

def remove_user_from_group(db: Session, user_id: int, group_id: int) -> bool:
    """
    Remove a user from a group.
    """
    membership = get_user_membership_in_group(db, user_id, group_id)
    if not membership:
        return False
    
    db.delete(membership)
    db.commit()
    return True

# --- Group Patient Assignment CRUD Operations ---

def get_group_patients(
    db: Session,
    group_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[GroupPatient], int]:
    """
    Get all patients assigned to a specific group.
    """
    query = db.query(GroupPatient).filter(GroupPatient.group_id == group_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    patients = query.offset(skip).limit(limit).all()
    
    return patients, total

def get_patient_groups(
    db: Session,
    patient_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Group], int]:
    """
    Get all groups a patient is assigned to.
    """
    query = db.query(Group).join(GroupPatient).filter(GroupPatient.patient_id == patient_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    groups = query.offset(skip).limit(limit).all()
    
    return groups, total

def get_group_patient_assignment(db: Session, assignment_id: int) -> Optional[GroupPatient]:
    """
    Get a specific group-patient assignment by ID.
    """
    return db.query(GroupPatient).filter(GroupPatient.id == assignment_id).first()

def is_patient_assigned_to_group(db: Session, patient_id: int, group_id: int) -> bool:
    """
    Check if a patient is assigned to a group.
    """
    assignment = db.query(GroupPatient).filter(
        and_(
            GroupPatient.patient_id == patient_id,
            GroupPatient.group_id == group_id
        )
    ).first()
    return assignment is not None

def assign_patient_to_group(db: Session, group_id: int, assignment_data: GroupPatientCreate, assigned_by: int) -> Optional[GroupPatient]:
    """
    Assign a patient to a group.
    """
    # Check if patient is already assigned
    existing_assignment = db.query(GroupPatient).filter(
        and_(
            GroupPatient.patient_id == assignment_data.patient_id,
            GroupPatient.group_id == group_id
        )
    ).first()
    if existing_assignment:
        return existing_assignment
    
    # Check if group exists
    group = get_group(db, group_id)
    if not group:
        return None
    
    # Check if patient exists
    patient = db.query(Patient).filter(Patient.patient_id == assignment_data.patient_id).first()
    if not patient:
        return None
    
    # Check group patient limit
    current_patient_count = db.query(GroupPatient).filter(GroupPatient.group_id == group_id).count()
    if current_patient_count >= group.max_patients:
        raise ValueError("Group patient limit reached")
    
    # Create assignment
    assignment = GroupPatient(
        group_id=group_id,
        patient_id=assignment_data.patient_id,
        assigned_by=assigned_by
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

def remove_patient_from_group(db: Session, patient_id: int, group_id: int) -> bool:
    """
    Remove a patient from a group.
    """
    assignment = db.query(GroupPatient).filter(
        and_(
            GroupPatient.patient_id == patient_id,
            GroupPatient.group_id == group_id
        )
    ).first()
    
    if not assignment:
        return False
    
    db.delete(assignment)
    db.commit()
    return True

def get_group_with_members_and_patients(db: Session, group_id: int) -> Optional[Group]:
    """
    Get a group with its members and patients.
    """
    return db.query(Group).filter(Group.id == group_id).first()