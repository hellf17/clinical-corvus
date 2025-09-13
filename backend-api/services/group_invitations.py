import uuid
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Tuple
from datetime import datetime, timedelta

from database.models import GroupInvitation, Group, User, GroupMembership
from schemas.group_invitation import GroupInvitationCreate, GroupInvitationUpdate
import logging

logger = logging.getLogger(__name__)

def generate_invitation_token() -> str:
    """Generate a unique invitation token."""
    return str(uuid.uuid4())

def get_invitation_by_id(db: Session, invitation_id: int) -> Optional[GroupInvitation]:
    """Get an invitation by ID."""
    return db.query(GroupInvitation).filter(GroupInvitation.id == invitation_id).first()

def get_invitation_by_token(db: Session, token: str) -> Optional[GroupInvitation]:
    """Get an invitation by token."""
    return db.query(GroupInvitation).filter(GroupInvitation.token == token).first()

def get_pending_invitations_for_email(db: Session, email: str) -> List[GroupInvitation]:
    """Get all pending invitations for an email."""
    return db.query(GroupInvitation).filter(
        and_(
            GroupInvitation.email == email,
            GroupInvitation.accepted_at.is_(None),
            GroupInvitation.declined_at.is_(None),
            GroupInvitation.revoked_at.is_(None),
            GroupInvitation.expires_at > datetime.utcnow()
        )
    ).all()

def get_group_invitations(
    db: Session,
    group_id: int,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[GroupInvitation], int]:
    """Get all invitations for a specific group."""
    query = db.query(GroupInvitation).filter(GroupInvitation.group_id == group_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    invitations = query.order_by(GroupInvitation.created_at.desc()).offset(skip).limit(limit).all()
    
    return invitations, total

def create_group_invitation(
    db: Session,
    invitation_data: GroupInvitationCreate,
    invited_by_user_id: int
) -> GroupInvitation:
    """Create a new group invitation."""
    # Check if group exists
    group = db.query(Group).filter(Group.id == invitation_data.group_id).first()
    if not group:
        raise ValueError("Group not found")
    
    # Check if user is already a member of the group
    user = db.query(User).filter(User.email == invitation_data.email).first()
    if user:
        existing_membership = db.query(GroupMembership).filter(
            and_(
                GroupMembership.group_id == invitation_data.group_id,
                GroupMembership.user_id == user.user_id
            )
        ).first()
        if existing_membership:
            raise ValueError("User is already a member of this group")
    
    # Check if there's already a pending invitation for this email and group
    existing_invitation = db.query(GroupInvitation).filter(
        and_(
            GroupInvitation.group_id == invitation_data.group_id,
            GroupInvitation.email == invitation_data.email,
            GroupInvitation.accepted_at.is_(None),
            GroupInvitation.declined_at.is_(None),
            GroupInvitation.revoked_at.is_(None),
            GroupInvitation.expires_at > datetime.utcnow()
        )
    ).first()
    
    if existing_invitation:
        # Update the existing invitation with new role and extend expiration
        existing_invitation.role = invitation_data.role
        existing_invitation.expires_at = datetime.utcnow() + timedelta(days=7)
        existing_invitation.token = generate_invitation_token()  # Generate new token
        db.commit()
        db.refresh(existing_invitation)
        return existing_invitation
    
    # Create new invitation
    invitation = GroupInvitation(
        group_id=invitation_data.group_id,
        invited_by_user_id=invited_by_user_id,
        email=invitation_data.email,
        role=invitation_data.role,
        token=generate_invitation_token(),
        expires_at=datetime.utcnow() + timedelta(days=7)  # Expires in 7 days
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation

def update_group_invitation(
    db: Session,
    invitation_id: int,
    invitation_update: GroupInvitationUpdate
) -> Optional[GroupInvitation]:
    """Update a group invitation."""
    invitation = get_invitation_by_id(db, invitation_id)
    if not invitation:
        return None
    
    if invitation_update.role:
        invitation.role = invitation_update.role
    
    db.commit()
    db.refresh(invitation)
    return invitation

def accept_group_invitation(db: Session, token: str, user_id: int) -> GroupInvitation:
    """Accept a group invitation."""
    invitation = get_invitation_by_token(db, token)
    if not invitation:
        raise ValueError("Invitation not found")
    
    # Check if invitation is still valid
    if invitation.is_expired:
        raise ValueError("Invitation has expired")
    
    if invitation.accepted_at:
        raise ValueError("Invitation has already been accepted")
    
    if invitation.declined_at:
        raise ValueError("Invitation has been declined")
    
    if invitation.revoked_at:
        raise ValueError("Invitation has been revoked")
    
    # Check if user is already a member of the group
    existing_membership = db.query(GroupMembership).filter(
        and_(
            GroupMembership.group_id == invitation.group_id,
            GroupMembership.user_id == user_id
        )
    ).first()
    
    if existing_membership:
        raise ValueError("You are already a member of this group")
    
    # Accept the invitation
    invitation.accept()
    
    # Add user to the group
    membership = GroupMembership(
        group_id=invitation.group_id,
        user_id=user_id,
        role=invitation.role,
        invited_by=invitation.invited_by_user_id
    )
    
    db.add(membership)
    db.commit()
    db.refresh(invitation)
    return invitation

def decline_group_invitation(db: Session, token: str) -> GroupInvitation:
    """Decline a group invitation."""
    invitation = get_invitation_by_token(db, token)
    if not invitation:
        raise ValueError("Invitation not found")
    
    # Check if invitation is still valid
    if invitation.is_expired:
        raise ValueError("Invitation has expired")
    
    if invitation.accepted_at:
        raise ValueError("Invitation has already been accepted")
    
    if invitation.declined_at:
        raise ValueError("Invitation has already been declined")
    
    if invitation.revoked_at:
        raise ValueError("Invitation has been revoked")
    
    # Decline the invitation
    invitation.decline()
    db.commit()
    db.refresh(invitation)
    return invitation

def revoke_group_invitation(db: Session, invitation_id: int) -> GroupInvitation:
    """Revoke a group invitation."""
    invitation = get_invitation_by_id(db, invitation_id)
    if not invitation:
        raise ValueError("Invitation not found")
    
    # Check if invitation is already accepted
    if invitation.accepted_at:
        raise ValueError("Cannot revoke an accepted invitation")
    
    # Revoke the invitation
    invitation.revoke()
    db.commit()
    db.refresh(invitation)
    return invitation

def delete_expired_invitations(db: Session) -> int:
    """Delete all expired invitations."""
    expired_invitations = db.query(GroupInvitation).filter(
        and_(
            GroupInvitation.expires_at < datetime.utcnow(),
            GroupInvitation.accepted_at.is_(None),
            GroupInvitation.declined_at.is_(None),
            GroupInvitation.revoked_at.is_(None)
        )
    ).all()
    
    count = len(expired_invitations)
    for invitation in expired_invitations:
        db.delete(invitation)
    
    db.commit()
    return count