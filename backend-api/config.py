import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import Field

# Determine the project root directory (assuming config.py is in backend-api/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOTENV_PATH = os.path.join(PROJECT_ROOT, '.env')

class Settings(BaseSettings):
    # PostgreSQL Database Configuration
    database_url: str = Field(..., env="DATABASE_URL")

    # JWT Configuration (Likely for old auth system, can be reviewed/removed if fully Clerk based)
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field("HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Clerk Configuration - com fallback robusto
    clerk_secret_key: str = Field(
        default="sk_test_YW55IHNlY3JldCBmb3Igc2VydmljZSBpZGVudGlmaWVy", 
        env="CLERK_SECRET_KEY"
    )

    # Google OAuth2 Configuration - com fallbacks para desenvolvimento
    google_client_id: str = Field(
        default="your_google_client_id_here", 
        env="GOOGLE_CLIENT_ID"
    )
    google_client_secret: str = Field(
        default="your_google_client_secret_here", 
        env="GOOGLE_CLIENT_SECRET"
    )
    google_redirect_uri: str = Field(
        default="http://localhost:8000/auth/google/callback", 
        env="GOOGLE_REDIRECT_URI"
    )

    # Frontend URL
    frontend_url: str = Field("http://localhost:3000", env="FRONTEND_URL")

    # CORS Origins (comma-separated string)
    cors_origins: str = Field("http://localhost:3000", env="CORS_ORIGINS")

    # Environment
    environment: str = Field("development", env="ENVIRONMENT")

    # MCP Server URL
    mcp_server_url: str = Field("http://mcp_server:8765", env="MCP_SERVER_URL")
    
    # Additional API keys found in the environment
    open_router_api_key: str | None = Field(None, env="OPEN_ROUTER_API_KEY")
    openrouter_api_key: str | None = Field(None, env="OPENROUTER_API_KEY")  # Variação do nome
    deepl_api_key: str | None = Field(None, env="DEEPL_API_KEY")
    gemini_api_key: str | None = Field(None, env="GEMINI_API_KEY")
    llama_cloud_api_key: str | None = Field(None, env="LLAMA_CLOUD_API_KEY")
    ncbi_api_key: str | None = Field(None, env="NCBI_API_KEY")
    brave_api_key: str | None = Field(None, env="BRAVE_API_KEY")
    lens_scholar_api_key: str | None = Field(None, env="LENS_SCHOLAR_API_KEY") # Added for optional Lens Scholar API key

    # Configuração que prioriza variáveis de ambiente sobre .env
    model_config = SettingsConfigDict(
        extra="ignore", 
        env_file=".env", 
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False
    )

# Use lru_cache to load settings only once
@lru_cache()
def get_settings() -> Settings:
    """Returns the application settings instance."""
    try:
        settings = Settings()
        print(f"✅ Settings loaded successfully")
        print(f"📍 Database URL: {settings.database_url[:50]}...")
        print(f"🔑 Clerk Secret Key: {settings.clerk_secret_key[:20]}...")
        print(f"🌐 Frontend URL: {settings.frontend_url}")
        return settings
    except Exception as e:
        print(f"❌ Error loading settings: {e}")
        print("📋 Available environment variables:")
        for key, value in os.environ.items():
            if any(search_key in key.upper() for search_key in ['CLERK', 'DATABASE', 'SECRET', 'GOOGLE']):
                print(f"  {key}: {value[:20]}...")
        raise

# You can access settings like this in other modules:
# from .config import get_settings
# settings = get_settings()
# db_url = settings.database_url 