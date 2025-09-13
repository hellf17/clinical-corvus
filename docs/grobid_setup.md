# GROBID Setup (Dev)

GROBID powers high‑quality parsing for scholarly PDFs. This guide covers running it locally and verifying integration.

## 1) Start GROBID

Prerequisites: Docker Desktop running.

- Compose (recommended):
  
  ```bash
  docker compose -f docker-compose.dev.yml up -d grobid
  ```

- Verify health:
  
  ```bash
  curl -f http://localhost:8070/api/isalive
  # returns: true
  ```

## 2) Configure Backend

- .env flags
  
  ```env
  DOCLING_ENABLE=true
  GROBID_ENABLE=true
  GROBID_URL=http://localhost:8070
  UNSTRUCTURED_ENABLE=false   # optional fallback
  NOUGAT_ENABLE=false         # optional heavy OCR fallback
  ```

- Restart backend if running via compose:
  
  ```bash
  docker compose -f docker-compose.dev.yml up -d backend-api
  ```

## 3) Ingest + Search

- File ingestion:
  
  ```bash
  BACKEND_URL=http://localhost:8000 \
    python scripts/ingest_corpus.py index-file exemplos/Surviving_sepsis.pdf \
    --doc-id surviving-sepsis-2021 --language en
  ```

- Example search (shows citation fields when available):
  
  ```bash
  curl -s http://localhost:8000/api/rag/search \
    -H 'Content-Type: application/json' \
    -d '{"query":"surviving sepsis campaign hour-1 antibiotics","top_k":10,"alpha":0.5}' | jq
  ```

## 4) Run the GROBID Test

- Local test is skipped unless GROBID is reachable on `GROBID_URL` (default `http://localhost:8070`).
  
  ```bash
  export GROBID_URL=http://localhost:8070
  python -m pytest -q tests_local/test_grobid_local.py
  ```

Expected: the test passes when GROBID is responding and can parse `exemplos/Surviving_sepsis.pdf`.

## Notes

- Some publisher URLs require cookies/referrers; prefer `index-file` with a downloaded PDF or provide a direct (non‑gated) URL.
- If Docling output is low‑quality or table‑heavy, the ingestion router automatically falls back to GROBID, then Unstructured/Nougat (if enabled), then pypdf.
