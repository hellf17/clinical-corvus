from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Import Clerk SDK (official)
from clerk_backend_api import Clerk
from clerk_backend_api import ClerkErrors, SDKError
# ClerkHttpResponseError is not available in clerk_backend_api, we'll handle this differently

import config # WAS: from .config import get_settings
# Adjust UserCreate schema if needed to include clerk_user_id or rely on request state
import schemas.user as user_schemas # WAS: from .schemas.user import UserCreate, User as UserSchema
import schemas as base_schemas # WAS: from .schemas import AuthStatus
import database.models as db_models # WAS: from .database.models import User as UserModel
import database # WAS: from .database import get_db
# Import the function directly from its module
import crud.associations as crud_associations # WAS: from .crud.associations import is_doctor_assigned_to_patient

settings = config.get_settings()

# Initialize Clerk client with the secret key
# Ensure your CLERK_SECRET_KEY is set in your environment or .env file
clerk_client = Clerk(bearer_auth=settings.clerk_secret_key)

# Scheme for extracting token from Authorization header
http_bearer_scheme = HTTPBearer(auto_error=False) # auto_error=False to handle missing token gracefully

async def get_verified_clerk_session_data(
    request: Request,
    token_credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme)
) -> Optional[dict]:
    # First, try to get JWT token from Authorization header
    jwt_token = None
    if token_credentials:
        jwt_token = token_credentials.credentials
    
    # If no JWT token, try session token from cookies as fallback
    session_token = request.cookies.get("__session")
    
    if jwt_token:
        # Handle JWT token validation using PyJWT library
        try:
            import jwt
            import requests
            import json
            
            # Get Clerk's public keys from JWKS endpoint
            jwks_url = f"https://api.clerk.dev/v1/jwks"
            try:
                jwks_response = requests.get(jwks_url, timeout=10)
                jwks = jwks_response.json()
                
                # Decode JWT header to get key ID
                unverified_header = jwt.get_unverified_header(jwt_token)
                kid = unverified_header.get('kid')
                
                # Find the right key
                key = None
                for jwk_key in jwks['keys']:
                    if jwk_key['kid'] == kid:
                        key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk_key))
                        break
                
                if not key:
                    raise Exception("Unable to find appropriate key")
                
                # Verify and decode the JWT token
                decode_kwargs = {
                    "algorithms": ['RS256'],
                    "options": {"verify_exp": True},
                }
                # Enable audience check if provided in settings
                try:
                    from config import get_settings as _get_settings
                    _settings = _get_settings()
                    if getattr(_settings, 'clerk_jwt_audience', None):
                        decode_kwargs["audience"] = _settings.clerk_jwt_audience
                    else:
                        # Explicitly disable audience verification when not configured
                        decode_kwargs["options"]["verify_aud"] = False
                except Exception:
                    decode_kwargs["options"]["verify_aud"] = False

                verified_claims = jwt.decode(jwt_token, key, **decode_kwargs)

                # Optional issuer check
                try:
                    if getattr(_settings, 'clerk_jwt_issuer', None):
                        if verified_claims.get('iss') != _settings.clerk_jwt_issuer:
                            raise Exception("Invalid token issuer")
                except Exception:
                    # If settings not available here, skip issuer check
                    pass
                
                if verified_claims and 'sub' in verified_claims:
                    return {"user_id": verified_claims['sub'], "session_id": verified_claims.get('sid', 'jwt-session')}
                return None
                
            except Exception as jwks_error:
                print(f"JWKS verification failed: {jwks_error}")
                # Development convenience only: allow unverified decode outside production
                try:
                    from config import get_settings as _get_settings
                    _settings = _get_settings()
                    if _settings.environment != 'production':
                        unverified_claims = jwt.decode(jwt_token, options={"verify_signature": False})
                        if unverified_claims and 'sub' in unverified_claims:
                            print("WARNING: Using unverified JWT token (non-production only)")
                            return {"user_id": unverified_claims['sub'], "session_id": unverified_claims.get('sid', 'jwt-session')}
                except Exception as decode_error:
                    print(f"JWT decode (non-production) failed: {decode_error}")
                    
        except Exception as e:
            # JWT verification failed, try session token as fallback
            print(f"JWT verification failed: {e}, trying session token fallback")
            if not session_token:
                return None
    
    # Only allow cookie-based session fallback outside production to reduce CSRF risk
    allow_cookie_fallback = True
    try:
        from config import get_settings as _get_settings
        if _get_settings().environment == 'production':
            allow_cookie_fallback = False
    except Exception:
        pass

    if session_token and allow_cookie_fallback:
        # Handle session token validation (original logic)
        try:
            session_result = clerk_client.sessions.verify_session(session_token=session_token)
            # Handle case where SDK returns a tuple
            if isinstance(session_result, tuple):
                session = session_result[0] if session_result else None
            else:
                session = session_result

            if session and hasattr(session, 'user_id') and session.user_id:
                return {"user_id": session.user_id, "session_id": getattr(session, 'id', 'session-id')}
            return None
        except (ClerkErrors, SDKError) as e:
            # Handle session verification errors
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        except Exception as e:
            # Handle any other authentication errors
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
    elif session_token and not allow_cookie_fallback:
        # Explicitly ignore cookie fallback in production
        return None
    
    # If both JWT and session validation failed, return None (no authentication)
    return None

