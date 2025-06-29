/**
 * Tipos para o módulo de análise clínica
 */

import { LabResult } from '@/types/health'; // Ensure LabResult is imported

// Enums
export enum Severity {
  NORMAL = 'normal',
  WARNING = 'warning',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

// Frontend specific Alert Type
export interface FrontendAlertType {
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | string; 
  type: string; // e.g., 'lab_alert', 'system_alert', 'general'
  parameter?: string;
  category?: string;
  value?: string | number;
  reference?: string;
  status?: string;
  interpretation?: string;
  recommendation?: string;
}

// Frontend specific Score Result Type
export interface ScoreResultType {
  score_name: string; // e.g., "SOFA", "qSOFA", "APACHE II"
  score_value: number | string;
  interpretation?: string;
  severity?: string; // e.g., "low_risk", "high_risk"
  category?: string; // Added for displaying score category like (Glasgow 15)
  details?: Record<string, any>; // For component scores or specific parameters of the score
  // recommendations and abnormalities can be part of the main AnalysisResult or here if score-specific
}

// Interfaces base
export interface AnalysisResult { // This is what AnalysisResultType in page.tsx aliases
  interpretation: string;
  abnormalities?: string[];
  is_critical: boolean; // Changed from is_critical: boolean; to ensure it's always present as per prior usage
  recommendations?: string[];
  details: {
    lab_results: LabResult[];
    score_results?: ScoreResultType[]; // Updated from Record<string, any> or specific ScoreResult
    alerts?: FrontendAlertType[];      // Updated from Record<string, any>
  };
}

// Tipos específicos para cada análise (These extend the base AnalysisResult)
// If these specific result types have more unique fields beyond what AnalysisResult provides,
// they can be expanded. For now, they primarily serve as semantic markers.
export interface BloodGasResult extends AnalysisResult {
  acid_base_status: string; // Specific to blood gas
  compensation_status: string; // Specific to blood gas
  oxygenation_status?: string; // Specific to blood gas
}

export interface ElectrolyteResult extends AnalysisResult {}

export interface HematologyResult extends AnalysisResult {}

export interface RenalResult extends AnalysisResult {}

export interface HepaticResult extends AnalysisResult {}

export interface CardiacResult extends AnalysisResult {}

export interface MicrobiologyResult extends AnalysisResult {}

export interface MetabolicResult extends AnalysisResult {}

// Interfaces para entrada de dados (These are for API request payloads, mostly for specific backend endpoints)
export interface BloodGasInput {
  ph: number;
  pco2: number;
  hco3: number;
  po2?: number;
  o2sat?: number;
  be?: number;
  lactate?: number;
  patient_id?: number;
}

export interface ElectrolyteInput {
  sodium?: number;
  potassium?: number;
  chloride?: number;
  bicarbonate?: number;
  calcium?: number;
  magnesium?: number;
  phosphorus?: number;
  patient_info?: Record<string, any>;
}

export interface HematologyInput {
  hemoglobin?: number;
  hematocrit?: number;
  rbc?: number;
  wbc?: number;
  platelet?: number;
  neutrophils?: number;
  lymphocytes?: number;
  monocytes?: number;
  eosinophils?: number;
  basophils?: number;
  patient_info?: Record<string, any>;
}

// This existing ScoreResult might be for backend score calculation responses, keeping it separate
// from FrontendScoreResultType which is for display within AnalysisResult.details
export interface ScoreResult { 
  score: number;
  category: string;
  mortality_risk: number;
  interpretation: string;
  component_scores?: Record<string, number>;
  recommendations?: string[];
  abnormalities?: string[];
  is_critical: boolean;
  details: Record<string, any>; // This details might be different from AnalysisResult.details
}

export interface SofaInput {
  respiratory_pao2_fio2?: number;
  coagulation_platelets?: number;
  liver_bilirubin?: number;
  cardiovascular_map?: number;
  cns_glasgow?: number;
  renal_creatinine?: number;
  renal_urine_output?: number;
} 