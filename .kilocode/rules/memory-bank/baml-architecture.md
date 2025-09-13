# Clinical Corvus - BAML Architecture & AI Workflows

## Overview
Clinical Corvus leverages BAML (Boundary AI Markup Language) as the primary orchestration layer for all AI interactions, providing structured, type-safe, and testable AI workflows. The architecture implements a hybrid approach combining clinical reasoning, evidence-based medicine, and patient data analysis through specialized BAML functions.

## BAML Architecture Components

### Core BAML Structure
```
baml_src/
├── functions/
│   ├── clinical/
│   │   ├── differential_diagnosis.baml
│   │   ├── lab_analysis.baml
│   │   ├── patient_insights.baml
│   │   └── clinical_reasoning.baml
│   ├── research/
│   │   ├── pico_generation.baml
│   │   ├── evidence_synthesis.baml
│   │   ├── literature_search.baml
│   │   └── quality_assessment.baml
│   ├── translation/
│   │   ├── clinical_translation.baml
│   │   ├── research_translation.baml
│   │   └── patient_education.baml
│   └── utilities/
│       ├── data_extraction.baml
│       ├── summarization.baml
│       └── validation.baml
├── clients/
│   ├── openrouter.baml
│   ├── gemini.baml
│   └── deepl.baml
├── types/
│   ├── clinical_types.baml
│   ├── research_types.baml
│   └── common_types.baml
└── prompts/
    ├── clinical_prompts.baml
    ├── research_prompts.baml
    └── system_prompts.baml
```

## Clinical AI Workflows

### 1. Differential Diagnosis Pipeline
```baml
function DifferentialDiagnosis(
  patient_data: PatientData,
  symptoms: SymptomList,
  lab_results: LabResults
) -> DifferentialDiagnosisResult {
  client OpenRouter
  prompt #"
    You are Dr. Corvus, an expert clinical diagnostician.
    
    Given the following patient data:
    - Demographics: {patient_data.demographics}
    - Symptoms: {symptoms.primary} {symptoms.secondary}
    - Lab Results: {lab_results.abnormal_values}
    
    Generate a prioritized differential diagnosis list with:
    1. Most likely diagnoses with confidence scores
    2. Key distinguishing features
    3. Recommended next steps
    4. Red flags to monitor
    
    Use evidence-based medicine principles and cite relevant literature.
  "#
}
```

### 2. Clinical Reasoning Engine
```baml
function ClinicalReasoning(
  case_data: ClinicalCase,
  reasoning_type: ReasoningType
) -> ReasoningResult {
  client OpenRouter
  prompt #"
    Perform {reasoning_type} analysis for this clinical case:
    
    Case: {case_data.presentation}
    Available data: {case_data.available_data}
    Clinical question: {case_data.question}
    
    Apply systematic clinical reasoning:
    1. Problem representation
    2. Hypothesis generation
    3. Hypothesis refinement
    4. Verification strategy
    5. Final diagnosis with confidence
    
    Format as structured clinical reasoning output.
  "#
}
```

### 3. Lab Results Analysis
```baml
function LabAnalysis(
  lab_results: LabResults,
  patient_context: PatientContext
) -> LabAnalysisResult {
  client OpenRouter
  prompt #"
    Analyze these laboratory results:
    
    Results: {lab_results.values}
    Reference ranges: {lab_results.ranges}
    Patient context: {patient_context}
    
    Provide:
    1. Abnormal findings with clinical significance
    2. Possible causes for abnormalities
    3. Recommended follow-up tests
    4. Clinical correlation suggestions
    5. Urgency assessment
    
    Use medical knowledge base and evidence-based guidelines.
  "#
}
```

## Research AI Workflows

### 1. PICO Question Generation
```baml
function GeneratePICO(
  clinical_question: string,
  patient_population: string,
  intervention_context: string
) -> PICOQuestion {
  client OpenRouter
  prompt #"
    Generate a structured PICO question from:
    
    Clinical question: {clinical_question}
    Population: {patient_population}
    Context: {intervention_context}
    
    Structure as:
    - P (Population): Clearly defined patient group
    - I (Intervention): Specific intervention or exposure
    - C (Comparison): Alternative intervention or control
    - O (Outcome): Measurable clinical outcome
    
    Ensure clinical relevance and research feasibility.
  "#
}
```

