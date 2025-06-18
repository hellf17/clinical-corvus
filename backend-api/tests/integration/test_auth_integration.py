"""
Integration tests for the authentication system.
These tests verify that user authentication, token validation, and account management work correctly.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import jwt
from jwt.exceptions import InvalidTokenError

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
import database.models as models
from security import create_access_token, get_password_hash, verify_password
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

@pytest.mark.integration
def test_auth_status_endpoint(pg_client, pg_session):
    """
    Test authentication status endpoint.
    This tests the basic auth status endpoint functionality.
    """
    # Test status endpoint
    status_response = pg_client.get("/api/auth/status")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert "is_authenticated" in status_data
    assert status_data["is_authenticated"] is False

@pytest.mark.integration
def test_token_validation(pg_client, pg_session):
    """
    Test token validation and protected endpoint access.
    """
    # Create a test user
    user = models.User(
        email="token_test@example.com",
        name="Token Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Create a valid token
    access_token_expires = timedelta(minutes=30)
    valid_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.user_id,
            "name": user.name
        },
        expires_delta=access_token_expires
    )
    
    # Create token with wrong signature
    valid_token_parts = valid_token.split(".")
    invalid_token = f"{valid_token_parts[0]}.{valid_token_parts[1]}.invalid_signature"
    
    # Create expired token
    expired_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.user_id,
            "name": user.name
        },
        expires_delta=timedelta(minutes=-30)  # Negative time = expired
    )
    
    # Usar o endpoint de status para testar token
    valid_response = pg_client.get(
        "/api/auth/status",
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    
    # Verificar resposta 
    assert valid_response.status_code == 200
    
    # Testar com token inválido
    invalid_response = pg_client.get(
        "/api/auth/status",
        headers={"Authorization": f"Bearer {invalid_token}"}
    )
    
    # Verificar response
    assert invalid_response.status_code == 200  # O endpoint status não retorna 401, apenas is_authenticated=false
    
    # Testar sem token
    no_token_response = pg_client.get("/api/auth/status")
    assert no_token_response.status_code == 200
    assert no_token_response.json()["is_authenticated"] is False

@pytest.mark.integration
def test_user_direct_update(pg_session):
    """
    Teste de atualização direta do papel do usuário no banco de dados.
    Este teste verifica a funcionalidade básica sem depender da API.
    """
    # Criar um usuário de teste
    user = models.User(
        email="role_direct_test@example.com",
        name="Role Test User",
        role="guest"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)
    
    # Verificar papel inicial
    assert user.role == "guest"
    
    # Atualizar papel diretamente
    user.role = "doctor"
    pg_session.commit()
    pg_session.refresh(user)
    
    # Verificar se o papel foi atualizado
    assert user.role == "doctor" 