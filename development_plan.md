# Clinical Corvus Development Plan

## Notes
- **Vision Evolution**: Transition from clinical assistant to autonomous medical AI agent
- **Core Architecture**: Multi-agent system with Langroid framework, Neo4j knowledge graphs, and specialized medical models for different tasks (e.g. clinical reasoning, KG building, contradiction resolution, etc.)
- **Autonomous Features**: Real-time knowledge discovery, social media monitoring, continuous learning
- **Advanced GraphRAG**: Hybrid GraphRAG (KG + BM25/Vector) as the source of truth. Only curated knowledge populates the KG; non-curated knowledge remains exclusively in BM25/Vector store
- **Compliance**: LGPD/HIPAA with healthcare interoperability (HL7/FHIR)
- **Specialized Models**: Clinical RoBERTa for KG building/updating and reranking retrieved information. Mistral 7B (GenQREnsemble) for query reformulation. Other SotA LLMs (Gemini, MedLlama, DeepSeek R1) for core medical reasoning and dialogue
- **Evaluation Framework**: Comprehensive metrics for medical reasoning accuracy

### Missing Core Components:
1. **Social Media & Autonomous Knowledge Discovery**
2. **Advanced GraphRAG architecture** (KG + BM25/Vector hybrid) - *Partial progress: Design and some initial setup completed.*
3. **Specialized Model Integration** (Clinical RoBERTa, Mistral, SOTA LLMs) - *Partial progress: Design completed, some models integrated for specific tasks.*
4. **KG Contradiction Handling & Evidence Scoring**
5. **Comprehensive Evaluation Framework**
6. **LGPD Compliance & Healthcare Interoperability** - *Partial progress: Data governance and security middleware implemented.*
7. **Production Deployment & Scaling Architecture** - *Partial progress: MVP deployment configuration and basic observability implemented.*

## Updated Task List

### Phase 1: Foundation & Migration
- [x] Finalize Lab Analysis, Deep Research and Clinical Academy features
- [x] Ensure proper extraction of information from sources with LLamaParser
- [x] Ensure integration with international and reputable sources (e.g., PubMed, Google Scholar, etc.)
- [x] Implement doctor dashboard for patient management with context for AI
  - [x] Main page with patient list and easy access to lab analysis, chat with patient context, add new patients
  - [x] Patient page with general overview and multiple tabs that contain different info about patient (clinical notes, clinical scores, lab results, charts, etc.)
  - [x] Users can create groups and add other users to the group; these groups can have multiple doctors that manage multiple patients
  - [x] Write and debug tests
  - [x] Patient Overview enhancements: CTA to Chat, Quick Clinical Insights widget (discussion agent), and Research Update widget (research agent) using patient context
  - [x] Strict client-side admin gating for groups using `/api/me`; role badges and admin-only actions (invite/assign)
  - [x] Settings & Preferences: Notifications toggles, Language and Timezone selectors persisted to DB via `/api/user/preferences`
- [x] Implement robust translation system with DeepL primary + BAML fallback
- [x] Extend laboratorial analysis tool to support different files formats (PNG, JPG) and source laboratory
 - [x] Write and debug tests
- [ ] Implement LGPD compliance framework and data governance (e.g. data encryption, data anonymization, data retention policy, etc.) - *Initial security middleware implemented.*
- [ ] Set up Clinical RoBERTa for KG building/updating and reranking retrieved information
- [ ] Implement hybrid GraphRAG architecture (KG + BM25/Vector)
- [ ] Implement basic KG population from curated knowledge sources (e.g. Medical Literature, Medical Guidelines, etc.)
- [ ] Configure BM25/Vector store for non-curated knowledge sources
- [x] Design Langroid implementation - *Completed as part of MVP Multi-Agent Implementation.*
- [ ] Design Ritual integration architecture

### Phase 2: Advanced AI Architecture
- [x] Implement Langroid multi-agent framework and internal Agent Collaboration - *MVP Multi-Agent system with ClinicalResearchAgent and ClinicalDiscussionAgent completed.*
  - [x] Research Agent: Use multiple tools and researching methods to find best up to date evidences - *Implemented with SimpleAutonomousResearchService integration.*
  - [x] Clinical Reasoning and Synthesis Agent: Integrates information using proper clinical thinking using core LLMs to form responses - *Implemented as part of ClinicalDiscussionAgent and academy tools.*
  - [ ] Data Retrieval Agent (GraphRAG): Executes hybrid searches (KG + BM25/Vector)
  - [ ] Knowledge Verification Agent: Assesses credibility of new information against the KG and other sources
  - [ ] Monitoring Agent: Scans external feeds for relevant updates