### 2. Evidence Synthesis
```baml
function EvidenceSynthesis(
  research_question: PICOQuestion,
  evidence_list: EvidenceList
) -> EvidenceSynthesisResult {
  client OpenRouter
  prompt #"
    Synthesize evidence for:
    PICO: {research_question}
    
    Evidence sources: {evidence_list.sources}
    
    Perform systematic synthesis:
    1. Quality assessment (GRADE methodology)
    2. Effect size estimation
    3. Heterogeneity analysis
    4. Risk of bias assessment
    5. Clinical significance interpretation
    
    Provide structured evidence synthesis with recommendations.
  "#
}
```

### 3. Literature Quality Assessment
```baml
function QualityAssessment(
  study_list: StudyList,
  assessment_type: QualityType
) -> QualityAssessmentResult {
  client OpenRouter
  prompt #"
    Assess quality of studies for {assessment_type}:
    
    Studies: {study_list.studies}
    
    Apply appropriate quality assessment:
    - RCTs: Cochrane Risk of Bias tool
    - Observational: Newcastle-Ottawa Scale
    - Systematic reviews: AMSTAR-2
    
    Provide detailed quality ratings and justification.
  "#
}
```

## Translation Workflows

### 1. Clinical Translation
```baml
function ClinicalTranslation(
  clinical_text: string,
  source_language: string,
  target_language: string
) -> TranslationResult {
  client DeepL
  fallback_client OpenRouter
  prompt #"
    Translate clinical content from {source_language} to {target_language}:
    
    Content: {clinical_text}
    
    Requirements:
    - Maintain medical accuracy
- Preserve clinical terminology
- Adapt for patient education level
- Include cultural context where relevant
    
    Use DeepL primarily, fallback to BAML for complex medical terms.
  "#
}
```

### 2. Research Translation
```baml
function ResearchTranslation(
  research_content: string,
  target_audience: AudienceType
) -> TranslationResult {
  client DeepL
  prompt #"
    Translate research content for {target_audience}:
    
    Content: {research_content}
    
    Adapt translation for:
    - Healthcare professionals: Technical accuracy
    - Patients: Simplified language
    - Students: Educational context
    
    Maintain scientific rigor while ensuring accessibility.
  "#
}
```

## Data Processing Workflows

### 1. PDF Data Extraction
```baml
function ExtractPDFData(
  pdf_content: string,
  document_type: DocumentType
) -> ExtractedData {
  client OpenRouter
  prompt #"
    Extract structured data from {document_type} PDF:
    
    Content: {pdf_content}
    
    Extract:
    1. Patient demographics
    2. Clinical findings
    3. Laboratory results
    4. Medications
    5. Diagnoses
    6. Recommendations
    
    Format as structured clinical data with confidence scores.
  "#
}
```

### 2. Image Analysis
```baml
function AnalyzeMedicalImage(
  image_description: string,
  image_type: ImageType
) -> ImageAnalysisResult {
  client OpenRouter
  prompt #"
    Analyze medical image of type {image_type}:
    
    Description: {image_description}
    
    Provide:
    1. Key visual findings
    2. Anatomical structures
    3. Pathological indicators
    4. Clinical significance
    5. Recommended follow-up
    
    Use medical imaging knowledge and evidence-based criteria.
  "#
}
```

## Validation and Quality Control

### 1. Clinical Validation
```baml
function ValidateClinicalData(
  clinical_data: ClinicalData,
  validation_rules: ValidationRules
) -> ValidationResult {
  client OpenRouter
  prompt #"
    Validate clinical data against rules:
    
    Data: {clinical_data}
    Rules: {validation_rules}
    
    Check:
    1. Data completeness
    2. Logical consistency
    3. Clinical plausibility
    4. Reference range compliance
    5. Missing data identification
    
    Provide validation report with severity levels.
  "#
}
```

### 2. Research Validation
```baml
function ValidateResearchData(
  research_data: ResearchData,
  standards: ResearchStandards
) -> ValidationResult {
  client OpenRouter
  prompt #"
    Validate research data quality:
    
    Data: {research_data}
    Standards: {standards}
    
    Validate:
    1. Methodology appropriateness
    2. Statistical significance
    3. Sample size adequacy
    4. Bias assessment
    5. Reproducibility factors
    
    Provide quality assurance report.
  "#
}
```

