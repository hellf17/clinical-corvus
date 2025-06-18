# Code Overview: Clinical Corvus

*This is the main code overview. For the full Brazilian Portuguese version, see [code-overview_pt-BR.md](./code-overview_pt-BR.md).*

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
├── README_pt-BR.md        # Full documentation (PT-BR)
├── code-overview.md       # Code overview (EN)
├── code-overview_pt-BR.md # Code overview (PT-BR)
└── ...
```

---

## Backend API (`backend-api/`)

### Structure

- **main.py**: FastAPI application entry point. Registers routers, middleware, and exception handlers.
- **routers/**: API endpoints for clinical assistant, research, patient, and academy modules.
- **services/**: Core business logic, translation, research orchestration, and clinical analyzers.
- **models/**: Pydantic schemas and SQLAlchemy models for data validation and persistence.
- **config.py**: Centralized settings (env vars, API keys, feature flags).
- **utils/**: Helper functions (PDF parsing, metrics, etc.).
- **tests/**: Pytest-based unit and integration tests.

### Key Routers

- **/api/clinical/**: Clinical assistant endpoints (lab insights, abnormality checks, etc.).
- **/api/research/**: Scientific research endpoints (quick/autonomous search, quality analysis, etc.).
- **/api/patient/**: Patient management (CRUD, data upload, etc.).
- **/api/academy/**: Educational modules (SNAPPS, metacognition, differential diagnosis).

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

### Clinical Reasoning and Academy

- **SNAPPS Framework**: Stepwise reasoning via BAML functions.
- **Differential Diagnosis Expansion**: VINDICATE and other mnemonics, BAML-powered.
- **Educational Feedback**: Socratic feedback, bias analysis, and critique modules.

### Security and Compliance

- **LGPD/HIPAA**: Data desensitization, audit logs, and strict role-based access.
- **API Key Management**: All sensitive keys loaded via environment variables.

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

- **Role-Based Dashboards**: `/dashboard` (doctor), `/dashboard-paciente` (patient).
- **Analysis Page**: Modern design, PDF/lab upload, manual entry, real-time validation.
- **Clinical Notes**: Rich text (TipTap), timeline, and event management.
- **Dr. Corvus Insights**: AI-driven clinical analysis, contextualized by user role.
- **Clinical Academy**: `/academy` with EBM, metacognition, and differential modules.
- **Notifications**: Sonner for toasts, ErrorAlert/SuccessAlert for feedback.
- **Full Localization**: All UI and error messages translated via i18n.

### UX/UI

- **Modernized Pages**: Redesigned patient and doctor dashboards for improved usability.
- **Translation**: All UI elements and error messages translated in real-time using i18n.
- **Loading States**: Optimized loading animations and skeleton screens for a seamless user experience.
- **Error Handling**: Centralized error handling with user-friendly error messages and feedback mechanisms.
- **Dr. Corvus Insights**: AI-driven clinical analysis and recommendations, contextualized by user role.
- **Clinical Academy**: Comprehensive educational modules, including SNAPPS, metacognition, and differential diagnosis.
- **Reusable Components**: A set of reusable UI components, including:
  - **Alerts**: Customizable alert components for success, error, and warning messages.
  - **Buttons**: Consistent button design with various styles and sizes.
  - **Cards**: Flexible card components for displaying patient information and clinical data.
  - **Charts**: Interactive chart components for visualizing patient data and trends.
  - **Forms**: Customizable form components with real-time validation and feedback.
  - **Tables**: Responsive table components for displaying patient data and clinical information.

### API Proxy Pattern

- **All `/api/*` routes** act as proxies to backend endpoints.
- **No translation logic** in the frontend; all translation is backend-centralized.
- **Example:**
  ```ts
  export async function POST(request: NextRequest) {
    // ...auth...
    const backendUrl = `${process.env.BACKEND_URL}/api/clinical/generate-lab-insights`;
    const response = await fetch(backendUrl, { ... });
    return NextResponse.json(await response.json(), { status: response.status });
  }
  ```

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

- **Sensitive Data**: All patient data is desensitized and access-controlled.
- **API Keys**: Managed via env vars; Lens Scholar key is optional (priority is reduced if missing).
- **Audit Logs**: All critical actions are logged for compliance.

---

## Testing and Quality

- **Backend**: Pytest for unit/integration tests.
- **Frontend**: Jest and Playwright for E2E.
- **Golden Dataset**: Medical specialist validation.
- **Continuous Review**: Human and adversarial testing.

---

## Roadmap and Future Directions

- **AI Migration**: ElizaOS → Langroid, LlamaParse → Marker.
- **Knowledge Graph**: Neo4j for clinical relationships.
- **Active Learning**: Continuous improvement pipeline.
- **Decentralized AI (Ritual)**: Verifiable, on-chain AI inference and privacy via TEEs.
- **Wearables Integration**: Automated data ingestion.
- **Advanced Medication Management**: Structured drug data and alerts.
- **Offline Support**: Mobile and desktop offline capabilities.

---

## References

- **Main Docs**: [README.md](./README.md) (EN), [README_pt-BR.md](./README_pt-BR.md) (PT-BR)
- **API Docs**: See `/docs` directories in each module for implementation details.
- **Brand Guide**: See project memories for Dr. Corvus branding and design principles.

---

**Clinical Corvus** is a next-generation clinical platform at the intersection of technology, evidence-based medicine, and patient empowerment, designed for extensibility, privacy, and global collaboration.

---

## Licensing

This project is licensed under the MIT License with the Commons Clause. Commercial use, resale, or hosting as a paid service is prohibited without explicit permission. See the [LICENSE](./LICENSE) file for details.
