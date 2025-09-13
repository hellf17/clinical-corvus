# Este arquivo torna o diretório 'routers' um pacote Python.
from fastapi import APIRouter

from . import auth
from . import patients
from . import lab_analysis
from . import medications
from . import clinical_notes
from . import alerts
from . import files
from . import stored_analyses
from . import me
from . import vital_signs
from . import scores
from . import general_scores
from . import research_assistant_router
from . import translator_router
from . import clinical_simulation_router
from . import chat
from . import clinical_assistant_router
from . import exams
from . import groups
from . import user_preferences_router
from . import agent_research_router
from .agents_router import router as agents_router


# You can also define a top-level router here if you want to group them
# or just import them to make them available when 'from routers import *' is used.

__all__ = [
    "auth",
    "patients",
    "lab_analysis",
    "medications",
    "clinical_notes",
    "chat",
    "alerts",
    "files",
    "stored_analyses",
    "me",
    "vital_signs",
    "scores",
    "general_scores",
    "clinical_assistant_router",
    "research_assistant_router",
    "translator_router",
    "clinical_simulation_router",
    "exams",
    "groups",
    "user_preferences_router",
    "agent_research_router",
    "agents_router"
]
