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
from . import clinical_assistant_router as clinical_assistant
from . import research_assistant_router

# You can also define a top-level router here if you want to group them
# or just import them to make them available when 'from routers import *' is used.

__all__ = [
    "auth",
    "patients",
    "lab_analysis",
    "medications",
    "clinical_notes",
    "alerts",
    "files",
    "stored_analyses",
    "me",
    "vital_signs",
    "scores",
    "clinical_assistant",
    "research_assistant_router",
] 