# --- Authentication Dependencies (Clerk based) ---

async def get_current_user(
    request: Request,
    verified_session_data: Optional[dict] = Depends(get_verified_clerk_session_data),
    db: Session = Depends(database.get_db)
) -> Optional[db_models.User]:
    """
    Dependency that retrieves the user from the DB based on the verified Clerk session.
    If the user is not found by Clerk ID but the session is valid, 
    it attempts to sync (create or link) the user using sync_clerk_user.
    Returns the user if authenticated and found/synced, or None otherwise.
    """
    if not verified_session_data or "user_id" not in verified_session_data:
        # No valid session or user_id could be extracted
        return None
        
    clerk_user_id = verified_session_data["user_id"]
    
    user = get_user_by_clerk_id(db, clerk_user_id)

    if user:
        # Optionally, re-sync critical fields or check if user is still active in Clerk if needed here.
        # For now, if user exists locally, return it.
        return user
    else:
        # User not found locally, try to sync from Clerk
        print(f"User with Clerk ID {clerk_user_id} not found locally. Attempting sync.")
        try:
            # Pass the whole verified_session_data which contains user_id
            synced_user = sync_clerk_user(db=db, clerk_session_data=verified_session_data)
            return synced_user
        except HTTPException as e:
            # Sync failed (e.g., user not found in Clerk, API error)
            print(f"Sync failed for Clerk user {clerk_user_id}: {e.detail}")
            # Depending on the error from sync_clerk_user, decide if this should be None or re-raise
            return None 
        except Exception as e:
            print(f"Unexpected error during sync for Clerk user {clerk_user_id}: {e}")
            return None

def get_user_group_memberships(db: Session, user_id: int):
    """Get all group memberships for a user."""
    from database.models import GroupMembership
    return db.query(GroupMembership).filter(GroupMembership.user_id == user_id).all()

async def get_current_user_with_groups(
    request: Request,
    verified_session_data: Optional[dict] = Depends(get_verified_clerk_session_data),
    db: Session = Depends(database.get_db)
) -> Optional[db_models.User]:
    """
    Dependency that retrieves the user from the DB based on the verified Clerk session,
    including their group memberships.
    If the user is not found by Clerk ID but the session is valid,
    it attempts to sync (create or link) the user using sync_clerk_user.
    Returns the user if authenticated and found/synced, or None otherwise.
    """
    if not verified_session_data or "user_id" not in verified_session_data:
        # No valid session or user_id could be extracted
        return None
        
    clerk_user_id = verified_session_data["user_id"]
    
    user = get_user_by_clerk_id(db, clerk_user_id)

    if user:
        # Optionally, re-sync critical fields or check if user is still active in Clerk if needed here.
        # For now, if user exists locally, return it.
        # Add group memberships to user object
        user.group_memberships = get_user_group_memberships(db, user.user_id)
        return user
    else:
        # User not found locally, try to sync from Clerk
        print(f"User with Clerk ID {clerk_user_id} not found locally. Attempting sync.")
        try:
            # Pass the whole verified_session_data which contains user_id
            synced_user = sync_clerk_user(db=db, clerk_session_data=verified_session_data)
            # Add group memberships to user object
            if synced_user:
                synced_user.group_memberships = get_user_group_memberships(db, synced_user.user_id)
            return synced_user
        except HTTPException as e:
            # Sync failed (e.g., user not found in Clerk, API error)
            print(f"Sync failed for Clerk user {clerk_user_id}: {e.detail}")
            # Depending on the error from sync_clerk_user, decide if this should be None or re-raise
            return None
        except Exception as e:
            print(f"Unexpected error during sync for Clerk user {clerk_user_id}: {e}")
            return None

