import logging
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, constr

# Import agents and security dependencies
from agents.clinical_research_agent import (
    create_clinical_research_agent,
    ClinicalResearchAgent,
)
from agents.clinical_discussion_agent import (
    create_clinical_discussion_agent,
    ClinicalDiscussionAgent,
)
from security import get_current_user_required, get_current_user_optional
from database.models import User as UserModel
from services.cache_service import cache_service
from services.patient_context_manager import patient_context_manager
from services.observability_service import (
    observability_service,
    track_agent_performance,
)
from utils.security_utils import sanitize_input

# Optional: rate limiting (same pattern as previous MVP router)
from slowapi import _rate_limit_exceeded_handler  # noqa: F401
from slowapi.errors import RateLimitExceeded  # noqa: F401
from utils.rate_limit import limiter

from baml_client import b


logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Agents"])

class AgentChatRequest(BaseModel):
    query: str
    patient_id: Optional[str] = None
    conversation_id: Optional[str] = None

@router.post("/chat")
async def agent_chat(
    request: AgentChatRequest,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Unified chat endpoint for interacting with the Langroid agent orchestrator.
    This endpoint receives a query and delegates it to the appropriate agent
    based on sophisticated intent analysis.
    """
    # Generate cache key
    cache_key_str = f"{request.query}-{request.patient_id}-{request.conversation_id}"
    cache_key = hashlib.md5(cache_key_str.encode()).hexdigest()

    # Check cache
    cached_response = cache_service.get(cache_key)
    if cached_response:
        return cached_response

    try:
        logger.info(f"Agent chat request received for user {current_user.id} with query: {request.query}")

        # Use BAML for sophisticated intent detection
        try:
            analysis = await b.AnalyzeClinicalQuery(request.query)
            intent = analysis.query_type
            logger.info(f"BAML intent analysis result: {intent}")
        except Exception as e:
            logger.error(f"BAML intent analysis failed: {e}. Falling back to keyword-based routing.")
            intent = "fallback"

        # Route based on intent analysis
        if intent == "research" or (intent == "fallback" and ("research" in request.query.lower() or "evidence" in request.query.lower())):
            agent = create_clinical_research_agent()
        elif intent == "discussion" or (intent == "fallback" and "case" in request.query.lower()):
            agent = create_clinical_discussion_agent()
        else: # Default to discussion agent for general clinical queries
            agent = create_clinical_discussion_agent()

        # The `agent_response` method in Langroid handles the full tool-use loop.
        response = await agent.agent_response(request.query)
        
        response_data = {"response": response.content, "intent": intent}
        
        # Set cache
        cache_service.set(cache_key, response_data)

        return response_data

    except Exception as e:
        logger.error(f"Error in agent chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------
# Consolidated MVP Agent Endpoints
# (moved from mvp_agents_router.py)
# ------------------------------

# Rate limiter instance imported from shared limiter


class ClinicalResearchRequest(BaseModel):
    query: constr(min_length=1, max_length=2000) = Field(..., description="Clinical research question")
    patient_id: Optional[str] = Field(None, description="Patient ID for context")
    include_patient_context: bool = Field(True, description="Whether to include patient context")
    research_mode: str = Field("comprehensive", description="Research mode: quick or comprehensive")


class ClinicalDiscussionRequest(BaseModel):
    case_description: constr(min_length=1, max_length=2000) = Field(..., description="Clinical case description")
    patient_id: Optional[str] = Field(None, description="Patient ID for context")
    include_patient_context: bool = Field(True, description="Whether to include patient context")


class ClinicalQueryRequest(BaseModel):
    query: constr(min_length=1, max_length=2000) = Field(..., description="General clinical query")
    patient_id: Optional[str] = Field(None, description="Patient ID for context")
    query_type: Optional[str] = Field(None, description="Override query type routing")


class FollowUpDiscussionRequest(BaseModel):
    follow_up_question: constr(min_length=1, max_length=2000) = Field(..., description="Follow-up question")
    conversation_id: Optional[int] = Field(None, description="Previous conversation ID")


class HealthCheckResponse(BaseModel):
    status: str
    timestamp: str
    services: dict


@router.post("/clinical-research")
@track_agent_performance("clinical_research")
@limiter.limit("10/minute")
async def clinical_research_endpoint(
    request: ClinicalResearchRequest,
    req: Request,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Clinical research with patient context (MVP endpoint).
    """
    try:
        sanitized_query = sanitize_input(request.query)
        logger.info(f"Clinical research request from user {current_user.id}: {sanitized_query[:100]}...")

        cache_key_data = f"{sanitized_query}-{request.patient_id}-{request.research_mode}-{current_user.id}"
        cache_key = hashlib.md5(cache_key_data.encode()).hexdigest()

        cached_response = cache_service.get(cache_key)
        if cached_response:
            logger.info("Returning cached research response")
            return cached_response

        patient_context = None
        if request.include_patient_context and request.patient_id:
            try:
                patient_context = await patient_context_manager.get_patient_context(
                    request.patient_id, current_user.id
                )
                if isinstance(patient_context, dict) and "error" in patient_context:
                    logger.warning(f"Could not get patient context: {patient_context['error']}")
                    patient_context = None
            except Exception as e:
                logger.warning(f"Error getting patient context: {e}")
                patient_context = None

        agent = ClinicalResearchAgent()
        result = await agent.handle_clinical_query(
            query=sanitized_query,
            patient_context=patient_context,
        )

        response_data = {
            "result": result,
            "agent_type": "clinical_research",
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
            "research_mode": request.research_mode,
        }

        if isinstance(result, dict) and "error" not in result:
            cache_service.set(cache_key, response_data, ttl=3600)

        return response_data

    except Exception as e:
        logger.error(f"Error in clinical research endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during clinical research.",
        )


@router.post("/clinical-discussion")
@track_agent_performance("clinical_discussion")
@limiter.limit("10/minute")
async def clinical_discussion_endpoint(
    request: ClinicalDiscussionRequest,
    req: Request,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Clinical case discussion with optional patient context (MVP endpoint).
    """
    try:
        sanitized_case_description = sanitize_input(request.case_description)
        logger.info(
            f"Clinical discussion request from user {current_user.id}: {sanitized_case_description[:100]}..."
        )

        agent = ClinicalDiscussionAgent()
        result = await agent.discuss_clinical_case(
            case_description=sanitized_case_description,
            patient_id=request.patient_id,
            user_id=current_user.id,
            include_patient_context=request.include_patient_context,
        )

        response_data = {
            "result": result,
            "agent_type": "clinical_discussion",
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
        }
        return response_data

    except Exception as e:
        logger.error(f"Error in clinical discussion endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during clinical discussion.",
        )


@router.post("/clinical-query")
@track_agent_performance("clinical_query")
@limiter.limit("15/minute")
async def clinical_query_endpoint(
    request: ClinicalQueryRequest,
    req: Request,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    General clinical queries with intelligent routing (MVP endpoint).
    """
    try:
        sanitized_query = sanitize_input(request.query)
        logger.info(f"Clinical query request from user {current_user.id}: {sanitized_query[:100]}...")

        patient_context = None
        if request.patient_id:
            try:
                patient_context = await patient_context_manager.get_patient_context(
                    request.patient_id, current_user.id
                )
                if isinstance(patient_context, dict) and "error" in patient_context:
                    patient_context = None
            except Exception as e:
                logger.warning(f"Error getting patient context for query: {e}")

        query_lower = request.query.lower()

        if request.query_type == "research" or any(
            keyword in query_lower
            for keyword in [
                "evidence",
                "literature",
                "research",
                "study",
                "guideline",
                "systematic review",
            ]
        ):
            agent = ClinicalResearchAgent()
            result = await agent.handle_clinical_query(request.query, patient_context)
            agent_type = "clinical_research"

        elif request.query_type == "discussion" or any(
            keyword in query_lower
            for keyword in [
                "case",
                "discussion",
                "differential",
                "diagnosis",
                "presentation",
            ]
        ):
            agent = ClinicalDiscussionAgent()
            result = await agent.discuss_clinical_case(
                case_description=request.query,
                patient_id=request.patient_id,
                user_id=current_user.id,
                include_patient_context=True,
            )
            agent_type = "clinical_discussion"

        else:
            agent = ClinicalResearchAgent()
            result = await agent.handle_clinical_query(request.query, patient_context)
            agent_type = "clinical_research"

        return {
            "result": result,
            "agent_type": agent_type,
            "routing_decision": {
                "query_type": request.query_type or "auto_detected",
                "patient_context_available": patient_context is not None,
            },
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
        }

    except Exception as e:
        logger.error(f"Error in clinical query endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical query failed: {str(e)}",
        )


@router.post("/follow-up-discussion")
@track_agent_performance("follow_up_discussion")
async def follow_up_discussion_endpoint(
    request: FollowUpDiscussionRequest,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Continue existing clinical discussion (MVP endpoint).
    """
    try:
        logger.info(
            f"Follow-up discussion from user {current_user.id}: {request.follow_up_question[:100]}..."
        )

        agent = ClinicalDiscussionAgent()
        result = await agent.continue_discussion(
            follow_up_question=request.follow_up_question,
            conversation_id=request.conversation_id,
        )

        return {
            "result": result,
            "agent_type": "clinical_discussion",
            "timestamp": datetime.now().isoformat(),
            "user_id": current_user.id,
        }

    except Exception as e:
        logger.error(f"Error in follow-up discussion endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Follow-up discussion failed: {str(e)}",
        )


@router.get("/conversation-history")
async def get_conversation_history(
    limit: int = 5,
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Get recent conversation history (MVP endpoint).
    """
    try:
        logger.info(f"Conversation history request from user {current_user.id}")

        agent = ClinicalDiscussionAgent()
        history = agent.get_conversation_history(limit=limit)

        return {
            "conversation_history": history,
            "total_conversations": len(history),
            "user_id": current_user.id,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting conversation history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}",
        )


@router.get("/metrics")
async def get_metrics(current_user: UserModel = Depends(get_current_user_required)):
    """
    Get observability metrics (admin only) (MVP endpoint).
    """
    if not hasattr(current_user, "roles") or "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access metrics.",
        )
    return observability_service.get_metrics()


@router.get("/health", response_model=HealthCheckResponse)
async def mvp_health_check():
    """
    Health check for multi-agent components (MVP endpoint).
    """
    try:
        services_status = {}

        try:
            _ = ClinicalResearchAgent()
            services_status["clinical_research_agent"] = "healthy"
        except Exception as e:
            services_status["clinical_research_agent"] = f"error: {str(e)}"

        try:
            _ = ClinicalDiscussionAgent()
            services_status["clinical_discussion_agent"] = "healthy"
        except Exception as e:
            services_status["clinical_discussion_agent"] = f"error: {str(e)}"

        try:
            await patient_context_manager.check_patient_access("test", "test")
            services_status["patient_context_manager"] = "healthy"
        except Exception as e:
            services_status["patient_context_manager"] = f"error: {str(e)}"

        try:
            from services.simple_autonomous_research import SimpleAutonomousResearchService  # noqa: F401
            services_status["autonomous_research_service"] = "available"
        except ImportError as e:
            services_status["autonomous_research_service"] = f"unavailable: {str(e)}"

        try:
            from baml_client import b as _b  # noqa: F401
            services_status["baml_client"] = "available"
        except ImportError as e:
            services_status["baml_client"] = f"unavailable: {str(e)}"

        overall_status = (
            "healthy"
            if all("error" not in s and "unavailable" not in s for s in services_status.values())
            else "degraded"
        )

        return HealthCheckResponse(
            status=overall_status,
            timestamp=datetime.now().isoformat(),
            services=services_status,
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthCheckResponse(
            status="error",
            timestamp=datetime.now().isoformat(),
            services={"error": str(e)},
        )
