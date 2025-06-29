import httpx
import os
import logging
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field # Re-define needed models or import if possible

# --- Pydantic Models (Mirrored from mcp_server for client-side validation/typing) ---
# It's better practice to share these via a common library, but for now, redefine.

class PatientDemographics(BaseModel):
    patient_id: Union[int, str]
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    primary_diagnosis: Optional[str] = None

class SimpleVitalSign(BaseModel):
    type: str
    value: Union[str, float, int]
    timestamp: str

class SimpleLabResult(BaseModel):
    test_name: str
    value: Union[str, float, int]
    unit: Optional[str] = None
    timestamp: str
    is_abnormal: Optional[bool] = None

class SimpleMedication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None

class SimpleClinicalNote(BaseModel):
    title: Optional[str] = None
    note_type: Optional[str] = None
    content_snippet: str
    timestamp: str

class ConversationMessage(BaseModel):
    role: str
    content: str

class ContextRequestClient(BaseModel): # Renamed slightly to avoid exact name clash if imported
    patient_data: PatientDemographics
    recent_vitals: List[SimpleVitalSign] = Field(default_factory=list)
    recent_labs: List[SimpleLabResult] = Field(default_factory=list)
    active_medications: List[SimpleMedication] = Field(default_factory=list)
    recent_notes: List[SimpleClinicalNote] = Field(default_factory=list)
    conversation_history: List[ConversationMessage] = Field(default_factory=list)
    max_context_length: Optional[int] = 2000

class ContextResponseClient(BaseModel): # Renamed slightly
    context_string: str
    debug_info: Optional[Dict[str, Any]] = None

# --- End Pydantic Models ---


logger = logging.getLogger(__name__)

class MCPClient:
    """Client for interacting with the MCP Context Server."""

    def __init__(self):
        self.base_url = os.getenv("MCP_SERVER_URL", "http://localhost:8765") # Default for local dev
        if not self.base_url.startswith(('http://', 'https://')):
             self.base_url = f"http://{self.base_url}" # Ensure scheme is present
             
        logger.info(f"MCP Client initialized with base URL: {self.base_url}")
        # Use an async client for non-blocking calls from FastAPI
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=15.0) # 15 sec timeout

    async def get_context(
        self,
        patient_data: Dict[str, Any],
        recent_vitals: List[Dict[str, Any]] = [],
        recent_labs: List[Dict[str, Any]] = [],
        active_medications: List[Dict[str, Any]] = [],
        recent_notes: List[Dict[str, Any]] = [],
        conversation_history: List[Dict[str, Any]] = [],
        max_context_length: Optional[int] = 2000
    ) -> Optional[str]:
        """
        Fetches the formatted context string from the MCP server.

        Args:
            patient_data: Dictionary representing PatientDemographics.
            recent_vitals: List of dictionaries representing SimpleVitalSign.
            recent_labs: List of dictionaries representing SimpleLabResult.
            active_medications: List of dictionaries representing SimpleMedication.
            recent_notes: List of dictionaries representing SimpleClinicalNote.
            conversation_history: List of dictionaries representing ConversationMessage.
            max_context_length: Optional maximum length for the context string.

        Returns:
            The formatted context string, or None if an error occurs.
        """
        try:
            # Validate and structure the request payload using Pydantic models
            request_payload = ContextRequestClient(
                patient_data=PatientDemographics(**patient_data),
                recent_vitals=[SimpleVitalSign(**v) for v in recent_vitals],
                recent_labs=[SimpleLabResult(**l) for l in recent_labs],
                active_medications=[SimpleMedication(**m) for m in active_medications],
                recent_notes=[SimpleClinicalNote(**n) for n in recent_notes],
                conversation_history=[ConversationMessage(**msg) for msg in conversation_history],
                max_context_length=max_context_length
            )
            
            payload_dict = request_payload.model_dump(mode='json') # Use model_dump for Pydantic v2+

            logger.info(f"Sending context request to {self.base_url}/context for patient {patient_data.get('patient_id')}")
            
            response = await self.client.post("/context", json=payload_dict)
            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

            response_data = response.json()
            
            # Validate response using Pydantic model
            context_response = ContextResponseClient(**response_data)

            logger.info(f"Received context string (length: {len(context_response.context_string)})")
            if context_response.debug_info:
                 logger.debug(f"MCP Server Debug Info: {context_response.debug_info}")

            return context_response.context_string

        except httpx.RequestError as e:
            logger.error(f"HTTP Request Error connecting to MCP server at {self.base_url}: {e}")
            return None
        except httpx.HTTPStatusError as e:
            logger.error(f"MCP Server returned error status {e.response.status_code}: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Error getting context from MCP server: {e}", exc_info=True)
            return None

    async def close(self):
        """Closes the underlying HTTP client."""
        await self.client.aclose()
        logger.info("MCP Client closed.")

# Example usage (optional, for testing)
# async def main():
#     client = MCPClient()
#     # ... create mock data ...
#     context = await client.get_context(mock_patient_data, ...)
#     if context:
#         print("Generated Context:\n", context)
#     await client.close()

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main()) 