async def get_current_user_required(
    current_user: Optional[db_models.User] = Depends(get_current_user),
) -> db_models.User:
    """
    Dependency that requires authentication via Clerk. Raises 401 if no valid session/user.
    Use this for protected endpoints.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            # headers={"WWW-Authenticate": "Bearer"}, # Clerk handles WWW-Authenticate
        )
    return current_user

async def get_current_user_optional(
    current_user: Optional[db_models.User] = Depends(get_current_user),
) -> Optional[db_models.User]:
    """
    Dependency that optionally retrieves the current user via Clerk.
    Returns None if no valid session/user.
    Use this for endpoints that work with or without authentication.
    """
    return current_user

# --- User Functions (Updated for Clerk) ---

def get_user_by_clerk_id(db: Session, clerk_user_id: str) -> Optional[db_models.User]:
    """Retrieves a user by Clerk User ID from the database."""
    return db.query(db_models.User).filter(db_models.User.clerk_user_id == clerk_user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[db_models.User]:
    """Retrieves a user by email from the database."""
    return db.query(db_models.User).filter(db_models.User.email == email).first()

def create_user_from_clerk(db: Session, clerk_user_id: str, email: str, name: Optional[str] = None, role: Optional[str] = "guest") -> db_models.User:
    """Creates a new user in the database using Clerk info."""
    db_user = db_models.User(
        clerk_user_id=clerk_user_id,
        email=email,
        name=name,
        role=role # Consider syncing role from Clerk metadata if used
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def sync_clerk_user(db: Session, clerk_session_data: dict) -> db_models.User:
    clerk_user_id = clerk_session_data.get("user_id")
    if not clerk_user_id:
        raise HTTPException(status_code=400, detail="Clerk user ID not found in session data")

    try:
        # Use the official SDK to get user details
        user_obj = clerk_client.users.get(user_id=clerk_user_id)
        if not user_obj:
            raise HTTPException(status_code=404, detail=f"Could not fetch details for Clerk user {clerk_user_id}")
        
        email = ""
        if user_obj.email_addresses and len(user_obj.email_addresses) > 0:
            primary_email_obj = next((e for e in user_obj.email_addresses if e.id == user_obj.primary_email_address_id), None)
            if primary_email_obj:
                email = primary_email_obj.email_address
            elif user_obj.email_addresses[0].email_address: # Fallback to first email if primary not found or not verified
                email = user_obj.email_addresses[0].email_address
        
        name = f"{user_obj.first_name or ''} {user_obj.last_name or ''}".strip() or None

        # --- Role Synchronization ---
        # Default to "guest" if no specific role is found in Clerk or if it's an unrecognized value.
        # This aligns with the User model's default role.
        db_user_role = "guest"

        if user_obj.public_metadata and isinstance(user_obj.public_metadata, dict):
            clerk_role = user_obj.public_metadata.get("role") # Key is 'role' based on frontend
            
            if clerk_role == "doctor":
                db_user_role = "doctor"
            elif clerk_role == "patient":
                db_user_role = "patient"
            # Add other mappings if necessary, e.g., for "student"
            # elif clerk_role == "student":
            #     db_user_role = "student"
            # If clerk_role is something else, it remains the default (e.g., "guest")

        # Check if user exists by Clerk ID
        db_user = get_user_by_clerk_id(db, clerk_user_id)

        if db_user:
            # Update existing user
            db_user.email = email # Keep email in sync
            db_user.role = db_user_role # Update role
            db_user.name = name # Update name
        else:
            # Create new user
            user_data_for_creation = {
                "clerk_user_id": clerk_user_id,
                "email": email,
                "role": db_user_role,
                "name": name
            }
            db_user = db_models.User(**user_data_for_creation)
            db.add(db_user)
        
        db.commit()
        db.refresh(db_user)
        return db_user

    except Exception as e:
        db.rollback()
        print(f"Clerk HTTP error during user sync for {clerk_user_id}: {e}")
        
        # Handle specific HTTP status codes if available
        if hasattr(e, 'status_code') and e.status_code == 404:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="User not found in Clerk")
        elif hasattr(e, 'status_code') and 400 <= e.status_code < 500:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid request: {str(e)}")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Clerk service error: {str(e)}")
    except (ClerkErrors, SDKError) as e:
        db.rollback()
        print(f"Clerk error during user sync for {clerk_user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to sync Clerk user due to an unexpected error.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error during user sync for {clerk_user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync Clerk user due to an unexpected error.")


# --- Auth Status (Can remain similar, uses get_current_user) ---

def get_auth_status(current_user: Optional[db_models.User] = Depends(get_current_user)) -> base_schemas.AuthStatus:
    """Generates an AuthStatus response with the current authentication state."""
    if current_user:
        return base_schemas.AuthStatus(
            is_authenticated=True,
            user=user_schemas.User.model_validate(current_user) # Ensure User schema includes clerk_user_id if needed client-side
        )
    else:
        return base_schemas.AuthStatus(
            is_authenticated=False,
            user=None
        )

# --- Password Functions (Likely unused with Clerk, can be removed later) ---
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

# --- Authorization Dependencies ---

async def verify_doctor_patient_access(
    patient_id: int, # Get patient_id from path parameter
    current_user: db_models.User = Depends(get_current_user_required),
    db: Session = Depends(database.get_db)
) -> db_models.User:
    """
    Dependency to verify that the current user is a doctor AND 
    is assigned to the requested patient_id.
    Raises 403 Forbidden if not authorized.
    Returns the validated current_user if authorized.
    """
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: User is not a doctor."
        )
    
    if not crud_associations.is_doctor_assigned_to_patient(db, doctor_user_id=current_user.user_id, patient_patient_id=patient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Doctor not assigned to this patient."
        )
        
    return current_user

# --- Group Token Refresh Mechanism ---

async def refresh_user_group_token(
    current_user: db_models.User = Depends(get_current_user_required),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Refresh the user's group access token.
    This function generates a new token with updated group claims.
    
    Args:
        current_user: The authenticated user
        db: Database session
        
    Returns:
        dict: New token with updated group claims
    """
    try:
        # Get user's current group memberships
        group_memberships = get_user_group_memberships(db, current_user.user_id)
        
        # Create group claims
        group_claims = []
        for membership in group_memberships:
            group_claims.append({
                "group_id": membership.group_id,
                "role": membership.role
            })
        
        # Generate new token with updated group claims
        # Note: In a real implementation, this would integrate with Clerk's token refresh mechanism
        # For now, we'll return a mock token with updated claims
        new_token = {
            "user_id": current_user.clerk_user_id,
            "groups": group_claims,
            "expires_at": datetime.now(timezone.utc).timestamp() + 3600  # 1 hour from now
        }
        
        return new_token
    except Exception as e:
        print(f"Error refreshing group token for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh group access token"
        )

