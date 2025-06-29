import { MedicationFrequency, MedicationRoute, MedicationStatus } from "./enums"; // Assuming enums.ts exists or will be created

// Aligned with backend models.Medication and schemas.Medication
export interface Medication {
  medication_id: number;
  name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  raw_frequency?: string; // Optional raw text field
  start_date: string; // ISO Date string
  end_date?: string | null; // ISO Date string or null
  status: MedicationStatus; // Use enum
  notes?: string;
  patient_id: number;
  created_at: string; // ISO DateTime string
  updated_at: string; // ISO DateTime string
  prescriber?: string;
  active?: boolean; // From backend model
  user_id?: number; // From backend model
}

// Assuming Create/Update schemas match backend
export interface MedicationCreate {
  name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  raw_frequency?: string;
  start_date: string;
  end_date?: string | null;
  status: MedicationStatus;
  notes?: string;
  patient_id: number;
  prescriber?: string;
  active?: boolean;
}

export interface MedicationUpdate {
  name?: string;
  dosage?: string;
  route?: MedicationRoute;
  frequency?: MedicationFrequency;
  raw_frequency?: string;
  start_date?: string;
  end_date?: string | null;
  status?: MedicationStatus;
  notes?: string;
  prescriber?: string;
  active?: boolean;
}

export interface MedicationList {
  items: Medication[];
  total: number;
} 