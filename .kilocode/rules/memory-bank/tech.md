# Clinical Corvus - Technology Stack & Development Setup

## Core Technologies

### Frontend Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 3.x with custom design system
- **UI Components**: Shadcn/UI (Radix UI + Tailwind)
- **State Management**: React hooks, Zustand for complex state
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form + Zod validation
- **Editor**: TipTap for rich text clinical notes
- **Notifications**: Sonner for toast notifications
- **Authentication**: Clerk for user management
- **HTTP Client**: Axios for API calls
- **Testing**: Jest + React Testing Library

### Backend Stack
- **Framework**: FastAPI 0.115.x with Python 3.10+
- **ORM**: SQLAlchemy 2.x with async support
- **Database**: PostgreSQL 15+ with JSONB support
- **Validation**: Pydantic 2.x for data models
- **Authentication**: Clerk JWT validation
- **AI Integration**: BAML for structured AI workflows
- **File Processing**: PyPDF2, Pillow for document analysis
- **API Documentation**: FastAPI auto-generated OpenAPI
- **Testing**: Pytest with async support
- **Migrations**: Alembic for database schema management

### AI/ML Technologies
- **BAML**: Boundary AI Markup Language for structured AI
- **Knowledge Graph**: Neo4j for clinical knowledge representation
- **Vector Search**: FAISS/ChromaDB for semantic search
- **LLM Integration**: OpenRouter with fallback to Gemini
- **Medical Models**: Clinical RoBERTa for medical NLP
- **RAG Pipeline**: Hybrid BM25 + vector search with reranking
- **Active Learning**: Continuous improvement pipeline

### Infrastructure & DevOps
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Environment Management**: dotenv for configuration
- **Monitoring**: Structured logging with Python logging
- **Health Checks**: FastAPI health endpoints
- **CI/CD**: GitHub Actions (planned)

## Development Environment Setup

### Prerequisites
- **Node.js**: v18+ (LTS recommended)
- **Python**: v3.10+ with pip
- **Docker**: Latest stable version
- **PostgreSQL**: 15+ (or use Docker)
- **Git**: For version control

### Environment Variables
Create these files in project root:

#### `.env` (Root)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clinical_corvus

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# AI Services
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
DEEPL_API_KEY=your_deepl_key

# External APIs
PUBMED_API_KEY=your_pubmed_key
EUROPE_PMC_API_KEY=your_europe_pmc_key
LENS_API_KEY=your_lens_key
ALTMETRIC_API_KEY=your_altmetric_key
ICITE_API_KEY=your_icite_key
```

#### `frontend/.env.local`
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

#### `backend-api/.env`
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/clinical_corvus
CLERK_SECRET_KEY=your_clerk_secret_key
OPENROUTER_API_KEY=your_openrouter_key
# ... other backend-specific variables
```

#### `mcp_server/.env`
```bash
MCP_PORT=8001
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

### Installation Steps

#### 1. Clone Repository
```bash
git clone [repository-url]
cd clinical-helper
```

#### 2. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend-api
pip install -r requirements.txt

# MCP Server
cd ../mcp_server
pip install -r requirements.txt
```

#### 3. Generate BAML Client
```bash
# From project root
baml-cli generate
```

#### 4. Database Setup
```bash
# Using Docker (recommended)
docker-compose -f docker-compose.dev.yml up -d postgres

# Manual setup
createdb clinical_corvus
alembic upgrade head
```

#### 5. Start Development Services
```bash
# Using Docker Compose (all services)
docker-compose -f docker-compose.dev.yml up -d --build

# Manual startup
# Terminal 1: Backend
cd backend-api && uvicorn main:app --reload --port 8000

# Terminal 2: MCP Server
cd mcp_server && uvicorn main:app --reload --port 8001

# Terminal 3: Frontend
cd frontend && npm run dev
```

## Development Workflow

### Code Organization
```
clinical-helper/
├── frontend/           # Next.js frontend
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/ # Reusable components
│   │   ├── lib/       # Utilities and helpers
│   │   └── types/     # TypeScript definitions
├── backend-api/        # FastAPI backend
│   ├── routers/       # API endpoints
│   ├── models/        # Database models
│   ├── schemas/       # Pydantic schemas
│   └── services/      # Business logic
├── mcp_server/        # MCP context server
│   ├── services/      # MCP tools and services
│   └── main.py        # FastAPI application
├── baml_src/          # BAML AI definitions
└── baml_client/       # Generated BAML client
```

### Key Development Commands

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run ESLint
```

#### Backend
```bash
uvicorn main:app --reload    # Start development server
pytest                      # Run tests
alembic revision --autogenerate -m "message"  # Create migration
alembic upgrade head        # Apply migrations
```

#### MCP Server
```bash
uvicorn main:app --reload --port 8001
```

## Testing Strategy

### Frontend Testing
- **Unit Tests**: React Testing Library for components
- **Integration Tests**: API route testing
- **E2E Tests**: Playwright for critical user flows

### Backend Testing
- **Unit Tests**: Pytest for individual functions
- **Integration Tests**: API endpoint testing
- **Database Tests**: Test database with fixtures

### Test Data
- **Mock Data**: Realistic patient scenarios
- **Test Database**: Separate test database
- **Fixtures**: Reusable test data generators

## Performance Considerations

### Frontend
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Webpack bundle analyzer
- **Caching**: SWR for data fetching

### Backend
- **Database Indexing**: Optimized for clinical queries
- **Connection Pooling**: SQLAlchemy connection pooling
- **Async Operations**: Full async support
- **Caching**: Redis for session management (planned)

### AI Services
- **Rate Limiting**: Respect API limits
- **Caching**: Cache research results
- **Batch Processing**: Process multiple items efficiently
- **Fallbacks**: Graceful degradation when services fail