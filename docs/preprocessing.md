# Preprocessing & Ingestion Pipeline

This document describes the document ingestion pipeline used by Clinical Corvus to prepare content for Hybrid RAG (BM25 + Vector) and GraphRAG in the future.

## Goals

- Local-first, robust parsing with graceful fallbacks
- Preserve structure (sections, tables, figures) and page spans when available
- Produce both coarse section “gists” and fine chunks suitable for retrieval and LLM context
- Minimize costs and external dependencies while allowing feature-gated cloud services

## Pipeline Overview (Local-First)

1. Docling (primary)
   - `DOCLING_ENABLE=true`
   - Fast, layout-aware parsing; exports Markdown/text.
   - Heuristics compute simple quality signals (text length, table count). If low-text or table-heavy, the doc is quarantined to the next parser.

2. GROBID (scholarly PDFs)
   - `GROBID_ENABLE=true`, `GROBID_URL=http://grobid:8070`
   - Converts scholarly PDFs to TEI XML; the pipeline extracts section headings, paragraphs, and tables and produces:
     - Section gists (section_key, section_path, optional page spans)
     - Fine chunks (~512 tokens, 64 overlap), with roles (narrative/table/figure)

3. Unstructured (optional fallback)
   - `UNSTRUCTURED_ENABLE=true`
   - Uses `partition_pdf` with table inference and hi-res strategy where available.

4. Nougat OCR (optional, heavy)
   - `NOUGAT_ENABLE=true`
   - For scanned/image-heavy documents; enable only when necessary (requires significant dependencies/GPU).

5. thepi.pe (optional AI extraction)
   - `THEPIPE_API_URL`, `THEPIPE_API_KEY`
   - Used only when both Docling/GROBID yields table/image-heavy text that needs AI extraction.

6. pypdf fallback
   - Lightweight text extraction if all else fails (no structure).

## Chunking & Metadata

- Coarse section “gists”: heading + first sentence or summary, for coarse-to-fine retrieval.
- Fine chunks: ~512 tokens, 64 overlap, sentence-friendly; do not split tables (atomic chunks).
- Roles: `narrative`, `table`, `figure` (and `section_summary` for gists)
- Metadata: `section_key`, `section_path`, `page_from`, `page_to` (when available), `doc_id`, `chunk_index`, `language`.

## Flags & Env

- Docling: `DOCLING_ENABLE=true`, `DOCLING_OCR=false`
- GROBID: `GROBID_ENABLE=true`, `GROBID_URL=http://grobid:8070`
- Unstructured: `UNSTRUCTURED_ENABLE=true`
- Nougat: `NOUGAT_ENABLE=true`
- LlamaParse (optional): `LLAMAPARSE_RESULT_TYPE=markdown|json`, `LLAMAPARSE_LANGUAGE=en`, `LLAMAPARSE_ENABLE_OCR`, `LLAMAPARSE_OCR_STRICT`, `INGEST_URL_DIRECT`
- thepi.pe: `THEPIPE_API_URL`, `THEPIPE_API_KEY`

## Endpoints & CLI

- File ingestion: `POST /api/rag/index-file` (form fields: `file`, `doc_id?`, `language?`, `target_tokens?`, `overlap_tokens?`)
- URL ingestion: `POST /api/rag/index-url` (form fields: `url`, `doc_id?`, `language?`, `target_tokens?`, `overlap_tokens?`)
- CLI:
  - `python scripts/ingest_corpus.py index-file <path> --doc-id ... --language en`
  - `python scripts/ingest_corpus.py index-url <url> --doc-id ... --language en`

## Recommended Defaults

- Chunking: 512 tokens, 64 overlap
- Roles: preserve tables as atomic chunks; strip markdown artifacts for embedding text
- Fusion: Weighted BM25 + vector; optional reranker (`RAG_ENABLE_RERANKER=true`)

## Troubleshooting

- If a URL returns HTML instead of a PDF (publisher cookie wall), download first and index the file, or provide a direct host URL.
- If LlamaParse is enabled but returns `COULD_NOT_LOAD_FILE`, rely on Docling/GROBID/Unstructured or provide a direct URL. Share job IDs with support.
- If Docling parsing yields low text or malformed tables, enable GROBID for papers; enable Unstructured as fallback; consider thepi.pe for AI table extraction.

