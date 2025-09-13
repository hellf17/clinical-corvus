from fastapi import APIRouter, HTTPException
from typing import Any

from models.rag_models import (
    RAGIndexRequest,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGScoredDocument,
)
from services.hybrid_rag_service import HybridRAGService, IndexedDocument


router = APIRouter(tags=["Hybrid RAG"])


@router.post("/rag/index")
async def index_documents(payload: RAGIndexRequest) -> dict:
    svc = HybridRAGService.get_instance()
    docs = [IndexedDocument(doc_id=d.doc_id, text=d.text, metadata=d.metadata) for d in payload.documents]
    res = svc.index_documents(docs)
    return {"status": "ok", **res}


@router.post("/rag/search", response_model=RAGSearchResponse)
async def search(payload: RAGSearchRequest) -> Any:
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    svc = HybridRAGService.get_instance()

    # temporarily allow per-request alpha override without mutating singleton globally
    original_alpha = svc.alpha
    if payload.alpha is not None:
        svc.alpha = payload.alpha
    try:
        results = svc.search(payload.query, top_k=payload.top_k)
    finally:
        svc.alpha = original_alpha

    return RAGSearchResponse(
        results=[RAGScoredDocument(**r) for r in results],
        used_alpha=payload.alpha if payload.alpha is not None else original_alpha,
        total_indexed=len(svc.documents),
    )


@router.post("/rag/reset")
async def reset_index() -> dict:
    svc = HybridRAGService.get_instance()
    svc.reset()
    return {"status": "ok"}

