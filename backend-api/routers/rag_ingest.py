from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Any, Dict, Optional

from services.document_ingestion_service import DocumentIngestionService
from services.hybrid_rag_service import HybridRAGService, IndexedDocument


router = APIRouter(tags=["Hybrid RAG Ingest"])


@router.post("/rag/index-file")
async def index_file(
    file: UploadFile = File(...),
    doc_id: Optional[str] = Form(None),
    source_url: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    target_tokens: int = Form(512),
    overlap_tokens: int = Form(64),
) -> Dict[str, Any]:
    ing = DocumentIngestionService()
    content = await file.read()
    sections, chunks = ing.ingest_bytes(content, filename=file.filename, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
    if not chunks and not sections:
        raise HTTPException(status_code=400, detail="Failed to parse content. Enable LlamaParse for PDFs or provide HTML/TXT.")

    base_id = doc_id or (source_url or (file.filename or "doc")).rsplit("/", 1)[-1]
    svc = HybridRAGService.get_instance()
    docs = []
    # index section summaries
    for i, sec in enumerate(sections):
        sid = f"{base_id}::section::{sec.get('section_key','ROOT')}"
        meta = {
            "doc_type": "section",
            "source": source_url or file.filename,
            "language": language,
            "section_key": sec.get("section_key"),
            "section_path": sec.get("section_path"),
            "page_from": sec.get("page_from"),
            "page_to": sec.get("page_to"),
        }
        docs.append(IndexedDocument(doc_id=sid, text=sec.get("text", ""), metadata=meta))
    # index chunk docs
    for i, ch in enumerate(chunks):
        cid = f"{base_id}#p={i+1}"
        meta = {
            "doc_type": "chunk",
            "source": source_url or file.filename,
            "language": language,
            "chunk_index": i + 1,
            "role": ch.get("role"),
            "section_key": ch.get("section_key"),
            "page": ch.get("page"),
        }
        docs.append(IndexedDocument(doc_id=cid, text=ch.get("text", ""), metadata=meta))
    res = svc.index_documents(docs)
    return {"status": "ok", "sections_indexed": len(sections), "chunks_indexed": len(chunks), "base_id": base_id}


@router.post("/rag/index-url")
async def index_url(
    url: str = Form(...),
    doc_id: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    target_tokens: int = Form(512),
    overlap_tokens: int = Form(64),
) -> Dict[str, Any]:
    ing = DocumentIngestionService()
    sections, chunks = ing.ingest_url(url, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
    if not chunks and not sections:
        raise HTTPException(status_code=400, detail="Failed to parse URL content")
    base_id = doc_id or url
    svc = HybridRAGService.get_instance()
    docs = []
    for i, sec in enumerate(sections):
        sid = f"{base_id}::section::{sec.get('section_key','ROOT')}"
        meta = {
            "doc_type": "section",
            "source": url,
            "language": language,
            "section_key": sec.get("section_key"),
            "section_path": sec.get("section_path"),
            "page_from": sec.get("page_from"),
            "page_to": sec.get("page_to"),
        }
        docs.append(IndexedDocument(doc_id=sid, text=sec.get("text", ""), metadata=meta))
    for i, ch in enumerate(chunks):
        cid = f"{base_id}#p={i+1}"
        meta = {
            "doc_type": "chunk",
            "source": url,
            "language": language,
            "chunk_index": i + 1,
            "role": ch.get("role"),
            "section_key": ch.get("section_key"),
            "page": ch.get("page"),
        }
        docs.append(IndexedDocument(doc_id=cid, text=ch.get("text", ""), metadata=meta))
    res = svc.index_documents(docs)
    return {"status": "ok", "sections_indexed": len(sections), "chunks_indexed": len(chunks), "base_id": base_id}
