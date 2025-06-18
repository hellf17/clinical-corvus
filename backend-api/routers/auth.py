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