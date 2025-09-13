from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ResearchTraceStep(BaseModel):
    step_type: str
    tool_name: Optional[str] = None
    query: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    outputs: Optional[Dict[str, Any]] = None
    timestamp_ms: Optional[int] = None


class ResearchCitation(BaseModel):
    doc_id: str
    title: Optional[str] = None
    url: Optional[str] = None
    page: Optional[int] = None
    page_from: Optional[int] = None
    page_to: Optional[int] = None


class ResearchRunResult(BaseModel):
    mode: str
    final_answer: str
    citations: List[ResearchCitation]
    trace: List[ResearchTraceStep]
    latency_ms: int
    tokens_used: Optional[int] = None
