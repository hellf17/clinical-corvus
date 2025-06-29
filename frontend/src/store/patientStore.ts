import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LabResult, VitalSign } from '@/types/health';

export interface Exam {
  exam_id: number;
  patient_id: number;
  exam_timestamp?: string;
  type?: string;
  exam_type?: string;
  exam_type_name?: string;
  file?: string;
  lab_results: LabResult[];
  notes?: string;
}

export interface Patient {
  patient_id: number;
  name: string;
  email?: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  documentNumber?: string;
  patientNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt?: string;
  updatedAt?: string;
  medicalRecord?: string;
  hospital?: string;
  admissionDate?: string;
  anamnesis?: string;
  physicalExamFindings?: string;
  diagnosticHypotheses?: string;
  primary_diagnosis?: string;
  exams: Exam[];
  vitalSigns: VitalSign[];
  age?: number;
  lab_results?: LabResult[];
  user_id?: string | null;
}

interface PatientState {
  setPatients: (patients: Patient[]) => void;
  
  patients: Patient[];
  selectedPatientId: number | null;
  isLoading: boolean;
  error: string | null;
  
  fetchInitialPatients: () => Promise<void>;
  addPatient: (patient: Omit<Patient, 'patient_id' | 'exams' | 'vitalSigns' | 'lab_results' | 'age'>) => Promise<void>;
  updatePatient: (patient_id: number, data: Partial<Omit<Patient, 'patient_id' | 'exams' | 'vitalSigns' | 'lab_results' | 'age'>>) => Promise<void>;
  deletePatient: (patient_id: number) => Promise<void>;
  selectPatient: (patient_id: number | null) => void;
  getPatient: (patient_id: number) => Patient | undefined;
  
  addExam: (patient_id: number, exam: Omit<Exam, 'exam_id' | 'patient_id'>, token: string) => Promise<void>;
  deleteExam: (patient_id: number, exam_id: number, token: string) => Promise<void>;
  
  addVitalSigns: (patient_id: number, vitalSigns: Omit<VitalSign, 'vital_id' | 'patient_id'>, token: string) => Promise<void>;
  
  clearError: () => void;
}

// Função para calcular idade a partir da data de nascimento
const calculateAge = (birthDate: string): number | undefined => {
  if (!birthDate) return undefined;
  try {
    const bd = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    console.error("Error calculating age:", e);
    return undefined;
  }
};

// --- Assume Service Interaction happens via imported functions ---
import {
  createPatientClient,
  deletePatientClient,
  getPatientByIdClient,
  getPatientsClient,
  addExamClient,
  deleteExamClient,
  addVitalSignClient,
} from '@/services/patientService.client';

// --- Store Implementation ---
export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      patients: [],
      selectedPatientId: null,
      isLoading: true,
      error: null,
      
      setPatients: (patients) => set({ patients }),

      fetchInitialPatients: async () => {
        // ... (keep fetch logic using getPatientsService)
      },

      addPatient: async (patientData) => {
        // ... (keep add logic using createPatientService)
      },

      updatePatient: async (patient_id, data) => {
        // TODO: Implement updatePatientClient and use it here if needed
        throw new Error('updatePatient is not implemented for client-side store.');
      },

      deletePatient: async (patient_id) => {
        // ... (keep delete logic using deletePatientService)
      },

      selectPatient: (patient_id) => {
        // ... (keep select logic)
      },

      getPatient: (patient_id) => {
        return get().patients.find(p => p.patient_id === patient_id);
      },

      addExam: async (patient_id, examData, token) => {
        // Ensure exam_timestamp is provided before sending to client
        const dataToSend = {
          ...examData,
          exam_timestamp: examData.exam_timestamp || new Date().toISOString()
        };
        await addExamClient(patient_id, dataToSend, token);
        // TODO: Optionally update the local state if addExamClient doesn't trigger a refetch
      },

      deleteExam: async (patient_id, exam_id, token) => {
        await deleteExamClient(patient_id, exam_id, token);
      },

      addVitalSigns: async (patient_id, vitalSignsData, token) => {
        await addVitalSignClient(patient_id, vitalSignsData, token);
      },

      clearError: () => set({ error: null }),

    }),
    {
      name: 'patient-storage', 
      partialize: (state) => ({ 
          patients: state.patients, 
          selectedPatientId: state.selectedPatientId 
      }), 
    }
  )
); 