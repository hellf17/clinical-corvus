# Clinical Corvus

*This is the main documentation. For the full Brazilian Portuguese version, see [README_pt-BR.md](./README_pt-BR.md).*

Clinical Corvus is a digital platform for clinical data analysis, decision support, and patient monitoring, leveraging Artificial Intelligence (Dr. Corvus) in a secure, privacy-focused environment. The platform is designed for both physicians (management and analysis) and patients (health tracking and education). Our vision is to act as a **"Clinical Co-pilot"** for doctors, optimizing workflows, and empowering patients with health tracking and education tools. **Compliance with LGPD/HIPAA and data security are top priorities.**

**Current Status:** The platform is functional, featuring *patient management, contextual AI chat, clinical data visualizations, clinical notes with a rich text editor*, a fully modernized Analysis page (`/analysis`) with redesigned UI, complete interface translation to Portuguese, advanced Dr. Corvus Insights system, elegant loading states, and robust error handling for both PDF exam uploads and manual data entry with backend abnormality checks. The "Clinical Academy" section (`/academy`) for clinical reasoning training uses dedicated BAML functions, with ALL 15 educational APIs 100% translated to Portuguese, eliminating language barriers. The scientific research system (`/academy/evidence-based-medicine`) has been expanded with new sources (Europe PMC, Lens.org) and a powerful quality and deduplication analysis system (CiteSource), operating on a unified bibliometric API architecture that provides rich, detailed metrics. Modern technologies include Next.js App Router, Clerk, Shadcn/UI, FastAPI, and Docker. The system features advanced exam processing via PDF upload, automatic extraction and enrichment of lab results, and expanded graphical and tabular data visualizations. We are migrating internal AI frameworks (ElizaOS > Langroid, LlamaParse > Marker) and advancing the implementation of the AI core with **hybrid GraphRAG architecture (KG + BM25/Vector) as our source of truth, populated with curated knowledge using Clinical RoBERTa for KG building and reranking, Mistral for query reformulation, and other SOTA LLMs for core medical reasoning.**

## API Routing and Proxy Pattern

### Backend Routing
- All backend API endpoints are exposed under the `/api/*` prefix, with routers included in `main.py` (e.g., `/api/research`, `/api/clinical`).
- No internal prefixes are set in router files; all prefixing is handled centrally in `main.py` for consistency.
- Example backend endpoints:
  - `/api/research/formulate-pico-translated`
  - `/api/research/quick-search-translated`
  - `/api/clinical/differential-diagnosis`

### Frontend Proxy
- All `/api/*` routes in the frontend act as proxies, forwarding requests to the backend at the same path.
- No translation or business logic is handled in the frontend API routes; they only proxy requests and responses.
- Example proxy route:
  - `frontend/src/app/api/research-assistant/formulate-pico-translated/route.ts` → proxies to `/api/research/formulate-pico-translated` on the backend.

### Routing Summary
- This design eliminates route duplication and ensures seamless integration between frontend and backend.
- For new endpoints, always add the router in `main.py` with the desired `/api/<domain>` prefix, and create a matching proxy route in the frontend if needed.

---

## Implemented Features

### Authentication and User Management
*   **Secure Authentication (Clerk):** Login via OAuth providers and email/password, session management, MFA.
*   **Post-Login Role Selection:** Mandatory flow for defining role (`doctor`/`patient`) via Clerk metadata.
*   **Routing Middleware (Next.js + Clerk):** Protects routes based on authentication and user role.
*   **Distinct Dashboards:** Separate, personalized interfaces for doctors (`/dashboard`) and patients (`/dashboard-paciente`), optimizing the workflow for each profile.

### Patient Management (Doctor)
*   Patient creation with validated forms (React Hook Form + Zod).
*   Listing and viewing assigned patients.
*   Patient deletion.