- [ ] Implement Neo4j knowledge graph with advanced schema (e.g. CONTRADICTS, PRECEDES, FOLLOWS, etc.) and populate with pre-curated sources
  - [ ] Deploy and configure Clinical RoBERTa for extracting relations and terms
- [ ] Implement Mistral 7B for query reformulation (GenQREnsemble)
- [ ] Deploy specialized models (MedLlama, DeepSeek R1, etc) with A/B testing
- [ ] Design social media monitoring infrastructure
- [ ] Create autonomous knowledge discovery pipeline
- [ ] Implement knowledge curation workflow for determining KG vs BM25/Vector storage

### Phase 3: Autonomous Agent Features
- [ ] Implement autonomous research agent with hybrid GraphRAG
- [ ] Create real-time knowledge ingestion from medical literature
- [ ] Deploy social media monitoring for medical trends
- [ ] Implement evidence scoring and contradiction resolution
- [ ] Create human reviewer workflow for knowledge verification
- [ ] Implement active learning pipeline with feedback loops
- [ ] Develop automated knowledge curation pipeline for new discoveries

### Phase 4: Evaluation & Monitoring
- [ ] Deploy comprehensive evaluation framework
- [ ] Implement position-independence testing
- [ ] Create reasoning coherence monitoring
- [ ] Set up performance logging and alerting - *Basic observability and metrics collection implemented for MVP agents.*
- [ ] Implement audit trails for all AI decisions - *Initial security middleware includes some auditing.*
- [ ] Create healthcare interoperability testing
- [ ] Evaluate KG vs Vector store performance and accuracy

### Phase 5: Production & Scale
- [ ] Implement production deployment architecture - *MVP deployment configuration completed.*
- [ ] Create REST API layer for KG integration
- [ ] Deploy caching and load balancing - *Caching integrated for MVP agents.*
- [ ] Implement batch synchronization strategies
- [ ] Create monitoring dashboard for system health - *Basic metrics available via API.*
- [ ] Deploy Ritual decentralized AI integration
- [ ] Optimize hybrid GraphRAG query performance

## Detailed Implementation Tasks

### Social Media & Autonomous Knowledge Discovery
- [ ] **Design social media monitoring system**
  - Twitter API integration for medical trends
  - Medical forum monitoring (Reddit r/medicine, etc.)
  - RSS feed aggregation for medical journals
  - Automated content filtering and relevance scoring
- [ ] **Implement knowledge ingestion pipeline**
  - Real-time content processing
  - Automated fact-checking against vetted sources
  - Confidence scoring for new information
  - Human review workflow integration
  - Curation decision engine (KG vs BM25/Vector)

### Hybrid GraphRAG Architecture
- [ ] **KG Implementation**
  - Neo4j deployment with medical schema
  - Curated knowledge ingestion pipeline
  - Evidence level metadata and confidence scoring
  - Temporal relationship tracking
- [ ] **BM25/Vector Store**
  - Elasticsearch/OpenSearch deployment
  - Non-curated knowledge indexing
  - Hybrid query orchestration
  - Performance optimization
- [ ] **Query Router**
  - Intelligent routing between KG and Vector store
  - Confidence-based source selection
  - Result aggregation and ranking

### Specialized Model Integration
- [ ] **State-of-the-art LLMs** (Gemini, Qwen, DeepSeek): for complex medical reasoning, understanding context, generating explanations, and engaging in nuanced dialogue
  - A/B testing framework
 - Performance comparison metrics
  - Clinical accuracy evaluation
- [ ] **Clinical RoBERTa Setup**: Extracts key medical entities & relationships from text (for KG building/updating) and reranks retrieved information for relevance
  - Entity extraction pipeline
  - Relationship identification
  - Medical terminology processing
  - KG population automation
- [ ] **Mistral 7B Integration**: Reformulates user queries into precise medical searches to enhance retrieval accuracy
  - Query reformulation (GenQREnsemble)
  - Search optimization
  - Context enhancement

### Knowledge Graph Enhancements
- [ ] **Advanced Schema Design**
  - CONTRADICTS relationship type
  - Evidence level metadata
  - Temporal relationships (PRECEDES, FOLLOWS)
  - Confidence scoring system
  - Curation status tracking
