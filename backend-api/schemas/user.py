from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    """Schema for creating a user (via OAuth or directly)"""
    pass

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")

class UserRoleUpdate(BaseModel):
    """Schema for updating a user's role"""
    role: str = Field(..., description="User role (doctor or patient)")

class User(UserBase):
    """Schema for fully representing a user, used in responses"""
    user_id: int
    created_at: datetime
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserInDB(User):
    """Schema for internal representation (not exposed in API)"""
    pass

# --- Authentication Status Schema ---
class AuthStatus(BaseModel):
    is_authenticated: bool
    user: Optional[User] = None

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token expiration time in seconds")

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    user_id: Optional[int] = None
    name: Optional[str] = None
    exp: Optional[datetime] = None 