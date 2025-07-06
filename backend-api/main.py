from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Optional

# As variáveis de ambiente são carregadas pelo Docker Compose via 'env_file'.
# O código Python simplesmente as usa, esperando que existam no ambiente.
from baml_client import b
from config import get_settings
from routers import auth, patients, me, lab_analysis, alerts, files, stored_analyses, vital_signs, scores, clinical_assistant, research_assistant_router, translator_router, clinical_simulation_router
from clients.mcp_client import MCPClient

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(me.router, prefix="/api/me", tags=["Me"])
app.include_router(lab_analysis.router, prefix="/api/lab-analysis", tags=["Lab Analysis"])  # CLEAR: Lab analysis
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(stored_analyses.router, prefix="/api/stored-analyses", tags=["Stored Analyses"])  # CLEAR: CRUD for analyses
app.include_router(vital_signs.router, prefix="/api/vital-signs", tags=["Vital Signs"])
app.include_router(scores.router, prefix="/api/scores", tags=["Scores"])
app.include_router(clinical_assistant.router, prefix="/api/clinical", tags=["Clinical Assistant"]) # Simplified prefix
app.include_router(research_assistant_router.router, prefix="/api/research", tags=["Research with Dr. Corvus"])
app.include_router(translator_router.router, prefix="/api/translate", tags=["Translation"])
app.include_router(clinical_simulation_router.router, prefix="/api/simulation", tags=["Clinical Simulation"])

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