/**
 * Represents a single laboratory test result fetched from the backend.
 */
export interface LabResult {
  result_id: number;
  patient_id: number;
  exam_id?: number | null;
  user_id: number;
  category_id?: number | null;
  test_name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string | null;
  timestamp: string; // ISO 8601 date string
  reference_range_low?: number | null;
  reference_range_high?: number | null;
  is_abnormal?: boolean | null;
  collection_datetime?: string | null; // ISO 8601 date string
  created_at: string; // ISO 8601 date string
  created_by?: number | null;
  test_category_id?: number | null;
  reference_text?: string | null;
  comments?: string | null;
  updated_at?: string | null; // ISO 8601 date string
  report_datetime?: string | null; // ISO 8601 date string
}

/**
 * Represents the structure of the paginated response for lab results.
 */
export interface PaginatedLabResultsResponse {
    items: LabResult[];
    total: number;
}

/**
 * Represents a single Vital Sign record fetched from the backend.
 * Matches the VitalSign schema in backend-api/schemas/vital_sign.py
 */
export interface VitalSign {
  vital_id: number;
  patient_id: number;
  timestamp: string; // ISO 8601 date string
  temperature_c?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  oxygen_saturation?: number | null;
  glasgow_coma_scale?: number | null;
  fio2_input?: number | null;
  created_at: string; // ISO 8601 date string
}

/**
 * Represents the input structure for creating a Vital Sign record.
 * Matches the VitalSignCreate schema in backend-api/schemas/vital_sign.py
 */
export interface VitalSignCreateInput {
  timestamp: string | Date;
  temperature_c?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  oxygen_saturation?: number | null;
  glasgow_coma_scale?: number | null;
  fio2_input?: number | null;
}

/**
 * Represents the structure for individual score results within the CalculatedScoresResponse.
 */
interface ScoreResult {
  score?: number;
  components?: Record<string, number>;
  interpretation?: string[];
  estimated_mortality?: number;
}

interface GfrResult {
  tfg_ml_min_173m2?: number | null;
  classification_kdigo?: string;
}

/**
 * Represents the response structure for the calculated scores endpoint.
 * Matches CalculatedScoresResponse in backend-api/routers/scores.py
 */
export interface CalculatedScoresResponse {
  patient_id: number;
  calculated_at: string; // ISO 8601 date string
  sofa?: ScoreResult | null;
  qsofa?: ScoreResult | null; 
  apache_ii?: ScoreResult | null;
  gfr_ckd_epi?: GfrResult | null;
  news2?: ScoreResult | null;
}

export interface HealthDiaryEntry {
  entry_id: number;
  content: string;
  created_at: string;
}

export interface HealthDiaryEntryCreate {
  content: string;
}

export interface ManualLabResultInput {
  test_name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string | null;
  timestamp: string | Date;
  collection_datetime?: string | Date | null;
  reference_range_low?: number | null;
  reference_range_high?: number | null;
  comments?: string | null;
} 