### Detailed Patient View
*   Dedicated pages (`/patients/[id]/*`) using Server Components for layout and initial data loading.
*   Client Components for interactivity (`'use client'`).
*   **Overview:** Includes demographic information, **detailed charts of vital signs and multiple lab results (with trends, correlations, comparisons, and severity scores)**, and a consolidated event timeline.
*   **Clinical Notes:** Dedicated section with a rich text editor (TipTap) for creating and viewing notes.
*   Management of Medications, Exams (Labs), Vital Signs.

### UX/UI

#### Modernized Pages
*   **Modern Responsive Design:** Completely redesigned interface with blue/purple gradients, enhanced shadcn/ui components, and Dr. Corvus branding
*   **Complete Translation:** All texts, error messages, labels, and interface fully translated to Brazilian Portuguese
*   **Robust Translation Architecture:** Centralized backend translation system with DeepL API as primary engine and BAML as fallback, supporting both single string and batch translation with comprehensive error handling
*   **Elegant Loading States:** Custom LoadingSpinner components with smooth animations and contextual visual feedback
*   **Robust Error Handling:**
    *   Custom ErrorAlert and SuccessAlert components with automatic dismiss
    *   Full integration with Sonner for contextual toast notifications
    *   Actionable and informative error messages with clear guidance
*   **Dr. Corvus Insights:** Advanced personalized insights system with:
    *   Configuration modal for additional context
    *   Distinct views for patients vs medical professionals
    *   Expandable accordion for content organization
    *   Custom loading animations with Dr. Corvus logo
*   **Clinical Academy:** Interactive learning system with:
    *   Clinical reasoning development
    *   Differential diagnosis with educational algorithms
    *   EBM: scientific research and quality analysis
    *   Metacognition and diagnostic errors
    *   Clinical case analysis and simulation

#### Reusable Components Created
*   **LoadingSpinner:** Elegant loading state with customizable message
*   **ErrorAlert:** Error alert with dismiss and contextual actions
*   **SuccessAlert:** Success alert with positive visual feedback

#### Automated Exam Upload and Analysis
*   Enhanced upload functionality for exams in PDF, JPG, and PNG format (`FileUploadComponent`).
*   Backend processes the file, creates an `Exam` record, and extracts individual `LabResult`s.
*   Lab results are enriched with units, reference values, and abnormality flags.
*   **Interpreted by a suite of specialized clinical analyzers and the `/clinical-assistant/check-lab-abnormalities` endpoint.**
*   Improved accuracy in extracting numerical values from PDFs (e.g., correct handling of "10,500").

#### Manual Entry Interface
*   **Organization by Medical Categories:**
    *   Hematologic System (Hemoglobin, Leukocytes, Platelets, etc.)
    *   Renal Function (Creatinine, Urea, GFR, etc.)
    *   Hepatic Function (AST, ALT, GGT, etc.)
    *   Electrolytes (Sodium, Potassium, Calcium, etc.)
    *   Blood Gas (pH, pCO2, pO2, etc.)
    *   Cardiac Markers (Troponin, CK, BNP, etc.)
    *   Metabolism (Glucose, HbA1c, Cholesterol, etc.)
    *   Inflammatory Markers (CRP, ESR, etc.)
    *   Microbiology (Blood cultures, Urine cultures, etc.)
    *   Pancreatic Function (Amylase, Lipase)
*   **Real-Time Validation:** Immediate feedback with intelligent validation
*   **Auto-Fill:** Pre-loaded reference values by category
*   **Responsive Layout:** Optimized grid for desktop and mobile
*   **UX:** Tooltips, contextual help, and intuitive navigation

### Dr. Corvus Insights System

#### Personalized Insights by Profile
*   **Intelligent Analysis:** Based on user profile
*   **Advanced Contextualization:** Deep clinical interpretation of lab results
*   **Adaptive Language:** Communication tailored for each user type

#### Advanced Configuration Modal
*   **Additional Context:** Field for relevant clinical information (diagnoses, symptoms, medications)
*   **Specific Questions:** System to guide Dr. Corvus's analysis
*   **Intuitive Interface:** Modern design with real-time validation and feedback

