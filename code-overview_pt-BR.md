# Clinical Helper - Code Overview and Project Structure

## Project Overview

Clinical Helper é uma plataforma de saúde digital com uma dupla finalidade: servir como um **gerenciador de pacientes e assistente clínico para profissionais médicos** (com foco inicial em UTI e análise laboratorial, utilizando a IA Dr. Corvus) e como um **gerenciador e educador em saúde para pacientes**. Nossa visão é que o Dr. Corvus atue como um **"Co-piloto Clínico"**, otimizando o fluxo de trabalho médico de forma similar a ferramentas como Cursor ou Windsurf, ao mesmo tempo que empodera pacientes com acesso a informações e acompanhamento personalizado. **A segurança dos dados, a privacidade (conformidade com LGPD/HIPAA) e a confiabilidade clínica são pilares fundamentais do projeto.**

**Estado Atual:** A plataforma é funcional com recursos de gestão de pacientes, chat com IA contextual, visualizações de dados clínicos, e notas clínicas com editor de rich text. A página de Análise (`/analysis`) foi modernizada com uma interface redesenhada, tradução completa para português, sistema avançado de Dr. Corvus Insights, loading states elegantes e error handling robusto. A seção "Academia Clínica" (`/academy`) para treinamento em raciocínio clínico está com suas APIs educacionais 100% traduzidas para português. O sistema de pesquisa científica foi expandido com novas fontes e um poderoso sistema de análise de qualidade (CiteSource). A arquitetura técnica foi otimizada com um novo sistema de gerenciamento de dependências Python, resultando em builds Docker mais rápidos e eficientes. A plataforma passou por uma unificação completa da arquitetura de APIs bibliométricas, resultando em melhorias significativas de performance e redução da complexidade do código. Estamos em processo de migração de frameworks internos para a IA (ElizaOS > Langroid, LlamaParse > Marker) e avançando na implementação do core da IA (KG, AL).

## Arquitetura Atual
O projeto está organizado em três serviços principais, gerenciados via Docker Compose, com interações com serviços externos e banco de dados:

