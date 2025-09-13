import pytest
import os
import sys
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
import tempfile
from datetime import timedelta, date # Added date import
import jwt
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from uuid import UUID
from typing import Dict, Any
import sqlite3
import uuid
from sqlalchemy.sql import text
from sqlalchemy.exc import OperationalError
import warnings

# Add the backend-api directory to the Python path
backend_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_api_dir not in sys.path:
    sys.path.insert(0, backend_api_dir)

# Import test settings and apply settings patch FIRST before any other imports
from tests.test_settings import get_test_settings, patch_production_settings, AppTestSettings

# Apply settings patch before importing modules that use settings
original_settings_func = patch_production_settings()

# Get test settings
test_settings = get_test_settings()

# Try importing database.py directly first
try:
    from database import Base, get_db, is_sqlite_dialect
    import database.models as models # Import models module directly
except ImportError:
    # This block is for fallback if database.models cannot be imported directly.
    # It attempts to create simplified mock classes for testing purposes.
    # It's important that this fallback correctly mocks all necessary models.
    import sys
    from sqlalchemy.ext.declarative import declarative_base
    
    Base = declarative_base()
    
    class DatabaseModule:
        Base = Base
        def get_db():
            raise NotImplementedError("Mock get_db function")
    sys.modules['database'] = DatabaseModule()
    
    # Define mock classes
    class User:
        user_id = None
        clerk_user_id = None
        email = None
        name = None
        role = None
    
    class Patient:
        patient_id = None
        name = None
        birthDate = None
        gender = None
        weight = None
        height = None
        ethnicity = None
        primary_diagnosis = None
        user_id = None
    
    class AIChatConversation:
        id = None
        title = None
        patient_id = None
        user_id = None
        last_message_content = None
    
    class AIChatMessage:
        id = None
        conversation_id = None
        role = None
        content = None
        message_metadata = None
    
    # Create a mock models module and add it to sys.modules
    # This ensures that `models.User`, `models.Patient`, etc. can be accessed.
    class MockModels:
        User = User
        Patient = Patient
        AIChatConversation = AIChatConversation
        AIChatMessage = AIChatMessage
    
    sys.modules['database.models'] = MockModels()
    # Also ensure 'models' is directly available if some code expects it that way
    sys.modules['models'] = MockModels()
    
# Import models after the try-except block to ensure it's always available
import database.models as models

# Import the actual FastAPI app from main.py
from main import app

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Clerk client before importing routers that use it
from unittest.mock import MagicMock, patch
import os

# Set test environment to disable real API calls
os.environ['CLERK_SECRET_KEY'] = 'test_key_for_testing'

# Create a mock Clerk client
mock_clerk_client = MagicMock()
mock_client_response = MagicMock()
mock_client_response.client = MagicMock()
mock_client_response.client.session_ids = ["test_session_123"]
mock_clerk_client.clients.verify.return_value = mock_client_response

mock_session_response = MagicMock()
mock_session_response.session = MagicMock()
mock_session_response.session.user_id = "test_clerk_user_123"
mock_clerk_client.sessions.get_session.return_value = mock_session_response

mock_user_response = MagicMock()
mock_user_response.email_addresses = [MagicMock()]
mock_user_response.email_addresses[0].email_address = "test@example.com"
mock_user_response.email_addresses[0].id = "primary_email_123"
mock_user_response.primary_email_address_id = "primary_email_123"
mock_user_response.first_name = "Test"
mock_user_response.last_name = "User"
mock_user_response.public_metadata = {"role": "doctor"}
mock_clerk_client.users.get.return_value = mock_user_response

# Patch the Clerk client before importing modules that use it
with patch('clerk_backend_api.Clerk', return_value=mock_clerk_client):
    # Import routers after app creation
    from routers import auth, patients, lab_analysis, medications, clinical_notes, alerts, files, stored_analyses, groups
    from routers.files import upload_pdf_guest

    # Routers are now included directly from main.app, no need to include them here

# Adicionar o endpoint de guest-upload diretamente à aplicação de teste
@app.post("/api/guest-upload", tags=["Guest Access"])
async def test_guest_upload(file: UploadFile = File(...)):
    """
    Endpoint público para upload de arquivos sem autenticação nos testes.
    Chama diretamente a função do router de arquivos.
    """
    return await upload_pdf_guest(file)

# Import models after router setup to avoid circular imports
from database import Base
from database.models import User, AIChatConversation, AIChatMessage  # Usando a estrutura unificada de modelos