#### Organized and Intelligent Visualization
*   **Detailed Thought Process:** Complete clinical reasoning from Dr. Corvus
*   **Key Abnormalities:** Identification and prioritization of relevant findings
*   **Patterns and Correlations:** Analysis of relationships between parameters
*   **Differential Diagnostic Considerations:** Structured diagnostic hypotheses
*   **Suggested Next Steps:** Recommendations for investigation and management
*   **Robustness:** System with educational fallbacks and consistent error handling.

#### Features
*   **Exclusive Animations:** Loading states with pulsating Dr. Corvus logo
*   **Expandable Accordion:** Intuitive content organization
*   **Smart Copy:** Complete reports with structured formatting
*   **Auto-Scroll:** Smooth navigation between sections
*   **Contextual Disclaimers:** Important clinical usage warnings

### Clinical Academy (Dr. Corvus)

#### Educational Structure
*   **Dedicated Section** (`/academy`) for clinical reasoning development.
*   **Complete Translation to Portuguese:** All APIs and educational features of the Clinical Academy are 100% translated, ensuring a native and accessible learning experience. Translation system uses DeepL API with BAML fallback and handles complex batch translations for clinical outputs.
*   **BAML Methodology:** Uses specialized AI functions (executed in English for optimized performance and translated to PT-BR for the user) for Socratic educational feedback, cognitive bias analysis, and reasoning development.
*   **Modern Interface:** Consistent design with optimized user experience.
*   **Structured Progression:** Interconnected modules for gradual learning.

#### Implemented Modules

##### Evidence-Based Medicine (`/academy/evidence-based-medicine`)
**Scientific Research System** with two distinct modes and a robust quality analysis system:

**Integrated Research Workflow:**
1.  **Intelligent Analysis of Clinical Question:** AI interprets the user's need.
2.  **Strategic Multi-Source Search:**
    *   **PubMed:** Peer-reviewed medical literature.
    *   **Europe PMC:** Extensive database with full texts and preprints.
    *   **Lens.org:** Global coverage of academic research and patents.
    *   **Brave Search API:** Current clinical guidelines and web resources.
3.  **Advanced Processing with CiteSource:**
    *   **Smart Deduplication:** Eliminates redundancies between sources.
    *   **Multidimensional Quality Analysis:** Assesses source coverage, study type diversity, recency of publications, and bibliometric impact.
    *   **Source Benchmarking:** Analyzes the performance and contribution of each database.
    *   **Detailed Reports:** Generates executive summaries, in-depth analyses, and actionable recommendations.
4.  **Unified Synthesis with BAML:** Research results and CiteSource analysis are consolidated and presented intelligently.

**🔧 Quick Research:**
*   **Structured PICO Form:** Population, Intervention, Comparison, Outcome.
*   **Optimized Strategies:** Generated by Dr. Corvus based on the clinical question.
*   **Controlled Execution:** User controls each research step.
*   **Total Transparency:** Full visibility of the search process and sources.

**🤖 Advanced Research - Autonomous Mode:**
*   **Adaptive Decisions:** Dr. Corvus autonomously decides strategies.
*   **Intelligent Iterations:** Multiple searches based on previous results.
*   **Dynamic Learning:** Continuous refinement of strategy during the process.

### Quick Research Workflow

| Step | Component | Purpose |
|-------|-----------|------------|
| 1 | **Query Pre-processing (`simple_autonomous_research.py`)** | • Expansion of medical abbreviations in PT.<br>• Automatic translation to EN (DeepL → BAML) with robust error handling.<br>• Synonym expansion.<br>• Generation/simplification via BAML (PICO / keywords). |
| 2 | **Layered PubMed Search (`UnifiedPubMedService`)** | • Tier 1 – Original/expanded query.<br>• Tier 2 – Simplified query.<br>• Tier 3 – PICO query.<br>• `_apply_default_language_filter` ensures `english[lang]`.<br>• Enrichment with metrics (Altmetric, iCite) and scoring. |
| 3 | **Supplementary Academic Sources** | • `EuropePMCService` for OA outside PubMed.<br>• `LensScholarService` optional (priority ↓ if `LENS_SCHOLAR_API_KEY` absent). |
| 4 | **Web & Guidelines Search** | • `async_brave_web_search` (MCP).<br>• `_try_mcp_search` converts results to BAML objects. |
| 5 | **Aggregation & Quality Filtering** | • `_filter_low_quality_sources` removes blacklisted domains and applies `TRUSTED_DOMAIN_WHITELIST`.<br>• Deduplication and consolidation via `cite_source_service`. |
| 6 | **Synthesis (`synthesize_with_fallback`)** | BAML summary of findings, quality assessment, and clinical implications. |