```
clinical-helper/
│
├── backend-api/          # Backend FastAPI
│   ├── alembic/          # Migrations DB
│   ├── analyzers/        # Módulos de análise de exames laboratoriais
│   ├── clients/          # Clientes HTTP (MCPClient, LLMClient com fallback, BAML Client Wrapper, Brave Search Client)
│   ├── crud/             # Operações CRUD DB
│   ├── database/         # Config DB, Modelos SQLAlchemy (com Encryption at Rest via Cloud Provider)
│   ├── routers/          # Endpoints API (pacientes, chat, notas, /clinical-assistant para BAML, /deep-research para pesquisa científica)
│   ├── schemas/          # Schemas Pydantic
│   ├── security/         # Lógica Auth (Clerk), Desidentificação, Políticas de Acesso
│   ├── services/         # Lógica de Negócios (incluindo enhanced_metrics_service.py, enhanced_pubmed_service.py, lens_scholar_service.py, PDF Service, Simple Autonomous Research Service)
│   ├── tests/            # Testes Backend (incluindo test_enhanced_apis_integration.py)
│   ├── utils/            # Utilitários (reference_ranges, _safe_convert_to_float)
│   ├── .env.example      # Variáveis de ambiente do Backend
│   ├── main.py           # Ponto de entrada da API
│   └── requirements*.txt # Dependências Python
│
├── frontend/             # Frontend Next.js (App Router)
│   ├── public/           # Arquivos estáticos
│   ├── src/
│   │   ├── app/          # Rotas App Router
│   │   │   ├── analysis/ # Página de Análise de Exames (Upload PDF/Entrada Manual) - MODERNIZADA
│   │   │   │   └── page.tsx # Interface completamente redesenhada com UI moderna
│   │   │   ├── academy/  # Nova seção de Academia Clínica
│   │   │   │   ├── page.tsx
│   │   │   │   ├── evidence-based-medicine/page.tsx # Sistema de Pesquisa Científica Avançado
│   │   │   │   ├── metacognition-diagnostic-errors/page.tsx
│   │   │   │   └── expand-differential/page.tsx
│   │   │   └── ... (outras rotas)
│   │   ├── components/   # Componentes React (UI, Features, Charts, Chat, Editor, Research)
│   │   │   └── research/ # Componentes específicos para pesquisa científica
│   │   │       ├── DeepResearchComponent.tsx
│   │   │       ├── PDFAnalysisComponent.tsx
│   │   │       ├── EvidenceAppraisalComponent.tsx
│   │   │       └── UnifiedEvidenceAnalysisComponent.tsx
│   │   ├── config/       # Configurações (ex: getAPIUrl)
│   │   ├── context/      # Contexto React
│   │   ├── hooks/        # Hooks customizados
│   │   ├── lib/          # Utilitários gerais (cn, shadcn)
│   │   ├── services/     # Funções para chamar Backend API (com token)
│   │   ├── store/        # Estado global (Zustand)
│   │   ├── types/        # Definições TypeScript (incluindo academy.ts, health.ts, analysis.ts, research.ts)
│   │   ├── clerk.d.ts    # Augmentação de tipos Clerk (metadata)
│   │   └── middleware.ts # Clerk Middleware (proteção de rotas, força choose-role)
│   ├── .env.example      # Variáveis de ambiente do Frontend
│   ├── next.config.mjs   # Configuração Next.js
│   ├── tests/            # Testes frontend (tests dir - Jest, Playwright)
│   └── package.json      # Dependências e scripts frontend
│
├── mcp_server/           # Servidor de Contexto MCP (FastAPI) - RAG & CiteSource Engine
│   ├── Dockerfile        # Dockerfile para desenvolvimento
│   ├── Dockerfile.prod   # Dockerfile otimizado para produção
│   ├── mcp_server.py     # Aplicação FastAPI principal com toda a lógica de Geração de Contexto, RAG e CiteSource
│   ├── requirements.txt  # Dependências Python específicas do MCP Server
│   └── requirements-local.txt # Dependências para desenvolvimento local (se houver)
│
├── baml_src/             # Código fonte BAML
│   ├── client_config.baml
│   ├── clinical_assistant.baml # Orquestrador principal para Academia/análise, incluindo GenerateDrCorvusInsights
│   ├── dr_corvus.baml      # Funções/template_strings gerais da IA (persona, disclaimers), UserRole enum
│   ├── enums.baml          # Enums globais como ResearchSourceType, StudyTypeFilter (movidos de research_assistant.baml ou duplicados para clareza)
│   ├── evidence_based_medicine.baml # Funções de pesquisa científica movidas para research_assistant.baml
│   ├── expand_differential.baml
│   ├── metacognition.baml
│   ├── patient_assistant.baml # Contém SuggestPatientFriendlyFollowUpChecklist e suas classes
│   ├── research_assistant.baml # NOVO: Hub principal para todas as funcionalidades de pesquisa avançada e análise de evidências
│   └── types.baml          # Tipos globais, incluindo PICOQuestion, SearchParameters, RawSearchResultItem, etc.
│
├── baml_client/          # Cliente BAML gerado (NÃO editar manualmente, gerado por `baml-cli generate`)
├── .env.example          # Variáveis globais para Docker
├── docker-compose.dev.yml # Configuração Docker para desenvolvimento (inclui Redis, Neo4j - opcional)
├── docker-compose.prod.yml # Configuração Docker para produção
├── README.md             # Documentação principal
└── code-overview.md      # Este arquivo
```

## Implementação Atual Detalhada

### 1. Arquitetura Frontend (Next.js - App Router)

*   **Framework**: Next.js 14 com **App Router** amplamente utilizado.
*   **Renderização**: Combinação de **Server Components** (RSC) para data fetching inicial, segurança e layouts, e **Client Components** (`'use client'`) para interatividade (chat, formulários, gráficos).
*   **UI**: **Tailwind CSS** e componentes **shadcn/ui**. Foco em clareza e eficiência para ambos os perfis (médico/paciente).
*   **Página de Análise de Exames (`/analysis/page.tsx`)**:
    *   **Interface com design moderno usando gradientes azul/roxo**
    *   **Tradução completa para português** - todas as mensagens, labels e texto da interface
    *   **Sistema de Dr. Corvus Insights** integrado para pacientes profissionais médicos, residentes e estudantes
    *   **Loading states elegantes** com spinner personalizado e animações
    *   **Error handling robusto** com componentes de alert personalizados e toast notifications (Sonner)
    *   **Interface de entrada manual reorganizada** por categorias médicas (Hematologia, Função Renal, etc.)
    *   **Validação aprimorada** para dados manuais com feedback em tempo real
    *   **Funcionalidade de cópia** melhorada para relatórios completos
    *   **Header com branding Dr. Corvus** e design responsivo
    *   **Componentes reutilizáveis** (LoadingSpinner, ErrorAlert, SuccessAlert)
    *   Utiliza um novo endpoint backend (`/clinical-assistant/check-lab-abnormalities`) para determinar anormalidades e exibir intervalos de referência, com lógica de fallback no frontend