# --- Group Session Encryption ---

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

# Generate a key for encryption (in production, this should be stored securely)
def get_encryption_key() -> bytes:
    """Get the Fernet key (base64 urlsafe 32-byte) for group session data."""
    from config import get_settings as _get_settings
    settings_local = _get_settings()

    key_str = os.environ.get("GROUP_SESSION_ENCRYPTION_KEY")
    if not key_str:
        if settings_local.environment == 'production':
            raise HTTPException(status_code=500, detail="Missing GROUP_SESSION_ENCRYPTION_KEY in production")
        # Development only: generate ephemeral key
        key_bytes = Fernet.generate_key()
        print("WARNING: Generated ephemeral encryption key (development only). Set GROUP_SESSION_ENCRYPTION_KEY for persistence.")
        return key_bytes

    # Fernet expects the base64 urlsafe key bytes; do not decode
    return key_str.encode()

def encrypt_group_session_data(data: dict) -> str:
    """
    Encrypt group session data.
    
    Args:
        data: Dictionary containing group session data
        
    Returns:
        str: Encrypted data as a base64 encoded string
    """
    try:
        # Convert data to JSON string
        import json
        data_str = json.dumps(data)
        
        # Get encryption key
        key = get_encryption_key()
        
        # Create Fernet cipher
        cipher = Fernet(key)
        
        # Encrypt data
        encrypted_data = cipher.encrypt(data_str.encode())
        
        # Return as base64 encoded string
        return base64.urlsafe_b64encode(encrypted_data).decode()
    except Exception as e:
        print(f"Error encrypting group session data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encrypt group session data"
        )

