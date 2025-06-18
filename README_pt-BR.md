# Clinical Corvus
# Clinical Corvus
Sistema de auxílio para análise de dados clínicos, suporte à decisão e monitoramento de pacientes, utilizando Inteligência Artificial (Dr. Corvus) em um ambiente seguro e focado na privacidade. Plataforma projetada para médicos (gerenciamento e análise) e pacientes (acompanhamento e educação em saúde). Nossa visão é atuar como um **"Co-piloto Clínico"** para médicos, otimizando fluxos de trabalho, e empoderar pacientes com ferramentas de acompanhamento e educação em saúde. **A conformidade com a LGPD/HIPAA e a segurança dos dados são prioridades máximas.**

**Status Atual:** Plataforma funcional com recursos de gestão de pacientes, chat com IA contextual, visualizações de dados clínicos, notas clínicas com editor de rich text, **uma página de Análise (`/analysis`) completamente modernizada com interface redesenhada, tradução completa da interface para português, sistema avançado de Dr. Corvus Insights, loading states elegantes e error handling robusto para upload de exames (PDF) e entrada manual de dados com checagem de anormalidades via backend. A seção "Academia Clínica" (`/academy`) para treinamento em raciocínio clínico, utilizando funções BAML dedicadas, está com TODAS as suas 15 APIs educacionais 100% traduzidas para português, eliminando barreiras linguísticas. O sistema de pesquisa científica (`/academy/evidence-based-medicine`) foi expandido com novas fontes (Europe PMC, Lens.org) e um poderoso sistema de análise de qualidade e deduplicação (CiteSource), operando sobre uma arquitetura unificada de APIs bibliométricas que oferece métricas ricas e detalhadas. A arquitetura técnica foi otimizada com um novo sistema de gerenciamento de dependências Python, resultando em builds Docker mais rápidos e eficientes.** Utiliza tecnologias modernas como Next.js App Router, Clerk, Shadcn/UI, FastAPI e Docker. O sistema inclui processamento avançado de exames via upload de PDF, com extração e enriquecimento automático de resultados laboratoriais, e um conjunto expandido de visualizações gráficas e tabulares para esses dados. **A plataforma passou por uma unificação completa da arquitetura de APIs bibliométricas (Maio 2025), resultando em 30-40% de melhoria na performance e 40% de redução na complexidade do código.** Estamos em processo de migração de frameworks internos para a IA (ElizaOS > Langroid, LlamaParse > Marker) e avançando na implementação do core da IA (KG, AL).

## Funcionalidades Implementadas 

### Autenticação e Gestão de Usuários
*   **Autenticação Segura (Clerk)**: Login via provedores OAuth e email/senha, gerenciamento de sessão, MFA.
*   **Seleção de Perfil Pós-Login**: Fluxo obrigatório para definição de papel (`doctor`/`patient`) via metadados do Clerk.
*   **Middleware de Roteamento (Next.js + Clerk)**: Protege rotas baseado em autenticação e papel do usuário.
*   **Dashboards Distintos**: Interfaces separadas e personalizadas para médicos (`/dashboard`) e pacientes (`/dashboard-paciente`), focando na otimização do fluxo de trabalho para cada perfil.

### Gestão de Pacientes (Médico)
*   Criação de pacientes com formulário validado (React Hook Form + Zod).

---

## Licença