*   **Seção Academia Clínica (`/academy`)**: Nova seção com múltiplos módulos para treinamento em raciocínio clínico:
    *   `academy/page.tsx`: Página principal da academia.
    *   `academy/evidence-based-medicine/page.tsx`: **Sistema de Pesquisa Científica Avançado** com dois modos distintos:
        *   **Modo Manual**: Execução controlada seguindo estratégias pré-definidas pelo BAML
        *   **Modo Autônomo**: Dr. Corvus decide autonomamente as estratégias de busca e executa múltiplas iterações adaptativas
        *   Integração com análise de PDFs científicos via LlamaParse
        *   Avaliação crítica de evidências científicas
    *   `academy/metacognition-diagnostic-errors/page.tsx`: Módulo focado em metacognição e erros diagnósticos, utilizando funções BAML como `ProvideFeedbackOnProblemRepresentation` e `ClinicalReasoningPath_CritiqueAndCompare`.
    *   `academy/expand-differential/page.tsx`: Módulo para auxiliar na expansão de diagnósticos diferenciais, utilizando a função BAML `ExpandDifferentialDiagnosis`.
*   **Componentes de Pesquisa Científica (`/components/research/`)**: Conjunto completo de componentes React para pesquisa científica:
    *   `DeepResearchComponent.tsx`: Interface principal com seleção de modo (manual/autônomo), formulário PICO, e visualização rica de resultados
    *   `PDFAnalysisComponent.tsx`: Upload e análise de documentos PDF científicos
    *   `EvidenceAppraisalComponent.tsx`: Avaliação crítica de evidências científicas
    *   `UnifiedEvidenceAnalysisComponent.tsx`: Componente unificado para análise de evidências (PDF + texto)
*   **Sistema de Notificações**: Integração completa com **Sonner** para toast notifications com feedback visual aprimorado
*   **Autenticação**: Gerenciada pelo **Clerk** (UI, hooks `useAuth`/`useUser`, middleware, metadata para roles `doctor`/`patient`).
*   **Gerenciamento de Estado**: Principalmente via props de Server para Client Components e estado local (`useState`). **Zustand** pode ser usado pontualmente para estado global crítico, se necessário.
*   **Chamadas de API**: Funções em `src/services/*` que recebem o token Clerk (obtido via `useAuth` nos Client Components) e chamam o Backend API.
*   **Chat**: Interface (`AIChat.tsx`) com **Vercel AI SDK (`useChat`)**, que se comunica com a API Route `/api/chat` para streaming.
*   **API Route de Chat (`/api/chat/route.ts`)**: Atua como um proxy seguro. Valida a sessão Clerk e encaminha a requisição (com o corpo original) para o endpoint `/ai-chat/stream` do Backend API.
*   **Notas Clínicas**: Componente `ClinicalNotes.tsx` utiliza **TipTap** para edição rich text e salva o conteúdo HTML/JSON no backend.
*   **Visualizações**: Utiliza **Recharts** para uma ampla gama de gráficos interativos e detalhados.
    Todos os componentes de visualização utilizam a estrutura de dados atualizada com `Exam.lab_results` (contendo objetos `LabResult` enriquecidos) e `Exam.exam_timestamp`.
*   **Testes**: Estrutura com Jest (unit/integration) e Playwright (E2E).

### 2. Arquitetura Backend (FastAPI)

