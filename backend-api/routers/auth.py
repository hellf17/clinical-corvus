from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm

from database import get_db
# from .. import crud, schemas as base_schemas # Changed relative import
import crud
from config import get_settings
# from ..schemas import User as UserSchema, AuthStatus # Changed relative import
from schemas import User as UserSchema, AuthStatus
# from ..security import get_current_user, get_current_user_required, get_auth_status # Changed relative import
from security import get_current_user, get_current_user_required, get_auth_status
from models import User
from schemas import UserCreate

settings = get_settings()

# Criar o roteador
router = APIRouter()

# Endpoint para verificar o estado de autenticação atual (Mantido)
@router.get("/status", response_model=AuthStatus)
async def auth_status_check(
    # Uses Clerk-based dependency implicitly via get_auth_status
    auth_status_result: AuthStatus = Depends(get_auth_status) 
):
    """
    Retorna o estado de autenticação atual do usuário via Clerk.
    Se autenticado, inclui informações do usuário do nosso DB.
    """
    return auth_status_result

# Endpoint para definir a função do usuário (Mantido)
@router.post("/role")
async def set_user_role(
    request: Request,
    # Uses Clerk-based dependency
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db) 
):
    """
    Define ou atualiza a função (role) do usuário autenticado (localmente).
    Requer autenticação via Clerk.
    """
    try:
        data = await request.json()
        role = data.get("role")
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Corpo da requisição inválido"
        )
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Função não especificada"
        )
    
    if role not in ["doctor", "patient"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Função inválida. Deve ser 'doctor' ou 'patient'"
        )
    
    # Atualizar a função do usuário no nosso DB
    current_user.role = role
    db.commit()
    
    return {"detail": f"Função do usuário definida como '{role}'"}


# --- Group Token Refresh Endpoint ---

@router.post("/refresh-group-token")
async def refresh_group_token(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Refresh the user's group access token.
    This endpoint generates a new token with updated group claims.
    """
    try:
        # Get user's current group memberships
        from utils.group_authorization import get_user_group_ids
        group_ids = get_user_group_ids(db, current_user.user_id)
        
        # Create group claims
        group_claims = []
        for group_id in group_ids:
            group_claims.append({
                "group_id": group_id
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