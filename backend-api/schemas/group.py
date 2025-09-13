from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

# --- Group Schemas ---

class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the group")
    description: Optional[str] = Field(None, max_length=1000, description="Description of the group")
    max_patients: Optional[int] = Field(100, ge=1, le=1000, description="Maximum number of patients allowed in the group")
    max_members: Optional[int] = Field(10, ge=2, le=50, description="Maximum number of members allowed in the group")

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Name of the group")
    description: Optional[str] = Field(None, max_length=1000, description="Description of the group")
    max_patients: Optional[int] = Field(None, ge=1, le=1000, description="Maximum number of patients allowed in the group")
    max_members: Optional[int] = Field(None, ge=2, le=50, description="Maximum number of members allowed in the group")

class Group(GroupBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GroupWithCounts(Group):
    member_count: int = Field(0, description="Current number of members in the group")
    patient_count: int = Field(0, description="Current number of patients assigned to the group")

# --- Group Membership Schemas ---

class GroupRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"

class GroupMembershipBase(BaseModel):
    group_id: int
    user_id: int
    role: GroupRole = GroupRole.MEMBER

class GroupMembershipCreate(BaseModel):
    user_id: int
    role: GroupRole = GroupRole.MEMBER

class GroupMembershipUpdate(BaseModel):
    role: GroupRole

class GroupMembership(GroupMembershipBase):
    id: int
    joined_at: datetime
    invited_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# --- Group Patient Assignment Schemas ---

class GroupPatientBase(BaseModel):
    group_id: int
    patient_id: int

class GroupPatientCreate(BaseModel):
    patient_id: int

class GroupPatient(GroupPatientBase):
    id: int
    assigned_at: datetime
    assigned_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# --- Response Schemas ---

class GroupWithMembersAndPatients(Group):
    members: List[GroupMembership] = []
    patients: List[GroupPatient] = []

class GroupListResponse(BaseModel):
    items: List[Group]
    total: int

class GroupWithCountsListResponse(BaseModel):
    items: List[GroupWithCounts]
    total: int

class GroupMembershipListResponse(BaseModel):
    items: List[GroupMembership]
    total: int

class GroupPatientListResponse(BaseModel):
    items: List[GroupPatient]
    total: int