*   **Framework**: Python com **FastAPI**.
*   **Autenticação**: Middleware (`security.py`) valida o Bearer token (JWT do Clerk) em rotas protegidas.
*   **Documentação Interativa da API**: Quando o serviço `backend-api` estiver em execução, a documentação interativa completa da API (Swagger UI) está disponível em `/docs`.
*   **Banco de Dados**: **PostgreSQL** gerenciado (AWS RDS, etc.) com **Encryption at Rest habilitada** e backups regulares, usando **SQLAlchemy** (ORM) e **Alembic** (migrations). Queries precisam de otimização.
*   **Validação**: **Pydantic** schemas.
*   **Estrutura**: Organizado em `routers`, `crud`, `schemas`, `database`, `clients`, `services`, `utils`, e `analyzers` para lógica de interpretação de exames.
*   **Funcionalidades**: 
    *   Endpoints para CRUD de pacientes, notas clínicas, medicamentos, diário de saúde, sinais vitais.
    *   **Novo endpoint `/clinical-assistant/check-lab-abnormalities`**: Recebe uma lista de parâmetros laboratoriais (nome, valor) e retorna para cada um: valor convertido, se é anormal (booleano), o intervalo de referência textual, e notas adicionais. Utiliza `_safe_convert_to_float` e `is_abnormal` de `utils.reference_ranges`.
    *   **Endpoint `/api/dr-corvus/insights`**: Novo endpoint integrado para geração de insights personalizados do Dr. Corvus com suporte para diferentes tipos de usuário (paciente vs profissional médico)
    *   Endpoints para análise transiente de exames (`/api/analysis/guest`, `/api/analysis/perform`):
        *   Permitem upload de arquivos de exames (PDF, JPG, PNG) ou entrada manual de dados laboratoriais.
        *   Os dados extraídos ou fornecidos (objetos `LabResult`) são processados por uma suíte de analisadores clínicos especializados (em `backend-api/analyzers/`) e/ou pelo novo endpoint de checagem de anormalidades.
        *   Estes endpoints realizam a análise de forma transiente (sem persistência direta no banco de dados do paciente), retornando os resultados e alertas gerados.
    *   **Router de Pesquisa Científica (`/deep-research`)**: Implementa endpoints completos para pesquisa em bases de dados médicas:
        *   `POST /deep-research/` - Modo manual com estratégia pré-definida pelo BAML
        *   `POST /deep-research/autonomous` - Modo autônomo com decisões adaptativas do Dr. Corvus
        *   `POST /deep-research/analyze-pdf` - Análise avançada de documentos PDF científicos
        *   `POST /deep-research/appraise-evidence` - Avaliação crítica de evidências científicas
        *   `GET /deep-research/search-strategy` - Formulação de estratégia apenas
        *   `GET /deep-research/health` - Health check do serviço
        *   `GET /deep-research/test-brave-search` - Teste de integração com Brave Search
    *   Lógica de **desidentificação** robusta aplicada antes do envio de dados para o MCP Server ou LLMs.
*   **Processamento de Dados Sensíveis**: Implementa a lógica de **desidentificação** (remoção/mascaramento de PII/PHI como nome, generalização de data de nascimento, uso de NER para texto livre) nos dados do paciente *antes* de enviá-los para o MCP Server ou diretamente para o LLM (quando aplicável), garantindo a privacidade em conformidade com a LGPD/HIPAA.
*   **Chat Backend (`ai_chat.py`)**: Endpoint `/stream` recebe a requisição via proxy, busca dados relevantes do paciente via `crud`, aplica **desidentificação rigorosa**, chama o `MCPClient` para obter o contexto formatado, e então chama o `LLMClient` (configurado com fallback OpenRouter -> Gemini) para gerar a resposta do LLM e faz o streaming da resposta. Este endpoint também é o ponto de coleta inicial para o pipeline de Aprendizado Ativo (AL).
*   **Client MCP**: `clients/mcp_client.py` encapsula a comunicação com o MCP Server.
*   **Client LLM**: `clients/llm_client.py` encapsula a comunicação com as APIs dos modelos de linguagem (com fallback e seleção de modelo).
*   **Endpoints para Dr. Corvus (BAML) / Academia Clínica**: O roteador `clinical_assistant_router.py` expõe funcionalidades BAML (via `baml_client`) para a Academia Clínica e outras interações IA. Ex: `POST /clinical-assistant/expand-differential`, `POST /clinical-assistant/assist-evidence-appraisal` etc.

