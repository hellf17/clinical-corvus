from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from schemas.group import (
    GroupCreate, GroupUpdate, Group, GroupListResponse, GroupWithCounts, GroupWithCountsListResponse,
    GroupMembershipCreate, GroupMembershipUpdate, GroupMembership, GroupMembershipListResponse,
    GroupPatientCreate, GroupPatient, GroupPatientListResponse,
    GroupWithMembersAndPatients
)
from schemas.group_invitation import (
    GroupInvitationCreate, GroupInvitationUpdate, GroupInvitation,
    GroupInvitationAccept, GroupInvitationDecline, GroupInvitationRevoke,
    GroupInvitationListResponse
)
from schemas.patient import PatientSummary
from models import User, Patient, Group as GroupModel, GroupMembership as GroupMembershipModel
from security import get_current_user_required
import crud.groups as groups_crud
import crud.patients as patients_crud
import services.group_invitations as group_invitations_service
import logging
from utils.group_authorization import invalidate_user_group_cache
from utils.group_permissions import (
    is_user_admin_of_group,
    can_user_invite_members,
    can_user_remove_members,
    can_user_change_member_role,
    can_user_assign_patients,
    can_user_remove_patients
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Groups"])

# --- Group CRUD Endpoints ---

@router.post("/", response_model=Group, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Create a new group.
    The creator automatically becomes an admin member of the group.
    """
    try:
        # Check if group with this name already exists
        existing_group = groups_crud.get_group_by_name(db, group_data.name)
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group with this name already exists"
            )

        # Create the group
        group = groups_crud.create_group(db, group_data, current_user.user_id)
        return group
    except HTTPException:
        # Re-raise HTTP exceptions (including the 400 for duplicate names)
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group"
        )

@router.get("/", response_model=GroupWithCountsListResponse)
def list_groups(
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search term for group names"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_counts: bool = Query(True, description="Include member and patient counts")
):
    """
    List all groups the current user belongs to.
    """
    try:
        if include_counts:
            groups, total = groups_crud.get_user_groups_with_counts(db, current_user.user_id, skip, limit)
            return GroupWithCountsListResponse(items=groups, total=total)
        else:
            groups, total = groups_crud.get_user_groups(db, current_user.user_id, skip, limit)
            return GroupListResponse(items=groups, total=total)
    except Exception as e:
        logger.error(f"Error listing groups: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list groups"
        )

@router.get("/{group_id}", response_model=GroupWithMembersAndPatients)
def get_group(
    group_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Get a specific group by ID, including its members and patients.
    Only members of the group can access this information.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        group = groups_crud.get_group_with_members_and_patients(db, group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        return group
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get group"
        )

@router.put("/{group_id}", response_model=Group)
def update_group(
    group_id: int,
    group_update: GroupUpdate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Update a group.
    Only admin members can update the group.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Check if user is an admin
        if not groups_crud.is_user_admin_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can update group information"
            )
        
        # Check if a group with the new name already exists (if name is being updated)
        if group_update.name:
            existing_group = groups_crud.get_group_by_name(db, group_update.name)
            if existing_group and existing_group.id != group_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A group with this name already exists"
                )
        
        group = groups_crud.update_group(db, group_id, group_update)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        return group
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group"
        )

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Delete a group.
    Only admin members can delete the group.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Check if user is an admin
        if not groups_crud.is_user_admin_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can delete the group"
            )
        
        success = groups_crud.delete_group(db, group_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete group"
        )

# --- Group Membership Endpoints ---

@router.post("/{group_id}/members", response_model=GroupMembership, status_code=status.HTTP_201_CREATED)
def invite_user_to_group(
    group_id: int,
    membership_data: GroupMembershipCreate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Invite a user to a group.
    Only admin members can invite users.
    """
    try:
        # Check if user can invite members
        if not can_user_invite_members(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can invite users"
            )
        
        # Check if the user being invited exists
        user = db.query(User).filter(User.user_id == membership_data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        membership = groups_crud.add_user_to_group(db, group_id, membership_data, current_user.user_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Invalidate the user's group cache
        invalidate_user_group_cache(membership_data.user_id)
        
        return membership
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting user to group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite user to group"
        )

@router.get("/{group_id}/members", response_model=GroupMembershipListResponse)
def list_group_members(
    group_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all members of a group.
    Only members of the group can access this information.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        memberships, total = groups_crud.get_group_memberships(db, group_id, skip, limit)
        return GroupMembershipListResponse(items=memberships, total=total)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing group members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list group members"
        )

@router.put("/{group_id}/members/{user_id}", response_model=GroupMembership)
def update_group_member_role(
    group_id: int,
    user_id: int,
    membership_update: GroupMembershipUpdate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Update a member's role in a group.
    Only admin members can update roles, and admins cannot change their own role.
    """
    try:
        # Check if user can change member roles
        if not can_user_change_member_role(db, current_user.user_id, group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can update member roles"
            )
        
        # Admins cannot change their own role
        if current_user.user_id == user_id and membership_update.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot remove their own admin status"
            )
        
        # Get the membership to update
        membership = groups_crud.get_user_membership_in_group(db, user_id, group_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this group"
            )
        
        # Update the membership
        updated_membership = groups_crud.update_group_membership(db, membership.id, membership_update)
        if not updated_membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Membership not found"
            )
        
        # Invalidate the user's group cache
        invalidate_user_group_cache(user_id)
        
        return updated_membership
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating group member role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group member role"
        )

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_group(
    group_id: int,
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Remove a user from a group.
    Admins can remove any member, members can remove themselves.
    Admins cannot remove themselves unless there's another admin.
    """
    try:
        # Check if the user being removed exists and is a member
        membership = groups_crud.get_user_membership_in_group(db, user_id, group_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this group"
            )
        
        # Check if user can remove members
        if not can_user_remove_members(db, current_user.user_id, group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to remove this member"
            )
        else:
            # Removing self - check if admin and if there are other admins
            if membership.role == "admin":
                # Count other admins
                other_admins = db.query(GroupMembershipModel).filter(
                    and_(
                        GroupMembershipModel.group_id == group_id,
                        GroupMembershipModel.user_id != user_id,
                        GroupMembershipModel.role == "admin"
                    )
                ).count()
                
                if other_admins == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove the last admin from the group"
                    )
        
        success = groups_crud.remove_user_from_group(db, user_id, group_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Membership not found"
            )
        
        # Invalidate the user's group cache
        invalidate_user_group_cache(user_id)
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing user from group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove user from group"
        )

# --- Group Patient Assignment Endpoints ---

@router.post("/{group_id}/patients", response_model=GroupPatient, status_code=status.HTTP_201_CREATED)
def assign_patient_to_group(
    group_id: int,
    assignment_data: GroupPatientCreate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Assign a patient to a group.
    Only admin members can assign patients.
    """
    try:
        # Check if user can assign patients
        if not can_user_assign_patients(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can assign patients"
            )
        
        # Check if the patient exists
        patient = db.query(Patient).filter(Patient.patient_id == assignment_data.patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Check if patient is already assigned to the group
        if groups_crud.is_patient_assigned_to_group(db, assignment_data.patient_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient is already assigned to this group"
            )
        
        assignment = groups_crud.assign_patient_to_group(db, group_id, assignment_data, current_user.user_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        return assignment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning patient to group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign patient to group"
        )

@router.get("/{group_id}/patients", response_model=GroupPatientListResponse)
def list_group_patients(
    group_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all patients assigned to a group.
    Only members of the group can access this information.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        assignments, total = groups_crud.get_group_patients(db, group_id, skip, limit)
        
        # Get patient details for each assignment
        patients = []
        for assignment in assignments:
            patient = db.query(Patient).filter(Patient.patient_id == assignment.patient_id).first()
            if patient:
                patients.append(assignment)
        
        return GroupPatientListResponse(items=patients, total=total)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing group patients: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list group patients"
        )

@router.delete("/{group_id}/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_patient_from_group(
    group_id: int,
    patient_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Remove a patient from a group.
    Only admin members can remove patients.
    """
    try:
        # Check if user can remove patients
        if not can_user_remove_patients(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can remove patients"
            )
        
        # Check if patient is assigned to the group
        if not groups_crud.is_patient_assigned_to_group(db, patient_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient is not assigned to this group"
            )
        
        success = groups_crud.remove_patient_from_group(db, patient_id, group_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient assignment not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing patient from group: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove patient from group"
        )

# --- Group Invitation Endpoints ---

@router.post("/{group_id}/invitations", response_model=GroupInvitation, status_code=status.HTTP_201_CREATED)
def create_group_invitation(
    group_id: int,
    invitation_data: GroupInvitationCreate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Create a new group invitation.
    Only admin members can create invitations.
    """
    try:
        # Check if user can invite members
        if not can_user_invite_members(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can invite users"
            )
        
        # Verify the group exists
        group = groups_crud.get_group(db, group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Create the invitation
        invitation = group_invitations_service.create_group_invitation(
            db, invitation_data, current_user.user_id
        )
        
        return invitation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating group invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group invitation"
        )

@router.get("/{group_id}/invitations", response_model=GroupInvitationListResponse)
def list_group_invitations(
    group_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all invitations for a group.
    Only members of the group can access this information.
    """
    try:
        # Check if user is a member of the group
        if not groups_crud.is_user_member_of_group(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        invitations, total = group_invitations_service.get_group_invitations(db, group_id, skip, limit)
        return GroupInvitationListResponse(items=invitations, total=total)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing group invitations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list group invitations"
        )

@router.put("/{group_id}/invitations/{invitation_id}", response_model=GroupInvitation)
def update_group_invitation(
    group_id: int,
    invitation_id: int,
    invitation_update: GroupInvitationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Update a group invitation.
    Only admin members can update invitations.
    """
    try:
        # Check if user can invite members
        if not can_user_invite_members(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can update invitations"
            )
        
        # Verify the group exists
        group = groups_crud.get_group(db, group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Update the invitation
        invitation = group_invitations_service.update_group_invitation(
            db, invitation_id, invitation_update
        )
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )
        
        return invitation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating group invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group invitation"
        )

@router.delete("/{group_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_group_invitation(
    group_id: int,
    invitation_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Revoke a group invitation.
    Only admin members can revoke invitations.
    """
    try:
        # Check if user can invite members
        if not can_user_invite_members(db, current_user.user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group admins can revoke invitations"
            )
        
        # Verify the group exists
        group = groups_crud.get_group(db, group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Revoke the invitation
        invitation = group_invitations_service.revoke_group_invitation(db, invitation_id)
        
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking group invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke group invitation"
        )

@router.post("/invitations/accept", response_model=GroupInvitation)
def accept_group_invitation(
    invitation_data: GroupInvitationAccept,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Accept a group invitation.
    Any authenticated user can accept an invitation sent to their email.
    """
    try:
        invitation = group_invitations_service.accept_group_invitation(
            db, invitation_data.token, current_user.user_id
        )
        
        # Invalidate the user's group cache
        invalidate_user_group_cache(current_user.user_id)
        
        return invitation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting group invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept group invitation"
        )

@router.post("/invitations/decline", response_model=GroupInvitation)
def decline_group_invitation(
    invitation_data: GroupInvitationDecline,
    request: Request,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Decline a group invitation.
    Any authenticated user can decline an invitation sent to their email.
    """
    try:
        invitation = group_invitations_service.decline_group_invitation(
            db, invitation_data.token
        )
        
        return invitation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error declining group invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decline group invitation"
        )