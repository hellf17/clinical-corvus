import sys
from pathlib import Path

# Ensure backend-api on path
repo_root = Path(__file__).resolve().parents[1]
backend_path = repo_root / 'backend-api'
sys.path.insert(0, str(backend_path))

from services.hybrid_rag_service import HybridRAGService, IndexedDocument
from services.document_ingestion_service import DocumentIngestionService


def test_hybrid_rag_basic_search():
    svc = HybridRAGService(alpha=0.5, embedding_dim=128)
    svc.reset()

    # Section doc
    sec_meta = {
        'doc_type': 'section',
        'section_key': 'Sepsis > Early Management',
        'section_path': ['Sepsis', 'Early Management'],
        'page_from': 10,
        'page_to': 12,
    }
    sec_doc = IndexedDocument(doc_id='book::section::sepsis-early', text='Early management of sepsis recommendations and protocols.', metadata=sec_meta)

    # Chunk doc tied to section
    ch_meta = {
        'doc_type': 'chunk',
        'role': 'guideline',
        'section_key': 'Sepsis > Early Management',
        'page': 11,
    }
    ch_doc = IndexedDocument(doc_id='book#p=1', text='Early goal-directed therapy is recommended in sepsis with timely antibiotics.', metadata=ch_meta)

    svc.index_documents([sec_doc, ch_doc])

    results = svc.search('early goal-directed therapy in sepsis', top_k=5)
    assert results, 'Expected non-empty results'
    top = results[0]
    assert 'sepsis' in (top.get('text') or '').lower() or 'goal-directed' in (top.get('text') or '').lower()


def test_ingestion_fallback_plain_text():
    ing = DocumentIngestionService()
    text = (
        'SEPSIS\n'
        'Early Management:\n'
        'Recommendation: Administer broad-spectrum antibiotics within one hour of recognition.'
    )
    sections, chunks = ing.ingest_bytes(text.encode('utf-8'), filename='note.txt', target_tokens=128, overlap_tokens=16)
    assert sections, 'Should produce at least one section summary'
    assert chunks, 'Should produce chunk docs'
    assert any('antibiotics' in (c.get('text') or '').lower() for c in chunks)

