# Clinical Corvus — RAG & Agent Evaluation

Clinical Corvus is a digital platform for clinical data analysis, decision support, and patient monitoring. This README focuses on the Retrieval‑Augmented Generation (RAG) stack and how to evaluate the agent end‑to‑end.

- Backend: FastAPI + PostgreSQL
- Frontend: Next.js (App Router), TypeScript, Tailwind
- AI orchestration: Langroid + BAML
- Retrieval: Hybrid RAG (BM25 + Vector) with citation mapping and optional reranker
- Preprocessing: Local‑first Docling and GROBID, optional Unstructured/Nougat OCR and thepi.pe AI extraction

For a full architectural overview, see `code-overview.md`.

## Table of Contents

- Overview
- Preprocessing & RAG
- Quick Start
- Agent Evaluation
- Benchmarks
- GROBID Setup
- Documentation

## Overview

Clinical Corvus acts as a “Clinical Co‑pilot,” providing grounded, citation‑rich answers with explainable reasoning. The system prefers local‑first parsing and retrieval; cloud services are optional and gated by flags.

## Preprocessing & RAG

Parsing pipeline (local‑first):
- Docling (`DOCLING_ENABLE=true`) — primary parser; fast, layout‑aware; exports Markdown/text
- GROBID (`GROBID_ENABLE=true`) — scholarly PDFs; TEI → sections/chunks; tables are atomic chunks
- Unstructured (`UNSTRUCTURED_ENABLE=true`) — optional fallback (hi‑res strategy, table inference)
- Nougat (`NOUGAT_ENABLE=true`) — optional heavy OCR fallback
- thepi.pe (`THEPIPE_API_URL`/`THEPIPE_API_KEY`) — optional AI extraction for table/image‑heavy docs
- pypdf — last‑resort lightweight extraction

Chunking & metadata:
- Coarse section “gists” and fine chunks (~512 tokens, 64 overlap)
- Do not split tables; preserve roles (narrative/table/figure)
- Keep `section_key`, `section_path`, `page_from/page_to` when available

Retrieval:
- Hybrid BM25 + Vector fusion with tunable alpha; optional cross‑encoder reranker
- Search results include `citation`, `page`, `page_from`, `page_to` for prompt‑side formatting

Endpoints & CLI:
- File: `POST /api/rag/index-file` (form: `file`, `doc_id?`, `language?`)
- URL:  `POST /api/rag/index-url`  (form: `url`,  `doc_id?`, `language?`)
- CLI:  `scripts/ingest_corpus.py index-file|index-url ...`

See `docs/preprocessing.md` for full details.

## Quick Start

Start services (optional):
```bash
docker compose -f docker-compose.dev.yml up -d qdrant grobid backend-api
```

Ingest a file:
```bash
BACKEND_URL=http://localhost:8000 \
  python scripts/ingest_corpus.py index-file exemplos/Surviving_sepsis.pdf \
  --doc-id surviving-sepsis-2021 --language en
```

Search:
```bash
curl -s http://localhost:8000/api/rag/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"surviving sepsis campaign hour-1 antibiotics","top_k":10,"alpha":0.5}' | jq
```

Results include `citation`, `page`, `page_from`, `page_to` for easy in‑prompt references.

## Agent Evaluation

Retrieval‑only metrics (Recall@K, nDCG@K, MRR@K):
```bash
BACKEND_URL=http://localhost:8000 \
  python scripts/bench_rag.py run exemplos/bench/sample_bench.json \
  --top-k 10 --alpha 0.5 --output retrieval_results.json
```

End‑to‑end QA (HealthSearchQA, PubMedQA, MedQA):
```bash
pip install datasets

# Retrieval-only
BACKEND_URL=http://localhost:8000 \
  python scripts/agent_eval.py \
  --datasets healthsearchqa pubmedqa medqa \
  --top-k 10 --alpha 0.5 --limit 200 \
  --output eval.json

# Retrieval + generation (provide your agent endpoint)
BACKEND_URL=http://localhost:8000 \
  python scripts/agent_eval.py \
  --datasets healthsearchqa pubmedqa medqa \
  --top-k 10 --alpha 0.5 --limit 200 \
  --agent-url http://localhost:8000/api/chat \
  --output eval_full.json
```

What’s measured:
- HealthSearchQA: EM, F1, ROUGE‑L (when agent predictions are available)
- PubMedQA/MedQA: accuracy (yes/no/maybe; A/B/C/D)
- KSR: fraction of answer sentences supported by retrieved context
- KOR: fraction of reference sentences missing from retrieved context (when references exist)

Suggested acceptance criteria (initial):
- Retrieval: nDCG@10 ≥ 0.45, Recall@50 ≥ 0.75 (on your guideline corpus)
- PubMedQA/MedQA: accuracy competitive with baselines; KSR ≥ 0.8; citation fidelity ≥ 0.9
- HealthSearchQA: ROUGE‑L ≥ baseline; KSR ≥ 0.8
- Safety: ≥ 0.95 refusal on unsafe prompts; zero PHI leakage

See `docs/agent_evaluation.md` for more details.

## Benchmarks

- HealthSearchQA: https://huggingface.co/datasets/katielink/healthsearchqa
- PubMedQA:      https://huggingface.co/datasets/qiaojin/PubMedQA
- MedQA:         https://huggingface.co/datasets/bigbio/med_qa

## GROBID Setup

See `docs/grobid_setup.md` for starting the GROBID container and verifying health.

## Documentation

- Architecture: `code-overview.md`
- Preprocessing: `docs/preprocessing.md`
- Agent Evaluation: `docs/agent_evaluation.md`
- GROBID Setup: `docs/grobid_setup.md`
