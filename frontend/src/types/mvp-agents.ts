/**
 * TypeScript types for MVP Agents - Week 3 Implementation
 *
 * Defines all interfaces for clinical research agent and clinical discussion agent
 */

export interface ClinicalQueryRequest {
  query: string;
  patient_id?: string;
  include_patient_context?: boolean;
  query_type?: 'research' | 'lab_analysis' | 'clinical_reasoning' | 'general';
}

export interface ClinicalCaseDiscussionRequest {
  case_description: string;
  patient_id?: string;
  include_patient_context?: boolean;
}

export interface FollowUpDiscussionRequest {
  follow_up_question: string;
  conversation_id?: number;
}

export interface AgentResponse {
  success: boolean;
  agent_type: 'clinical_research' | 'clinical_discussion';
  response: ClinicalQueryResponse | ClinicalDiscussionResponse;
  timestamp: string;
  error?: string;
}

// Clinical Research Agent Response Types
export interface ClinicalQueryResponse {
  original_query: string;
  analysis_type: 'research' | 'lab_analysis' | 'clinical_reasoning';
  result: ResearchResult | LabAnalysisResult | ClinicalReasoningResult;
  patient_context_used: boolean;
  service_used: string;
  execution_time_seconds?: number;
}

export interface ResearchResult {
  executive_summary: string;
  detailed_results: string;
  key_findings_by_theme: ResearchFinding[];
  evidence_quality_assessment: string;
  clinical_implications: string[];
  research_gaps_identified: string[];
  relevant_references: ResearchReference[];
  search_strategy_used: string;
  limitations: string[];
  research_metrics?: ResearchMetrics;
}

export interface ResearchFinding {
  theme_name: string;
  key_findings: string[];
  strength_of_evidence: string;
  supporting_studies_count: number;
}

export interface ResearchReference {
  reference_id: number;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  url?: string;
  study_type: string;
  synthesis_relevance_score?: number;
}

export interface ResearchMetrics {
  total_articles_analyzed: number;
  sources_consulted: string[];
  search_duration_seconds: number;
  unique_journals: number;
  study_composition: StudyComposition;
  quality_metrics: QualityMetrics;
}

export interface StudyComposition {
  systematic_reviews: number;
  randomized_trials: number;
  cohort_studies: number;
  case_control_studies: number;
  other_studies: number;
}

export interface QualityMetrics {
  high_impact_studies: number;
  recent_studies: number;
  studies_with_doi: number;
  average_relevance_score: number;
}

export interface LabAnalysisResult {
  summary: string;
  abnormal_findings: string[];
  recommendations: string[];
  correlations: string[];
  follow_up_suggestions: string[];
  clinical_significance: string;
}

export interface ClinicalReasoningResult {
  assessment: string;
  differential_diagnosis: string[];
  next_steps: string[];
  red_flags: string[];
  clinical_pearls: string[];
}

// Clinical Discussion Agent Response Types
export interface ClinicalDiscussionResponse {
  case_description: string;
  analysis: CaseAnalysis;
  discussion: ClinicalDiscussion;
  patient_context_included: boolean;
  conversation_id: number;
}

export interface CaseAnalysis {
  needs_research: boolean;
  case_type: string;
  urgency_level: 'low' | 'medium' | 'high';
  key_symptoms: string[];
  possible_diagnoses: string[];
  recommended_tests: string[];
  mock_analysis?: boolean;
}

export interface ClinicalDiscussion {
  clinical_reasoning: ClinicalReasoning;
  differential_diagnosis: DifferentialDiagnosis;
  management_plan: ManagementPlan;
  patient_specific_considerations: PatientConsiderations;
  follow_up_questions: string[];
}

export interface ClinicalReasoning {
  assessment: string;
  key_findings: string[];
  rationale: string;
  clinical_pearls: string[];
}

export interface DifferentialDiagnosis {
  primary_diagnoses: string[];
  rationale: string;
  distinguishing_features: string[];
  red_flags: string[];
}

export interface ManagementPlan {
  immediate_actions: string[];
  diagnostic_workup: string[];
  treatment_considerations: string[];
  monitoring_plan: string[];
  follow_up_schedule: string;
}

export interface PatientConsiderations {
  medication_interactions: string[];
  comorbidities: string[];
  lab_correlations: string[];
  age_considerations: string;
  social_factors: string[];
  note?: string;
}

// Conversation History Types
export interface ConversationHistoryResponse {
  success: boolean;
  conversation_history: ConversationEntry[];
  count: number;
  timestamp: string;
}

export interface ConversationEntry {
  case_description: string;
  patient_id?: string;
  analysis: CaseAnalysis;
  discussion: ClinicalDiscussion;
  timestamp: string;
  patient_context_used: boolean;
}

// Follow-up Discussion Types
export interface FollowUpDiscussionResponse {
  follow_up_question: string;
  response: FollowUpResponse;
  conversation_id: number;
  agent_type: 'clinical_discussion';
}

export interface FollowUpResponse {
  answer: string;
  related_to_previous: boolean;
  previous_case_summary: string;
  additional_insights: string[];
  suggested_actions: string[];
}

// Health Check Types
export interface HealthCheckResponse {
  timestamp: string;
  agents_available: boolean;
  security_available: boolean;
  overall_status: 'healthy' | 'degraded' | 'error';
  components: {
    [key: string]: {
      status: 'available' | 'unavailable' | 'error';
      type: string;
      error?: string;
    };
  };
  frontend_status: 'ok' | 'error';
  backend_status: 'ok' | 'unreachable' | 'error';
}

// Error Types
export interface AgentError {
  error: string;
  agent_type: 'clinical_research' | 'clinical_discussion';
  error_type: string;
  timestamp: string;
  context?: {
    patient_id?: string;
    query_type?: string;
    conversation_id?: number;
  };
}

// Component Props Types
export interface ClinicalDiscussionProps {
  patientId?: string;
  onDiscussionComplete?: (result: ClinicalDiscussionResponse) => void;
  onError?: (error: AgentError) => void;
  className?: string;
}

export interface AgentQueryInterfaceProps {
  patientId?: string;
  onQueryComplete?: (result: ClinicalQueryResponse) => void;
  onError?: (error: AgentError) => void;
  className?: string;
}

export interface ConversationHistoryProps {
  limit?: number;
  onHistoryLoad?: (history: ConversationEntry[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Loading and State Types
export interface AgentLoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
}

export interface AgentUIState {
  activeTab: 'discussion' | 'query' | 'history';
  isExpanded: boolean;
  showPatientContext: boolean;
  selectedPatientId?: string;
}

// Utility Types
export type AgentType = 'clinical_research' | 'clinical_discussion';
export type QueryType = 'research' | 'lab_analysis' | 'clinical_reasoning' | 'general';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type AgentStatus = 'available' | 'unavailable' | 'error';