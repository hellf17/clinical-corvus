# Code Overview: Clinical Corvus

---

## Project Structure and Main Components

Clinical Corvus is a modular platform that integrates advanced AI-driven clinical reasoning, patient management, and scientific research workflows. The architecture is designed for extensibility, privacy, and robust internationalization. This document provides a comprehensive overview of the codebase, highlighting key modules, architectural patterns, and technical decisions.

### Top-Level Directory Layout

```
clinical-helper/
├── backend-api/           # FastAPI backend
├── frontend/              # Next.js frontend (App Router)
├── mcp_server/            # Context generation, RAG, and CiteSource
├── baml_src/              # BAML prompt definitions
├── baml_client/           # Auto-generated BAML client
├── docs/                  # Additional documentation
├── scripts/               # Utility scripts (benchmarks, ingestion, eval)
├── .env, .env.example     # Environment configuration
├── docker-compose.*.yml   # Docker Compose files (dev/prod)
├── README.md              # Main documentation (EN)
├── code-overview.md       # Code overview (EN)
└── ...
```

---

## Backend API (`backend-api/`)

### Structure

* **main.py**: FastAPI app entry point (routers, middleware, handlers).
* **routers/**: Consolidated API endpoints (`agents_router.py`, `clinical`, `research`, `patient`, `academy`, `groups`).
* **services/**: Core business logic (translation, analyzers, research orchestration, observability, patient context manager).
* **models/**: Pydantic schemas + SQLAlchemy models (users, patients, lab results, preferences, etc.).
* **middleware/**: Security (`agent_security.py`) and error handling.
* **analyzers/**: Specialized modules for interpreting labs (hematology, renal, hepatic, cardiac, thyroid, bone metabolism, tumor markers, autoimmune, infectious, hormones, drug monitoring, etc.).
* **agents/**: Langroid-based agents (`ClinicalResearchAgent`, `ClinicalDiscussionAgent`, `ClinicalAcademyAgent`).
* **tests/**: Pytest-based unit, integration, and load tests.

### Key Routers

* `/api/clinical/*`: Lab insights, abnormality checks.
* `/api/research/*`: Quick and autonomous research, quality analysis.
* `/api/agents/*`: Unified multi-agent system (canonical), `/api/mvp-agents/*` legacy shim.
* `/api/user/preferences`: Manage doctor preferences.
* `/api/groups/*`: Group collaboration endpoints.

### Translation Service

Centralized in `services/translator_service.py`. DeepL primary, BAML fallback. Frontend never handles translation.

---

## Agent Architecture

* **ClinicalAcademyAgent**: Core reasoning engine, wraps BAML functions.
* **ClinicalDiscussionAgent & ClinicalResearchAgent**: High-level orchestrators delegating to academy agent.
* **Unified Endpoint**: `/api/agents/chat` routes all clinical/research chat requests.
* **Frontend Integration**: Single `drCorvusClinicalAssistant` tool (Vercel AI SDK), dynamic UI (`ToolResult.tsx`), Redis caching, stateful conversations.

---

## Retrieval & Knowledge (Hybrid RAG → GraphRAG)

### Hybrid RAG

* **Service**: `services/hybrid_rag_service.py` (BM25 via rank-bm25; vectors via OpenAI embeddings or hashing fallback).
* **Router**: `routers/rag.py`.
* **Endpoints**:

  * `POST /api/rag/index`
  * `POST /api/rag/search`
  * `POST /api/rag/reset`
  * `POST /api/rag/index-file`
  * `POST /api/rag/index-url`
* **Optional backends**: Qdrant (`RAG_USE_QDRANT=true`), Whoosh (`RAG_USE_WHOOSH=true`).
* **Reranker**: Cross-encoder BAAI/bge-reranker-base.

### Preprocessing & Ingestion

(Local-first pipeline; see `preprocessing.md`)

* Docling → GROBID → Unstructured → Nougat OCR → thepi.pe → pypdf fallback.
* Produces coarse section gists + fine chunks (\~512 tokens, 64 overlap).
* Preserves metadata: roles (narrative/table/figure), section paths, page spans.

---

## Research Streaming, Traces & Overrides

### Streaming

* `POST /api/research/quick-search-stream` (SSE events: start, plan, citesource\_start, synthesis\_done, final\_result).
* Frontend proxies under `/api/research-assistant/*`.

### Traces & Trees

* Enabled with `ENABLE_RESEARCH_TRACE=1`.
* Endpoints: `GET /api/research/traces`, `GET /api/research/traces/{name}`.
* Schema includes plan → executions → dedup/quality → synthesis (claims + grounding summary).

### Strategy Overrides

* Advanced panel accepts `strategy_override` (JSON array) and `model_preset` (fast|balanced|deep).
* Presets: Minimal, Expansive, Intensive, Guidelines-First, RCT-Only, Rapid-Narrative.

---

## Monitoring, Benchmarking & Evaluation

### Bench Harness (`scripts/bench_rag.py`)

* Compute Recall\@K, nDCG\@K, MRR\@K.
* Supports JSON/JSONL queries with relevance.

### Agent Evaluation (`scripts/agent_eval.py`, see `agent_evaluation.md`)

* Datasets: HealthSearchQA, PubMedQA, MedQA.
* Modes: retrieval-only and end-to-end (generation + retrieval).
* Metrics: EM, F1, ROUGE-L, accuracy (PubMedQA/MedQA), KSR/KOR.
* Defaults: `top_k=10`, `alpha=0.5`, reranker enabled for QA runs.

### Monitoring & Observability

* Observability service, audit logging, structured error handling.
* Production deployment includes Prometheus/Grafana, ELK/Loki, tracing (Jaeger, OpenTelemetry). See `production_deployment_architecture.md`.

---

## Security & Compliance

* Clerk for authentication (OAuth, MFA).
* Backend validation via Clerk SDK (`security.py`).
* RBAC enforced frontend + backend.
* Agent Security Middleware (`agent_security.py`): verifies auth, role, patient data access.
* Data de-identification before external API/LLM calls.
* HIPAA/LGPD compliance, audit logs, encryption.

---

## Frontend (`frontend/`)

### Structure

* `src/app/`: App Router pages and API proxies.
* `src/components/`: Shared UI (charts, forms, alerts).
* `src/features/`: Domain features (patients, academy, analysis).
* `src/styles/`: Tailwind + brand palette.
* `src/utils/`: Helpers.

### Features

* Role-based dashboards (doctor, patient).
* Doctor dashboard: alerts, quick analysis, appointments, risk scoring, decision support.
* Analysis page: PDF upload + manual entry with validation.
* Dr. Corvus Insights system.
* Clinical Academy modules (EBM, metacognition, differential).
* Group collaboration UI.
* Notifications: Sonner + reusable alert components.
* Agent chat integration with structured outputs.

---

## Group Collaboration

* Models: Group, GroupMembership, GroupPatient, GroupInvitation.
* Endpoints for group CRUD, membership, patient assignment, invitations.
* Services: group logic, permissions, invitations.
* Middleware: validates group access, logs activities.
* Admin vs member roles.
* Fully HIPAA/LGPD compliant.

---

## Configuration & Feature Flags

| Area    | Example Vars                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Auth    | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                                                               |
| DB      | `DATABASE_URL`                                                                                            |
| LLM     | `OPENROUTER_API_KEY`, `GEMINI_API_KEY`                                                                    |
| Search  | `BRAVE_API_KEY`, `ALTMETRIC_KEY`, `ICITE_BASE`, `WOS_KEY`, `LENS_SCHOLAR_API_KEY`, `SEMANTIC_SCHOLAR_KEY` |
| RAG     | `RAG_USE_QDRANT`, `RAG_USE_WHOOSH`, `RAG_ENABLE_RERANKER`                                                 |
| Parsing | `DOCLING_ENABLE`, `GROBID_ENABLE`, `UNSTRUCTURED_ENABLE`, `NOUGAT_ENABLE`, `THEPIPE_API_URL`              |
| Tracing | `ENABLE_RESEARCH_TRACE`                                                                                   |

---

## Testing Strategy

* Backend: pytest.
* Frontend: Jest + Playwright.
* Golden dataset validated by clinicians.
* Adversarial/security testing.
* Clinical validation program (`/dashboard-doctor/clinical-validation`).

---

## Roadmap & Future Directions

* Knowledge Graph (Neo4j + GraphRAG).
* Advanced patients analytics.
* Mobile app
* Wearables + real-time monitoring.
* Decentralized AI (verifiable on-chain inference).
* Offline support for mobile/desktop.

---

**Clinical Corvus** is a next-generation clinical platform at the intersection of technology, evidence-based medicine, and patient empowerment, designed for extensibility, privacy, and global collaboration.
