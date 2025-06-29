// Corresponds to backend schema schemas.health_diary.HealthDiaryEntry

export interface HealthDiaryEntry {
  entry_id: number;
  patient_id: number;
  content: string;
  created_at: string; // ISO date string
}

// Corresponds to backend schema schemas.health_diary.HealthDiaryEntryCreate
export interface HealthDiaryEntryCreate {
  content: string;
} 