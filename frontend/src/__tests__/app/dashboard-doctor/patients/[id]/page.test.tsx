import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientDetailPage from '@/app/dashboard-doctor/patients/[id]/page';

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useParams: () => ({
    id: '1',
  }),
}));

// Mock the patient store
const mockUsePatientStore = jest.fn();

jest.mock('@/store/patientStore', () => ({
  usePatientStore: () => mockUsePatientStore(),
}));

describe('Patient Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders patient information when patient exists', () => {
    // Mock the store to return a patient
    mockUsePatientStore.mockReturnValue({
      patients: [],
      selectedPatientId: null,
      getPatient: (id: number) => {
        if (id === 1) {
          return {
            patient_id: 1,
            name: 'John Doe',
            primary_diagnosis: 'Hypertension',
          };
        }
        return null;
      },
    });
    
    render(<PatientDetailPage />);
    
    expect(screen.getByText('Resumo do Paciente (App Router)')).toBeInTheDocument();
    expect(screen.getByText('Nome: John Doe')).toBeInTheDocument();
    expect(screen.getByText('ID: 1')).toBeInTheDocument();
    expect(screen.getByText('Diagnóstico: Hypertension')).toBeInTheDocument();
    expect(screen.getByText(/Este é o ponto de entrada para o paciente ID: 1/)).toBeInTheDocument();
  });

  it('shows error message when patient does not exist', () => {
    // Mock the store to return null patient
    mockUsePatientStore.mockReturnValue({
      patients: [],
      selectedPatientId: null,
      getPatient: () => null,
    });
    
    render(<PatientDetailPage />);
    
    expect(screen.getByText('Paciente não encontrado...')).toBeInTheDocument();
  });
});