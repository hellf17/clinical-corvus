/**
 * Types for lab analysis results
 */

export interface LabAnalysisResult {
  summary?: string;
  critical_alerts?: string[];
  insights?: string;
  message?: string;
  filename?: string;
  lab_results?: LabResult[];
  analysis_results?: { [key: string]: SystemAnalysis };
  generated_alerts?: any[];
  exam_timestamp?: string;
  hematology?: SystemAnalysis;
  hepatic?: SystemAnalysis;
  renal?: SystemAnalysis;
  cardiac?: SystemAnalysis;
  metabolic?: SystemAnalysis;
  electrolytes?: SystemAnalysis;
  microbiology?: SystemAnalysis;
}

export interface SystemAnalysis {
  summary?: string;
  details?: string[];
  abnormalities?: string[];
  recommendations?: string[];
  interpretation?: string;
  is_critical?: boolean;
}

export interface LabResult {
  id?: number;
  patient_id?: number;
  exam_id?: number;
  parameter: string;
  value: number | string;
  unit: string;
  reference_range: string;
  interpretation?: string;
  timestamp?: string;
  abnormal?: boolean;
  critical?: boolean;
}