from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Import Clerk specific classes
from clerk_backend_api import Clerk, models as clerk_models # Updated import for ClerkErrors
# These might need adjustment based on the new SDK's structure
# from clerk_server_sdk_python.types import SessionV1 
# from clerk_server_sdk_python.errors import ClerkAPIError

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
    token_credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme)
) -> Optional[dict]: # Returns a dict with user_id if successful
    if not token_credentials:
        # No token provided
        return None

    token = token_credentials.credentials
    try:
        response = clerk_client.clients.verify(request={"token": token}) # This is VerifyClientResponse
        
     

        # If the response is a `clerk_models.Client` object (from the `verify` operation):
        if response and response.client and response.client.session_ids and len(response.client.session_ids) > 0:
            # Take the first session_id. In a typical scenario, a user token would be linked to one primary active session.
            session_id = response.client.session_ids[0]
            
            # Now fetch the session details to get the user_id
            session_details = clerk_client.sessions.get_session(session_id=session_id)
            
            if session_details and session_details.session: # session_details is GetSessionResponse, session_details.session is Session
                if session_details.session.user_id and session_details.session.status == clerk_models.SessionStatus.ACTIVE:
                    return {"user_id": session_details.session.user_id, "session_id": session_id}
                else:
                    # Session not active or no user_id
                    print(f"Session {session_id} not active or no user_id. Status: {session_details.session.status}")
                    return None
            else:
                # Could not fetch session details
                print(f"Could not fetch details for session {session_id}")
                return None
        else:
            # Verification failed or no active sessions found linked to the token via client.verify
            print("Token verification via client.verify did not yield active sessions.")
            return None

    except clerk_models.ClerkErrors as e:
        # Handle Clerk-specific errors (e.g., 400, 401, 404)
        # Log the error for debugging
        print(f"Clerk API error during token verification: {e.status_code} - {e.body}")
        # Depending on the error, you might want to map it to HTTPException
        # For example, a 401 could be an invalid token.
        if e.status_code == 401: # Unauthorized
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # For other Clerk errors, re-raise or handle as appropriate
        # For now, treat other Clerk errors as server-side issues if not 401
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clerk authentication error: {e.detail if hasattr(e, 'detail') else e.body}",
        )
    except Exception as e:
        # Handle other unexpected errors
        print(f"Unexpected error during token verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during authentication.",
        )

# --- Authentication Dependencies (Clerk based) ---

async def get_current_user(
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
        clerk_user_details = clerk_client.users.get_user(user_id=clerk_user_id)
        if not clerk_user_details or not clerk_user_details.user:
            raise HTTPException(status_code=404, detail=f"Could not fetch details for Clerk user {clerk_user_id}")
        
        user_obj = clerk_user_details.user # This is clerk_models.User

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
            # Ensure your UserCreate schema can handle these fields or pass them directly to the model constructor.
            # The db_models.User constructor will take these directly if they are columns.
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

    except clerk_models.ClerkErrors as e:
        db.rollback()
        print(f"Clerk API error during user sync for {clerk_user_id}: {e.body}")
        raise HTTPException(status_code=500, detail=f"Failed to sync Clerk user: {e.detail if hasattr(e, 'detail') else e.body}")
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

# --- Deprecated JWT/Cookie functions removed --- 