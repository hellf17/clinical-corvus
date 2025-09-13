from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from typing import Optional
from . import Base
from .user import User
from .group import Group

class GroupInvitation(Base):
    """Model for group invitations."""
    __tablename__ = "group_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    invited_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False, index=True)  # Email of the invited user
    token = Column(String(255), unique=True, nullable=False, index=True)  # Unique token for the invitation
    role = Column(String(50), default="member", nullable=False)  # Role to be assigned when accepted
    expires_at = Column(DateTime, nullable=False)  # Expiration time for the invitation
    accepted_at = Column(DateTime, nullable=True)  # When the invitation was accepted
    declined_at = Column(DateTime, nullable=True)  # When the invitation was declined
    revoked_at = Column(DateTime, nullable=True)  # When the invitation was revoked
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    group = relationship("Group", foreign_keys=[group_id])
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set default expiration to 7 days from now if not set
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(days=7)
    
    @property
    def is_expired(self) -> bool:
        """Check if the invitation has expired."""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_accepted(self) -> bool:
        """Check if the invitation has been accepted."""
        return self.accepted_at is not None
    
    @property
    def is_declined(self) -> bool:
        """Check if the invitation has been declined."""
        return self.declined_at is not None
    
    @property
    def is_revoked(self) -> bool:
        """Check if the invitation has been revoked."""
        return self.revoked_at is not None
    
    @property
    def is_pending(self) -> bool:
        """Check if the invitation is still pending."""
        return not self.is_accepted and not self.is_declined and not self.is_revoked and not self.is_expired
    
    def accept(self) -> None:
        """Accept the invitation."""
        if self.is_pending:
            self.accepted_at = datetime.utcnow()
    
    def decline(self) -> None:
        """Decline the invitation."""
        if self.is_pending:
            self.declined_at = datetime.utcnow()
    
    def revoke(self) -> None:
        """Revoke the invitation."""
        if self.is_pending:
            self.revoked_at = datetime.utcnow()