**Key Protections:**

* `english[lang]` in all PubMed/EPMC queries; Brave with `lang:en`.
* Elite domain whitelist.
* Adaptive prioritization based on available API keys (Lens Scholar optional).
* `MCP_CALL_DELAY_SECONDS` delay to avoid rate-limit.

*   **Stopping Criteria:** AI determines when the search is sufficient.

**📊 Transparency Metrics (Automatic):**
*   **Research Overview:** Total articles analyzed, sources consulted, analysis time, unique journals.
*   **Study Composition:** Breakdown by type (systematic reviews, RCTs), high-impact studies, recent studies.
*   **Detailed Search Strategy:** Sources used, research period, filters applied, selection criteria.
    *   *Goal: Increase reliability and demonstrate scientific rigor.*

**🔗 Additional Sources and Tools:**
*   **LlamaParse:** Advanced analysis of scientific PDF documents for data extraction.
*   **Critical Appraisal:** Tools for structured methodological quality assessment.

##### Metacognition and Diagnostic Errors (`/academy/metacognition-diagnostic-errors`)
*   **Error Prevention:** Focus on metacognition and critical thinking through the SNAPPS framework and other tools.
*   **SNAPPS Framework (Summarize, Narrow, Analyze, Probe, Plan, Select):** Robust BAML support for each step, offering Socratic feedback and bias analysis.
*   **Specialized BAML Functions:**
    *   `ProvideFeedbackOnProblemRepresentation`: Feedback on problem formulation.
    *   `ClinicalReasoningPath_CritiqueAndCompare`: Reasoning process analysis
    *   `AnalyzeDifferentialDiagnoses_SNAPPS`: Structured case presentation

##### Differential Diagnosis Expansion (`/academy/expand-differential`)
*   **Structured Methodologies:** VINDICATE and other systematic approaches
*   **BAML Function `ExpandDifferentialDiagnosis`:** Intelligent assistance in diagnostic expansion
*   **Interactive Interface:** Dynamic exploration of diagnostic possibilities

### Unified Bibliometric API Architecture

*   **Unified Metrics Service:** Consolidates all bibliometric APIs into a centralized service
*   **Unified PubMed Service:** Complete integration with automatic metric enrichment
*   **Citation Consensus:** Cross-validation between multiple sources
*   **Composite Scoring:** Unified relevance and quality algorithm to rank articles

#### Integrated APIs (Examples of Collected Metrics)
*   **Altmetric API:** Social impact metrics and online attention (e.g., news mentions, social media, policy documents)
*   **NIH iCite API:** Field-normalized metrics (e.g., Relative Citation Ratio - RCR, NIH percentile, Approximate Potential to Translate - APT)
*   **Web of Science API:** Precise citation data and classifications (e.g., citation counts, "Highly Cited Paper" status, journal impact factor)
*   **OpenCitations API:** Open citation data to expand coverage
*   **Semantic Scholar API:** AI insights, influential citations, and AI-generated summaries

### Advanced Data Visualizations
*   **Interactive Charts (Recharts)** for vital signs and lab results
*   **Consolidated Timeline** with major clinical events
*   **Comparative Analyses:** Multiple parameters, correlations, scatter plots
*   **Specialized Dashboards:** Categorized and detailed results
*   **Clinical Scores:** SOFA, qSOFA, APACHE II with evolutionary visualization