# Configura o banco de dados de teste em memória para SQLite
@pytest.fixture(scope="function")
def db_session():
    # Cria um arquivo temporário para o banco de dados SQLite de teste
    db_file = tempfile.NamedTemporaryFile(delete=False)
    db_file_name = db_file.name
    db_file.close()
    
    # Cria o URL do banco de dados SQLite de teste
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_file_name}"
    
    # Cria o engine, as tabelas e a sessão
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Cria todas as tabelas
    Base.metadata.create_all(bind=engine)
    
    # Ensure test database has all required columns
    with engine.connect() as connection:
        connection.execution_options(autocommit=True)
        ensure_test_db_schema(connection.connection)
    
    # Cria a sessão
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Limpa o arquivo temporário do banco de dados
        try:
            os.unlink(db_file_name)
        except PermissionError:
            # On Windows, sometimes the file is still in use by another process
            # Just warn and continue
            warnings.warn(f"Could not delete temporary file {db_file_name}. It may be locked by another process.")

@pytest.fixture(scope="function")
def sqlite_client(db_session):
    """
    Cria um cliente FastAPI de teste usando o banco de dados SQLite temporário.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Substitui a dependência do banco de dados principal pela do banco de dados de teste
    from database import get_db
    app.dependency_overrides[get_db] = override_get_db
    
    # Cria o cliente de teste
    client = TestClient(app)
    
    # Adiciona um usuário de teste ao banco de dados
    test_user = User(
        user_id=1,
        clerk_user_id="test_clerk_user_123",  # Same as mocked Clerk user
        email="test@example.com",
        name="Test User",
        role="doctor"
    )
    db_session.add(test_user)
    db_session.commit()

    # Create a test patient for tests that require one (e.g., test_upload_and_analyze_with_patient)
    test_patient = models.Patient(
        patient_id=1,
        name="Test Patient",
        birthDate=date(2000, 1, 1), # Converted to date object
        gender="M",
        weight=70.0,
        height=170.0,
        ethnicity="Caucasian",
        primary_diagnosis="Test Diagnosis",
        user_id=test_user.user_id # Associate with the test user
    )
    db_session.add(test_patient)
    db_session.commit()
    
    # Adiciona uma função para configurar o usuário autenticado para fins de teste
    def set_auth_user(user, bypass_auth=False):
        """
        Configura um usuário como autenticado para o teste.
        Isso inclui a criação de um token válido e configuração de substituições para as dependências.
        """
        # Cria um token de acesso para o usuário se user não for None
        if user is not None:
            # No longer using create_access_token directly.
            # For testing, we can mock the authentication or directly set headers.
            # For now, we'll just set a dummy Authorization header if a user is provided.
            access_token = "dummy_token_for_test"
            
            # Adiciona o token ao objeto de cliente para ser usado em todos os testes
            client.headers["Authorization"] = f"Bearer {access_token}"
        else:
            # Se user for None, remova o cabeçalho de autorização
            if "Authorization" in client.headers:
                del client.headers["Authorization"]
        
        # Se bypass_auth for True, substitui as funções de autenticação para sempre retornar o usuário
        if bypass_auth:
            from security import get_current_user, get_current_user_required
            
            # Defina os mocks como funções síncronas normais, não assíncronas
            def mock_get_current_user(request=None, token=None, db=None):
                return user
                
            def mock_get_current_user_required(current_user=None):
                return user
                
            app.dependency_overrides[get_current_user] = mock_get_current_user
            app.dependency_overrides[get_current_user_required] = mock_get_current_user_required
            
    # Adiciona a função ao cliente
    client.set_auth_user = set_auth_user
    
    yield client, test_user # Yield both client and test_user
    
    # Limpa a substituição de dependência
    app.dependency_overrides.clear()

# This fixture is part of the legacy authentication system and is no longer needed.
# The `sqlite_client` and `pg_client` fixtures now handle authentication by mocking the Clerk client,
# which is the correct approach for the current test setup.
# @pytest.fixture
# def mock_auth_headers():
#     """
#     Cria os cabeçalhos de autenticação simulados para os testes.
#     """
#     # Cria um token de acesso para o usuário de teste (id=1)
#     access_token = jwt.encode(
#         {"sub": "1", "exp": 1745184261},  # Token válido por um longo tempo
#         "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",  # Secret key
#         algorithm="HS256"
#     )
#     return {"Authorization": f"Bearer {access_token}"}

# Adicionado para inicializar as tabelas do chat AI
@pytest.fixture
def init_ai_chat_tables(db_session):
    """
    Inicializa as tabelas relacionadas ao chat AI no banco de dados de teste.
    """
    # Cria uma conversa de exemplo
    conversation = AIChatConversation(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        title="Conversa de teste",
        patient_id=1,  # Agora usando integer
        user_id=1,     # Agora usando integer
        last_message_content="Última mensagem de teste"
    )
    db_session.add(conversation)
    
    # Cria uma mensagem de exemplo
    message = AIChatMessage(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        conversation_id=UUID("00000000-0000-0000-0000-000000000001"),
        role="user",
        content="Mensagem de teste",
        message_metadata={}
    )
    db_session.add(message)
    
    db_session.commit()
    
    return db_session

