"""
Agent Security Middleware

This middleware provides security checks for the multi-agent system,
including authentication, authorization, and patient data access control.
"""

import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from typing import Optional

from security import get_current_user
from services.patient_context_manager import patient_context_manager

logger = logging.getLogger(__name__)

class AgentSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Apply to both legacy MVP routes and consolidated agents routes
        if not request.url.path.startswith(("/api/mvp-agents", "/api/agents")):
            return await call_next(request)

        try:
            user = await get_current_user(request)
            if not user:
                logger.warning("Agent request rejected: User not authenticated.")
                return Response(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content="User not authenticated",
                )

            request.state.user = user

            # Extract patient_id from request body if present
            patient_id = await self.get_patient_id_from_request(request)

            if patient_id:
                has_access = await patient_context_manager.check_patient_access(
                    patient_id=patient_id, user_id=user.id
                )
                if not has_access:
                    logger.warning(
                        f"Agent request rejected: User {user.id} does not have access to patient {patient_id}."
                    )
                    return Response(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content=f"Access to patient {patient_id} denied.",
                    )
            
            response = await call_next(request)
            return response

        except Exception as e:
            logger.error(f"Error in AgentSecurityMiddleware: {e}", exc_info=True)
            return Response(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content="An internal server error occurred in the security middleware.",
            )

    async def get_patient_id_from_request(self, request: Request) -> Optional[str]:
        """
        Extracts patient_id from the request body.
        Handles the case where the request body might be consumed.
        """
        try:
            body = await request.json()
            # After getting the body, we need to make it available for the next middleware/endpoint
            request.state.body = body
            return body.get("patient_id")
        except Exception:
            # If body is not JSON or already consumed, try to get it from state if available
            if hasattr(request.state, "body"):
                return request.state.body.get("patient_id")
            return None

async def get_body(request: Request):
    """
    A dependency to get the body from the request state,
    as the AgentSecurityMiddleware consumes it.
    """
    if hasattr(request.state, "body"):
        return request.state.body
    return await request.json()