### Clinical AI Assistant (Dr. Corvus - Chat)
*   **Streaming Interface:** Vercel AI SDK for smooth conversation
*   **Advanced Security:** Rigorous de-identification of sensitive data
*   **Intelligent Context:** MCP Server for generating relevant context
*   **Fallback Strategy:** OpenRouter → Gemini for maximum availability
*   **Structured Logging:** Active Learning pipeline for continuous improvement

### Patient Features
*   **Health Diary:** Record with smart pagination
*   **Personalized Dashboard:** Optimized interface for personal tracking
*   **Accessible Insights:** Dr. Corvus with patient-appropriate language

### Next-Generation Notification System
*   **Toast Notifications:** Sonner for real-time visual feedback
*   **Full Responsiveness:** Optimized for all devices
*   **Intelligent Context:** Specific messages for each action
*   **Reusable Components:** LoadingSpinner, ErrorAlert, SuccessAlert

## BAML Architecture and Dr. Corvus Core

### BAML Structure
*   **Source Code:** `baml_src/` with structured definitions
*   **Generated Client:** `baml_client/` auto-generated via BAML CLI
*   **Configuration:** `client_config.baml` with fallback strategy and English prompts for LLM performance
*   **Translation Integration:** Dedicated FastAPI router exposing BAML translation endpoints with DeepL as primary engine
*   **Orchestration:** `clinical_assistant.baml` as the central hub
*   **Robustness:** BAML functions with educational fallbacks and consistent error handling

### Specialized BAML Functions (partial list)

#### Academy and Training
*   **`AnalyzeDifferentialDiagnoses_SNAPPS`:** Structured framework for clinical cases
*   **`ClinicalReasoningPath_CritiqueAndCompare`:** Metacognitive analysis of reasoning
*   **`ProvideFeedbackOnProblemRepresentation`:** Personalized educational feedback
*   **`ExpandDifferentialDiagnosis`:** Systematic expansion (VINDICATE and other mnemonics)
*   **`AssistEvidenceAppraisal`:** Critical appraisal of scientific evidence
*   **`AssistInIdentifyingCognitiveBiases`:** Cognitive bias analysis
*   **

#### Scientific Research
*   **`FormulateDeepResearchStrategy`:** Optimized multi-source strategies
*   **`SynthesizeDeepResearchFindings`:** Intelligent synthesis of results
*   **`AnalyzePDFDocument`:** Advanced analysis of scientific documents

#### Dr. Corvus Insights
*   **Personalized Analysis:** Adaptation based on patient data
*   **Contextual Interpretation:** Lab results with deep clinical insight
*   **Critical Thinking:** Cognitive bias analysis and metacognition

#### Patient Support
*   **`GetProfessionalIntroduction`:** Professional introduction templates
*   **`SuggestPatientFriendlyFollowUpChecklist`:** Personalized checklists

## Technical Architecture

```
+---------------------+      +---------------------+      +--------------------+      +---------------------+
|      Frontend       | ---->|     Backend API     | ---->|      Database      |      |        Clerk        |
| (Next.js App Router)|      |      (FastAPI)      |      |    (PostgreSQL)    | ---->|   (Auth Service)    |
| - React             |      | - Python            |      +--------------------+      +---------------------+
| - TypeScript        |<----->| - SQLAlchemy (ORM)  |               ↑
| - TailwindCSS       |      | - Pydantic          |               |
| - Shadcn UI         |      | - CRUD Operations   |---------------+
| - Recharts          |      | - Business Logic    |
| - Vercel AI SDK     |      | - Auth Middleware   |      +----------------------+
| - Clerk Client      |      | - BAML Client       |      |      MCP Server      |
| - TipTap Editor     |      +---------------------+      |       (FastAPI)      |
| - Sonner Toasts     |               |                     | - Context Generation |
+---------------------+               |-------------------->| - KG Interaction     |
                                       | (De-identified      | - RAG Pipeline       |
                                       |  Data)              | - AL Logging         |
                                       |                     | - CiteSource Engine  |
                                       |                     +----------------------+
                                       |
                                       | LLM APIs (De-identified Data)
                                       v
                              +------------------------+
                              | LLM APIs (OpenRouter/  |
                              | Gemini Direct Fallback)|
                              +------------------------+
                                       |
                                       | External Services (Bibliometrics, etc.)
                                       v
                              +------------------------+
                              | PubMed, Europe PMC,    |
                              | Lens.org, Brave Search,|
                              | LlamaParse, etc.       |
                              +------------------------+
```