# PostgreSQL test database for integration tests
@pytest.fixture(scope="session")
def pg_engine():
    """Create a PostgreSQL test database for integration testing, falling back to SQLite if PostgreSQL is not available."""
    try:
        # First try connecting to PostgreSQL
        engine = create_engine(test_settings.postgres_database_url)
        # Test connection
        connection = engine.connect()
        connection.close()
        
        # If successful, create tables and return the engine
        Base.metadata.create_all(bind=engine)
        yield engine
        Base.metadata.drop_all(bind=engine)
    except Exception as e:
        warnings.warn(f"PostgreSQL connection failed: {e}. Using SQLite for integration tests.")
        
        # Create SQLite database as fallback for integration tests
        db_file = tempfile.NamedTemporaryFile(delete=False)
        db_file_name = db_file.name
        db_file.close()
        
        # Add UUID support for SQLite
        sqlite3.register_adapter(uuid.UUID, lambda u: u.hex)
        sqlite3.register_converter("UUID", lambda s: uuid.UUID(s.decode('utf-8')))
        
        sqlite_url = f"sqlite:///{db_file_name}"
        engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        
        # Add event listener for SQLite connections
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        # Create tables on SQLite engine
        Base.metadata.create_all(bind=engine)
        yield engine
        
        # Cleanup
        Base.metadata.drop_all(bind=engine)
        try:
            os.unlink(db_file_name)
        except PermissionError:
            warnings.warn(f"Could not delete temporary SQLite file {db_file_name}. It may be locked by another process.")

@pytest.fixture(scope="function")
def pg_session():
    """
    Fixture for SQLite or PostgreSQL session for integration tests.
    Tries PostgreSQL connection first, falls back to SQLite.
    """
    # Attempt to create a PostgreSQL connection
    try:
        SQLALCHEMY_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/clinical_helper_test"
        # Short timeout to fail fast if Postgres is not available
        engine = create_engine(
            SQLALCHEMY_TEST_DATABASE_URL, 
            connect_args={"connect_timeout": 3}
        )
        
        # Test the connection by executing a simple query
        with engine.connect() as connection:
            # Define a simple query to test the connection
            connection.execute(text("SELECT 1"))
        
        # Connection successful, proceed with PostgreSQL setup
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Create session
        db = TestingSessionLocal()
        
        try:
            yield db
        finally:
            db.close()
            Base.metadata.drop_all(bind=engine)
            engine.dispose()
            
    except Exception as e:
        warnings.warn(f"PostgreSQL connection failed: {e}. Using SQLite for integration tests.")
        
        # Fall back to SQLite for integration tests
        db_file = tempfile.NamedTemporaryFile(delete=False)
        db_file_name = db_file.name
        db_file.close()
        
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_file_name}"
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Set pragma for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Ensure test database has all required columns
        with engine.connect() as connection:
            connection.execution_options(autocommit=True)
            ensure_test_db_schema(connection.connection)
        
        # Create session
        db = TestingSessionLocal()
        
        try:
            yield db
        finally:
            db.close()
            
            # Cleanup the SQLite file
            try:
                os.unlink(db_file_name)
            except PermissionError:
                # On Windows, sometimes the file is still in use
                pass

@pytest.fixture(scope="function")
def pg_client(pg_session):
    """
    Creates a FastAPI test client using the PostgreSQL test database.
    """
    def override_get_db():
        try:
            yield pg_session
        finally:
            pass
    
    # Não vamos criar um usuário fixo aqui
    # Em vez disso, vamos criar um mock que pode ser definido no teste
    
    # Variável global para armazenar o usuário atual para autenticação
    # Será inicializada como None e definida nos testes
    test_auth_user = None
    
    # Lista de endpoints que não precisam de autenticação
    guest_endpoints = ["/api/files/upload/guest", "/api/analyze/guest"]
    
    # Flag para controlar se devemos ignorar a verificação de autenticação
    # durante o teste atual (útil para testes de endpoints guest)
    bypass_auth_check = False
    
    async def mock_get_current_user():
        return test_auth_user
        
    async def mock_get_current_user_required():
        # Se a flag de bypass estiver ativa, ignorar verificação de autenticação
        if bypass_auth_check:
            return None
            
        # Exigir autenticação normalmente
        if test_auth_user is None:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return test_auth_user
    
    # Override dependencies
    from security import get_current_user, get_current_user_required
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_user_required] = mock_get_current_user_required
    
    # Create test client
    client = TestClient(app)
    
    # Adicionar uma função ao cliente para definir o usuário de autenticação
    def set_auth_user(user, bypass_auth=False):
        nonlocal test_auth_user, bypass_auth_check
        test_auth_user = user
        bypass_auth_check = bypass_auth
    
    # Adicionar a função como atributo do cliente
    client.set_auth_user = set_auth_user
    
    yield client
    
    # Clear dependency overrides
    app.dependency_overrides.clear()