- [ ] **Contradiction Handling**
  - Automated detection algorithms
  - Human review workflows
  - Resolution strategies
- [ ] **Evidence Scoring**
  - Source reliability metrics
  - Study quality assessment
  - Confidence propagation

### Evaluation Framework
- [ ] **Information Retrieval Accuracy**
  - Clinical narrative testing
  - Position-independent retrieval
  - Source verification metrics
  - KG vs Vector store performance comparison
- [ ] **Reasoning Coherence**
  - Patient history consistency
  - Diagnostic conclusion validation
  - Contradiction detection
- [ ] **Performance Monitoring**
  - API latency tracking
  - Model inference timing
  - Error rate monitoring
  - Resource utilization metrics
- [ ] **Healthcare Interoperability**
  - HL7 FHIR integration
  - Electronic health record connectivity
  - Standardized data formats
  - Clinical document architecture

### Production Architecture
- [ ] **REST API Layer**
  - KG query endpoints
  - Agent action APIs
  - Monitoring interfaces
- [ ] **Caching Strategy**
  - Query result caching
  - Model response caching
  - Knowledge graph caching
- [ ] **Load Balancing**
  - Multi-instance deployment
  - Request distribution
  - Failover mechanisms
- [ ] **Monitoring Dashboard**
  - System health metrics
  - Performance analytics
  - Error tracking
  - Usage analytics

## Current Goal
Continue with Phase 1 foundation, focusing on LGPD compliance, specialized model integration, and hybrid GraphRAG architecture as immediate priorities, building upon the completed MVP Multi-Agent system.

## Risk Mitigation
- **Model Performance**: Implement gradual rollout with A/B testing
- **Data Privacy**: Regular compliance audits and penetration testing
- **System Reliability**: Comprehensive monitoring and alerting
- **User Experience**: Extensive testing with medical professionals
- **Regulatory Compliance**: Regular updates to meet changing requirements
- **Knowledge Quality**: Human-in-the-loop curation workflow for KG population

## Recently Completed Features

### Group Collaboration System
- [x] **Database Models Implementation**
  - Created Group, GroupMembership, GroupPatient, and GroupInvitation models
  - Implemented proper relationships and constraints
  - Added audit fields and indexing for performance
- [x] **Backend API Development**
  - Implemented CRUD operations for groups
  - Created member management endpoints (add/remove/change roles)
  - Developed patient assignment functionality
  - Built invitation system with email tokens
- [x] **Frontend UI Components**
  - Created GroupList, GroupCard, and GroupForm components
  - Implemented MemberList and MemberInviteForm
  - Developed PatientAssignmentList and search functionality
  - Built invitation management UI
- [x] **Dashboard Integration**
  - Added group navigation to main dashboard
  - Created group detail pages with tabs
  - Integrated group context into patient views
  - Added group filtering to patient lists
- [x] **Security Implementation**
  - Implemented role-based access control (admin/member)
  - Added permission checking utilities
  - Created authentication middleware for groups
  - Implemented audit logging for group activities
- [x] **Testing Suite**
  - Created comprehensive unit tests for all components
  - Implemented integration tests for workflows
  - Added security tests for access controls
  - Built end-to-end tests for user journeys

### MVP Multi-Agent System
- [x] **Implement Enhanced ClinicalResearchAgent with existing service integration**
- [x] **Create PatientContextManager integration layer**
- [x] **Implement ClinicalDiscussionAgent for case discussions**
- [x] **Create MVP API endpoints (/api/mvp-agents/*)**
- [x] **Build frontend ClinicalAssistant components**
- [x] **Add comprehensive error handling and security integration**
- [x] **Implement basic observability and metrics collection**
- [x] **Create deployment configuration and health checks**
### Doctor Dashboard Enhancements
- [x] Added “Perguntar ao Dr. Corvus sobre este paciente” CTA on Patient Overview
- [x] Added compact Clinical Insights and Research Update widgets with patient context
- [x] Implemented `/api/mvp-agents/clinical-research` proxy route
- [x] Implemented `/api/me` proxy to match Clerk user to DB user_id
- [x] Restored strict client-side gating for admin-only group actions and added role badges
- [x] Implemented DB-backed user preferences with Alembic revision `3e1b2c7f5a10_add_user_preferences_table`
- [x] Added Notifications, Language, and Timezone controls in Settings
