"""
Database initialization package.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sqlite3
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from contextlib import asynccontextmanager
from config import get_settings

settings = get_settings()

# Add diagnostic logging for database connection
import logging
logger = logging.getLogger(__name__)

# Log database connection details (without password)
db_url_for_logging = settings.database_url
if '@' in db_url_for_logging:
    # Hide password in logs
    parts = db_url_for_logging.split('@')
    auth_part = parts[0]
    if ':' in auth_part:
        user_part = auth_part.split(':')[0]
        db_url_for_logging = f"{user_part}:***@{parts[1]}"

logger.info(f"🔌 Attempting to connect to database: {db_url_for_logging}")
logger.info(f"🌍 Database URL from settings: {settings.database_url[:50]}...")

# Add UUID support for SQLite
def _add_sqlite_uuid_support():
    # Register UUID adapter and converter for SQLite
    sqlite3.register_adapter(uuid.UUID, lambda u: u.hex)
    sqlite3.register_converter("UUID", lambda s: uuid.UUID(s.decode('utf-8')))

# Initialize SQLite UUID support
_add_sqlite_uuid_support()

# Create the SQLAlchemy engine
# The connect_args are recommended for SQLite, but might not be needed for PostgreSQL.
# Keeping it commented out for now.
if 'sqlite' in settings.database_url:
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False}
    )
    
    # Enable SQLite foreign key support
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(settings.database_url)
    logger.info("✅ PostgreSQL engine created successfully")

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for our models to inherit from
Base = declarative_base()

# Dependency to get DB session in path operations
def get_db():
    db = SessionLocal()
    try:
        logger.info("🔗 Database session created successfully")
        yield db
    except Exception as e:
        logger.error(f"❌ Database session creation failed: {e}")
        raise
    finally:
        db.close()

# Import all models to make them available as database.models.*
from .models import (
    User, Patient, VitalSign, Exam, TestCategory, LabResult, LabInterpretation,
    Medication, ClinicalScore, ClinicalNote, Analysis, AIChatConversation,
    AIChatMessage, Alert, HealthTip, HealthDiaryEntry, GroupInvitation,
    Group, GroupMembership, GroupPatient, MedicationStatus, MedicationRoute,
    MedicationFrequency, NoteType, ExamStatus
)

# Helper function to check if the current dialect is SQLite
def is_sqlite_dialect():
    from sqlalchemy import inspect
    try:
        insp = inspect(engine)
        return insp.dialect.name == 'sqlite'
    except:
        return False