### Main Components:

1.  **Frontend (Next.js App Router):** User interface, dashboards, interactions, and visualizations.
2.  **Backend API (FastAPI):** Core business logic, data management, integration with BAML and external services.
3.  **MCP Server (FastAPI):** Context generation for AI, hybrid GraphRAG pipeline (KG + BM25/Vector), Knowledge Graph interaction, and CiteSource engine.
4.  **Database (PostgreSQL):** Persistent application data storage.
5.  **Clerk:** Authentication and user management service.
6.  **BAML (Boundary):** AI engine for clinical reasoning, research, and educational features.
7.  **External Services:** Bibliometric APIs, LLMs, etc.

### Translation Strategy for AI Features
To ensure high performance of language models (LLMs) and a native experience in Portuguese, **all translation logic is now centralized in the backend**:

1. **User Input (PT-BR):** Input provided by the user in Portuguese is sent from the frontend to the backend without any prior translation.
2. **Backend Processing:** The backend translates to English using DeepL as the primary engine, with automatic fallback to BAML if it fails. Then, BAML functions (prompts and logic in English) are executed.
3. **Output to User (PT-BR):** The response generated by BAML in English is translated back to Portuguese in the backend (using DeepL/BAML) before being returned to the frontend.

**Important:** Frontend API routes act only as proxies and should not implement translation logic or import/use DeepL, BAML, or any translation service directly. All translation occurs exclusively in the backend, ensuring consistency, auditability, and ease of maintenance.

**Frontend Proxy Example:**
```ts
// frontend/src/app/api/some-translated-route/route.ts
export async function POST(request: NextRequest) {
  // ...authentication...
  const backendUrl = `${process.env.BACKEND_URL}/api/some-translated-route`;
  const response = await fetch(backendUrl, { ... });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

## How to Run

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   Docker and Docker Compose
*   Clerk account (for authentication)
*   **API Keys:** For various external services (LLMs like OpenRouter/Gemini, bibliometric APIs like PubMed, Altmetric, iCite, Web of Science, Lens.org, Semantic Scholar, Brave Search). These should be configured as environment variables (e.g., in a `.env` file at the project root). See each service's specific documentation for keys.

### Initial Setup
1.  **Clone and Configure:**
    ```bash
    git clone [repository]
    # Configure .env, frontend/.env.local, backend-api/.env, mcp_server/.env
    ```

2.  **Generate BAML Client:**
    ```bash
    baml-cli generate
    ```

3.  **Start Services:**
    ```bash
    # Development
    docker-compose -f docker-compose.dev.yml up -d --build

    # Production
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

4.  **Run Migrations:**
    ```bash
    docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
    ```

### Contributions
Contributions are welcome! Please follow the style guide and commit standards.

## Additional Documentation
- **`code-overview.md`:** Detailed overview of code structure, key components, and interactions (to be updated).
- **Specific documents:** Inside `frontend/docs`, `backend-api/docs`, `mcp_server/docs` for implementation details of specific features (to be consolidated or removed).

## Roadmap and Next Steps

### Completed / Stable

*   **Modernized Interface:** All pages modernized
*   **Full Localization:** Complete Brazilian Portuguese translation
*   **Dr. Corvus Insights:** Personalized insights system
*   **BAML Academy:** Educational modules with specialized AI
*   **Scientific Research:** Advanced manual and autonomous modes
*   **Unified APIs:** 30-40% performance improvement
*   **Notifications:** Complete Sonner system
*   **Advanced Research:** Advanced scientific research in high-quality global databases

