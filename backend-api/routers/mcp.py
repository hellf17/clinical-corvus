from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, List, Any, Optional
import httpx
import logging
import json
from pydantic import BaseModel, Field
import os
import importlib.util
from pathlib import Path

from security import JWTBearer
from database import get_db
from schemas import StandardResponse
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Path to the mcp_server module
MCP_SERVER_PATH = Path(__file__).parent.parent.parent.parent / "mcp_server" / "mcp_server.py"

# Import mcp_server.py dynamically
def import_mcp_server():
    if not MCP_SERVER_PATH.exists():
        raise ImportError(f"MCP Server module not found at {MCP_SERVER_PATH}")
    
    spec = importlib.util.spec_from_file_location("mcp_server", MCP_SERVER_PATH)
    mcp_server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mcp_server)
    return mcp_server

try:
    mcp_server = import_mcp_server()
    logger.info("MCP Server module imported successfully")
except ImportError as e:
    logger.error(f"Failed to import MCP Server module: {e}")
    mcp_server = None

# Pydantic models for API endpoints
class ToolListResponse(BaseModel):
    success: bool
    tools: List[Dict[str, Any]]
    message: Optional[str] = None

class ToolCallRequest(BaseModel):
    tool_name: str
    args: Dict[str, Any]

class ToolCallResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None

# Initialize MCP clients
clinical_mcp_client = None
research_mcp_client = None

@router.on_event("startup")
async def startup_event():
    """Initialize MCP clients when the router starts"""
    global clinical_mcp_client, research_mcp_client
    
    if mcp_server:
        try:
            clinical_mcp_client = mcp_server.ClinicalMCPClient(mode="clinical")
            await clinical_mcp_client.connect()
            logger.info("Clinical MCP Client initialized successfully")
            
            research_mcp_client = mcp_server.ClinicalMCPClient(mode="research")
            await research_mcp_client.connect()
            logger.info("Research MCP Client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MCP clients: {e}")

@router.on_event("shutdown")
async def shutdown_event():
    """Cleanup when the router shuts down"""
    global clinical_mcp_client, research_mcp_client
    
    if clinical_mcp_client:
        await clinical_mcp_client.disconnect()
    
    if research_mcp_client:
        await research_mcp_client.disconnect()

@router.get("/tools", response_model=ToolListResponse)
async def list_tools(
    mode: str = "clinical",
    db: Session = Depends(get_db), 
    token: str = Depends(JWTBearer())
):
    """
    List available MCP tools
    
    Args:
        mode: Either "clinical" or "research"
    """
    if not mcp_server:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MCP Server functionality is not available"
        )
    
    client = clinical_mcp_client if mode == "clinical" else research_mcp_client
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MCP {mode} client is not initialized"
        )
    
    try:
        server = client.server
        response = await server.list_tools()
        
        tools_list = []
        for tool in response.tools:
            tools_list.append({
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.inputSchema,
                "outputSchema": getattr(tool, "outputSchema", {"type": "string"})
            })
        
        return ToolListResponse(success=True, tools=tools_list)
    
    except Exception as e:
        logger.error(f"Error listing MCP tools: {e}")
        return ToolListResponse(
            success=False,
            tools=[],
            message=f"Error listing tools: {str(e)}"
        )

@router.post("/call", response_model=ToolCallResponse)
async def call_tool(
    request: ToolCallRequest = Body(...),
    mode: str = "clinical",
    db: Session = Depends(get_db), 
    token: str = Depends(JWTBearer())
):
    """
    Call an MCP tool
    
    Args:
        request: Tool name and arguments
        mode: Either "clinical" or "research"
    """
    if not mcp_server:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MCP Server functionality is not available"
        )
    
    client = clinical_mcp_client if mode == "clinical" else research_mcp_client
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MCP {mode} client is not initialized"
        )
    
    try:
        server = client.server
        response = await server.call_tool(request.tool_name, request.args)
        
        return ToolCallResponse(
            success=response.success,
            content=response.content,
            error=response.error
        )
    
    except Exception as e:
        logger.error(f"Error calling MCP tool: {e}")
        return ToolCallResponse(
            success=False,
            error=f"Error calling tool: {str(e)}"
        )

@router.post("/guest/call", response_model=ToolCallResponse)
async def guest_call_tool(
    request: ToolCallRequest = Body(...),
    mode: str = "clinical"
):
    """
    Call an MCP tool without authentication (guest mode)
    Only certain tools are available in guest mode
    
    Args:
        request: Tool name and arguments
        mode: Either "clinical" or "research"
    """
    # Limited set of tools allowed in guest mode
    ALLOWED_GUEST_TOOLS = [
        "brave_web_search", 
        "search_pubmed",
        "get_pubmed_abstract"
    ]
    
    if request.tool_name not in ALLOWED_GUEST_TOOLS:
        return ToolCallResponse(
            success=False,
            error=f"Tool '{request.tool_name}' is not available in guest mode"
        )
    
    if not mcp_server:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MCP Server functionality is not available"
        )
    
    client = clinical_mcp_client if mode == "clinical" else research_mcp_client
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MCP {mode} client is not initialized"
        )
    
    try:
        server = client.server
        response = await server.call_tool(request.tool_name, request.args)
        
        return ToolCallResponse(
            success=response.success,
            content=response.content,
            error=response.error
        )
    
    except Exception as e:
        logger.error(f"Error calling MCP tool in guest mode: {e}")
        return ToolCallResponse(
            success=False,
            error=f"Error calling tool: {str(e)}"
        )

# Direct access to common MCP functions for ease of use in other modules
async def search_pubmed(query: str, max_results: int = 10, include_abstract: bool = True) -> Dict[str, Any]:
    """Helper function to search PubMed directly"""
    if not clinical_mcp_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                           detail="Clinical MCP client not initialized")
    
    try:
        # Prepare the arguments for the PubMed search
        args = {
            "title_abstract_keywords": [query],
            "authors": [],
            "num_results": max_results
        }
        
        # Call the PubMed search function
        result = await clinical_mcp_client.call_tool("mcp_pubmed_search_mcp_server_search_pubmed", args)
        
        # If abstract is not needed, strip it from the results to reduce payload size
        if not include_abstract and "results" in result:
            for paper in result["results"]:
                if "abstract" in paper:
                    paper["abstract"] = ""
        
        return result
    except Exception as e:
        logging.error(f"Error searching PubMed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                           detail=f"Error searching PubMed: {str(e)}") 