def decrypt_group_session_data(encrypted_data: str) -> dict:
    """
    Decrypt group session data.
    
    Args:
        encrypted_data: Base64 encoded encrypted data string
        
    Returns:
        dict: Decrypted data as a dictionary
    """
    try:
        # Get encryption key
        key = get_encryption_key()
        
        # Create Fernet cipher
        cipher = Fernet(key)
        
        # Decode base64 encoded data
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
        
        # Decrypt data
        decrypted_data = cipher.decrypt(encrypted_bytes)
        
        # Convert JSON string back to dictionary
        import json
        data = json.loads(decrypted_data.decode())
        
        return data
    except Exception as e:
        print(f"Error decrypting group session data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt group session data"
        )

# --- Audit Logging ---

import logging

# Create audit logger
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# Create file handler for audit logs (in production, use a proper log management system)
audit_handler = logging.FileHandler("audit.log")
audit_handler.setLevel(logging.INFO)

# Create formatter for audit logs
audit_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
audit_handler.setFormatter(audit_formatter)

# Add handler to audit logger
audit_logger.addHandler(audit_handler)

def log_authentication_event(
    user_id: int,
    event_type: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None
) -> None:
    """
    Log an authentication event for audit purposes.
    
    Args:
        user_id: ID of the user involved in the event
        event_type: Type of authentication event (e.g., "login", "logout", "failed_login")
        ip_address: IP address of the client (optional)
        user_agent: User agent string (optional)
        details: Additional details about the event (optional)
    """
    try:
        # Create log message
        log_data = {
            "user_id": user_id,
            "event_type": event_type,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details
        }
        
        # Log the event
        audit_logger.info(f"Authentication Event: {log_data}")
    except Exception as e:
        print(f"Error logging authentication event: {e}")
        # Don't raise an exception here as we don't want logging failures to break the application

def log_group_access_event(
    user_id: int,
    group_id: int,
    action: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None
) -> None:
    """
    Log a group access event for audit purposes.
    
    Args:
        user_id: ID of the user involved in the event
        group_id: ID of the group being accessed
        action: Action being performed (e.g., "view", "edit", "delete")
        ip_address: IP address of the client (optional)
        user_agent: User agent string (optional)
        details: Additional details about the event (optional)
    """
    try:
        # Create log message
        log_data = {
            "user_id": user_id,
            "group_id": group_id,
            "action": action,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details
        }
        
        # Log the event
        audit_logger.info(f"Group Access Event: {log_data}")
    except Exception as e:
        print(f"Error logging group access event: {e}")
        # Don't raise an exception here as we don't want logging failures to break the application

# --- Deprecated JWT/Cookie functions removed ---

# Add a dummy function to allow old tests to be collected
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    This is a dummy function to allow old tests to be collected.
    It does not generate a valid token.
    """
    return "dummy-token"