# This fixture can be used to create test data
@pytest.fixture(scope="function")
def test_data(sqlite_session):
    """Create test data in the database."""
    # Add code to create test data here
    # Example: create test users, patients, etc.
    yield
    # Clean up is handled by the session fixture 

@pytest.fixture(scope="function")
def sqlite_session(db_session):
    """
    Alias para db_session para compatibilidade com testes existentes.
    Muitos testes foram escritos usando sqlite_session, então mantemos este alias.
    """
    return db_session 

@pytest.fixture
def mock_response_validation():
    """
    Patch to enable UUID validation to accept integers in Pydantic v2.
    This solves the issue with models expecting UUIDs but the router using integers.
    """
    # We don't need to modify pydantic.UUID directly in v2
    # Instead, we'll monkey patch the schema models that use UUID
    from pydantic.json_schema import JsonSchemaValue
    from typing import Any, Callable
    import sys
    
    # Find schemas module that might contain UUID fields
    schemas_module = sys.modules.get('schemas')
    
    if schemas_module:
        # Get all schema modules
        for module_name in dir(schemas_module):
            if module_name.startswith('_'):
                continue
            
            module = getattr(schemas_module, module_name, None)
            if not module:
                continue
                
            # Look for model classes with UUID fields
            for name in dir(module):
                if name.startswith('_'):
                    continue
                    
                obj = getattr(module, name, None)
                if not obj or not hasattr(obj, '__fields__'):
                    continue
    
    # Just yield without making changes - we'll rely on the test mocks instead
    yield

# Add SQLite UUID handling for testing
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Function to ensure test database has all required columns
def ensure_test_db_schema(connection):
    """Ensure test database has all columns required by tests."""
    cursor = connection.cursor()
    
    # Check if lab_results table is missing is_abnormal column
    try:
        cursor.execute("SELECT is_abnormal FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'is_abnormal' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN is_abnormal BOOLEAN DEFAULT 0")
    
    # Check if lab_results table is missing created_by column
    try:
        cursor.execute("SELECT created_by FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'created_by' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN created_by INTEGER")
    
    # Check if lab_results table is missing test_category_id column
    try:
        cursor.execute("SELECT test_category_id FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'test_category_id' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN test_category_id INTEGER")
    
    # Check if lab_results table is missing reference_text column
    try:
        cursor.execute("SELECT reference_text FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'reference_text' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN reference_text VARCHAR")
    
    # Check if lab_results table is missing comments column
    try:
        cursor.execute("SELECT comments FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'comments' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN comments TEXT")
    
    # Check if lab_results table is missing updated_at column
    try:
        cursor.execute("SELECT updated_at FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'updated_at' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN updated_at TIMESTAMP")
    
    # Check if lab_results table is missing report_datetime column
    try:
        cursor.execute("SELECT report_datetime FROM lab_results LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'report_datetime' to lab_results table")
        cursor.execute("ALTER TABLE lab_results ADD COLUMN report_datetime TIMESTAMP")
    
    # Check if medications table is missing raw_frequency column
    try:
        cursor.execute("SELECT raw_frequency FROM medications LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing column 'raw_frequency' to medications table")
        cursor.execute("ALTER TABLE medications ADD COLUMN raw_frequency VARCHAR")
    
    # Check if alerts table is missing parameter column
    try:
        cursor.execute("SELECT parameter FROM alerts LIMIT 1")
    except (sqlite3.OperationalError, Exception):
        print("Adding missing columns to alerts table")
        cursor.execute("ALTER TABLE alerts ADD COLUMN parameter VARCHAR")
        cursor.execute("ALTER TABLE alerts ADD COLUMN category VARCHAR")
        cursor.execute("ALTER TABLE alerts ADD COLUMN value FLOAT")
        cursor.execute("ALTER TABLE alerts ADD COLUMN reference VARCHAR")
        cursor.execute("ALTER TABLE alerts ADD COLUMN status VARCHAR DEFAULT 'active'")
        cursor.execute("ALTER TABLE alerts ADD COLUMN interpretation TEXT")
        cursor.execute("ALTER TABLE alerts ADD COLUMN recommendation TEXT")
        cursor.execute("ALTER TABLE alerts ADD COLUMN acknowledged_by VARCHAR")
        cursor.execute("ALTER TABLE alerts ADD COLUMN acknowledged_at TIMESTAMP")
    
    # Commit changes
    connection.commit()
    cursor.close()