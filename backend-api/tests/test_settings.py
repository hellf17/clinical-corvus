"""
Test configuration settings for the backend API tests.
This module provides test-specific settings and should be used only in the test environment.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys

# Add path to parent directory to import modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import the original settings
from config import Settings as ProductionSettings

class AppTestSettings(BaseSettings):
    """Test settings for the application."""
    
    # Database Configuration
    # SQLite for unit tests
    sqlite_database_url: str = "sqlite:///./test.db"
    
    # PostgreSQL for integration tests - override this in CI/CD or local .env.test
    # Use a different database name to avoid affecting development/production data
    postgres_database_url: str = "postgresql://postgres:postgres@localhost:5432/clinical_helper_test"
    
    # JWT Configuration
    secret_key: str = "testsecretkey123456789testsecretkey123456789"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Mock Google OAuth2 Configuration
    google_client_id: str = "test-client-id.apps.googleusercontent.com"
    google_client_secret: str = "test-client-secret"
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    
    # Mock Frontend URL
    frontend_url: str = "http://localhost:3000"
    
    # Mock MCP Server URL
    mcp_server_url: str = "http://localhost:7777"
    
    # Additional API keys for testing
    open_router_api_key: str = "test-openrouter-key"
    ncbi_api_key: str = "test-ncbi-key"
    brave_api_key: str = "test-brave-key"
    redirect_uri: str = "http://localhost:8000/redirect"
    
    # Override with local environment variables if they exist
    class Config:
        env_prefix = "TEST_"
        env_file = ".env.test"
        env_file_encoding = "utf-8"

@lru_cache()
def get_test_settings() -> AppTestSettings:
    """Returns the test settings instance."""
    return AppTestSettings()

# Function to patch production settings for testing
def patch_production_settings():
    """Override the production settings with test settings during testing."""
    from config import get_settings
    
    # Store original function
    original_get_settings = get_settings
    
    # Override function to return test settings
    from functools import wraps
    
    @wraps(original_get_settings)
    def patched_get_settings():
        test_settings = get_test_settings()
        # Create a new Settings instance with test values
        settings = ProductionSettings(
            database_url=test_settings.sqlite_database_url,
            secret_key=test_settings.secret_key,
            algorithm=test_settings.algorithm,
            access_token_expire_minutes=test_settings.access_token_expire_minutes,
            google_client_id=test_settings.google_client_id,
            google_client_secret=test_settings.google_client_secret,
            google_redirect_uri=test_settings.google_redirect_uri,
            frontend_url=test_settings.frontend_url,
            mcp_server_url=test_settings.mcp_server_url,
            open_router_api_key=test_settings.open_router_api_key,
            ncbi_api_key=test_settings.ncbi_api_key,
            brave_api_key=test_settings.brave_api_key,
            redirect_uri=test_settings.redirect_uri
        )
        return settings
    
    # Apply patch
    import config
    config.get_settings = patched_get_settings
    
    return original_get_settings

# Usage in tests:
# from tests.test_settings import get_test_settings, patch_production_settings
# original_settings_func = patch_production_settings()  # Apply patch
# test_settings = get_test_settings() 