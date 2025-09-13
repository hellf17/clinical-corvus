from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RAGDocumentInput(BaseModel):
    doc_id: str = Field(..., description="Unique document ID")
    text: str = Field(..., description="Raw text content")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata")


class RAGIndexRequest(BaseModel):
    documents: List[RAGDocumentInput]


class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=10, ge=1, le=100)
    alpha: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Weight for vector score in fusion")


class RAGScoredDocument(BaseModel):
    doc_id: str
    text: Optional[str]
    metadata: Optional[Dict[str, Any]]
    scores: Dict[str, float]
    # Optional citation helpers for prompt-side formatting
    citation: Optional[str] = None
    page: Optional[int] = None
    page_from: Optional[int] = None
    page_to: Optional[int] = None


class RAGSearchResponse(BaseModel):
    results: List[RAGScoredDocument]
    used_alpha: float
    total_indexed: int
