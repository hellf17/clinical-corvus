"""
Database initialization script.

This script initializes the database and creates all tables defined in the models.
It should be run once before starting the application for the first time.
"""

import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database and create all tables."""
    try:
        # Load environment variables
        load_dotenv()
        
        # Get database URL from environment variable
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL environment variable not set")
            return False
        
        # Create engine
        engine = create_engine(db_url)
        
        # Import models here to avoid circular imports
        from src.db_models import Base
        
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(engine)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info(f"Database connection test: {result.scalar()}")
        
        logger.info("Database initialization completed successfully")
        return True
    
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {e}")
        return False

if __name__ == "__main__":
    if init_database():
        print("Database initialized successfully!")
    else:
        print("Failed to initialize database. Check logs for details.") 