Este projeto está licenciado sob a Licença MIT com a [Commons Clause](https://commonsclause.com/pt-br/).

- **Aberto para colaboração:** Você pode usar, modificar e contribuir com este código para fins não comerciais.
- **Uso comercial é restrito:** Não é permitido vender, hospedar ou oferecer o software como serviço pago sem permissão explícita do detentor dos direitos autorais.
- **Propósito:** Este modelo protege o valor comercial do projeto, ao mesmo tempo em que incentiva a colaboração aberta e a transparência.

Consulte o arquivo [LICENSE](./LICENSE) para o texto legal completo e mais detalhes.
*   Listagem e visualização de pacientes designados.
*   Exclusão de pacientes.

### Visualização Detalhada do Paciente
*   Páginas dedicadas (`/patients/[id]/*`) usando Server Components para layout e carregamento inicial de dados.
*   Client Components para interatividade (`'use client'`).
*   **Visão Geral**: Inclui informações demográficas, **gráficos detalhados de sinais vitais e múltiplos resultados de exames (com tendências, correlações, comparações e scores de severidade)**, e timeline consolidada de eventos.
*   **Notas Clínicas**: Seção dedicada com editor de rich text (TipTap) para criação e visualização de notas.
*   Gestão de Medicamentos, Exames (Labs), Sinais Vitais.

### Sistema de Análise de Exames Modernizado (`/analysis`)

#### Interface 
*   **Design Responsivo Moderno**: Interface completamente repensada com gradientes azul/roxo, componentes shadcn/ui aprimorados e branding Dr. Corvus
*   **Tradução Completa**: Todos os textos, mensagens de erro, labels e interface traduzidos para português brasileiro
*   **Loading States Elegantes**: Componentes personalizados (LoadingSpinner) com animações suaves e feedback visual contextual
*   **Error Handling Robusto**: 
    *   Componentes ErrorAlert e SuccessAlert personalizados com dismiss automático
    *   Integração completa com Sonner para toast notifications contextuais
    *   Mensagens de erro acionáveis e informativas com orientações claras

#### Upload e Análise Automatizada de Exames
*   Funcionalidade aprimorada de upload de exames em formato PDF, JPG e PNG (`FileUploadComponent`).
*   Backend processa o arquivo, cria um registro `Exam` e extrai `LabResult` individuais.
*   Resultados laboratoriais são enriquecidos com unidades, valores de referência e flags de anormalidade.
*   **Interpretados por uma suíte de analisadores clínicos especializados e pelo endpoint `/clinical-assistant/check-lab-abnormalities`**.
*   Melhoria na precisão da extração de valores numéricos de PDFs (ex: tratamento correto de "10.500").

#### Interface de Entrada Manual
*   **Organização por Categorias Médicas**:
    *   Sistema Hematológico (Hemoglobina, Leucócitos, Plaquetas, etc.)
    *   Função Renal (Creatinina, Ureia, TFG, etc.)
    *   Função Hepática (TGO, TGP, GGT, etc.)
    *   Eletrólitos (Sódio, Potássio, Cálcio, etc.)
    *   Gasometria (pH, pCO2, pO2, etc.)
    *   Marcadores Cardíacos (Troponina, CK, BNP, etc.)
    *   Metabolismo (Glicose, HbA1c, Colesterol, etc.)
    *   Marcadores Inflamatórios (PCR, VHS, etc.)
    *   Microbiologia (Hemoculturas, Uroculturas, etc.)
    *   Função Pancreática (Amilase, Lipase)
*   **Validação em Tempo Real**: Feedback imediato com validação inteligente
*   **Preenchimento Automático**: Valores de referência pré-carregados por categoria
*   **Layout Responsivo**: Grid otimizado para desktop e mobile
*   **UX**: Tooltips, ajuda contextual e navegação intuitiva

### Sistema Dr. Corvus Insights

#### Insights Personalizados por Perfil
*   **Análise Inteligente**: Baseada no perfil do usuário
*   **Contextualização Avançada**: Interpretação clínica profunda dos resultados laboratoriais
*   **Linguagem Adaptativa**: Comunicação adequada para cada tipo de usuário

#### Modal de Configuração Avançado
*   **Contexto Adicional**: Campo para informações clínicas relevantes (diagnósticos, sintomas, medicações)
*   **Perguntas Específicas**: Sistema para direcionar a análise do Dr. Corvus
*   **Interface Intuitiva**: Design moderno com validação e feedback em tempo real

#### Visualização Organizada e Inteligente
*   **Processo de Pensamento Detalhado**: Raciocínio clínico completo do Dr. Corvus
*   **Principais Anormalidades**: Identificação e priorização de achados relevantes
*   **Padrões e Correlações**: Análise de relacionamentos entre parâmetros
*   **Considerações Diagnósticas Diferenciais**: Hipóteses diagnósticas estruturadas
*   **Próximos Passos Sugeridos**: Recomendações de investigação e conduta
*   **Robustez**: Sistema com fallbacks educacionais e tratamento de erros consistente.

#### Funcionalidades
*   **Animações Exclusivas**: Loading states com logo Dr. Corvus pulsante
*   **Accordion Expandível**: Organização intuitiva do conteúdo
*   **Cópia Inteligente**: Relatórios completos com formatação estruturada
*   **Scroll Automático**: Navegação suave entre seções
*   **Disclaimers Contextuais**: Avisos importantes sobre uso clínico

### Academia Clínica (Dr. Corvus)

#### Estrutura Educacional
*   **Seção Dedicada** (`/academy`) para desenvolvimento de raciocínio clínico.
*   **Tradução Completa para Português**: Todas as APIs e funcionalidades educacionais da Academia Clínica são 100% traduzidas, garantindo uma experiência de aprendizado nativa e acessível.
*   **Metodologia BAML**: Utilizando funções especializadas de IA (executadas em inglês para performance otimizada e traduzidas para PT-BR para o usuário) para feedback educacional socrático, análise de vieses cognitivos e desenvolvimento de raciocínio.
*   **Interface Moderna**: Design consistente com experiência de usuário otimizada.
*   **Progressão Estruturada**: Módulos interconectados para aprendizado gradual.

#### Módulos Implementados

##### Medicina Baseada em Evidências (`/academy/evidence-based-medicine`)
**Sistema de Pesquisa Científica** com duas modalidades distintas e um robusto sistema de análise de qualidade:

**Workflow Integrado de Pesquisa:**
1.  **Análise Inteligente da Questão Clínica**: IA interpreta a necessidade do usuário.
2.  **Busca Multi-fonte Estratégica**:
    *   **PubMed**: Literatura médica peer-reviewed.
    *   **Europe PMC**: Ampla base de dados com textos completos e preprints.
    *   **Lens.org**: Cobertura global de pesquisa acadêmica e patentes.
    *   **Brave Search API**: Diretrizes clínicas atuais e recursos web.
3.  **Processamento Avançado com CiteSource**:
    *   **Deduplicação Inteligente**: Elimina redundâncias entre fontes (DOI, PMID, similaridade de título/autor), preservando metadados únicos.
    *   **Análise de Qualidade Multidimensional**: Avalia cobertura das fontes, diversidade dos tipos de estudo, recência das publicações e impacto bibliométrico.
    *   **Benchmarking de Fontes**: Analisa a performance e contribuição de cada base de dados.
    *   **Relatórios Detalhados**: Gera sumários executivos, análises aprofundadas e recomendações acionáveis para otimizar futuras buscas.
4.  **Síntese Unificada com BAML**: Resultados da pesquisa e análise CiteSource são consolidados e apresentados de forma inteligente.

**🔧 Pesquisa Rápida**:
*   **Formulário PICO Estruturado**: Population, Intervention, Comparison, Outcome.
*   **Estratégias Otimizadas**: Geradas pelo Dr. Corvus com base na pergunta clínica.
*   **Execução Controlada**: Usuário controla cada etapa da pesquisa.
*   **Transparência Total**: Visibilidade completa do processo de busca e das fontes.

**🤖 Pesquisa Avançada - Modo Autônomo**:
*   **Decisões Adaptativas**: Dr. Corvus decide autonomamente as estratégias.
*   **Iterações Inteligentes**: Múltiplas buscas baseadas em resultados anteriores.
*   **Aprendizado Dinâmico**: Refinamento contínuo da estratégia durante o processo.

### Workflow de Pesquisa Rápida

| Etapa | Componente | Finalidade |
|-------|-----------|------------|
| 1 | **Pré-processamento da Query (`simple_autonomous_research.py`)** | • Expansão de abreviações médicas em PT.<br>• Tradução automática para EN (DeepL → BAML).<br>• Expansão de sinônimos.<br>• Geração/simplificação via BAML (PICO / keywords). |
| 2 | **Busca PubMed em Camadas (`UnifiedPubMedService`)** | • Tier 1 – Query original/expandida.<br>• Tier 2 – Query simplificada.<br>• Tier 3 – Query PICO.<br>• `_apply_default_language_filter` assegura `english[lang]`.<br>• Enriquecimento com métricas (Altmetric, iCite) e scoring. |
| 3 | **Fontes Acadêmicas Suplementares** | • `EuropePMCService` para OA fora do PubMed.<br>• `LensScholarService` opcional (prioridade ↓ se `LENS_SCHOLAR_API_KEY` ausente). |
| 4 | **Busca Web & Diretrizes** | • `async_brave_web_search` (MCP).<br>• `_try_mcp_search` converte resultados para objetos BAML. |
| 5 | **Agregação & Filtro de Qualidade** | • `_filter_low_quality_sources` remove domínios blacklist e aplica `TRUSTED_DOMAIN_WHITELIST`.<br>• Deduplicação e consolidação via `cite_source_service`. |
| 6 | **Síntese (`synthesize_with_fallback`)** | Sumário BAML dos achados, avaliação de qualidade e implicações clínicas. |

**Proteções-chave:**

* `english[lang]` em todas as queries PubMed/EPMC; Brave com `lang:en`.
* Whitelist de domínios de elite.
* Priorização adaptativa conforme chaves API disponíveis (Lens Scholar opcional).
* Delay `MCP_CALL_DELAY_SECONDS` para evitar rate-limit.

*   **Critérios de Parada**: IA determina quando a busca é suficiente.

**📊 Métricas de Transparência da Análise (Automáticas)**:
*   **Visão Geral da Pesquisa**: Total de artigos analisados, fontes consultadas, tempo de análise, revistas científicas únicas.
*   **Composição dos Estudos**: Detalhamento por tipo (revisões sistemáticas, RCTs), estudos de alto impacto, estudos recentes.
*   **Estratégia de Busca Detalhada**: Fontes utilizadas, período da pesquisa, filtros aplicados, critérios de seleção.
    *   *Objetivo: Aumentar a confiabilidade e demonstrar o rigor científico da pesquisa.*

**🔗 Fontes e Ferramentas Adicionais**:
*   **LlamaParse**: Análise avançada de documentos PDF científicos para extração de dados.
*   **Avaliação Crítica**: Ferramentas para avaliação estruturada da qualidade metodológica dos estudos.

##### Metacognição e Erros Diagnósticos (`/academy/metacognition-diagnostic-errors`)
*   **Prevenção de Erros**: Foco em metacognição e pensamento crítico através do framework SNAPPS e outras ferramentas.
*   **Framework SNAPPS (Summarize, Narrow, Analyze, Probe, Plan, Select)**: Implementado com suporte robusto de BAML para cada etapa, oferecendo feedback socrático e análise de vieses.
*   **Funções BAML Especializadas**:
    *   `ProvideFeedbackOnProblemRepresentation`: Feedback sobre formulação de problemas.
    *   `ClinicalReasoningPath_CritiqueAndCompare`: Análise do processo de raciocínio
    *   `AnalyzeDifferentialDiagnoses_SNAPPS`: Apresentação estruturada de casos

##### Expansão de Diagnósticos Diferenciais (`/academy/expand-differential`)
*   **Metodologias Estruturadas**: VINDICATE e outras abordagens sistemáticas
*   **Função BAML `ExpandDifferentialDiagnosis`**: Auxílio inteligente na expansão diagnóstica
*   **Interface Interativa**: Exploração dinâmica de possibilidades diagnósticas

### Arquitetura Unificada de APIs Bibliométricas

*   **Unified Metrics Service**: Consolidação de todas as APIs bibliométricas em um serviço centralizado
*   **Unified PubMed Service**: Integração completa com enriquecimento automático de métricas
*   **Consenso de Citações**: Validação cruzada entre múltiplas fontes
*   **Scoring Composto**: Algoritmo unificado de relevância e qualidade para classificar artigos

#### APIs Integradas (Exemplos de Métricas Coletadas)
*   **Altmetric API**: Métricas de impacto social e atenção online (e.g., menções em notícias, mídias sociais, documentos de políticas)
*   **NIH iCite API**: Métricas normalizadas por campo (e.g., Relative Citation Ratio - RCR, percentil NIH, Approximate Potential to Translate - APT)
*   **Web of Science API**: Dados precisos de citação e classificações (e.g., contagem de citações, status de "Highly Cited Paper", fator de impacto de journals)
*   **OpenCitations API**: Dados de citação abertos para expandir a cobertura
*   **Semantic Scholar API**: Insights de IA, citações influentes e resumos gerados por IA

### Visualizações de Dados Avançadas
*   **Gráficos Interativos (Recharts)** para sinais vitais e resultados de exames
*   **Timeline Consolidada** com eventos clínicos importantes
*   **Análises Comparativas**: Múltiplos parâmetros, correlações, scatter plots
*   **Dashboards Especializados**: Resultados categorizados e detalhados
*   **Scores Clínicos**: SOFA, qSOFA, APACHE II com visualização evolutiva

### Assistente Clínico IA (Dr. Corvus - Chat)
*   **Interface Streaming**: Vercel AI SDK para conversação fluida
*   **Segurança Avançada**: Desidentificação rigorosa de dados sensíveis
*   **Contexto Inteligente**: MCP Server para geração de contexto relevante
*   **Fallback Strategy**: OpenRouter → Gemini para máxima disponibilidade
*   **Logging Estruturado**: Pipeline de Aprendizado Ativo para melhoria contínua

### Funcionalidades para Pacientes
*   **Diário de Saúde**: Registro com paginação inteligente
*   **Dashboard Personalizado**: Interface otimizada para acompanhamento pessoal
*   **Insights Acessíveis**: Dr. Corvus com linguagem adequada ao paciente

### Sistema de Notificações de Última Geração
*   **Toast Notifications**: Sonner para feedback visual em tempo real
*   **Responsividade Total**: Otimização para todos os dispositivos
*   **Contexto Inteligente**: Mensagens específicas para cada ação
*   **Componentes Reutilizáveis**: LoadingSpinner, ErrorAlert, SuccessAlert

## Arquitetura BAML e Dr. Corvus Core 

### Estrutura BAML
*   **Código Fonte**: `baml_src/` com definições estruturadas
*   **Cliente Gerado**: `baml_client/` auto-gerado via BAML CLI
*   **Configuração**: `client_config.baml` com fallback strategy e prompts em inglês para otimizar performance de LLMs
*   **Orquestração**: `clinical_assistant.baml` como hub central
*   **Robustez**: Funções BAML com fallbacks educacionais e tratamento de erros consistente

### Funções BAML Especializadas

#### Academia e Treinamento
*   **`AnalyzeDifferentialDiagnoses_SNAPPS`**: Framework estruturado para casos clínicos
*   **`ClinicalReasoningPath_CritiqueAndCompare`**: Análise metacognitiva do raciocínio
*   **`ProvideFeedbackOnProblemRepresentation`**: Feedback educacional personalizado
*   **`ExpandDifferentialDiagnosis`**: Expansão sistemática (VINDICATE e outros mnemônicos)
*   **`AssistEvidenceAppraisal`**: Avaliação crítica de evidências científicas

#### Pesquisa Científica
*   **`FormulateDeepResearchStrategy`**: Estratégias otimizadas multi-fonte
*   **`SynthesizeDeepResearchFindings`**: Síntese inteligente de resultados
*   **`AnalyzePDFDocument`**: Análise avançada de documentos científicos

#### Dr. Corvus Insights
*   **Análise Personalizada**: Adaptação baseada nos dados do paciente
*   **Interpretação Contextual**: Resultados laboratoriais com insight clínico aprofundado
*   **Pensamento Crítico**: Análise de vieses cognitivos e metacognição

#### Suporte ao Paciente
*   **`GetProfessionalIntroduction`**: Templates de apresentação profissional
*   **`SuggestPatientFriendlyFollowUpChecklist`**: Checklists personalizados

## Arquitetura Técnica

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
                                      | (Dados              | - RAG Pipeline       |
                                      |  Desidentificados)  | - AL Logging         |
                                      |                     | - CiteSource Engine  |
                                      |                     +----------------------+
                                      |
                                      | APIs LLM (Dados Desidentificados)
                                      v
                             +------------------------+
                             | LLM APIs (OpenRouter/  |
                             | Gemini Direct Fallback)|
                             +------------------------+
                                      |
                                      | Serviços Externos (Bibliométricos, etc.)
                                      v
                             +------------------------+
                             | PubMed, Europe PMC,    |
                             | Lens.org, Brave Search,|
                             | LlamaParse, etc.       |
                             +------------------------+
```

### Componentes Principais:

1.  **Frontend (Next.js App Router)**: Interface do usuário, dashboards, interações e visualizações.
2.  **Backend API (FastAPI)**: Lógica de negócios principal, gerenciamento de dados, integração com BAML e serviços externos.
3.  **MCP Server (FastAPI)**: Geração de contexto para IA, RAG pipeline, interação com Knowledge Graph (futuro) e motor CiteSource.
4.  **Database (PostgreSQL)**: Armazenamento persistente dos dados da aplicação.
5.  **Clerk**: Serviço de autenticação e gerenciamento de usuários.
6.  **BAML (Boundary)**: Motor de IA para raciocínio clínico, pesquisa e funcionalidades educacionais.
7.  **Serviços Externos**: APIs bibliométricas, LLMs, etc.


### Estratégia de Tradução para Funcionalidades de IA
Para garantir alta performance dos modelos de linguagem (LLMs) e uma experiência nativa em português, **toda a lógica de tradução é centralizada no backend**:

1. **Entrada do Usuário (PT-BR):** O input fornecido pelo usuário em português é enviado do frontend para o backend sem qualquer tradução prévia.
2. **Processamento Backend:** O backend executa a tradução para o inglês utilizando DeepL como motor primário, com fallback automático para BAML em caso de falha. Em seguida, executa as funções BAML (prompts e lógica em inglês).
3. **Saída para o Usuário (PT-BR):** A resposta gerada pela BAML em inglês é traduzida de volta para o português no backend (usando DeepL/BAML) antes de ser retornada ao frontend.

**Importante:** As rotas de API do frontend atuam apenas como proxies e não devem implementar lógica de tradução, nem importar/utilizar DeepL, BAML ou qualquer serviço de tradução diretamente. Toda a tradução ocorre exclusivamente no backend, garantindo consistência, auditabilidade e facilidade de manutenção.

**Exemplo de Proxy Frontend:**
```ts
// frontend/src/app/api/alguma-rota-traduzida/route.ts
export async function POST(request: NextRequest) {
  // ...autenticação...
  const backendUrl = `${process.env.BACKEND_URL}/api/alguma-rota-traduzida`;
  const response = await fetch(backendUrl, { ... });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

## Como Executar

### Pré-requisitos
*   Node.js (v18+)
*   Python (v3.10+)
*   Docker e Docker Compose
*   Conta Clerk (para autenticação)
*   **Chaves de API**: Para diversos serviços externos (LLMs como OpenRouter/Gemini, APIs bibliométricas como PubMed, Altmetric, iCite, Web of Science, Lens.org, Semantic Scholar, Brave Search). Estas devem ser configuradas como variáveis de ambiente (ex: em um arquivo `.env` na raiz do projeto). Consulte a documentação específica de cada serviço para obter as chaves.

### Configuração Inicial
1.  **Clone e Configure**:
    ```bash
    git clone [repositório]
    # Configure .env, frontend/.env.local, backend-api/.env, mcp_server/.env
    ```

2.  **Gere Cliente BAML**:
    ```bash
    baml-cli generate
    ```

3.  **Inicie Serviços**:
    ```bash
    # Desenvolvimento
    docker-compose -f docker-compose.dev.yml up -d --build
    
    # Produção
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

4.  **Execute Migrações**:
    ```bash
    docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
    ```

### Contribuições
Contribuições são bem-vindas! Siga o guia de estilo e padrões de commit.

## Documentação Adicional
- **`code-overview.md`**: Visão geral detalhada da estrutura do código, componentes chave e interações (a ser atualizado).
- **Documentos específicos**: Dentro das pastas `frontend/docs`, `backend-api/docs`, `mcp_server/docs` para detalhes de implementação de funcionalidades específicas (estes serão consolidados ou removidos).

## Roadmap e Próximos Passos

### Concluído / Estável

*   **Interface Modernizada**: Todas as páginas modernizadas
*   **Localização Total**: Tradução completa português brasileiro
*   **Dr. Corvus Insights**: Sistema de insights personalizados
*   **Academia BAML**: Módulos educacionais com IA especializada
*   **Pesquisa Científica**: Modos manual e autônomo avançados
*   **APIs Unificadas**: 30-40% melhoria performance
*   **Notificações**: Sistema Sonner completo
*   **Pesquisa Avançada**: Pesquisa científica avançada em bases globais de alta qualidade

### Em Desenvolvimento

*   **Migração IA**: ElizaOS → Langroid, LlamaParse → Marker
*   **Knowledge Graph**: Implementação Neo4j
*   **Aprendizado Ativo**: Pipeline melhoria contínua
*   **Testes Avançados**: Cobertura E2E expandida

### Próximos Passos

1. **Performance**: Cache Redis, otimização queries, bundle size
2. **Funcionalidades**: Alertas inteligentes, wearables, medicamentos avançados
3. **Qualidade**: Testes segurança IA, LGPD/HIPAA, Golden Dataset
4. **UX**: i18n completa, offline mode, mobile otimizado

### Visão Futura

#### IA Completa
- **Knowledge Graph**: Fontes médicas confiáveis
- **Agente Autônomo**: Clinico e Pesquisador independente, com acesso a todas as funcionalidades da plataforma
- **Aprendizado Ativo**: Fine-tuning contínuo validado

#### Funcionalidades Clínicas
- **Tempo Real**: Monitoramento com consentimento granular
- **Wearables**: Integração automatizada
- **Alertas IA**: Baseados em tendências clínicas
- **Interoperabilidade**: HL7/FHIR hospitalar

#### Pesquisa Autônoma (Modulo MBE da Academia Clínica)
- **Agente Autônomo**: Dr. Corvus tem acesso a todas as funcionalidades da plataforma, podendo utilizar todas as ferramentas necessárias para responder a uma pesquisa
  - **Decisões Adaptativas**: Dr. Corvus decide autonomamente as estratégias
  - **Iterações Inteligentes**: Múltiplas buscas baseadas em resultados anteriores
  - **Aprendizado Dinâmico**: Refinamento contínuo da estratégia durante o processo
  - **Avaliação de Qualidade**: Avaliação contínua da qualidade dos resultados
  - **Relatórios Detalhados**: Gera sumários executivos, análises aprofundadas e recomendações acionáveis para otimizar futuras buscas

#### Arquitetura Descentralizada com Ritual
Em alinhamento com nossa missão de **"Descentralizar o Conhecimento, Democratizar a Saúde"**, a próxima evolução da plataforma será construída sobre princípios de IA descentralizada utilizando a **Ritual Foundation**. Esta abordagem nos permitirá oferecer garantias sem precedentes de privacidade, transparência e soberania de dados.
*   **IA Verificável e Auditável**: Execução de modelos de IA on-chain com provas criptográficas, garantindo que as análises são transparentes e livres de manipulação.
*   **Privacidade por Hardware (TEEs)**: Processamento de dados sensíveis em *Trusted Execution Environments*, assegurando que a privacidade do paciente é absoluta e inviolável.
*   **Soberania Real do Usuário**: Dar aos pacientes e médicos controle total sobre seus dados e os modelos que utilizam, quebrando a dependência de infraestruturas centralizadas.

## Testes e Qualidade

### Estratégia Multi-Camadas
- **Código**: Jest (frontend), pytest (backend)
- **E2E**: Playwright para fluxos críticos
- **Golden Dataset**: Validação especialistas médicos
- **Adversariais**: Segurança e robustez IA
- **Revisão Humana**: Validação clínica contínua

### Comandos
```bash
# Backend
docker-compose -f docker-compose.dev.yml exec backend pytest

# Frontend
docker-compose -f docker-compose.dev.yml exec frontend npm run test
docker-compose -f docker-compose.dev.yml exec frontend npm run test:e2e
```

---

**Clinical Corvus** representa o futuro da assistência clínica, combinando tecnologia de ponta com práticas médicas baseadas em evidências, sempre priorizando a segurança, privacidade e qualidade do cuidado ao paciente.