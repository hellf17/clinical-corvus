export interface PICOQuestion {
  patient_population: string;
  intervention: string;
  comparison?: string;
  outcome: string;
  time_frame?: string;
  study_type?: string;
}

export interface DeepResearchRequest {
  user_original_query: string;
  pico_question?: {
    patient_population?: string;
    intervention?: string;
    comparison?: string;
    outcome?: string;
  };
  research_focus?: string;
  target_audience?: string;
}

export interface RawSearchResultItem {
  source: string;
  title: string;
  url?: string;
  snippet_or_abstract: string;
  publication_date?: string;
  authors?: string[];
  journal?: string;
  pmid?: string;
  doi?: string;
  study_type?: string;
  citation_count?: number;
}

export interface EvidenceTheme {
  theme_name: string;
  key_findings: string[];
  strength_of_evidence: string;
  supporting_studies_count: number;
}

export interface ResearchMetrics {
  total_articles_analyzed: number;
  sources_consulted: string[];
  search_duration_seconds: number;
  quality_filters_applied: string[];
  date_range_searched: string;
  unique_journals_found: number;
  high_impact_studies_count: number;
  recent_studies_count: number; // last 3 years
  systematic_reviews_count: number;
  rct_count: number;
  cite_source_metrics?: CiteSourceMetrics;
}

export interface SynthesizedResearchOutput {
  original_query: string;
  executive_summary: string;
  key_findings_by_theme: EvidenceTheme[];
  evidence_quality_assessment: string;
  clinical_implications: string[];
  research_gaps_identified: string[];
  relevant_references: RawSearchResultItem[];
  search_strategy_used: string;
  limitations: string[];
  research_metrics?: ResearchMetrics;
  professional_detailed_reasoning_cot?: string;
  disclaimer: string;
}

export interface FormulatedSearchStrategyOutput {
  refined_query_for_llm_synthesis: string;
  search_parameters_list: SearchParameters[];
  search_rationale: string;
  expected_evidence_types: string[];
  disclaimer: string;
}

export interface SearchParameters {
  source: string;
  query_string: string;
  max_results?: number;
  study_type_filter?: string;
  date_range_years?: number;
  language_filter?: string;
}

export interface PDFAnalysisOutput {
  document_type: string;
  key_findings: string[];
  methodology_summary: string;
  clinical_relevance: string;
  evidence_quality: string;
  recommendations: string[];
  limitations: string[];
  structured_summary: string;
}

export interface EvidenceAppraisalRequest {
  clinical_question_PICO: string;
  evidence_summary_or_abstract: string;
  study_type_if_known?: string;
}

export interface PICOFormulationRequest {
  clinical_scenario: string;
  additional_context?: string;
}

export interface PICOFormulationOutput {
  structured_pico_question: PICOQuestion;
  explanation: string;
  pico_derivation_reasoning: string;
  search_terms_suggestions: string[];
  boolean_search_strategies: string[];
  alternative_pico_formulations?: string[];
  recommended_study_types: string[];
  disclaimer: string;
}

// Enums para filtros
export enum ResearchFocus {
  TREATMENT = "treatment",
  DIAGNOSIS = "diagnosis", 
  PROGNOSIS = "prognosis",
  ETIOLOGY = "etiology",
  PREVENTION = "prevention"
}

export enum TargetAudience {
  MEDICAL_STUDENT = "medical_student",
  PRACTICING_PHYSICIAN = "practicing_physician",
  SPECIALIST = "specialist",
  RESEARCHER = "researcher"
}

// NEW: CiteSource Integration Types
export interface CiteSourceMetrics {
  total_sources_consulted: number;
  original_results_count: number;
  deduplicated_results_count: number;
  deduplication_rate: number; // 0.0 to 1.0
  overall_quality_score: number; // 0.0 to 1.0
  coverage_score: number; // 0.0 to 1.0
  diversity_score: number; // 0.0 to 1.0
  recency_score: number; // 0.0 to 1.0
  impact_score: number; // 0.0 to 1.0
  source_balance_score: number; // 0.0 to 1.0
  best_performing_source: string;
  processing_time_ms: number;
  key_quality_insights: string[];
}

export interface SourcePerformanceMetrics {
  source_name: string;
  total_results: number;
  unique_contributions: number;
  quality_score: number; // 0.0 to 1.0
  response_time_ms: number;
  recent_publications_count: number;
  high_impact_count: number;
}

export interface DeduplicationSummary {
  original_count: number;
  deduplicated_count: number;
  removed_duplicates: number;
  deduplication_rate: number; // 0.0 to 1.0
  efficiency_score: number;
}

export interface CiteSourceAnalysisResult {
  deduplication_summary: DeduplicationSummary;
  source_performance: SourcePerformanceMetrics[];
  quality_assessment: QualityScores;
  processing_insights: string[];
  recommendations: string[];
  processing_metadata: {
    total_processing_time_ms: number;
    sources_analyzed: number;
    timestamp: string;
    version: string;
  };
}

export interface QualityScores {
  overall_score: number;
  coverage_score: number;
  diversity_score: number;
  recency_score: number;
  impact_score: number;
  source_balance_score: number;
} 