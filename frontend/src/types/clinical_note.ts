export type NoteType = 'evolution' | 'admission' | 'discharge' | 'procedure' | 'consultation' | 'other';

export interface ClinicalNote {
  id: string;
  title: string;
  content: string;
  note_type: NoteType;
  patient_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicalNoteCreate {
  title: string;
  content: string;
  note_type: NoteType;
  patient_id: string;
}

export interface ClinicalNoteUpdate {
  title?: string;
  content?: string;
  note_type?: NoteType;
}

export interface ClinicalNoteList {
  notes: ClinicalNote[];
  total: number;
} 