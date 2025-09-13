# Clinical Corvus

*A clinical platform for organized patient data, AI-assisted decision support, and evidence-based learning.*

> **Mission:** Be a trustworthy **clinical co‑pilot** for physicians and trainees—accelerating workflows, improving clinical reasoning, and keeping practice aligned with evidence. Privacy, security, and LGPD/HIPAA compliance are first‑class concerns.

---

## Table of Contents

* [Overview](#overview)
* [Key Features](#key-features)
* [Architecture](#architecture)
* [Security & Compliance](#security--compliance)
* [Getting Started](#getting-started)
* [Configuration](#configuration)
* [Project Structure](#project-structure)
* [Core Services](#core-services)
* [API Overview](#api-overview)
* [Clinical Validation Program](#clinical-validation-program)
* [Roadmap](#roadmap)
* [Testing & Quality](#testing--quality)
* [Contributing](#contributing)
* [License](#license)

---

## Overview

Clinical Corvus is a secure platform that centralizes clinical data and augments clinicians with AI. It supports:

* **Physicians:** patient management, AI‑assisted analysis, research tooling.
* **Students/Residents:** academy modules, structured reasoning, research practice.

The platform blends a multi‑agent architecture (Langroid), structured data capture, and hybrid retrieval (GraphRAG: KG + BM25/Vector) to deliver contextual insights while preserving privacy.

---

## Key Features

### Clinical

* **Patient Management:** RBAC‑guarded CRUD, groups/teams, audit trail.
* **Clinical Data Visualization:** charts for vitals/labs; risk scores (e.g., MELD, CKD‑EPI).
* **Exam Ingestion:** PDF/JPG/PNG upload → extraction → unit/reference enrichment → abnormalities.
* **Alerts:** severity‑based rules, real‑time management.
* **Medications:** status, route/frequency, prescriptions.

### AI Copilot (Dr. Corvus)

* **ClinicalDiscussionAgent:** case analysis, differential, plans, red flags.
* **ClinicalResearchAgent:** PubMed/Europe PMC/Lens + web guidelines; synthesis with quality checks (CiteSource).
* **Patient Context Awareness:** automatic context in patient chats.
* **Streaming Chat:** unified `/api/agents/chat` endpoint (backend orchestrates tools).

### Education (Clinical Academy)

* **Reasoning Modules:** SNAPPS, differential expansion (e.g., VINDICATE), metacognition.
* **EBM Workflows:** Quick Research (PICO), Autonomous Deep Research, transparency metrics.
* **Portuguese‑first UX:** full PT‑BR translation; backend‑centralized translation (DeepL → BAML fallback).

---

## Architecture

**Frontend:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Recharts, Clerk

**Backend API:** FastAPI, SQLAlchemy, Pydantic, PostgreSQL, Alembic

**AI & Orchestration:** Langroid multi‑agent, BAML functions, Vercel AI SDK (frontend), MCP server (context/RAG), hybrid GraphRAG (KG + BM25/Vector)

**External Services:** PubMed, Europe PMC, Lens.org, Brave Search; bibliometrics (Altmetric, iCite, Web of Science, OpenCitations, Semantic Scholar)

```
+-------------+      +---------------+      +-------------+      +---------+
|  Frontend   | ---> |  Backend API  | ---> |  Postgres   | ---> |  Clerk  |
|  Next.js    | <--- |   FastAPI     | <--- |  (RDBMS)    |      | (Auth)  |
+-------------+      +-------+-------+      +------+------+      +----+----+
                              |                    ^                  |
                              v                    |                  |
                       +------+-------+           |           +------+------+
                       |   MCP Server |-----------+-----------|  LLM APIs   |
                       |  (RAG/KG/AL) |   (de‑identified data) | (OpenRouter/|
                       +------+-------+                         |  Gemini)    |
                              |                                 +-------------+
                              v
                       External APIs (PubMed, Europe PMC, Lens, Brave, LlamaParse, Bibliometrics)
```

---

## Security & Compliance

* **Authentication:** Clerk (OAuth, Email/Password, MFA), session verification on backend (`security.py`).
* **RBAC:** enforced in middleware (frontend) and endpoints (backend).
* **Data Privacy:** strict handling of PHI; de‑identification for external LLM calls.
* **Encryption:** TLS in transit; at‑rest encryption configured at the DB/storage level.
* **Compliance:** Designed for LGPD/HIPAA; audit logging for sensitive operations.

> See also: `production_deployment_architecture.md` and `monitoring_evaluation_framework.md`.

---

## Getting Started

### Prerequisites

* **OS:** Linux/macOS/Windows (WSL2)
* **Node.js:** v18+
* **Python:** 3.10+
* **Docker & Compose:** latest
* **Clerk account** (auth)
* **API keys** for LLMs and bibliometric/search services

### Quick Start

```bash
# 1) Clone & configure
git clone <YOUR_REPO_URL> clinical-corvus
cd clinical-corvus
# Prepare .env files: root, frontend/.env.local, backend-api/.env, mcp_server/.env

# 2) Generate BAML client
baml-cli generate

# 3) Start services (dev)
docker-compose -f docker-compose.dev.yml up -d --build

# 4) Run DB migrations (dev)
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head

# 5) Open the app
# Frontend: http://localhost:<frontend_port>
# Backend:  http://localhost:<backend_port>/docs
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Performance targets (typical): cold start 2–3 min; API P50 < 500 ms.

---

## Configuration

All secrets are set via environment variables. Common keys:

| Area                 | Variables (examples)                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Auth                 | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                                                               |
| DB                   | `DATABASE_URL` (PostgreSQL)                                                                               |
| LLM                  | `OPENROUTER_API_KEY`, `GEMINI_API_KEY`                                                                    |
| Search/Bibliometrics | `BRAVE_API_KEY`, `ALTMETRIC_KEY`, `ICITE_BASE`, `WOS_KEY`, `LENS_SCHOLAR_API_KEY`, `SEMANTIC_SCHOLAR_KEY` |
| Parsing              | `LLAMAPARSE_API_KEY`                                                                                      |

> Keep `.env` files out of version control. See service docs for full lists.

---

## Project Structure

```
frontend/                # Next.js app (App Router), shadcn/ui components
backend-api/             # FastAPI service (routers, schemas, crud, security)
mcp_server/              # Context generation, RAG (KG + BM25/Vector), CiteSource
baml_src/                # BAML function specs and orchestration
baml_client/             # Generated BAML client
scripts/                 # Benchmarks, utilities
docs/                    # Additional docs & testing plans
```

Helpful docs in repo:

* `code-overview.md`
* `README_RAG.md`, `hybrid_graphrag_architecture.md`, `hybrid_graphrag_implementation.md`
* `langroid_agent_integration.md`, `multi-agent-langroid-architecture.md`
* `monitoring_evaluation_framework.md`, `production_deployment_architecture.md`
* `agent_evaluation.md`, `preprocessing.md`

---

## Core Services

### Frontend

* Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Clerk.
* Proxies `/api/*` to backend (no business logic in proxy routes).

### Backend API

* FastAPI routers under `/api/*` (research, clinical, agents, etc.).
* Central prefixing in `main.py`. Alembic for migrations.

### MCP Server

* Context generation, hybrid RAG, KG interaction, CiteSource integration.
* De‑identified requests when calling external LLMs/services.

### BAML & Multi‑Agent

* BAML functions for clinical reasoning, EBM, metacognition.
* Langroid‑based multi‑agent orchestration (discussion, research).

---

## API Overview

### Agents (canonical)

```
POST /api/agents/clinical-discussion      # case analysis
POST /api/agents/clinical-query           # research/evidence queries
POST /api/agents/follow-up-discussion     # continue clinical discussions
GET  /api/agents/conversation-history     # discussion history
GET  /api/agents/health                   # agent health
```

*legacy shim also available under `/api/mvp-agents/*`.*

### Research Streaming & Traces

```
POST /api/research/quick-search-stream    # SSE: plan/exec/quality/synthesis
GET  /api/research/traces                 # list traces
GET  /api/research/traces/{name}          # fetch trace JSON
```

### User Preferences

```
GET/POST /api/user/preferences            # DB-backed preferences (language, tz, notifications)
```

> See `code-overview.md` and service docs for a complete endpoint list.

---

## Clinical Validation Program

* **Route:** `/dashboard-doctor/clinical-validation`
* **Purpose:** Run predefined clinical/research scenarios and submit structured feedback (accuracy, relevance, completeness, safety, privacy, comments).
* **Access:** via Clerk metadata (`clinicalValidation: true` / `betaTester: true`) or allowlist env `NEXT_PUBLIC_CLINICAL_VALIDATION_TESTERS`.

---

## Roadmap

### Completed

* Modernized UI (PT‑BR fully localized)
* Dr. Corvus Insights & MVP multi‑agent (discussion, research)
* Exam ingestion pipeline + patient result saving
* Unified research with CiteSource quality analysis
* Comprehensive MVP testing (unit, integration, e2e, clinical)

### In Progress

* **Knowledge Graph:** Neo4j + hybrid GraphRAG (KG + BM25/Vector)
* **Specialized Models:** Clinical RoBERTa, Mistral, reranking
* **Active Learning:** continuous improvement pipeline
* Performance & caching optimizations

### Next

* Smart multi‑parameter alerts
* Wearables and advanced medication features
* Expanded E2E test coverage & QA harness

> For detailed milestones, see `paper.md` and related engineering docs.

---

## Testing & Quality

* **Unit/Integration:** `pytest` (backend), `jest` (frontend)
* **E2E:** Playwright for critical flows
* **Golden Dataset:** clinician‑validated cases
* **Adversarial & Security:** AI robustness checks
* **Clinical Validation:** ongoing human review

```bash
# Backend
docker-compose -f docker-compose.dev.yml exec backend pytest

# Frontend
npm run test
npm run test:e2e
```

---

## Contributing

Contributions are welcome! Please follow the style guide and commit conventions. Open an issue to discuss large changes. For security‑sensitive topics, contact the maintainers privately.

---

## License

This project is licensed under **MIT** with the **Commons Clause**.

* **Open for collaboration:** free use/modification for non‑commercial purposes.
* **Commercial use is restricted:** hosting/selling/SaaS requires written permission.

See [`LICENSE`](./LICENSE) for the full text.
