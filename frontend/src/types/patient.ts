/**
 * Types for patient data
 */

import { Medication } from "./medication"; // Import Medication type
import { LabResult, VitalSign } from "./health"; // Import LabResult AND VitalSign

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  patient_id: number;
  name: string;
  birthDate: string;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  ethnicity?: string;
  comorbidities?: string;
  primary_diagnosis?: string;
  secondary_diagnosis?: string;
  admission_date?: string;
  createdAt?: string;
  updatedAt?: string;
  exams?: Exam[];
  vitalSigns?: VitalSign[];
  age?: number;
  medications?: Medication[];
  user_id?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  documentNumber?: string;
  patientNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContact?: EmergencyContact;
  diseaseHistory?: string;
  familyDiseaseHistory?: string;
}

export interface PatientCreate {
  name: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  primary_diagnosis?: string;
  weight?: number;
  height?: number;
  ethnicity?: string;
  comorbidities?: string;
  group_id?: number; // Add optional group assignment
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  documentNumber?: string;
  patientNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContact?: EmergencyContact;
  diseaseHistory?: string;
  familyDiseaseHistory?: string;
}

export interface PatientUpdate {
  name?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  ethnicity?: string;
  comorbidities?: string;
  primary_diagnosis?: string;
  secondary_diagnosis?: string;
  admission_date?: string;
  group_id?: number; // Add optional group assignment
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  documentNumber?: string;
  patientNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContact?: EmergencyContact;
  diseaseHistory?: string;
  familyDiseaseHistory?: string;
}

export interface PatientList {
  patients: Patient[];
  total: number;
}

// Simplified type for patient list view
export interface PatientSummary {
  patient_id: number; // Matches backend schema
  name: string;
  diagnostico?: string; // Diagnosis hypothesis or primary
}

// Type for paginated patient list response
export interface PatientListResponse {
  items: PatientSummary[];
  total: number;
}

// Define ExamStatus string literal type for frontend
export type ExamProcessingStatus = "pending" | "processing" | "processed" | "error";

export interface Exam {
  exam_id: number;
  patient_id: number;
  user_id?: number; // Added user_id (uploader)
  exam_timestamp: string; // Renamed from 'date', ISO 8601 date string
  upload_timestamp?: string; // Added, ISO 8601 date string
  exam_type?: string; // Replaces 'type', e.g., "Blood Panel"
  source_file_name?: string | null;
  source_file_path?: string | null;
  processing_status?: ExamProcessingStatus;
  processing_log?: string | null;
  lab_results: LabResult[]; // Replaces 'results', now typed
  notes?: string;
  // file?: string; // Optional: keep if frontend still uses it for display, though backend has source_file_name/path
} 