*   **Serviços de Pesquisa Científica**:
    *   **Unified Metrics Service (`services/unified_metrics_service.py`)**: Serviço consolidado que integra todas as APIs bibliométricas (Altmetric, NIH iCite, Web of Science, OpenCitations, Semantic Scholar) em uma única interface unificada, eliminando duplicação de código e melhorando performance com processamento paralelo e cache unificado. Utiliza estruturas de dados como `UnifiedMetrics` para consolidar os dados.
    *   **Unified PubMed Service (`services/unified_pubmed_service.py`)**: Integração completa com PubMed E-utilities API para busca de artigos científicos, com integração direta ao Unified Metrics Service para enriquecimento automático com métricas bibliométricas (retornando objetos como `UnifiedSearchResult`), scoring de relevância multidimensional e indicadores de qualidade.
    *   **Brave Search Client (`clients/brave_search_client.py`)**: Cliente HTTP para integração com Brave Search API para busca web de diretrizes e recursos clínicos
    *   **PDF Service (`services/pdf_service.py`)**: Processamento avançado de PDFs usando LlamaParse como método primário com fallback automático para PyPDF2
    *   **Simple Autonomous Research Service (`services/simple_autonomous_research.py`)**: Implementação de pesquisa autônoma simplificada que simula comportamento adaptativo sem dependências complexas do Langroid

### Scientific Search Workflow (Deep Research)

The deep-research feature orchestrates a multi-stage, multi-source pipeline that balances **breadth (web guidelines, grey literature) and depth (PubMed, Europe PMC, Lens Scholar)** while aggressively enforcing English, quality and trust controls.

| Stage | Component | Purpose |
|-------|-----------|---------|
| 1 | **Query Pre-processing (backend-api / `simple_autonomous_research.py`)** | • Expand Portuguese medical abbreviations.<br>• Detect Portuguese terms & translate to English (DeepL → BAML fallback).<br>• Expand synonyms using custom dictionary.<br>• Generate or simplify strategy queries via BAML (PICO / keyword extraction). |
| 2 | **Tiered PubMed Search (`UnifiedPubMedService`)** | • Three passes:<br>  • Tier 1 – Original/expanded query.<br>  • Tier 2 – Simplified keyword query.<br>  • Tier 3 – PICO-driven query.<br>• `_apply_default_language_filter` appends `english[lang]` when absent.<br>• Retrieves PMIDs → `efetch` details → enriches with `UnifiedMetricsService` (Altmetric, iCite, etc.) and scores relevance. |
| 3 | **Supplementary Scholarly Sources** | • `EuropePMCService` mirrors PubMed logic for non-PubMed OA content.<br>• `LensScholarService` is optional; if `LENS_SCHOLAR_API_KEY` is missing its priority is automatically downgraded. |
| 4 | **Web & Guidelines Search** | • `async_brave_web_search` (MCP tool) fetches guideline/web content.<br>• `_try_mcp_search` packages Brave results into BAML objects. |
| 5 | **Result Aggregation & Filtering** | • `_filter_low_quality_sources` removes blacklisted domains and enforces `TRUSTED_DOMAIN_WHITELIST`.<br>• Duplicate detection & citation consolidation via `cite_source_service`. |
| 6 | **Synthesis (`synthesize_with_fallback`)** | BAML summarises key findings, evidence quality and implications, producing the final `SynthesizedResearchOutput`. |

Key safeguards:

* **Language enforcement** – Every PubMed/EPMC query defaults to `english[lang]`; Brave queries include `lang:en` parameter.
* **Domain trust filter** – Only elite journals / institutional domains survive unless explicitly widened.
* **API-Key aware priority** – Missing keys (e.g. Lens Scholar) merely reduce weight instead of breaking the pipeline.
* **Rate-limit spacing** – `MCP_CALL_DELAY_SECONDS` prevents hammering APIs.

> This table should help new contributors navigate the search stack quickly and debug quality issues (e.g., dominance of non-English sources).

### 3. MCP Server (FastAPI) - RAG & Context Generation