### In Development

*   **AI Migration:** ElizaOS → Langroid, LlamaParse → Marker
*   **Knowledge Graph:** Neo4j implementation with **hybrid GraphRAG architecture (KG + BM25/Vector)**
*   **Specialized Models:** Clinical RoBERTa for KG building/updating and reranking, Mistral for query reformulation, other SOTA LLMs for core reasoning
*   **Active Learning:** Continuous improvement pipeline
*   **Advanced Testing:** Expanded E2E coverage

### Next Steps

1. **Performance:** Redis cache, query optimization, bundle size
2. **Features:** Smart alerts, wearables, advanced medications
3. **Quality:** AI security tests, LGPD/HIPAA, Golden Dataset
4. **UX:** Full i18n, offline mode, mobile optimization

### Future Vision

#### Complete AI
- **Knowledge Graph:** Reliable medical sources with **hybrid GraphRAG (KG + BM25/Vector) as source of truth**
- **Curated Knowledge:** Only curated knowledge populates KG, non-curated stays in BM25/Vector store
- **Autonomous Agent:** Independent clinician and researcher, with access to all platform features
- **Active Learning:** Continuous, validated fine-tuning

#### Clinical Features
- **Real Time:** Monitoring with granular consent
- **Wearables:** Automated integration
- **AI Alerts:** Based on clinical trends
- **Interoperability:** HL7/FHIR hospital integration

#### Autonomous Research (Clinical Academy EBM Module)
- **Autonomous Agent:** Dr. Corvus has access to all platform features, able to use all necessary tools to answer a research question
  - **Adaptive Decisions:** Dr. Corvus autonomously decides strategies
  - **Intelligent Iterations:** Multiple searches based on previous results
  - **Dynamic Learning:** Continuous refinement of strategy during the process
  - **Quality Assessment:** Continuous evaluation of result quality
  - **Detailed Reports:** Generates executive summaries, in-depth analyses, and actionable recommendations to optimize future searches

#### Decentralized Architecture with Ritual
Aligned with our mission to **"Decentralize Knowledge, Democratize Health"**, the next evolution of the platform will be built on decentralized AI principles using the **Ritual Foundation**. This approach will provide unprecedented guarantees of privacy, transparency, and data sovereignty.
*   **Verifiable and Auditable AI:** On-chain execution of AI models with cryptographic proofs, ensuring analyses are transparent and tamper-proof.
*   **Hardware Privacy (TEEs):** Processing sensitive data in *Trusted Execution Environments*, ensuring patient privacy is absolute and inviolable.
*   **True User Sovereignty:** Giving patients and doctors full control over their data and the models they use, breaking dependence on centralized infrastructures.

## Testing and Quality

### Multi-Layered Strategy
- **Code:** Jest (frontend), pytest (backend)
- **E2E:** Playwright for critical flows
- **Golden Dataset:** Validation by medical specialists
- **Adversarial:** AI security and robustness
- **Human Review:** Continuous clinical validation

### Commands
```bash
# Backend
docker-compose -f docker-compose.dev.yml exec backend pytest

# Frontend
docker-compose -f docker-compose.dev.yml exec frontend npm run test
docker-compose -f docker-compose.dev.yml exec frontend npm run test:e2e
```

---

**Clinical Corvus** represents the future of clinical assistance, combining cutting-edge technology with evidence-based medical practices, always prioritizing safety, privacy, and quality of patient care.

## License

This project is licensed under the MIT License with the [Commons Clause](https://commonsclause.com/).

- **Open for collaboration:** You may use, modify, and contribute to this codebase for non-commercial purposes.
- **Commercial use is restricted:** You may not sell, host, or offer the software as a service for a fee without explicit written permission from the copyright holder.
- **Purpose:** This model protects the project's commercial value while encouraging open collaboration and transparency.

See the [LICENSE](./LICENSE) file for the full legal text and details.
