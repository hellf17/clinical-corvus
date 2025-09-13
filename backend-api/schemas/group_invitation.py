from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class GroupInvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    REVOKED = "revoked"
    EXPIRED = "expired"

class GroupInvitationBase(BaseModel):
    group_id: int
    email: str = Field(..., description="Email of the invited user")
    role: str = Field("member", description="Role to be assigned when accepted")

class GroupInvitationCreate(GroupInvitationBase):
    pass

class GroupInvitationUpdate(BaseModel):
    role: Optional[str] = Field(None, description="Role to be assigned when accepted")

class GroupInvitationAccept(BaseModel):
    token: str = Field(..., description="Invitation token")

class GroupInvitationDecline(BaseModel):
    token: str = Field(..., description="Invitation token")

class GroupInvitationRevoke(BaseModel):
    id: int = Field(..., description="Invitation ID")

class GroupInvitation(GroupInvitationBase):
    id: int
    invited_by_user_id: int
    token: str
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime
    status: GroupInvitationStatus

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    model_config = ConfigDict(from_attributes=True)

class GroupInvitationListResponse(BaseModel):
    items: List[GroupInvitation]
    total: int