*   Serviço Python independente (FastAPI) rodando na porta `8765`.
*   Endpoint principal: `POST /context`.
*   **Documentação Interativa da API**: Quando o serviço `mcp_server` estiver em execução, a documentação interativa completa da API (Swagger UI) está disponível em `/docs`.
*   Recebe dados **já desidentificados** do paciente e da conversa do Backend API.
*   **Responsabilidades:**
    *   **Seleção de Contexto (RAG):** Busca informações relevantes no Knowledge Graph (KG) e/ou outras fontes.
    *   **Formatação:** Cria o prompt de contexto otimizado (string) para o LLM.
    *   **Integração CiteSource**: Utiliza o motor CiteSource para análise de qualidade e deduplicação dos resultados de pesquisa antes da síntese.
*   Retorna a string de contexto formatada e **desidentificada** para o Backend API.

### 4. BAML (Better A(I)ML) - Dr. Corvus Core
*   **Localização**: Código fonte em `baml_src/`, cliente gerado em `baml_client/`.
*   **Configuração**: `client_config.baml` define os clientes LLM (Gemini com fallback para OpenRouter) e a estratégia de fallback. Todas as funções BAML utilizam prompts e lógica em inglês para otimizar o desempenho do LLM, com tradução de entrada/saída para PT-BR gerenciada pelo backend/frontend.
*   **Orquestração**: 
    *   `clinical_assistant.baml`: Atua como o orquestrador para as funções da Academia Clínica e para `GenerateDrCorvusInsights` (que tem lógica distinta para `UserRole.PATIENT` vs `UserRole.DOCTOR_STUDENT`, gerando `LabInsightsOutput` com campos específicos para cada um).
    *   `research_assistant.baml`: Novo hub central para funcionalidades de pesquisa científica avançada.
*   **Funções Chave e Estruturas de Dados (exemplos):**
    *   **Pesquisa Avançada (`research_assistant.baml`):**
        *   `FormulatePICOQuestionFromScenario(ClinicalScenarioInput) -> PICOFormulationOutput`: Estrutura questões clínicas em formato PICO.
        *   `FormulateDeepResearchStrategy(ResearchTaskInput) -> FormulatedSearchStrategyOutput`: Cria estratégias de busca multi-fonte (PubMed, EuropePMC, Lens.org, Brave Search) usando `ResearchSourceType` enum e `SearchParameters`.
        *   `AnalyzePDFDocumentForEvidence(PDFAnalysisInput) -> PDFAnalysisOutput`: Analisa PDFs científicos para extrair metodologia, achados, qualidade da evidência, etc.
        *   `SynthesizeResearchFindings(RawSearchResultItem[], FormulatedSearchStrategyOutput) -> SynthesizedResearchOutput`: Consolida resultados de busca e análises em um relatório com sumário executivo, temas de evidência (`EvidenceTheme`), métricas de pesquisa (`ResearchMetrics`), e limitações.
        *   Enums: `ResearchSourceType`, `StudyTypeFilter`.
        *   Classes: `PICOQuestion`, `SearchParameters`, `RawSearchResultItem`, `EvidenceTheme`, `ResearchMetrics`, `PDFAnalysisInput`, `PDFAnalysisOutput`, `SynthesizedResearchOutput`.
    *   **Análise Laboratorial (`clinical_assistant.baml`):**
        *   `GenerateDrCorvusInsights(LabAnalysisInput) -> LabInsightsOutput`: Gera insights laboratoriais diferenciados para pacientes e profissionais.
        *   Classes: `LabTestResult`, `LabAnalysisInput`, `LabInsightsOutput` (com campos condicionais como `patient_friendly_summary` vs `professional_detailed_reasoning_cot`).
    *   **Treinamento em Raciocínio Clínico (`clinical_assistant.baml`, `metacognition.baml`, `expand_differential.baml`):**
        *   `AnalyzeDifferentialDiagnoses_SNAPPS`, `ClinicalReasoningPath_CritiqueAndCompare`, `ProvideFeedbackOnProblemRepresentation`, `ExpandDifferentialDiagnosis`.
    *   **Suporte ao Paciente (`patient_assistant.baml`):**
        *   `SuggestPatientFriendlyFollowUpChecklist(PatientFollowUpInput) -> PatientFollowUpChecklistOutput`: Cria checklists de acompanhamento para pacientes.
    *   **Templates de Persona e Disclaimers (`dr_corvus.baml`):**
        *   `GetPatientIntroduction()`, `GetProfessionalIntroduction()`, `GetGenericDisclaimerPatient()`, `GetGenericDisclaimerProfessional()`, etc.
