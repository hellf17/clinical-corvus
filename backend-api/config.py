import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

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
    clerk_api_url: str = Field("https://api.clerk.com", env="CLERK_API_URL")
    clerk_api_version: str = Field("v1", env="CLERK_API_VERSION")
    # Optional strict JWT checks
    clerk_jwt_issuer: str | None = Field(default=None, env="CLERK_JWT_ISSUER")
    clerk_jwt_audience: str | None = Field(default=None, env="CLERK_JWT_AUDIENCE")

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

    # Environment name (development/staging/production)
    environment: str = Field("development", env="ENVIRONMENT")

    # MCP Server URL
    mcp_server_url: str = Field("http://mcp_server:8765", env="MCP_SERVER_URL")

    # Redis URL for caching
    redis_url: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    
    # Additional API keys found in the environment
    open_router_api_key: str | None = Field(None, env="OPEN_ROUTER_API_KEY")
    openrouter_api_key: str | None = Field(None, env="OPENROUTER_API_KEY")  # Variação do nome
    deepl_api_key: str | None = Field(None, env="DEEPL_API_KEY")
    gemini_api_key: str | None = Field(None, env="GEMINI_API_KEY")
    llama_cloud_api_key: str | None = Field(None, env="LLAMA_CLOUD_API_KEY")
    ncbi_api_key: str | None = Field(None, env="NCBI_API_KEY")
    brave_api_key: str | None = Field(None, env="BRAVE_API_KEY")
    lens_scholar_api_key: str | None = Field(None, env="LENS_SCHOLAR_API_KEY") # Added for optional Lens Scholar API key

    # RAG/Index backends
    rag_use_qdrant: bool = Field(False, env="RAG_USE_QDRANT")
    rag_use_whoosh: bool = Field(False, env="RAG_USE_WHOOSH")
    qdrant_url: str | None = Field(default=None, env="QDRANT_URL")
    qdrant_host: str = Field(default="localhost", env="QDRANT_HOST")
    qdrant_port: int = Field(default=6333, env="QDRANT_PORT")
    qdrant_api_key: str | None = Field(default=None, env="QDRANT_API_KEY")
    rag_whoosh_index_dir: str = Field(default="/app/data/whoosh_index", env="RAG_WHOOSH_INDEX_DIR")

    # RAG parameters
    rag_alpha: float = Field(0.5, env="RAG_ALPHA")
    rag_coarse_sections: int = Field(20, env="RAG_COARSE_SECTIONS")
    rag_vector_candidates: int = Field(200, env="RAG_VECTOR_CANDIDATES")
    rag_bm25_candidates: int = Field(200, env="RAG_BM25_CANDIDATES")
    rag_enable_reranker: bool = Field(False, env="RAG_ENABLE_RERANKER")
    rag_reranker_model: str = Field("BAAI/bge-reranker-base", env="RAG_RERANKER_MODEL")
    rag_rerank_top_k: int = Field(50, env="RAG_RERANK_TOP_K")

    # LlamaParse advanced controls
    llamaparse_result_type: str = Field("json", env="LLAMAPARSE_RESULT_TYPE")  # 'json' | 'markdown' | 'text'
    llamaparse_preset: str | None = Field("high_quality_with_tables", env="LLAMAPARSE_PRESET")
    llamaparse_num_workers: int = Field(2, env="LLAMAPARSE_NUM_WORKERS")
    llamaparse_enable_ocr: bool = Field(False, env="LLAMAPARSE_ENABLE_OCR")
    llamaparse_ocr_strict: bool = Field(False, env="LLAMAPARSE_OCR_STRICT")
    llamaparse_language: str = Field("AUTO", env="LLAMAPARSE_LANGUAGE")

    # Docling (local-first) controls
    docling_enable: bool = Field(False, env="DOCLING_ENABLE")
    docling_ocr: bool = Field(False, env="DOCLING_OCR")

    # GROBID (scholarly PDF) controls
    grobid_enable: bool = Field(False, env="GROBID_ENABLE")
    grobid_url: str = Field("http://grobid:8070", env="GROBID_URL")

    # Unstructured/Nougat OCR fallbacks
    unstructured_enable: bool = Field(False, env="UNSTRUCTURED_ENABLE")
    nougat_enable: bool = Field(False, env="NOUGAT_ENABLE")

    # Ingestion behavior controls
    llamaparse_strict: bool = Field(False, env="LLAMAPARSE_STRICT")
    ingest_url_direct: bool = Field(False, env="INGEST_URL_DIRECT")

    # thepi.pe (optional table/image-heavy fallback)
    thepipe_api_url: str | None = Field(None, env="THEPIPE_API_URL")
    thepipe_api_key: str | None = Field(None, env="THEPIPE_API_KEY")

    # New configuration using SettingsConfigDict
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
        return settings
    except Exception as e:
        print(f"Error loading settings: {e}")
        raise

# You can access settings like this in other modules:
# from .config import get_settings
# settings = get_settings()
# db_url = settings.database_url
