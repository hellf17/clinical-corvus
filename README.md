# Clinical Corvus

Clinical Corvus is a digital platform for clinical data analysis, decision support, and patient monitoring, leveraging Artificial Intelligence (Dr. Corvus) in a secure, privacy-focused environment. The platform is designed for both physicians (management with AI, analysis, some tools on academy - DDx, advanced research) and students/residents (management with AI, analysis, academy modules, AI support). Our vision is to act as a **"Clinical Co-pilot"** for doctors and students, optimizing workflows and helping them to keep up with evidence based practices. We also have educational tools that leverages LLMs to train clinical thinking tools that can be used in clinical practice. **Compliance with LGPD/HIPAA and data security are top priorities.**

## Table of Contents

- [Current Status](#current-status)
- [API Routing and Proxy Pattern](#api-routing-and-proxy-pattern)
- [Implemented Features](#implemented-features)
- [BAML Architecture and Dr. Corvus Core](#baml-architecture-and-dr-corvus-core)
- [Technical Architecture](#technical-architecture)
- [Quick Start](#quick-start)
- [How to Run](#how-to-run)
- [Contributions](#contributions)
- [Security Audit and Recommendations](#security-audit-and-recommendations)
- [Additional Documentation](#additional-documentation)
- [Roadmap and Next Steps](#roadmap-and-next-steps)
- [Testing and Quality](#testing-and-quality)
- [License](#license)

## Current Status

The platform is **fully functional** and has completed a comprehensive testing phase for its MVP multi-agent system. Key capabilities include:

### Core Features
- **Patient Management**: Complete CRUD operations with role-based access
- **AI Clinical Assistant**: Dr. Corvus provides contextual insights and recommendations
- **Clinical Data Visualization**: Interactive charts for vital signs and lab results
- **Rich Text Editor**: TipTap integration for clinical notes
- **PDF Exam Processing**: Automated upload, extraction, and analysis of lab results

### Advanced Systems
- **Modernized UI**: Complete interface redesign with blue/purple gradients
- **Portuguese Localization**: 100% translation of all interfaces and educational content
- **Dr. Corvus Insights**: Personalized AI analysis system with configuration modal
- **Clinical Academy**: Interactive learning modules with BAML-powered AI training
- **Scientific Research**: Advanced evidence-based medicine with CiteSource quality analysis
- **Multi-Agent System**: Langroid-based multi-agent system for advanced clinical and research tasks.

### Technical Infrastructure
- **Frontend**: Next.js App Router, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, PostgreSQL, BAML AI orchestration
- **AI Pipeline**: Langroid for multi-agent orchestration, with a hybrid GraphRAG architecture (KG + BM25/Vector)
- **External Services**: PubMed, Europe PMC, Lens.org, Brave Search integration
- **AI SDK Integration**: Vercel AI SDK powers `/api/chat` with a single tool (`drCorvusClinicalAssistant`) that delegates to the backend `/api/agents/chat` orchestrator.

### User Preferences & Settings
- DB‑backed preferences for doctors, including notification toggles, language, and timezone.
- Backend API: `GET/POST /api/user/preferences` (FastAPI), persists to `user_preferences` table.
- Frontend proxy: `GET/POST /api/user/preferences` (Next.js API route) with Clerk auth.
- UI: `/dashboard-doctor/settings` → Notifications tab exposes toggles, language, timezone.
- Migration: Alembic revision `3e1b2c7f5a10_add_user_preferences_table`.

### Ongoing Development
- **Security improvements**: Authentication hardening and data encryption enhancements
- **Knowledge Graph**: Neo4j implementation with Clinical RoBERTa and Mistral integration
- **Active Learning**: Continuous improvement pipeline
- **Performance Optimization**: 30-40% improvement in unified API performance

### Recently Completed
- **Patient Result Saving**: Direct integration to save lab analysis results to patient profiles ✅
- **Quick Analysis Enhancement**: Complete workflow from upload to patient record integration ✅
- **API Integration**: Real-time patient fetching with robust error handling ✅
- **User Experience**: Streamlined patient selection and result saving workflow ✅
- **MVP Agents Integration**: ClinicalDiscussionAgent and ClinicalResearchAgent fully integrated ✅
- **Enhanced Chat Interface**: Intelligent agent routing and patient context awareness ✅
- **Frontend Components**: Complete MVP agent integration with toggle controls ✅
- **Comprehensive Testing**: Completed unit, integration, end-to-end, and clinical validation for the MVP agents. ✅

### Clinical Validation Program

- Route: `/dashboard-doctor/clinical-validation`
- Purpose: Allow selected testers to run predefined clinical and research scenarios against the MVP agents and submit structured feedback (accuracy, relevance, completeness, safety, privacy, comments).
- Access control: restricted to doctors explicitly allowed via one of the following mechanisms:
  - Clerk public metadata: `clinicalValidation: true` or `betaTester: true`
  - Email allowlist env: set `NEXT_PUBLIC_CLINICAL_VALIDATION_TESTERS="email1@example.com,email2@org.com"`
- Feedback handling: submitted via `/api/clinical-validation/feedback` (frontend route) which logs server‑side. For production, forward to a backend datastore endpoint.

### Migrations
- Alembic located at `backend-api/alembic`.
- New revision adds `user_preferences` table: `3e1b2c7f5a10_add_user_preferences_table.py`.
- Apply with: `alembic upgrade head` (ensure env points to your DB).

## Backend Testing & Implementation Status

### ✅ **FULLY IMPLEMENTED BACKEND COMPONENTS**

#### **Patient Management System** (`/backend-api/routers/patients.py`)
**Status: ✅ PRODUCTION READY**
- Complete CRUD operations for patients
- Role-based access control (admin/doctor/patient)
- Group collaboration support
- Lab results management with manual entry
- Pagination and search functionality
- Authorization checks for all operations

#### **Alert System** (`/backend-api/routers/alerts.py`)
**Status: ✅ PRODUCTION READY**
- Alert CRUD operations (create, read, update, delete)
- Patient-specific alerts with authorization
- Alert statistics and filtering
- Alert generation from lab results
- Severity-based categorization
- Real-time alert management

#### **Medication Management** (`/backend-api/routers/medications.py`)
**Status: ✅ PRODUCTION READY**
- Medication CRUD operations
- Patient-specific medication management
- Status tracking (active, completed, suspended)
- Route and frequency management
- Prescription tracking
- Authorization and access control

#### **Group Collaboration** (`/backend-api/routers/groups.py`)
**Status: ✅ PRODUCTION READY**
- Group CRUD operations
- Member management (invite, remove, role changes)
- Patient assignment to groups
- Invitation system with tokens
- Role-based permissions (admin/member)
- Comprehensive authorization checks

### 🗄️ **DATABASE MODELS - COMPLETE SUPPORT**
**Core Models** (`/backend-api/database/models.py`)
- User & Patient Models with role-based access
- Doctor-patient associations (many-to-many)
- LabResult model with abnormality detection
- Medication model with status tracking
- Alert model with severity levels
- ClinicalScore model for severity scoring
- VitalSign model for patient monitoring
- Group Collaboration Models (Group, GroupMembership, GroupPatient, GroupInvitation)

### 🔧 **SUPPORTING INFRASTRUCTURE**
- **Schemas** (`/backend-api/schemas/`): Complete API schemas for all endpoints
- **CRUD Operations** (`/backend-api/crud/`): Full database operations layer
- **Security & Authorization**: Clerk integration with role-based access control
- **Medical Analyzers**: 12+ specialized clinical analyzers (hematology, renal, hepatic, cardiac, etc.)

### 📊 **API ENDPOINTS SUMMARY**
```
Patient Management:
GET    /api/patients/              - List patients (paginated)
POST   /api/patients/              - Create patient
GET    /api/patients/{id}          - Get patient details
PUT    /api/patients/{id}          - Update patient
DELETE /api/patients/{id}          - Delete patient
GET    /api/patients/{id}/lab_results - Get patient lab results
POST   /api/patients/{id}/lab_results - Create manual lab result

Alert Management:
POST   /api/alerts/                - Create alert
GET    /api/alerts/{id}            - Get alert
PATCH  /api/alerts/{id}            - Update alert (mark as read)
GET    /api/alerts/patient/{id}    - Get patient alerts
GET    /api/alerts/stats           - Get alert statistics
DELETE /api/alerts/{id}            - Delete alert

Medication Management:
POST   /api/medications/           - Create medication
GET    /api/medications/{id}       - Get medication
PUT    /api/medications/{id}       - Update medication
DELETE /api/medications/{id}       - Delete medication
GET    /api/patients/{id}/medications - Get patient medications
POST   /api/patients/{id}/medications - Create patient medication

Group Collaboration:
POST   /api/groups/                - Create group
GET    /api/groups/                - List user groups
GET    /api/groups/{id}            - Get group details
PUT    /api/groups/{id}            - Update group
DELETE /api/groups/{id}            - Delete group
POST   /api/groups/{id}/members    - Invite user to group
GET    /api/groups/{id}/members    - List group members
DELETE /api/groups/{id}/members/{user_id} - Remove user from group
POST   /api/groups/{id}/patients   - Assign patient to group
GET    /api/groups/{id}/patients   - List group patients
DELETE /api/groups/{id}/patients/{patient_id} - Remove patient from group
```

### 🎯 **BACKEND READINESS ASSESSMENT**
✅ **FULLY PRODUCTION READY COMPONENTS:**
- Patient Management System
- Alert System
- Medication Management
- Group Collaboration System
- Database Models & Schemas
- Security & Authorization
- Medical Analyzers (12+)

🔧 **Technical Excellence:**
- Security: Comprehensive authorization and authentication
- Scalability: Pagination, efficient queries, proper indexing
- Maintainability: Clean separation of concerns, comprehensive logging
- Testing: Well-structured API with clear schemas
- Documentation: Complete endpoint documentation

🚀 **CONCLUSION**
The backend infrastructure for dashboard-doctor is exceptionally well-implemented with:
- **100% feature coverage** for all dashboard requirements
- **Enterprise-grade security** with role-based access control
- **Comprehensive API endpoints** for all CRUD operations
- **Robust group collaboration capabilities**
- **Production-ready code quality** with proper error handling

**The backend is fully prepared to support the dashboard-doctor functionality with no gaps or missing components!** 🎉

## Security Audit and Recommendations

A comprehensive security audit has been performed on the Clinical Corvus platform. Hardenings were applied across backend (rate limiting, cookie policy, JWT verification options, sanitization), frontend (CSP/security headers, render sanitization), and secrets management (Infisical). For the current status and actionable recommendations, see the [Security Audit and Recommendations](./security-audit.md) document.

### Production Deployment (Docker Compose)

- Use `docker-compose.prod.app.yml` for the core app stack (Postgres, Redis, Backend API, MCP Server, Frontend).
- Combine with `docker-compose.prod.yml` to add the metrics stack if desired.

Examples (with Infisical CLI injecting secrets):

```
# App stack only
infisical run --env=Production -- docker compose -f docker-compose.prod.app.yml up -d

# App + metrics stacks
infisical run --env=Production -- docker compose \
  -f docker-compose.prod.app.yml \
  -f docker-compose.prod.yml \
  up -d
```

Recommended production env values:
- `FRONTEND_URL=https://www.clinical-corvus.app`
- `CORS_ORIGINS=https://www.clinical-corvus.app`
- `NEXT_PUBLIC_BACKEND_URL=https://api.clinical-corvus.app` (if browser must call API directly)
- `CLERK_JWT_ISSUER` / `CLERK_JWT_AUDIENCE` for strict Clerk token verification

### Infisical: CLI bulk import from `.env`

To import secrets without the UI, use the provided scripts that call `infisical secrets set` for each key:

```
# macOS/Linux
PROJECT_ID=<your-project-id> ENV_SLUG=Production \
  ./scripts/infisical_import_from_env.sh .env

# Windows PowerShell
./scripts/infisical_import_from_env.ps1 -EnvFile .env -ProjectId <your-project-id> -EnvSlug Production
```

Notes:
- Scripts ignore comments/blank lines and handle quoted values. Adjust as needed for paths or secret scoping.
- If your CLI version supports native bulk from file, you may also use `infisical secrets set --from-file .env` (see Infisical CLI docs).
- After importing, run the app with Infisical: `infisical run --env=Production -- docker compose -f docker-compose.prod.app.yml up -d`.

## License

This project is licensed under the MIT License with the [Commons Clause](https://commonsclause.com/).

- **Open for collaboration:** You may use, modify, and contribute to this codebase for non-commercial purposes.
- **Commercial use is restricted:** You may not sell, host, or offer the software as a service for a fee without explicit written permission from the copyright holder.
- **Purpose:** This model protects the project's commercial value while encouraging open collaboration and transparency.

See the [LICENSE](./LICENSE) file for the full legal text and details.

## API Routing and Proxy Pattern

### Backend Routing
- All backend API endpoints are exposed under the `/api/*` prefix, with routers included in `main.py` (e.g., `/api/research`, `/api/clinical`).
- No internal prefixes are set in router files; all prefixing is handled centrally in `main.py` for consistency.
- Agents: endpoints are consolidated in `backend-api/routers/agents_router.py` and mounted under both `/api/agents/*` (canonical) and `/api/mvp-agents/*` (legacy shim).
- Example backend endpoints:
  - `/api/research/formulate-pico-translated`
 - `/api/research/quick-search-translated`
  - `/api/clinical/differential-diagnosis`

### Frontend Proxy
- All `/api/*` routes in the frontend act as proxies, forwarding requests to the backend at the same path.
- No translation or business logic is handled in the frontend API routes; they only proxy requests and responses.
- Example proxy route:
  - `frontend/src/app/api/research-assistant/formulate-pico-translated/route.ts` → proxies to `/api/research/formulate-pico-translated` on the backend.
  - `frontend/src/app/api/mvp-agents/*` → proxies to `/api/mvp-agents/*` on the backend (also available at `/api/agents/*`).

### Research Agent Auth
- `/api/research/agent-research/autonomous` and `/api/research/agent-research/autonomous-translated` require authentication; Next.js proxies forward the `Authorization` header.

### Routing Summary
- This design eliminates route duplication and ensures seamless integration between frontend and backend.
- For new endpoints, always add the router in `main.py` with the desired `/api/<domain>` prefix, and create a matching proxy route in the frontend if needed.

---

## Implemented Features

### Authentication and Security Architecture

The platform's security is built on a robust, multi-layered architecture that ensures data privacy and compliance with standards like HIPAA and LGPD.

*   **Authentication (Clerk):** User authentication is managed by Clerk, supporting OAuth, email/password, and MFA. Clerk handles all user session management.
*   **Frontend Middleware (`frontend/src/middleware.ts`):** The Next.js middleware is the first line of defense. It protects routes based on user authentication status and role (e.g., `doctor`, `patient`). It is also responsible for forwarding the necessary authentication headers to the backend API, ensuring seamless session verification.
*   **Backend Verification (`backend-api/security.py`):** The FastAPI backend uses the official Clerk SDK to verify user sessions. The `get_verified_clerk_session_data` function validates the session token from the request cookies, providing a secure way to authenticate API requests. This method is resilient to page refreshes and ensures that the user's session is consistently maintained.
*   **Role-Based Access Control (RBAC):** Both the frontend middleware and backend endpoints enforce strict role-based access control, ensuring that users can only access data and perform actions appropriate for their role.
*   **Data Privacy:** All patient data is handled with strict privacy controls, and the system is designed to be compliant with healthcare data regulations.

### Doctor Dashboard Features
*   **Patient Management**: Creation, listing, viewing, and deletion of patient records
*   **Quick Analysis**: In-dashboard lab file analysis with modal workflow for instant insights and patient result saving
*   **Patient Result Saving**: Direct integration to save lab analysis results to patient profiles with automatic data mapping
*   **Critical Alerts**: Real-time notifications for urgent patient issues
*   **Recent Conversations**: Quick access to ongoing patient communications
*   **Appointment Management**: Schedule and view upcoming patient appointments
*   **Risk Scoring**: Comprehensive clinical risk scores (MELD, Child-Pugh, CKD-EPI) with visualizations and trend analysis
*   **Alert System**: Real-time clinical alerts with severity levels and management tools
*   **Clinical Decision Support**: Evidence-based diagnostic and treatment recommendations
*   **Group Collaboration**: Team-based patient management with invitations and role-based access

### Detailed Patient View
*   Dedicated pages (`/patients/[id]/*`) using Server Components for layout and initial data loading
*   Client Components for interactivity (`'use client'`)
*   **Overview:** Demographic information, detailed charts of vital signs and lab results
*   **Clinical Notes:** Rich text editor (TipTap) for creating and viewing notes
*   **Management:** Medications, exams, vital signs, and appointment scheduling
*   **Risk Scores:** Comprehensive clinical risk assessments (MELD, Child-Pugh, CKD-EPI) with visualizations and trend analysis
*   **Alert System:** Real-time clinical alerts with severity levels and management tools
*   **Clinical Decision Support:** Evidence-based diagnostic and treatment recommendations

### Group Collaboration System

The Group Collaboration System enables healthcare teams to work together on patient management with robust security and access controls.

#### Key Features
*   **Team Management**: Create and manage healthcare teams with configurable limits
*   **Role-Based Access Control**: Admin and member roles with distinct permissions
*   **Patient Assignment**: Assign patients to groups for collaborative care
*   **Member Invitation**: Invite new members to groups via email
*   **Member Management**: Add, remove, and change member roles within groups
*   **Audit Logging**: Comprehensive logging of all group activities
*   **Secure Authentication**: Integration with existing Clerk authentication system

#### Group Roles
*   **Admin**: Can create/delete groups, invite/remove members, change member roles, assign patients to groups
*   **Member**: Can view group information, access assigned patients, participate in group activities

#### Workflow
1. **Create Group**: Admins can create new groups with name, description, and limits
2. **Invite Members**: Admins invite members via email with specific roles
3. **Accept Invitations**: Users accept invitations to join groups
4. **Assign Patients**: Admins assign patients to groups for collaborative care
5. **Collaborate**: All group members can access and manage assigned patients
6. **Manage**: Admins can remove members, change roles, and reassign patients

#### Security
*   **HIPAA/LGPD Compliance**: All group data is handled with the same privacy standards as individual patient data
*   **Access Control**: Role-based permissions ensure only authorized users can perform specific actions
*   **Audit Trail**: All group activities are logged for compliance and security monitoring
*   **Data Encryption**: Group data is encrypted both in transit and at rest

### UX/UI
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

#### Reusable Components
*   **LoadingSpinner:** Elegant loading state with customizable message
*   **ErrorAlert:** Error alert with dismiss and contextual actions
*   **SuccessAlert:** Success alert with positive visual feedback

#### Automated Exam Upload and Analysis
*   Enhanced upload functionality for exams in PDF, JPG, and PNG format (`FileUploadComponent`).
*   Backend processes the file, creates an `Exam` record, and extracts individual `LabResult`s.
*   Lab results are enriched with units, reference values, and abnormality flags.
*   **Interpreted by an expanded suite of 11 specialized clinical analyzers (including new Thyroid, Bone Metabolism, Tumor Markers, Autoimmune, Infectious Disease, Hormones, and Drug Monitoring analyzers) and the `/clinical-assistant/check-lab-abnormalities` endpoint.**
*   Improved accuracy in extracting numerical values from PDFs (e.g., correct handling of "10,500").

##### Patient Result Integration
*   **Direct Patient Saving**: After analysis completion, results can be directly saved to patient profiles
*   **Dynamic Patient Selection**: Real-time fetching of patients from the API with fallback to demo data
*   **Automatic Data Mapping**: Lab results are automatically mapped to patient lab result records
*   **Batch Processing**: All analysis results are saved efficiently in a single operation
*   **Audit Trail**: Automatic tracking of result sources and timestamps for compliance
*   **Error Handling**: Comprehensive error handling with user-friendly feedback for save failures
*   **Authentication Integration**: Secure saving with Clerk authentication and role-based access control

##### Manual Entry Interface
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
  *   Thyroid Function (TSH, Free T4, Free T3, Anti-TPO, Anti-TG, TRAb)
  *   Bone Metabolism (Calcium, Phosphorus, PTH, Vitamin D, Alkaline phosphatase, Ionized calcium)
  *   Tumor Markers (PSA, CA 125, CEA, AFP, CA 19-9, Beta-HCG, LDH)
  *   Autoimmune Markers (ANA, Anti-dsDNA, Anti-ENA panel, RF, Anti-CCP, ANCA, C3, C4)
  *   Infectious Disease (HIV, Hepatitis B panel, HCV, Syphilis, EBV, CMV, Toxoplasma)
  *   Hormones (Cortisol, Prolactin, Testosterone, Estradiol, Progesterone, LH, FSH, DHEA-S)
  *   Drug Level Monitoring (Digoxin, Phenytoin, Carbamazepine, Valproic acid, Lithium, Gentamicin, Vancomycin, Theophylline)
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
*   **Next Steps:** Recommendations for investigation and management
*   **Robustness:** System with educational fallbacks and consistent error handling.

#### Features
*   **Exclusive Animations:** Loading states with pulsating Dr. Corvus logo
*   **Expandable Accordion:** Intuitive content organization
*   **Smart Copy:** Complete reports with structured formatting
*   **Auto-Scroll:** Smooth navigation between sections
*   **Contextual Disclaimers:** Important clinical usage warnings

### Clinical Academy

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
4. **Unified Synthesis with BAML:** Research results and CiteSource analysis are consolidated and presented intelligently.

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
*   **Streaming Interface:** Vercel AI SDK 5 for smooth, tool-based conversations.
*   **Advanced Agentic Architecture:** The chat is powered by a backend-driven, multi-agent system using Langroid. This allows for complex, stateful reasoning and orchestration of multiple tools.
*   **Unified Agent Endpoint:** A single `/api/agents/chat` endpoint handles all clinical and research queries, routing them to the appropriate Langroid agent.
*   **Comprehensive Toolset:** The agent has access to a full suite of clinical and research tools, including differential diagnosis, PICO question formulation, evidence synthesis, and more, all powered by BAML.
*   **Message Persistence & Caching:** All conversations are saved to the database, and a Redis-based caching layer improves performance for repeated queries.
*   **Advanced Security:** Rigorous de-identification of sensitive data.
*   **Intelligent Context:** MCP Server for generating relevant context.
*   **Fallback Strategy:** OpenRouter → Gemini for maximum availability.
*   **Structured Logging:** Active Learning pipeline for continuous improvement.

### MVP Agents Integration

The platform now features advanced AI agents that provide specialized clinical assistance through intelligent chat interfaces:

#### ClinicalDiscussionAgent
*   **Purpose:** Specialized in clinical case analysis and discussion
*   **Capabilities:**
    - **Case Analysis:** Automatic case type detection and urgency assessment
    - **Differential Diagnosis:** Structured diagnostic reasoning with red flags
    - **Management Plans:** Evidence-based treatment recommendations
    - **Patient-Specific Context:** Incorporates patient history and medications
    - **Follow-up Support:** Continue discussions with additional questions
*   **Trigger Keywords:** "discuss", "case", "patient", "symptoms", "diagnosis", "differential"

#### ClinicalResearchAgent
*   **Purpose:** Evidence-based medicine research and literature analysis
*   **Capabilities:**
    - **Literature Search:** PubMed, Europe PMC, Lens.org integration
    - **Evidence Synthesis:** Quality assessment and clinical implications
    - **Research Metrics:** Study counts, impact factors, publication dates
    - **Citation Management:** Proper referencing with DOIs and PMIDs
    - **Clinical Correlations:** Links research findings to patient context
*   **Trigger Keywords:** "research", "evidence", "study", "literature", "pubmed", "guidelines"

#### Agent Integration Features
*   **Intelligent Routing:** Automatic agent selection based on message content analysis
*   **Patient Context Awareness:** Automatic inclusion of patient data when available
*   **Multi-Agent Switching:** Manual override for specific agent selection
*   **Health Monitoring:** Real-time agent availability and status checking
*   **Enhanced Chat Interface:** Agent-specific UI indicators and response formatting
*   **Conversation History:** Persistent clinical discussion tracking and retrieval

#### How to Use MVP Agents

##### In General Chat (`/chat`)
1. **Enable MVP Agents:** Toggle the switch in the sidebar
2. **Select Patient Context:** Choose a patient for context-aware responses
3. **Start Chatting:** Messages are automatically routed to appropriate agents
4. **Agent Detection:**
   - *"Discuss this patient case"* → ClinicalDiscussionAgent
   - *"What does the literature say about..."* → ClinicalResearchAgent

##### In Patient-Specific Chat (`/patients/[id]/chat`)
1. **Automatic Setup:** Patient context is automatically included
2. **Enable Agents:** Toggle MVP agents for enhanced responses
3. **Clinical Discussions:** Get case analysis, differential diagnoses, management plans
4. **Evidence-Based Answers:** Ask research questions with literature citations

#### MVP Agent API Endpoints
Canonical path (recommended):
```
POST /api/agents/clinical-discussion      - Clinical case analysis
POST /api/agents/clinical-query           - Research and evidence queries
POST /api/agents/follow-up-discussion     - Continue clinical discussions
GET  /api/agents/conversation-history     - Retrieve discussion history
GET  /api/agents/health                   - Agent health monitoring
```
Legacy-compatible path (still available):
```
POST /api/mvp-agents/clinical-discussion
POST /api/mvp-agents/clinical-query
POST /api/mvp-agents/follow-up-discussion
POST /api/mvp-agents/conversation-history
GET  /api/mvp-agents/health
```

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
|      Frontend       | ---->|     Backend API     | ---->|      Database      |        Clerk        |
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
                                       | Data)              | - AL Logging         |
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

## Quick Start

### System Requirements
- **OS**: Linux, macOS, or Windows (with WSL2)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **Node.js**: v18 or higher
- **Python**: v3.10 or higher
- **Docker**: Latest stable version
- **Docker Compose**: Latest stable version

### Performance Expectations
- **Initial Setup**: 10-15 minutes
- **Cold Start**: 2-3 minutes
- **API Response Time**: <500ms for most operations
- **Memory Usage**: ~2-4GB during normal operation

### Prerequisites Checklist
- ✅ Node.js (v18+)
- ✅ Python (v3.10+)
- ✅ Docker and Docker Compose
- ✅ Clerk account (for authentication)
- ✅ API Keys for external services (LLMs like OpenRouter/Gemini, bibliometric APIs like PubMed, Altmetric, iCite, Web of Science, Lens.org, Semantic Scholar, Brave Search)

**Note**: API keys should be configured as environment variables in `.env` files. See each service's documentation for key acquisition.

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

3. **Start Services:**
    ```bash
    # Development
    docker-compose -f docker-compose.dev.yml up -d --build

    # Production
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

4. **Run Migrations:**
    ```bash
    docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
    ```

### Contributions
Contributions are welcome! Please follow the style guide and commit standards.

## Additional Documentation
- **`code-overview.md`:** Detailed overview of code structure, key components, and interactions.
- **`docs/MVP_AGENTS_TESTING_PLAN.md`**: Comprehensive testing plan for the MVP agents.
- **`docs/TESTING_RESULTS.md`**: Detailed results of the MVP agent testing.
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
*   **Group Collaboration:** Team-based patient management system
*   **MVP Multi-Agent System**: Langroid-based agents for clinical discussion and research.
*   **Comprehensive Testing**: Full testing suite for MVP agents, including unit, integration, e2e, and clinical validation.

### In Development

*   **Knowledge Graph:** Neo4j implementation with **hybrid GraphRAG architecture (KG + BM25/Vector)**
*   **Specialized Models:** Clinical RoBERTa for KG building/updating and reranking, Mistral for query reformulation, other SOTA LLMs for core reasoning
*   **Active Learning:** Continuous improvement pipeline
*   **Advanced Testing:** Expanded E2E coverage
*   **MVP Agents Enhancement:** Advanced agent capabilities and multi-agent collaboration
*   **Performance Optimization:** Response time improvements and caching strategies

### Future Enhancements
 
We plan to implement the following advanced features to enhance the Clinical Corvus analysis system:
- **Cross-analyzer correlations:** Develop logic to identify and interpret patterns across results from different analyzer modules.
- **Evidence-based guideline references:** Integrate dynamic fetching and linking of comprehensive evidence-based guidelines.
- **Enhanced critical value detection with multi-parameter alerts:** Implement a centralized system for multi-parameter alerts based on combined critical values from various analyzers.
- **Performance optimization for large datasets:** Optimize the analysis pipeline for efficient processing of large volumes of data.

### Next Steps (Immediate)

1. **Production Deployment**: Final checks and deployment of the MVP agent system.
2. **Performance Monitoring**: Real-world performance monitoring and optimization.
3. **Features:** Smart alerts, wearables, advanced medications
4. **Quality:** AI security tests, LGPD/HIPAA, Golden Dataset
5. **UX:** Full i18n, offline mode, mobile optimization

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
npm run test
npm run test:e2e
```

---

**Clinical Corvus** represents the future of clinical assistance, combining cutting-edge technology with evidence-based medical practices, always prioritizing safety, privacy, and quality of patient care.

## License

This project is licensed under the MIT License with the [Commons Clause](https://commonsclause.com/).

- **Open for collaboration:** You may use, modify, and contribute to this codebase for non-commercial purposes.
- **Commercial use is restricted:** You may not sell, host, or offer the software as a service for a fee without explicit written permission from the copyright holder.
- **Purpose:** This model protects the project's commercial value while encouraging open collaboration and transparency.

See the [LICENSE](./LICENSE) file for the full legal text and details.
-
### Agent-Orchestrated Autonomous Research
- Frontend (EBM → DeepResearch):
  - Pesquisa Rápida: `/api/research-assistant/quick-search-translated` → backend simple service (PT output)
  - Análise Autônoma: `/api/research-assistant/autonomous-translated` → backend agent-orchestrated route (PT output)
- Backend routes:
  - `POST /api/research/agent-research/autonomous` (untranslated)
  - `POST /api/research/agent-research/autonomous-translated` (Portuguese output)
- Orchestration:
  - ClinicalResearchAgent enriches the query (PICO, filters, context) and leverages the SimpleAutonomousResearchService for deeper search; output is translated server-side for PT endpoints.
- Note: Legacy `autonomous_research_service.py` removed; autonomous orchestration now flows through the agent + simple service.

## Research Streaming & Traces

- Research Streaming (SSE):
  - Backend: POST /api/research/quick-search-stream (streams JSON events: start, plan, strategy_start/end, citesource_start/done, synthesis_start/done, final_result)
  - Frontend proxy: POST /api/research-assistant/quick-search-stream
- Research Traces:
  - Backend: GET /api/research/traces (list), GET /api/research/traces/{name} (fetch JSON)
  - Frontend proxies: /api/research-assistant/traces, /api/research-assistant/traces/[name]
  - UI: /academy/research/traces viewer (collapsible tree)
- Research Trees:
  - Lightweight, schema-1.0 �research tree� exported within research traces: root ? plan ? search executions ? dedup/quality ? synthesis (claims + grounding summary).
  - Enabled when ENABLE_RESEARCH_TRACE=1.

## Strategy Overrides & Presets (UI)
- Advanced panel in Deep Research component accepts strategy_override (JSON array) and model_preset (ast|balanced|deep).
- Template presets (Minimal, Expansive, Intensive, Guidelines-First, RCT-Only, Rapid-Narrative) can be loaded into the JSON editor.

## Benchmark Harness
- scripts/benchmarks/run_benchmarks.py � run prompts against backend and collect raw outputs
- scripts/benchmarks/evaluate_kae.py � computes Knowledge Support/Contradiction/Omission Rates (KSR/KCR/KOR) + Markdown table
- scripts/benchmarks/evaluate_ace.py � Arena-style checklist (structure, coherence, completeness, citations, clinical) + Markdown table