*   **Robustez**: Funções BAML com fallbacks educacionais e tratamento de erros consistente.

### 5. Arquitetura Unificada de APIs Bibliométricas

Unificação completa da arquitetura de APIs bibliométricas
**APIs Integradas no Unified Metrics Service**:
*   **Altmetric API**: Métricas de impacto social e atenção online
*   **NIH iCite API**: Relative Citation Ratio (RCR) e relevância clínica
*   **Web of Science API**: Fator de impacto de journals e citações
*   **OpenCitations API**: Dados de citação abertos
*   **Semantic Scholar API**: Insights de IA e citações influentes
*   **Lens.org API Oficial**: Acesso via API REST oficial para dados acadêmicos e patentes.
*   **Google Scholar Analysis**: Análise de viabilidade e limitações (concluído que não é recomendado para produção, Semantic Scholar é preferível)

**Funcionalidades Avançadas**:
*   **Consenso de Citações**: Validação cruzada entre múltiplas fontes de citação e cálculo de score de consenso.
*   **Scoring Composto Avançado**: Algoritmo unificado que combina métricas de todas as fontes (RCR, consenso, citações influentes Semantic Scholar, Altmetric, JIF, etc.) e bônus para classificar artigos.
*   **Indicadores de Qualidade**: Identificação automática de artigos clínicos, altamente citados e com resumos de IA
*   **Cache Inteligente**: TTL de 1 hora com otimização de chamadas redundantes

### 6. Otimização de Dependências Python e Estratégia de Tradução
*   **Gestão de Dependências**: O projeto utiliza arquivos `requirements.txt` específicos por serviço (`backend-api/requirements.txt`, `mcp_server/requirements.txt`) e um `requirements-shared.txt` para dependências comuns. Esta abordagem otimiza os builds Docker (velocidade e tamanho) e melhora a manutenibilidade. Os Dockerfiles são configurados para instalar primeiro as dependências compartilhadas e depois as específicas do serviço.
*   **Estratégia de Tradução Centralizada**: Para garantir alta performance dos LLMs e uma experiência de usuário nativa em português, toda a lógica de tradução é centralizada no backend. O input do usuário em português é enviado ao backend, traduzido para o inglês (usando DeepL com fallback para BAML), processado pelas funções BAML (que operam em inglês), e a resposta em inglês é traduzida de volta para o português antes de ser enviada ao frontend. As rotas de API do frontend atuam apenas como proxies, sem nenhuma lógica de tradução.

## UX/UI

### Páginas Modernizadas
*   **Design Responsivo Moderno**: Interface completamente redesenhada com gradientes azul/roxo e componentes shadcn/ui aprimorados
*   **Tradução Completa**: Todos os textos, mensagens de erro, labels e interface traduzidos para português brasileiro
*   **Loading States Elegantes**: Componentes personalizados (LoadingSpinner) com animações suaves e feedback visual
*   **Error Handling Robusto**: 
    *   Componentes ErrorAlert e SuccessAlert personalizados
    *   Integração com Sonner para toast notifications
    *   Mensagens de erro contextuais e acionáveis
*   **Dr. Corvus Insights**: Sistema avançado de insights personalizados com:
    *   Modal de configuração para contexto adicional
    *   Diferentes visualizações para pacientes vs profissionais médicos
    *   Accordion expandível para organização de conteúdo
    *   Animações de loading específicas com logo Dr. Corvus
*   **Academia Clínica**: Sistema de aprendizado interativo com:
    *   Desenvolvimento de raciocínio clínico
    *   Diagnostico diferencial com algoritmos educacionais
    *   MBE: pesquisa científica e analise de qualidade
    *   Metacognição e erros diagnósticos
    *   Análise e simulação de casos clínicos

### Componentes Reutilizáveis Criados
*   **LoadingSpinner**: Loading state elegante com mensagem customizável
*   **ErrorAlert**: Alert de erro com dismiss e ações contextuais
*   **SuccessAlert**: Alert de sucesso com feedback visual positivo
---

