# Clinical Corvus - System Architecture

## High-Level Architecture Overview

Clinical Corvus follows a microservices architecture with clear separation of concerns:

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

## Core Components

### 1. Frontend (Next.js App Router)
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with Shadcn/UI components
- **State Management**: React hooks and context
- **Charts**: Recharts for data visualization
- **Editor**: TipTap for rich text clinical notes
- **Notifications**: Sonner for toast notifications
- **Authentication**: Clerk client integration

### 2. Backend API (FastAPI)
- **Framework**: FastAPI with Python 3.10+
- **ORM**: SQLAlchemy with PostgreSQL
- **Validation**: Pydantic models
- **Authentication**: JWT tokens via Clerk
- **AI Integration**: BAML client for clinical reasoning
- **File Processing**: PDF/image analysis for exam uploads
- **Research Services**: PubMed, Europe PMC, Lens.org integration

### 3. MCP Server (FastAPI)
- **Purpose**: Context generation and knowledge management
- **Knowledge Graph**: Neo4j with hybrid GraphRAG architecture
- **RAG Pipeline**: BM25 + Vector search with reranking
- **CiteSource**: Research quality analysis and deduplication
- **Active Learning**: Continuous improvement pipeline

### 4. Database (PostgreSQL)
- **Schema**: Normalized relational design
- **Models**: Patients, exams, lab results, medications, notes
- **Relationships**: One-to-many and many-to-many associations
- **Indexes**: Optimized for clinical queries

## Key Design Patterns

### API Routing Pattern
- **Backend**: All endpoints under `/api/*` prefix
- **Frontend**: Proxy routes that forward to backend
- **Consistency**: Centralized routing in `main.py`

### Translation Architecture
- **Backend-Centric**: All translation handled in FastAPI
- **DeepL Primary**: High-quality Portuguese translation
- **BAML Fallback**: Ensures reliability
- **No Frontend Translation**: Clean separation of concerns

### Security Architecture
- **Authentication**: Clerk for user management
- **Authorization**: Role-based access (doctor/patient)
- **Data Privacy**: HIPAA/LGPD compliant
- **De-identification**: All AI processing uses anonymized data

### AI Integration Pattern
- **BAML Functions**: Structured AI workflows
- **Context Generation**: MCP server provides relevant context
- **Fallback Strategy**: OpenRouter → Gemini for availability
- **Active Learning**: Continuous model improvement

## Data Flow Architecture

### Patient Data Flow
1. **Input**: Manual entry or PDF upload
2. **Processing**: Clinical analyzers and AI extraction
3. **Storage**: PostgreSQL with normalized schema
4. **Analysis**: BAML functions for insights
5. **Visualization**: Interactive charts and reports

### Research Flow
1. **Query**: User enters clinical question
2. **Translation**: Portuguese → English (if needed)
3. **Search**: Multi-source research (PubMed, Europe PMC, etc.)
4. **Analysis**: CiteSource for quality assessment
5. **Synthesis**: BAML-powered summary generation

## Technology Stack

### Frontend Technologies
- **Next.js 14+**: App Router, Server Components
- **TypeScript**: Type safety and developer experience
- **TailwindCSS**: Utility-first styling
- **Shadcn/UI**: Accessible component library
- **Recharts**: Data visualization
- **Clerk**: Authentication and user management
- **TipTap**: Rich text editor for clinical notes

### Backend Technologies
- **FastAPI**: High-performance Python API framework
- **SQLAlchemy**: Python SQL toolkit and ORM
- **PostgreSQL**: Primary database
- **BAML**: AI function orchestration
- **Pydantic**: Data validation
- **Alembic**: Database migrations

### AI/ML Technologies
- **BAML**: Boundary AI Markup Language for structured AI
- **Langroid**: Next-generation AI framework (migration in progress)
- **Clinical RoBERTa**: Specialized medical language model
- **Mistral**: Query reformulation and reasoning
- **Neo4j**: Knowledge graph database
- **Vector Databases**: For semantic search

### External Services
- **Clerk**: Authentication and user management
- **DeepL**: High-quality translation
- **PubMed**: Medical literature database
- **Europe PMC**: European medical literature
- **Lens.org**: Global research database
- **Brave Search**: Web search API
- **OpenRouter**: LLM API aggregation

## Deployment Architecture

### Development Environment
- **Docker Compose**: Container orchestration
- **Hot Reload**: Fast development feedback
- **Local Database**: PostgreSQL in Docker
- **Local MCP**: Full AI capabilities locally

### Production Environment
- **Docker**: Containerized deployment
- **Cloud Hosting**: Scalable infrastructure
- **Database**: Managed PostgreSQL
- **CDN**: Static asset delivery
- **Monitoring**: Health checks and logging