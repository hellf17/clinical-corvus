#!/usr/bin/env python
"""
Local ingestion (no API) for a single URL using the same pipeline as the backend.

Usage:
  DOCLING_ENABLE=true python scripts/ingest_url_local.py \
    --url https://link.springer.com/content/pdf/10.1007/s00134-021-06506-y.pdf \
    --doc-id surviving-sepsis-2021 --language en

This indexes into the in-memory HybridRAGService singleton and prints a brief summary.
"""
import os
import sys
import argparse
from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root / 'backend-api'))

from services.document_ingestion_service import DocumentIngestionService
from services.hybrid_rag_service import HybridRAGService, IndexedDocument


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True)
    ap.add_argument('--doc-id', required=True)
    ap.add_argument('--language', default=None)
    ap.add_argument('--target-tokens', type=int, default=512)
    ap.add_argument('--overlap-tokens', type=int, default=64)
    args = ap.parse_args()

    # Ensure Docling can be tried if requested via env
    print('[Info] DOCLING_ENABLE =', os.getenv('DOCLING_ENABLE', 'false'))
    print('[Info] LLAMAPARSE_RESULT_TYPE =', os.getenv('LLAMAPARSE_RESULT_TYPE', 'json'))

    ing = DocumentIngestionService()
    sections, chunks = ing.ingest_url(args.url, target_tokens=args.target_tokens, overlap_tokens=args.overlap_tokens)
    if not sections and not chunks:
        print('[Error] Ingestion returned no content')
        sys.exit(2)

    svc = HybridRAGService.get_instance()
    docs = []
    # sections
    for sec in sections:
        sid = f"{args.doc_id}::section::{sec.get('section_key','ROOT')}"
        meta = {
            'doc_type': 'section',
            'source': args.url,
            'language': args.language,
            'section_key': sec.get('section_key'),
            'section_path': sec.get('section_path'),
            'page_from': sec.get('page_from'),
            'page_to': sec.get('page_to'),
        }
        docs.append(IndexedDocument(doc_id=sid, text=sec.get('text',''), metadata=meta))
    # chunks
    for i, ch in enumerate(chunks):
        cid = f"{args.doc_id}#p={i+1}"
        meta = {
            'doc_type': 'chunk',
            'source': args.url,
            'language': args.language,
            'chunk_index': i + 1,
            'role': ch.get('role'),
            'section_key': ch.get('section_key'),
            'page': ch.get('page'),
        }
        docs.append(IndexedDocument(doc_id=cid, text=ch.get('text',''), metadata=meta))

    res = svc.index_documents(docs)
    print('[OK] Ingestion complete:', res)

    # quick sanity query
    q = 'surviving sepsis campaign hour-1 antibiotics'
    results = svc.search(q, top_k=5)
    print(f"\nTop results for: {q}")
    for r in results:
        txt = (r.get('text') or '')
        snippet = (txt[:300] + '...') if len(txt) > 300 else txt
        print(f"- {r.get('doc_id')} | score={r.get('scores',{}).get('hybrid'):.3f}\n  {snippet}")


if __name__ == '__main__':
    main()