### Status e Próximos Passos

### Concluído / Estável ✅

*   **Autenticação e Fluxo de Roles**: Completo e funcional via Clerk.
*   **Estrutura Frontend/Backend/MCP/BAML**: Serviços definidos, containerizados (Docker) e se comunicando.
*   **CRUD Básico**: Pacientes (com RHF/Zod), Notas Clínicas (com editor TipTap), Diário de Saúde (com paginação), Medicamentos (básico).
*   **Chat Contextual (Fluxo Básico)**: Fluxo de ponta a ponta implementado com persistência de mensagens, **desidentificação** e **fallback de LLM**.
*   **Página de Análise de Exames (`/analysis`) - MODERNIZADA COMPLETAMENTE**:
    *   ✅ Interface totalmente redesenhada com design moderno
    *   ✅ Tradução completa para português brasileiro
    *   ✅ Sistema de Dr. Corvus Insights integrado
    *   ✅ Loading states elegantes e error handling robusto
    *   ✅ Interface de entrada manual reorganizada e aprimorada
    *   ✅ Funcionalidade de upload de PDF e entrada manual com checagem de anormalidades via backend e UI aprimorada
*   **Seção Academia Clínica (`/academy`)**: Versão inicial implementada com módulos para Medicina Baseada em Evidências, Metacognição/Erros Diagnósticos e Expansão de Diagnósticos Diferenciais, utilizando funções BAML dedicadas.
*   **Sistema de Pesquisa Científica Avançado**: Implementação completa com dois modos distintos:
    *   **Modo Manual**: Estratégias pré-definidas pelo BAML, execução controlada
    *   **Modo Autônomo**: Decisões adaptativas, múltiplas iterações, comportamento emergente
    *   **Integração Multi-fonte**: PubMed E-utilities + Brave Search API
    *   **Análise de PDFs**: LlamaParse com fallback PyPDF2
    *   **Avaliação de Evidências**: Critérios estruturados de qualidade metodológica
*   **Visualizações Avançadas de Exames e Scores**: Múltiplos gráficos interativos (Recharts) implementados.
*   **Sistema de Notificações**: Integração completa com Sonner para feedback visual aprimorado.
*   **Componentes UI Modernos**: LoadingSpinner, ErrorAlert, SuccessAlert e outros componentes reutilizáveis.

### Em Desenvolvimento 🚧

*   **Migração de Frameworks IA**: ElizaOS > Langroid, LlamaParse > Marker
*   **Knowledge Graph (KG)**: Implementação do core da IA com Neo4j
*   **Pipeline de Aprendizado Ativo (AL)**: Sistema de melhoria contínua da IA
*   **Testes Automatizados**: Expansão da cobertura de testes, especialmente E2E (e.g., `test_enhanced_apis_integration.py` para novas integrações bibliométricas)

### Próximos Passos Prioritários 🎯

1. **Otimização de Performance**:
   - Implementar caching no MCP Server (Redis)
   - Otimizar queries de banco de dados
   - Melhorar bundle size do frontend

2. **Expansão de Funcionalidades**:
   - Sistema de alertas e notificações
   - Integração com dispositivos wearables
   - Funcionalidades avançadas de gestão de medicamentos

3. **Qualidade e Segurança**:
   - Testes automatizados de segurança para IA
   - Documentação de conformidade LGPD/HIPAA
   - Pipeline de testes Golden Dataset para Dr. Corvus

4. **Experiência do Usuário**:
   - Internacionalização (i18n) completa
   - Modo offline limitado
   - Performance em dispositivos móveis

## Configuração Adicional (Variáveis de Ambiente)

Além das variáveis de ambiente padrão para Clerk, banco de dados e LLMs, as seguintes chaves de API são usadas pelas integrações bibliométricas:

```bash
# Existentes
ALTMETRIC_API_KEY=your_altmetric_key
WOS_API_KEY=your_wos_key
# ... (outras chaves para PubMed/NCBI, Lens.org, Brave Search)

# Novas (Opcionais, mas recomendadas para melhor performance/cobertura)
SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key
OPENCITATIONS_ACCESS_TOKEN=your_opencitations_token
LENS_SCHOLAR_API_KEY=your_lens_api_token_here # Para a API oficial do Lens.org
```