## Performance Optimization

### 1. Caching Strategy
```baml
function CacheStrategy(
  query_type: QueryType,
  data_size: DataSize
) -> CacheConfig {
  client OpenRouter
  prompt #"
    Determine optimal caching strategy for:
    
    Query type: {query_type}
    Data size: {data_size}
    
    Consider:
    1. Data volatility
    2. Query frequency
    3. Update patterns
    4. Memory constraints
    5. Performance requirements
    
    Recommend caching configuration with TTL and invalidation strategy.
  "#
}
```

### 2. Query Optimization
```baml
function OptimizeQuery(
  query: string,
  context: QueryContext
) -> OptimizedQuery {
  client OpenRouter
  prompt #"
    Optimize query for performance:
    
    Query: {query}
    Context: {context}
    
    Optimize:
    1. Search terms
    2. Filtering criteria
    3. Sorting strategy
    4. Pagination approach
    5. Result relevance
    
    Provide optimized query with performance considerations.
  "#
}
```

## Error Handling and Fallbacks

### 1. Error Recovery
```baml
function ErrorRecovery(
  error_context: ErrorContext,
  fallback_options: FallbackOptions
) -> RecoveryStrategy {
  client OpenRouter
  prompt #"
    Develop error recovery strategy for:
    
    Error: {error_context}
    Fallbacks: {fallback_options}
    
    Strategy:
    1. Error classification
    2. Fallback selection
    3. Graceful degradation
    4. User notification
    5. Recovery actions
    
    Provide structured recovery plan.
  "#
}
```

### 2. Quality Assurance
```baml
function QualityAssurance(
  ai_output: string,
  quality_criteria: QualityCriteria
) -> QualityReport {
  client OpenRouter
  prompt #"
    Perform quality assurance on AI output:
    
    Output: {ai_output}
    Criteria: {quality_criteria}
    
    Assess:
    1. Accuracy
    2. Completeness
    3. Relevance
    4. Consistency
    5. Clinical appropriateness
    
    Provide quality score and improvement recommendations.
  "#
}
```

## Integration Patterns

### 1. Multi-Model Orchestration
```baml
function OrchestrateModels(
  task: TaskDefinition,
  model_preferences: ModelPreferences
) -> OrchestrationResult {
  client OpenRouter
  prompt #"
    Orchestrate multiple AI models for task:
    
    Task: {task}
    Preferences: {model_preferences}
    
    Strategy:
    1. Task decomposition
    2. Model selection
    3. Load balancing
    4. Result aggregation
    5. Quality validation
    
    Provide orchestration plan with model assignments.
  "#
}
```

### 2. External Service Integration
```baml
function IntegrateExternalService(
  service_type: ServiceType,
  integration_requirements: IntegrationRequirements
) -> IntegrationPlan {
  client OpenRouter
  prompt #"
    Plan integration with external service:
    
    Service: {service_type}
    Requirements: {integration_requirements}
    
    Plan:
    1. API compatibility
    2. Authentication method
    3. Data mapping
    4. Error handling
    5. Rate limiting
    
    Provide integration specification.
  "#
}
```

## Monitoring and Observability

### 1. Performance Monitoring
```baml
function MonitorPerformance(
  metrics: PerformanceMetrics,
  thresholds: ThresholdConfig
) -> MonitoringConfig {
  client OpenRouter
  prompt #"
    Configure performance monitoring for:
    
    Metrics: {metrics}
    Thresholds: {thresholds}
    
    Monitor:
    1. Response times
    2. Error rates
    3. Resource usage
    4. Throughput
    5. User experience
    
    Provide monitoring configuration with alerts.
  "#
}
```

### 2. Usage Analytics
```baml
function TrackUsage(
  usage_data: UsageData,
  analytics_config: AnalyticsConfig
) -> AnalyticsResult {
  client OpenRouter
  prompt #"
    Track usage patterns for:
    
    Data: {usage_data}
    Config: {analytics_config}
    
    Track:
    1. Feature usage
    2. User behavior
    3. Performance trends
    4. Error patterns
    5. Optimization opportunities
    
    Provide analytics insights and recommendations.
  "#
}