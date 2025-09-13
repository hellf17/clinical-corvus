from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Optional

# As variáveis de ambiente são carregadas pelo Docker Compose via 'env_file'.
# O código Python simplesmente as usa, esperando que existam no ambiente.
from baml_client import b
from config import get_settings
from routers import auth, patients, me, lab_analysis, alerts, files, stored_analyses, vital_signs, scores, general_scores, clinical_assistant_router, research_assistant_router, translator_router, clinical_simulation_router, chat, exams, groups, medications, clinical_notes, agents_router, user_preferences_router, agent_research_router
from routers import rag as rag_router
from routers import rag_ingest as rag_ingest_router
from clients.mcp_client import MCPClient
from middleware.agent_security import AgentSecurityMiddleware
from middleware.error_handling import ErrorHandlingMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from utils.rate_limit import limiter

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carrega as configurações que, por sua vez, leem as variáveis de ambiente.
settings = get_settings()

# Lifespan para MCP Client initialization/closing
mcp_client_instance: Optional[MCPClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mcp_client_instance
    logger.info("Lifespan startup: MCP Client e outros serviços inicializados.")
    mcp_client_instance = MCPClient()
    yield # Application runs
    logger.info("Lifespan shutdown: Closing MCP Client...")
    if mcp_client_instance:
        await mcp_client_instance.close()

app = FastAPI(
    title="Clinical Corvus API",
    description="API for Clinical Corvus application, managing patients, lab results, AI interactions, and clinical analyses.",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
origins = settings.cors_origins.split(",") if settings.cors_origins else []

logger.info(f"🌐 CORS Origins: {origins}")
logger.info(f"🔑 Frontend URL: {settings.frontend_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# Add Agent Security Middleware
app.add_middleware(AgentSecurityMiddleware)

# Add Error Handling Middleware
app.add_middleware(ErrorHandlingMiddleware)

# Global Rate Limiting (shared limiter instance)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
logger.info("SlowAPI rate limiting middleware enabled")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(me.router, prefix="/api/me", tags=["Me"])
app.include_router(lab_analysis.router, prefix="/api/lab-analysis", tags=["Lab Analysis"])  # CLEAR: Lab analysis
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(medications.router, prefix="/api/medications", tags=["Medications"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(stored_analyses.router, prefix="/api/stored-analyses", tags=["Stored Analyses"])  # CLEAR: CRUD for analyses
app.include_router(vital_signs.router, prefix="/api/vital-signs", tags=["Vital Signs"])
app.include_router(scores.router, prefix="/api", tags=["Scores"])
app.include_router(general_scores.router, prefix="/api", tags=["General Scores"])
app.include_router(research_assistant_router.router, prefix="/api/research", tags=["Research with Dr. Corvus"])
app.include_router(translator_router.router, prefix="/api/translate", tags=["Translation"])
app.include_router(clinical_simulation_router.router, prefix="/api/simulation", tags=["Clinical Simulation"])
app.include_router(clinical_assistant_router.router, prefix="/api/clinical")
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(exams.router, prefix="/api/patients", tags=["Exams"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(clinical_notes.router, prefix="/api/clinical-notes", tags=["Clinical Notes"])
# Expose consolidated agents endpoints under both prefixes for compatibility
app.include_router(agents_router, prefix="/api/agents", tags=["AI Agents"])
app.include_router(agents_router, prefix="/api/mvp-agents", tags=["MVP Agents"])  # legacy path shim
app.include_router(agent_research_router.router, prefix="/api/research", tags=["Agent Clinical Research"])
app.include_router(user_preferences_router.router, prefix="/api/user", tags=["User Preferences"])
app.include_router(rag_router, prefix="/api", tags=["Hybrid RAG"])
app.include_router(rag_ingest_router, prefix="/api", tags=["Hybrid RAG Ingest"])

# Root endpoint
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Clinical Corvus API"}

# Health check endpoint
@app.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "ok"}

# Added Health check endpoint to solve 404s on /api/health
@app.get("/api/health", tags=["Health Check"])
async def api_health_check():
    """Provides a simple health check endpoint for API status monitoring."""
    return {"status": "ok", "message": "API is running"}

# Example route requiring authentication
# @app.get("/protected")
# async def protected_route(user: dict = Depends(get_clerk_user)):

# --- Adicionar lógica para inicialização da base de dados com Alembic ---
# (Consider calling alembic upgrade here or as a separate startup script/job)


if __name__ == "__main__":
    import uvicorn
    # Use settings for host and port if available, otherwise default
    host = getattr(settings, 'host', '0.0.0.0')
    port = getattr(settings, 'port', 8000)
    reload = settings.environment == 'development'
    
    logger.info(f"Starting Uvicorn server on {host}:{port} with reload={reload}")
    uvicorn.run("main:app", host=host, port=port, reload=reload) 
