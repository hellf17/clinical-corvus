"""
Script to reset the test database with the proper schema.
This script drops all tables and recreates them with the proper schema.
"""

import os
import sys
import sqlite3
import shutil
from pathlib import Path
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.ext.declarative import declarative_base

# Add the parent directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Create a test database URL
sqlite_database_url = "sqlite:///./test.db"
db_path = os.path.join(parent_dir, "test.db")

# Create a simple base for testing
Base = declarative_base()

def reset_test_database():
    """Reset the test database by dropping all tables and recreating them."""
    # Check if test.db exists and remove it
    if os.path.exists(db_path):
        print(f"Removing existing test database: {db_path}")
        os.remove(db_path)
    
    # Create a new SQLite database
    print("Creating new test database...")
    engine = create_engine(
        sqlite_database_url,
        connect_args={"check_same_thread": False}
    )

    # Connect to the database
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    
    print("Creating tables...")
    
    # Create alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        user_id INTEGER,
        alert_type VARCHAR,
        message VARCHAR NOT NULL,
        severity VARCHAR NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        details JSON,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        parameter VARCHAR,
        category VARCHAR,
        value FLOAT,
        reference VARCHAR,
        status VARCHAR DEFAULT 'active',
        interpretation TEXT,
        recommendation TEXT,
        acknowledged_by VARCHAR,
        acknowledged_at TIMESTAMP
    )
    """)
    print("Alerts table created")
    
    # Create lab_results table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lab_results (
        result_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        category_id INTEGER,
        test_name VARCHAR(100) NOT NULL,
        value_numeric FLOAT,
        value_text VARCHAR(255),
        unit VARCHAR(50),
        timestamp TIMESTAMP NOT NULL,
        reference_range_low FLOAT,
        reference_range_high FLOAT,
        is_abnormal BOOLEAN DEFAULT 0,
        collection_datetime TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        test_category_id INTEGER,
        reference_text VARCHAR,
        comments TEXT,
        updated_at TIMESTAMP,
        report_datetime TIMESTAMP
    )
    """)
    print("Lab results table created")
    
    # Create medications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medications (
        medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100),
        frequency VARCHAR(20) NOT NULL,
        raw_frequency VARCHAR(100),
        route VARCHAR(20) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        active BOOLEAN DEFAULT 1,
        prescriber VARCHAR(255),
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Medications table created")
    
    # Create test_categories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Test categories table created")
    
    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'guest',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Users table created")
    
    # Create patients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(255),
        idade INTEGER,
        sexo VARCHAR(1),
        peso FLOAT,
        altura FLOAT,
        etnia VARCHAR(50),
        data_internacao TIMESTAMP,
        diagnostico TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("Patients table created")
    
    # Commit all changes
    connection.commit()
    
    # Cleanup
    cursor.close()
    connection.close()
    
    print("Database reset completed successfully!")
    return True

if __name__ == "__main__":
    reset_test_database() 