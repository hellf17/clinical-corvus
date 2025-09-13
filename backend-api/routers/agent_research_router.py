import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from baml_client.types import ResearchTaskInput, SynthesizedResearchOutput, PICOQuestion
from security import get_current_user_required
from database.models import User as UserModel

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Agent Clinical Research"],
    dependencies=[Depends(get_current_user_required)],
)


class DeepResearchRequest(BaseModel):
    user_original_query: str
    pico_question: Optional[Dict[str, Optional[str]]] = None
    research_focus: Optional[str] = None
    target_audience: Optional[str] = None
    research_mode: Optional[str] = 'quick'  # 'quick' or 'expanded'


def _map_pico(pico_dict: Optional[Dict[str, Optional[str]]]) -> Optional[PICOQuestion]:
    if not pico_dict:
        return None
    try:
        return PICOQuestion(
            patient_population=pico_dict.get("population"),
            intervention=pico_dict.get("intervention"),
            comparison=pico_dict.get("comparison"),
            outcome=pico_dict.get("outcome"),
            time_frame=pico_dict.get("time_frame"),
            study_type=pico_dict.get("study_type"),
        )
    except Exception:
        return None


@router.post("/agent-research/autonomous-translated", response_model=SynthesizedResearchOutput)
async def clinical_research_autonomous_translated(
    request: DeepResearchRequest,
):
    """Agent-orchestrated autonomous research (PT output)."""
    try:
        from agents.clinical_research_agent import ClinicalResearchAgent
        from services.simple_autonomous_research import SimpleAutonomousResearchService
        from routers.research_assistant_router import _translate_synthesized_output  # reuse translator

        agent = ClinicalResearchAgent()

        pico_q = _map_pico(request.pico_question)
        analysis = {"needs_research": True, "query_type": "research", "research_indicators": ["autonomous"]}

        # Build enhanced input via agent enrichment
        try:
            research_input = await agent._create_enhanced_research_input(
                request.user_original_query, analysis, None
            )
            if hasattr(research_input, "pico_question") and pico_q:
                research_input.pico_question = pico_q
            if hasattr(research_input, "research_focus") and request.research_focus:
                research_input.research_focus = request.research_focus
            if hasattr(research_input, "target_audience") and request.target_audience:
                research_input.target_audience = request.target_audience
        except Exception:
            research_input = ResearchTaskInput(
                user_original_query=request.user_original_query,
                pico_question=pico_q,
                research_focus=request.research_focus,
                target_audience=request.target_audience,
            )

        # Map depth to simple service modes
        depth = (request.research_mode or 'quick').lower()
        service_mode = 'comprehensive' if depth == 'expanded' else 'quick'

        async with SimpleAutonomousResearchService(research_mode=service_mode) as service:
            result = await service.conduct_autonomous_research(research_input)

        translated = await _translate_synthesized_output(result, target_lang="PT")
        return translated
    except Exception as e:
        logger.error(f"clinical_research_autonomous_translated failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent-research/autonomous", response_model=SynthesizedResearchOutput)
async def clinical_research_autonomous(
    request: DeepResearchRequest,
):
    """Agent-orchestrated autonomous research (untranslated)."""
    try:
        from agents.clinical_research_agent import ClinicalResearchAgent
        from services.simple_autonomous_research import SimpleAutonomousResearchService

        agent = ClinicalResearchAgent()

        pico_q = _map_pico(request.pico_question)
        analysis = {"needs_research": True, "query_type": "research", "research_indicators": ["autonomous"]}

        try:
            research_input = await agent._create_enhanced_research_input(
                request.user_original_query, analysis, None
            )
            if hasattr(research_input, "pico_question") and pico_q:
                research_input.pico_question = pico_q
            if hasattr(research_input, "research_focus") and request.research_focus:
                research_input.research_focus = request.research_focus
            if hasattr(research_input, "target_audience") and request.target_audience:
                research_input.target_audience = request.target_audience
        except Exception:
            research_input = ResearchTaskInput(
                user_original_query=request.user_original_query,
                pico_question=pico_q,
                research_focus=request.research_focus,
                target_audience=request.target_audience,
            )

        depth = (request.research_mode or 'quick').lower()
        service_mode = 'comprehensive' if depth == 'expanded' else 'quick'

        async with SimpleAutonomousResearchService(research_mode=service_mode) as service:
            result = await service.conduct_autonomous_research(research_input)

        return result
    except Exception as e:
        logger.error(f"clinical_research_autonomous failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
