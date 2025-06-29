import axios from 'axios';
import { ClinicalNote, ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNoteList, NoteType } from '../types/clinical_note';
import { API_URL } from '@/lib/config';

export const clinicalNoteService = {
  async getNotes(patientId: string, noteType?: NoteType): Promise<ClinicalNoteList> {
    let url = `${API_URL}/api/clinical-notes/patient/${patientId}`;
    if (noteType) {
      url += `?note_type=${noteType}`;
    }
    const response = await axios.get<ClinicalNoteList>(url);
    return response.data;
  },

  async getNote(noteId: string): Promise<ClinicalNote> {
    const response = await axios.get<ClinicalNote>(`${API_URL}/api/clinical-notes/${noteId}`);
    return response.data;
  },

  async createNote(note: ClinicalNoteCreate): Promise<ClinicalNote> {
    const response = await axios.post<ClinicalNote>(`${API_URL}/api/clinical-notes/`, note);
    return response.data;
  },

  async createNoteForPatient(patientId: string, note: Omit<ClinicalNoteCreate, 'patient_id'>): Promise<ClinicalNote> {
    const response = await axios.post<ClinicalNote>(`${API_URL}/api/clinical-notes/patient/${patientId}`, note);
    return response.data;
  },

  async updateNote(noteId: string, note: ClinicalNoteUpdate): Promise<ClinicalNote> {
    const response = await axios.put<ClinicalNote>(`${API_URL}/api/clinical-notes/${noteId}`, note);
    return response.data;
  },

  async updateNoteForPatient(patientId: string, noteId: string, note: ClinicalNoteUpdate): Promise<ClinicalNote> {
    const response = await axios.put<ClinicalNote>(`${API_URL}/api/clinical-notes/patient/${patientId}/${noteId}`, note);
    return response.data;
  },

  async deleteNote(noteId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/clinical-notes/${noteId}`);
  },

  async deleteNoteForPatient(patientId: string, noteId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/clinical-notes/patient/${patientId}/${noteId}`);
  }
}; 