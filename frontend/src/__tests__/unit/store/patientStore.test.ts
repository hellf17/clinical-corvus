import { usePatientStore, Patient, Exam, LabResult, VitalSigns } from '@/store/patientStore';
import { act } from 'react';
import { render, screen } from '@testing-library/react';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('patientStore', () => {
  // Helper to create a test patient
  const createTestPatient = (name: string = 'Test Patient') => ({
    name,
    dateOfBirth: '1980-01-01',
    gender: 'male' as const,
    medicalRecord: '12345',
    hospital: 'Test Hospital',
    admissionDate: '2023-01-01',
    anamnesis: 'Test anamnesis',
    diagnosticHypotheses: 'Test diagnosis',
  });

  // Calculate expected age dynamically based on current year
  const getExpectedAge = (birthYear: number) => {
    const today = new Date();
    return today.getFullYear() - birthYear;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store to initial state
    usePatientStore.setState({
      patients: [],
      selectedPatientId: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initialization', () => {
    it('should initialize with empty patients array', () => {
      const state = usePatientStore.getState();
      expect(state.patients).toEqual([]);
      expect(state.selectedPatientId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('patient management', () => {
    it('should add a patient', () => {
      const patientData = createTestPatient();
      
      act(() => {
        usePatientStore.getState().addPatient(patientData);
      });
      
      const state = usePatientStore.getState();
      expect(state.patients.length).toBe(1);
      expect(state.patients[0].name).toBe(patientData.name);
      expect(state.patients[0].dateOfBirth).toBe(patientData.dateOfBirth);
      // Use dynamic age expectation since it depends on current year
      expect(state.patients[0].age).toBe(getExpectedAge(1980));
      expect(state.patients[0].exams).toEqual([]);
      expect(state.patients[0].vitalSigns).toEqual([]);
    });

    it('should update a patient', () => {
      // Add a patient first
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient());
      });
      
      const state = usePatientStore.getState();
      const patientId = state.patients[0].id;
      
      // Update the patient
      act(() => {
        usePatientStore.getState().updatePatient(patientId, {
          name: 'Updated Name',
          diagnosticHypotheses: 'Updated diagnosis',
        });
      });
      
      const updatedState = usePatientStore.getState();
      expect(updatedState.patients[0].name).toBe('Updated Name');
      expect(updatedState.patients[0].diagnosticHypotheses).toBe('Updated diagnosis');
      expect(updatedState.patients[0].primary_diagnosis).toBe('Updated diagnosis');
    });

    it('should delete a patient', () => {
      // Add two patients
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient('Patient 1'));
      });
      
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient('Patient 2'));
      });
      
      const state = usePatientStore.getState();
      expect(state.patients.length).toBe(2);
      
      // Get the ID of Patient 2
      const patientToDeleteId = state.patients.find(p => p.name === 'Patient 2')?.id;
      
      // Delete Patient 2
      act(() => {
        usePatientStore.getState().deletePatient(patientToDeleteId!);
      });
      
      const updatedState = usePatientStore.getState();
      expect(updatedState.patients.length).toBe(1);
      expect(updatedState.patients[0].name).toBe('Patient 1');
    });

    it('should select a patient', () => {
      // Add a patient
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient());
      });
      
      const state = usePatientStore.getState();
      const patientId = state.patients[0].id;
      
      // Select the patient
      act(() => {
        usePatientStore.getState().selectPatient(patientId);
      });
      
      const updatedState = usePatientStore.getState();
      expect(updatedState.selectedPatientId).toBe(patientId);
    });

    it('should get a patient by id', () => {
      // Add a patient
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient());
      });
      
      const state = usePatientStore.getState();
      const patientId = state.patients[0].id;
      
      // Get the patient
      const patient = usePatientStore.getState().getPatient(patientId);
      
      expect(patient).not.toBeUndefined();
      expect(patient?.name).toBe('Test Patient');
      expect(patient?.lab_results).toEqual([]);
    });

    it('should respect guest user limit', () => {
      // Mock localStorage to simulate a guest user
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null);
      
      // Add 5 patients (the guest limit)
      for (let i = 0; i < 5; i++) {
        act(() => {
          usePatientStore.getState().addPatient(createTestPatient(`Patient ${i+1}`));
        });
      }
      
      // Try to add a 6th patient
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient('Patient 6'));
      });
      
      // Check that the error was set and patient wasn't added
      const state = usePatientStore.getState();
      expect(state.patients.length).toBe(5);
      expect(state.error).toBe('Limite de 5 pacientes atingido no modo convidado. Faça login para adicionar mais.');
    });
  });

  describe('exam management', () => {
    let patientId: string;
    
    beforeEach(() => {
      // Add a patient
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient());
      });
      
      patientId = usePatientStore.getState().patients[0].id;
    });
    
    it('should add an exam to a patient', () => {
      const examData: Omit<Exam, 'id'> = {
        date: '2023-01-15',
        type: 'laboratorial',
        file: 'test.pdf',
        results: [
          {
            id: '1',
            name: 'Hemoglobina',
            test: 'Hemoglobina',
            date: '2023-01-15',
            value: 13.5,
            unit: 'g/dL',
            referenceRange: '12-16',
            isAbnormal: false,
          },
        ],
      };
      
      act(() => {
        usePatientStore.getState().addExam(patientId, examData);
      });
      
      const patient = usePatientStore.getState().getPatient(patientId);
      expect(patient?.exams.length).toBe(1);
      expect(patient?.exams[0].date).toBe('2023-01-15');
      expect(patient?.exams[0].results.length).toBe(1);
      expect(patient?.exams[0].results[0].name).toBe('Hemoglobina');
      
      // Check lab_results was updated
      expect(patient?.lab_results?.length).toBe(1);
      expect(patient?.lab_results?.[0].name).toBe('Hemoglobina');
    });
    
    it('should delete an exam from a patient', () => {
      // Add an exam first
      const examData: Omit<Exam, 'id'> = {
        date: '2023-01-15',
        type: 'laboratorial',
        file: 'test.pdf',
        results: [],
      };
      
      act(() => {
        usePatientStore.getState().addExam(patientId, examData);
      });
      
      const patient = usePatientStore.getState().getPatient(patientId);
      const examId = patient?.exams[0].id as string;
      
      // Delete the exam
      act(() => {
        usePatientStore.getState().deleteExam(patientId, examId);
      });
      
      const updatedPatient = usePatientStore.getState().getPatient(patientId);
      expect(updatedPatient?.exams.length).toBe(0);
      expect(updatedPatient?.lab_results?.length).toBe(0);
    });
  });

  describe('vital signs management', () => {
    let patientId: string;
    
    beforeEach(() => {
      // Add a patient
      act(() => {
        usePatientStore.getState().addPatient(createTestPatient());
      });
      
      patientId = usePatientStore.getState().patients[0].id;
    });
    
    it('should add vital signs to a patient', () => {
      const vitalSignsData: Omit<VitalSigns, 'id'> = {
        date: '2023-01-15',
        temperature: 37.0,
        heartRate: 80,
        respiratoryRate: 16,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        oxygenSaturation: 98,
        Glasgow: 15,
      };
      
      act(() => {
        usePatientStore.getState().addVitalSigns(patientId, vitalSignsData);
      });
      
      const patient = usePatientStore.getState().getPatient(patientId);
      expect(patient?.vitalSigns.length).toBe(1);
      expect(patient?.vitalSigns[0].date).toBe('2023-01-15');
      expect(patient?.vitalSigns[0].temperature).toBe(37.0);
    });
    
    it('should update vital signs of a patient', () => {
      // Add vital signs first
      const vitalSignsData: Omit<VitalSigns, 'id'> = {
        date: '2023-01-15',
        temperature: 37.0,
        heartRate: 80,
        respiratoryRate: 16,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        oxygenSaturation: 98,
        Glasgow: 15,
      };
      
      act(() => {
        usePatientStore.getState().addVitalSigns(patientId, vitalSignsData);
      });
      
      // Update vital signs
      act(() => {
        usePatientStore.getState().updateVitalSigns(patientId, '2023-01-15', {
          temperature: 38.5,
          heartRate: 90,
        });
      });
      
      const patient = usePatientStore.getState().getPatient(patientId);
      expect(patient?.vitalSigns[0].temperature).toBe(38.5);
      expect(patient?.vitalSigns[0].heartRate).toBe(90);
      expect(patient?.vitalSigns[0].respiratoryRate).toBe(16); // Unchanged
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      // Set an error
      act(() => {
        usePatientStore.setState({ error: 'Test error' });
      });
      
      expect(usePatientStore.getState().error).toBe('Test error');
      
      // Clear error
      act(() => {
        usePatientStore.getState().clearError();
      });
      
      expect(usePatientStore.getState().error).toBeNull();
    });
  });
}); 