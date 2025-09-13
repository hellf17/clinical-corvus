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
├── scripts/               # Utility scripts
├── .env, .env.example     # Environment configuration
├── docker-compose.*.yml   # Docker Compose files (dev/prod)
├── README.md              # Main documentation (EN)
├── code-overview.md       # Code overview (EN)
└── ...
```

---

## Backend API (`backend-api/`)

### Structure

- **main.py**: FastAPI application entry point. Registers routers, middleware, and exception handlers.
- **routers/**: API endpoints for clinical assistant, research, patient, and academy modules. The multi-agent endpoints are consolidated in `agents_router.py`.
- **services/**: Core business logic, translation, research orchestration, and clinical analyzers. Includes the new `patient_context_manager.py` and `observability_service.py`.
- **models/**: Pydantic schemas and SQLAlchemy models for data validation and persistence.
  - Adds `UserPreferences` model for doctor settings (notification flags, language, timezone).
- **config.py**: Centralized settings (env vars, API keys, feature flags).
- **utils/**: Helper functions (PDF parsing, metrics, etc.).
- **analyzers/**: Modules for specialized clinical lab test interpretation.
- **agents/**: Contains the Langroid agents, including `ClinicalResearchAgent` and `ClinicalDiscussionAgent`.
- **middleware/**: Contains the new `agent_security.py` and `error_handling.py` middleware.
- **tests/**: Pytest-based unit, integration, and load tests.

### Key Routers

- **/api/clinical/**: Clinical assistant endpoints (lab insights, abnormality checks, etc.).
- **/api/research/**: Scientific research endpoints (quick/autonomous search, quality analysis, etc.).
- **/api/patient/**: Patient management (CRUD, data upload, etc.).
- **/api/academy/**: Educational modules (SNAPPS, metacognition, differential diagnosis).
- **/api/agents/** (canonical) and **/api/mvp-agents/** (legacy shim): Endpoints for the multi-agent system.
 - **/api/user/preferences**: Persist and retrieve user preferences (notifications, language, timezone).
- **/api/research/agent-research/**: Agent-orchestrated research endpoints (authenticated):
   - `autonomous` (untranslated)
   - `autonomous-translated` (Portuguese output)

### Clinical Analyzers

The `backend-api/analyzers/` directory contains specialized modules for interpreting various clinical lab tests. Each module focuses on a specific category of markers, providing detailed interpretations, identifying abnormalities, and suggesting recommendations based on clinical guidelines.

- **blood_gases.py**: Analyzes arterial blood gas values.
- **electrolytes.py**: Interprets electrolyte imbalances.
- **hematology.py**: Analyzes complete blood count (CBC) results.
- **renal.py**: Interprets kidney-related lab tests.
- **hepatic.py**: Analyzes liver function tests.
- **cardiac.py**: Interprets cardiac-related lab tests.
- **metabolic.py**: Analyzes glucose metabolism, lipids, and other metabolic parameters.
- **microbiology.py**: Interprets culture results and other microbiological tests.
- **pancreatic.py**: Analyzes pancreatic enzyme tests.
- **inflammatory.py**: Interprets inflammatory markers.
- **coagulation.py**: Analyzes coagulation parameters.
- **thyroid.py**: Interprets thyroid function tests (newly added).
- **bone_metabolism.py**: Analyzes bone metabolism tests (newly added).
- **tumor_markers.py**: Interprets tumor markers (newly added).
- **autoimmune.py**: Analyzes autoimmune markers (newly added).
- **infectious_disease.py**: Interprets infectious disease markers (newly added).
- **hormones.py**: Analyzes hormone tests (newly added).
- **drug_monitoring.py**: Interprets therapeutic drug levels (newly added).
- **/api/groups/**: Group collaboration endpoints (CRUD, membership, patient assignment, invitations).

### Translation Service

- **Centralized in `services/translator_service.py`**
  - Tries DeepL first, falls back to BAML if needed.
  - Used for all AI flows requiring EN/PT translation.
  - Ensures frontend never handles translation directly.

### Research Services

- **SimpleAutonomousResearchService**: Preprocesses queries, expands abbreviations, translates, and orchestrates layered PubMed and multi-source search.
- **UnifiedPubMedService**: Handles tiered PubMed search with enrichment and language filtering.
- **EuropePMCService, LensScholarService**: Supplementary academic source handlers.
- **CiteSourceService**: Deduplication and multidimensional quality analysis.
- **BraveWebSearch**: Guidelines and web search integration.

### Research Architecture

- Pesquisa Rápida (quick/comprehensive): Uses `SimpleAutonomousResearchService` directly via `/api/research/quick-search(-translated)`
- Análise Autônoma (agent): `ClinicalResearchAgent` enriches the input (PICO, filters, context) and leverages `SimpleAutonomousResearchService` for in‑depth search.
- Translation: All “translated” routes convert `SynthesizedResearchOutput` to Portuguese via `translator_service`.
- Removed: legacy `autonomous_research_service.py` in favor of the agent + simple service orchestration.

### Clinical Reasoning and Academy

- **SNAPPS Framework**: Stepwise reasoning via BAML functions.
- **Differential Diagnosis Expansion**: VINDICATE and other mnemonics, BAML-powered.
- **Educational Feedback**: Socratic feedback, bias analysis, and critique modules.

### Advanced Agent-Based Architecture

The platform's AI capabilities are now driven by a sophisticated, backend-centric, multi-agent system built with Langroid. This architecture provides a robust and extensible foundation for complex clinical and research tasks.

#### Core Components:
- **`ClinicalAcademyAgent` (`backend-api/agents/academy_tools.py`)**: This is the core reasoning engine. It is equipped with a comprehensive set of Langroid `ToolMessage` handlers that wrap the powerful BAML functions for clinical reasoning, research, and analysis. It acts as the "tool user" in the agentic system.
- **`ClinicalDiscussionAgent` & `ClinicalResearchAgent` (`backend-api/agents/`)**: These have been refactored into high-level orchestrators that delegate tasks to the `ClinicalAcademyAgent`. This aligns with the multi-agent vision where specialized agents handle specific domains.
- **Unified Agent Endpoint (`backend-api/routers/agents_router.py`)**: A new, single endpoint at `/api/agents/chat` now serves as the primary interface between the frontend and the entire Langroid agent system. This simplifies the frontend and centralizes control on the backend.
- **Agents Router (`backend-api/routers/agents_router.py`)**: Consolidated router hosting `/chat`, clinical research, clinical discussion, and general clinical query endpoints. It is exposed under both `/api/agents/*` and `/api/mvp-agents/*` for compatibility.

#### Frontend Integration (Vercel AI SDK 5):
- **Unified Tool (`frontend/src/lib/clinical-tools.ts`)**: The frontend now uses a single, powerful `drCorvusClinicalAssistant` tool. This tool is responsible for sending all clinical and research queries to the unified backend agent endpoint.
- **Dynamic UI (`frontend/src/components/chat/`)**: The chat interface has been enhanced to dynamically render rich, structured outputs from the agent's tools. The `ChatMessage.tsx` component now uses a new `ToolResult.tsx` component to display specialized UI for different tool outputs, such as formatted illness scripts, differential diagnoses, and more.
- **Stateful Conversations**: The chat system is fully stateful, with message persistence and caching. All conversations are saved to the database, and a Redis-based cache improves performance for repeated queries.
- **MVP Agent Component (`frontend/src/components/mvp/ClinicalAssistant.tsx`)**: A new component for interacting with the MVP agents, providing a dedicated UI for research and discussion modes.

### Security and Compliance

- **LGPD/HIPAA**: Data desensitization, audit logs, and strict role-based access.
- **API Key Management**: All sensitive keys loaded via environment variables.
- **Agent Security Middleware (`backend-api/middleware/agent_security.py`)**: Provides security checks for the multi-agent system, including authentication, authorization, and patient data access control.
- **Error Handling Middleware (`backend-api/middleware/error_handling.py`)**: Provides centralized error handling for the application, logging exceptions and returning standardized error responses.

### Group Collaboration System

### Doctor Dashboard: Recent Enhancements

- Patient Overview
  - Adds “Perguntar ao Dr. Corvus sobre este paciente” CTA linking to the Chat tab.
  - Adds compact “Quick Clinical Insights” widget (calls `/api/mvp-agents/clinical-discussion` with `include_patient_context: true`) that renders top differentials, immediate actions, and red flags.
  - Adds compact “Research Update” widget (calls `/api/mvp-agents/clinical-research` with `include_patient_context: true`) that renders executive summary, key findings, and references.
- Groups
  - Strict client-side admin gating using `/api/me` to resolve DB `user_id`, with role badges and admin-only notes for inviting members and assigning patients.
- Settings
  - Notifications tab: toggles for alert emails, group updates, product updates.
  - Language and Timezone selectors persisted via `/api/user/preferences` to the `user_preferences` table.
  - Subscription tab is present as a placeholder (billing integration pending).

### Migrations

- Alembic revision `3e1b2c7f5a10_add_user_preferences_table` adds the `user_preferences` table.

The group collaboration system enables healthcare teams to work together on patient management with robust security and access controls.

#### Database Models

- **Group**: Represents a healthcare team or department
  - Fields: id, name, description, max_patients, max_members, created_at, updated_at
  - Relationships: members, patients, invitations
- **GroupMembership**: Links users to groups with role assignments
  - Fields: id, group_id, user_id, role (admin/member), joined_at, invited_by
  - Relationships: group, user
- **GroupPatient**: Links patients to groups for collaborative management
  - Fields: id, group_id, patient_id, assigned_at, assigned_by
 - Relationships: group, patient
- **GroupInvitation**: Manages invitations to join groups
  - Fields: id, group_id, invited_by_user_id, email, token, role, expiration, status timestamps
  - Relationships: group, invited_by_user

#### Services

- **Group Service**: Core business logic for group management
  - CRUD operations for groups
  - Member management (add/remove/change roles)
  - Patient assignment to groups
  - Invitation creation and management
- **Group Invitation Service**: Handles invitation workflows
  - Token generation and validation
 - Invitation acceptance/decline/revoke
 - Expiration handling
- **Group Permissions Service**: Authorization logic
  - Role-based access control
  - Permission checking functions
  - Audit logging

#### API Endpoints

- **Group Management**: CRUD operations for groups
  - `POST /api/groups` - Create new group
  - `GET /api/groups` - List user's groups
  - `GET /api/groups/{id}` - Get group details
  - `PUT /api/groups/{id}` - Update group
  - `DELETE /api/groups/{id}` - Delete group
- **Member Management**: Manage group membership
  - `POST /api/groups/{id}/members` - Add member to group
  - `GET /api/groups/{id}/members` - List group members
  - `PUT /api/groups/{id}/members/{user_id}` - Change member role
  - `DELETE /api/groups/{id}/members/{user_id}` - Remove member from group
- **Patient Assignment**: Manage group-patient relationships
 - `POST /api/groups/{id}/patients` - Assign patient to group
  - `GET /api/groups/{id}/patients` - List group patients
  - `DELETE /api/groups/{id}/patients/{patient_id}` - Remove patient from group
- **Invitation Management**: Handle group invitations
  - `POST /api/groups/{id}/invitations` - Create invitation
  - `GET /api/groups/{id}/invitations` - List group invitations
  - `PUT /api/groups/{id}/invitations/{invitation_id}` - Update invitation
  - `DELETE /api/groups/{id}/invitations/{invitation_id}` - Revoke invitation
  - `POST /api/groups/invitations/accept` - Accept invitation
  - `POST /api/groups/invitations/decline` - Decline invitation
  - `GET /api/me/invitations` - List user's invitations

#### Middleware and Security

- **Group Authentication Middleware**: Validates group access and extracts context
- **Permission Checking**: Role-based access control for all group operations
- **Audit Logging**: Comprehensive logging of group activities
- **Data Privacy**: HIPAA/LGPD compliant handling of group data

---

## Frontend (`frontend/`)

### Structure

- **src/app/**: Next.js App Router pages and API proxies.
- **src/components/**: Shared UI components (charts, tables, forms, alerts, etc.).
- **src/features/**: Feature-specific logic (patient, academy, analysis, etc.).
- **src/styles/**: Tailwind CSS, brand palette, and global styles.
- **src/utils/**: Helper functions (date, formatting, etc.).
- **src/docs/**: Additional documentation.

### Key Features

- **Role-Based Dashboards**: `/dashboard` (doctor), `/dashboard-paciente` (patient)
- **Doctor Dashboard Features**:
  - **Critical Alerts Card**: Real-time notifications for urgent patient issues
  - **Recent Conversations Card**: Quick access to ongoing patient communications
  - **Quick Analysis Card**: In-dashboard lab file analysis with modal workflow for instant insights
  - **Appointment Management**: Schedule and view upcoming patient appointments
  - **Risk Scoring Card**: Comprehensive clinical risk assessments (MELD, Child-Pugh, CKD-EPI) with visualizations
  - **Alert Management**: Real-time clinical alerts with severity levels and resolution tools
  - **Clinical Decision Support**: Evidence-based diagnostic and treatment recommendations
- **Analysis Page**: Modern design, PDF/lab upload, manual entry, real-time validation
- **Clinical Notes**: Rich text (TipTap), timeline, and event management
- **Dr. Corvus Insights**: AI-driven clinical analysis, contextualized by user role
- **Clinical Academy**: `/academy` with EBM, metacognition, and differential modules
- **Notifications**: Sonner for toasts, ErrorAlert/SuccessAlert for feedback
- **Full Localization**: All UI and error messages translated via i18n
- **Group Collaboration**: `/groups` with comprehensive team management
- **MVP Agents Integration**: Advanced AI agents for clinical discussions and research

### Group Collaboration Features

---

## Hybrid RAG (BM25 + Vector)

- Minimal in-memory Hybrid RAG is implemented for MVP benchmarking.
- Service: `backend-api/services/hybrid_rag_service.py` (BM25 via `rank-bm25`, vector via OpenAI embeddings if available, else hashing-based fallback).
- Router: `backend-api/routers/rag.py`.
- Endpoints:
  - `POST /api/rag/index` — index documents: `{ documents: [{ doc_id, text, metadata? }] }`.
  - `POST /api/rag/search` — search with hybrid fusion: `{ query, top_k?, alpha? }` → returns scores per component and hybrid.
  - `POST /api/rag/reset` — clear indices.
- Ingestion Endpoints:
  - `POST /api/rag/index-file` — upload and index a file (uses LlamaParse if available; falls back to HTML/TXT parsing). Form fields: `file`, `doc_id?`, `source_url?`, `language?`, `target_tokens?`, `overlap_tokens?`.
  - `POST /api/rag/index-url` — fetch, parse, chunk, and index a URL. Form fields: `url`, `doc_id?`, `language?`, `target_tokens?`, `overlap_tokens?`.
- Notes:
  - Set `OPENAI_API_KEY` to enable real embeddings (`text-embedding-3-small`).
  - Without it, a deterministic hashing-based embedding is used for local dev.
  - Designed as a stepping stone towards the GraphRAG plan in `backend-api/kg-docs`.
  - Optional backends: Qdrant for vectors, Whoosh for BM25. Enable via env:
    - `RAG_USE_QDRANT=true`, `QDRANT_URL` (or `QDRANT_HOST`/`QDRANT_PORT`, `QDRANT_API_KEY`)
    - `RAG_USE_WHOOSH=true`, `RAG_WHOOSH_INDEX_DIR=/app/data/whoosh_index`
  - Optional reranker: `RAG_ENABLE_RERANKER=true`, `RAG_RERANKER_MODEL=BAAI/bge-reranker-base`, `RAG_RERANK_TOP_K=50`.

## Benchmarking

## Preprocessing Pipeline

- Local-first parsing (flag-driven):
  - Docling (`DOCLING_ENABLE=true`): primary parser; exports Markdown/text; fast and layout-aware.
  - GROBID (`GROBID_ENABLE=true` + `GROBID_URL`): for scholarly PDFs; TEI→sections/chunks with tables as atomic chunks.
  - Unstructured (`UNSTRUCTURED_ENABLE=true`): fallback partitioner with optional table inference.
  - Nougat (`NOUGAT_ENABLE=true`): heavy OCR fallback (stubbed unless installed).
  - Optional: `thepi.pe` (`THEPIPE_API_URL`, `THEPIPE_API_KEY`) for table/image-heavy AI extraction.
- Quality gates:
  - Heuristics per parse (text length, table count). Low text or table-heavy → quarantine to next parser.
- Chunking:
  - Keep coarse section gists and fine chunks (~512 tokens, 64 overlap). Do not split tables; mark roles (narrative/table/figure), keep section paths/page spans when available.
- Flags (env):
  - `DOCLING_ENABLE`, `GROBID_ENABLE`, `UNSTRUCTURED_ENABLE`, `NOUGAT_ENABLE`
  - `LLAMAPARSE_RESULT_TYPE`, `LLAMAPARSE_LANGUAGE`, `LLAMAPARSE_*` (optional; no longer critical path)
  - `INGEST_URL_DIRECT` (try LlamaParse on URL before fetching)
- Usage:
  - File: `POST /api/rag/index-file` (form `file`, `doc_id?`, `language?`)
  - URL: `POST /api/rag/index-url` (form `url`, `doc_id?`, `language?`)
  - CLI: `scripts/ingest_corpus.py index-file|index-url ...`

### Quickstart

- Start services (optional):
  - `docker compose -f docker-compose.dev.yml up -d qdrant grobid backend-api`
- Ingest file:
  - `BACKEND_URL=http://localhost:8000 python scripts/ingest_corpus.py index-file exemplos/Surviving_sepsis.pdf --doc-id surviving-sepsis-2021 --language en`
- Ingest URL (must be directly fetchable PDF):
  - `BACKEND_URL=http://localhost:8000 python scripts/ingest_corpus.py index-url "https://your-host/doc.pdf" --doc-id doc-1`
- Search:
  - `curl -s http://localhost:8000/api/rag/search -H 'Content-Type: application/json' -d '{"query":"surviving sepsis campaign hour-1 antibiotics","top_k":10,"alpha":0.5}' | jq`

### Citation Fields

- Search results include optional `citation`, `page`, `page_from`, `page_to` for prompt‑side formatting. When chunk page is unknown, section page span is used when available.

### Benchmarking

- Retrieval metrics runner: `scripts/bench_rag.py`
  - Input JSON/JSONL items: `{ query, relevant_ids? , relevant_substrings? }`
  - Example: `BACKEND_URL=http://localhost:8000 python scripts/bench_rag.py run exemplos/bench/sample_bench.json --top-k 10 --alpha 0.5 --output results.json`
- QA benchmarks (HealthSearchQA, PubMedQA, MedQA):
  - Index relevant corpora (e.g., guideline PDFs, PubMed abstracts subset) via the ingestion CLI.
  - For answer scoring, implement a simple harness: fetch top‑K via `/api/rag/search`, compose a prompt with citations, call your generation endpoint, and score with exact match / F1 / ROUGE‑L per dataset conventions.
  - Suggested defaults: K=10, alpha=0.5, reranker on for answer generation runs.

- CLI: `scripts/bench_rag.py`
  - Example: `BACKEND_URL=http://localhost:8000 python scripts/bench_rag.py run exemplos/bench/sample_bench.json --top-k 10 --alpha 0.5`
  - Dataset format: JSON/JSONL with `{ query, relevant_ids? , relevant_substrings? }`.
  - Metrics: Recall@K, nDCG@K, MRR@K. Writes per-query details with `--output`.
- Sample dataset: `exemplos/bench/sample_bench.json` (substring-matching example).

## Ingestion & Chunking

- Parser: `backend-api/services/document_ingestion_service.py` prefers LlamaParse (`LLAMA_CLOUD_API_KEY`) for PDFs/books; falls back to `trafilatura` (HTML) and plain text.
- Chunker: `backend-api/services/text_chunking.py` provides structure-aware, token-based chunking (default 512 tokens with 64-token overlap) and section-first splitting.

- **Group Dashboard**: Overview of all groups user belongs to
- **Group Detail Pages**: Comprehensive view of group information
  - Member management with role assignments
  - Patient assignment and management
  - Invitation system for new members
  - Group settings and configuration
- **Role-Based UI Controls**: Admin/member distinctions in UI
- **Real-Time Updates**: Live status updates for group activities
- **Intuitive Workflows**: Streamlined group management processes

### UX/UI

- **Modernized Pages**: Redesigned patient and doctor dashboards for improved usability.
- **Translation**: All UI elements and error messages translated in real-time using i18n.
- **Loading States**: Optimized loading animations and skeleton screens for a seamless user experience.
- **Error Handling**: Centralized error handling with user-friendly error messages and feedback mechanisms.
- **Dr. Corvus Insights**: AI-driven clinical analysis and recommendations, contextualized by user role.
- **Clinical Academy**: Comprehensive educational modules, including SNAPPS, metacognition, and differential diagnosis.
- **Reusable Components**: A set of reusable UI components, including:
  - **Alerts**: Customizable alert components for success, error, and warning messages
  - **Buttons**: Consistent button design with various styles and sizes
  - **Cards**: Flexible card components including:
    - CriticalAlertsCard for urgent notifications
    - RecentConversationsCard for patient communications
    - QuickAnalysisCard for instant lab analysis
  - **Charts**: Interactive chart components for visualizing patient data and trends
  - **Forms**: Customizable form components with real-time validation and feedback
  - **Tables**: Responsive table components for displaying patient data and clinical information
  - **Group Components**: Specialized components for group collaboration:
  - GroupList for displaying user's groups
  - GroupCard for individual group display
  - MemberList for managing group members
  - InvitationForm for creating invitations
  - PatientAssignmentList for managing group patients
- **MVP Agent Components**: Advanced AI agent integration:
  - MVPAgentChat for intelligent clinical discussions
  - MVPAgentIntegration for agent activation and health monitoring
  - ConversationHistory for clinical discussion tracking

### API Proxy Pattern

- **All `/api/*` routes** act as proxies to backend endpoints.
- **No translation logic** in the frontend; all translation is backend-centralized.
- **Enhanced Chat API**: Intelligent agent routing with keyword detection
- **Example:**
  ```ts
  export async function POST(request: NextRequest) {
    // ...auth...
    const backendUrl = `${process.env.BACKEND_URL}/api/clinical/generate-lab-insights`;
    const response = await fetch(backendUrl, { ... });
    return NextResponse.json(await response.json(), { status: response.status });
  }
  ```

### MVP Agent API Integration

- **Enhanced `/api/chat` Route**: Intelligent agent routing and response formatting
  - Automatic agent detection based on message content analysis
  - Keyword-based routing to ClinicalDiscussionAgent or ClinicalResearchAgent
  - Patient context integration and metadata tracking
  - Response formatting for chat interface compatibility
- **Agent Health Monitoring**: Real-time availability checking
- **Conversation Management**: Persistent clinical discussion tracking
- **Error Handling**: Comprehensive fallback mechanisms and user feedback

### Clinical Validation Harness

- Path: `frontend/src/app/dashboard-doctor/clinical-validation/page.tsx`
- Purpose: Gated area where selected users can run predefined scenarios (`frontend/src/lib/clinical-validation-scenarios.ts`) and submit structured feedback.
- Access gating: relies on Clerk metadata (`clinicalValidation: true` or `betaTester: true`) or email allowlist via `NEXT_PUBLIC_CLINICAL_VALIDATION_TESTERS`.
- API paths used:
  - Scenario execution: `/api/mvp-agents/clinical-discussion` and `/api/mvp-agents/clinical-research` (proxy to FastAPI MVP router)
  - Feedback submit: `/api/clinical-validation/feedback` (front-end logging stub; wire to backend in production)

---

## MCP Server (`mcp_server/`)

- **Context Generation**: Provides relevant context for LLMs and BAML.
- **RAG Pipeline**: Retrieval-augmented generation for evidence-based answers.
- **CiteSource Engine**: Deduplication and quality scoring for research sources.
- **Knowledge Graph (future)**: Planned Neo4j integration for clinical knowledge.
- **AL Logging**: Active learning and continuous improvement pipeline.
- **API**: FastAPI, with endpoints for context, research, and logging.

---

## BAML Architecture (`baml_src/`, `baml_client/`)

- **Prompt Definitions**: All BAML prompts and functions defined in English.
- **Client Generation**: `baml_client/` auto-generated for backend consumption.
- **Central Orchestration**: `clinical_assistant.baml` coordinates all clinical reasoning.
- **Educational Modules**: SNAPPS, metacognition, differential diagnosis, and research.
- **Fallbacks**: Robust error handling and educational fallbacks in all flows.

---

## Data Flow and Translation

1. **User Input (PT-BR)**: Sent as-is from frontend to backend.
2. **Backend Translation**: DeepL → BAML fallback; all AI logic in EN.
3. **AI Processing**: BAML/LLM functions in English.
4. **Output Translation**: EN → PT-BR in backend before returning to frontend.
5. **Frontend**: Receives only the final translated result; no translation logic.

---

## Security, Compliance, and API Keys

- **Authentication and Authorization**: The platform uses Clerk for user authentication and session management. The frontend Next.js middleware handles route protection and forwards authentication headers to the backend. The backend's `security.py` module verifies the session using the Clerk SDK, ensuring a secure and persistent authentication flow.
- **Sensitive Data**: All patient data is desensitized and access-controlled.
- **API Keys**: Managed via env vars; Lens Scholar key is optional (priority is reduced if missing).
- **Audit Logs**: All critical actions are logged for compliance.
- **Group Security**: Role-based access control with comprehensive audit logging

---

## Testing and Quality

- **Backend**: Pytest for unit/integration tests.
- **Frontend**: Jest and Playwright for E2E.
- **Golden Dataset**: Medical specialist validation.
- **Continuous Review**: Human and adversarial testing.
- **Group Testing**: Comprehensive test suite for group functionality:
  - Unit tests for all group services and utilities
  - Integration tests for group API endpoints
  - Database integration tests for group models
  - Security tests for group access controls
  - Frontend component tests
  - End-to-end workflow tests
  - Accessibility tests
  - Performance tests
- **MVP Agent Testing**: A comprehensive testing plan (`docs/MVP_AGENTS_TESTING_PLAN.md`) has been executed, covering:
    - **Unit Tests**: For agent logic, routing, data processing, and error handling.
    - **Integration Tests**: For frontend-backend communication, agent orchestration, database integration, and external APIs.
    - **End-to-End Tests**: For user workflows, patient context, agent switching, and error recovery.
    - **Clinical Validation**: Manual review by clinical experts for medical accuracy, safety, and evidence quality.
    - **Production Readiness**: Security, load testing, and documentation updates.

---

## Current Implementation Status

All requested doctor dashboard features are **fully implemented** and **properly integrated** across the entire stack:

- **Patients**: Complete CRUD operations with role-based access control
- **Medications**: Full medication tracking with dosage, route, frequency, and status management
- **Clinical Notes**: Support for multiple note types (progress, admission, discharge, etc.)
- **Vital Signs**: Comprehensive vital signs tracking (temperature, heart rate, BP, SpO2, GCS)
- **Lab Results**: Flexible lab result model with numeric/text values and reference ranges
- **Clinical Scores**: Multiple scoring systems (SOFA, qSOFA, APACHE II, NEWS, MEWS)
- **Risk Scores**: Comprehensive clinical risk assessments (MELD, Child-Pugh, CKD-EPI)
- **Alert Systems**: Real-time clinical alerts with severity levels
- **Clinical Decision Support**: Evidence-based diagnostic and treatment recommendations
- **Group Collaboration**: Complete team-based patient management with invitations and role-based access
- **MVP Agents**: Advanced AI agents for clinical discussions and research
  - ClinicalDiscussionAgent for case analysis and differential diagnosis
  - ClinicalResearchAgent for evidence-based medicine and literature search
  - Intelligent agent routing and patient context integration
  - Enhanced chat interfaces with agent switching capabilities

---

## Roadmap and Future Directions

### Critical Missing Features (Immediate Priority)
- **Prescription Management & E-Prescribing System**: Essential for treatment workflows beyond simple medication tracking
- **Appointment Scheduling & Calendar Integration**: Foundational for clinical workflow management
- **Real-Time Clinical Decision Support Alerts**: Prevents adverse events through proactive warnings

### Medium-Term Priorities
- **EMR/EHR Integration Framework**: Mandatory for clinical adoption in healthcare settings
- **Referral Management System**: Critical for care coordination across specialties
- **Advanced Group Analytics**: Enhanced reporting and insights for healthcare teams

### Long-Term Vision
- **AI Migration**: ElizaOS → Langroid, LlamaParse → Marker
- **Knowledge Graph**: Neo4j for clinical relationships
- **Active Learning**: Continuous improvement pipeline
- **Decentralized AI (Ritual)**: Verifiable, on-chain AI inference and privacy via TEEs
- **Wearables Integration**: Automated data ingestion
- **Advanced Medication Management**: Structured drug data and alerts
- **Offline Support**: Mobile and desktop offline capabilities

---

## References

- **Main Docs**: [README.md](./README.md) (EN), [README_pt-BR.md](./README_pt-BR.md) (PT-BR)
- **API Docs**: See `/docs` directories in each module for implementation details.

---

**Clinical Corvus** is a next-generation clinical platform at the intersection of technology, evidence-based medicine, and patient empowerment, designed for extensibility, privacy, and global collaboration.

---

## Licensing

This project is licensed under the MIT License with the Commons Clause. Commercial use, resale, or hosting as a paid service is prohibited without explicit permission. See the [LICENSE](./LICENSE) file for details.

## Research Streaming & Overrides (New)

- Streaming autonomous research via SSE:
  - Backend route: POST /api/research/quick-search-stream
  - Frontend proxy: POST /api/research-assistant/quick-search-stream
  - Events: start, plan, strategy_start, strategy_end, citesource_start, citesource_done, synthesis_start, synthesis_done, inal_result.
- Strategy overrides & presets:
  - UI accepts strategy_override (JSON plan mirroring BAML SearchParameters) and model_preset (ast|balanced|deep).
  - Template presets available in the advanced panel.

## Research Traces & Trees (New)

- Tracing enabled via ENABLE_RESEARCH_TRACE=1.
- Trace endpoints: GET /api/research/traces, GET /api/research/traces/{name}; proxies added and a simple viewer at /academy/research/traces.
- Each trace includes a lightweight research tree (schema 1.0): plan ? search executions ? dedup/quality ? synthesis (claims + grounding summary).

## Bench Harness Updates (New)

- KAE-lite now emits KSR/KCR/KOR and a markdown table (see scripts/benchmarks/evaluate_kae.py).
- ACE-lite provides a checklist-based score and a markdown table (see scripts/benchmarks/evaluate_ace.py).
