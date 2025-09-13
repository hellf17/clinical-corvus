import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientOverview from '@/components/dashboard-doctor/PatientOverview';
import { Patient } from '@/types/patient';

describe('PatientOverview', () => {
  const mockPatient: Patient = {
    patient_id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    birthDate: '1980-01-01',
    gender: 'male',
    phone: '1234567890',
    address: '123 Main St',
    city: 'City',
    state: 'State',
    zipCode: '12345',
    documentNumber: '123456789',
    patientNumber: 'P001',
    primary_diagnosis: 'Hypertension',
    observations: 'Patient is stable and responding well to treatment',
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '0987654321',
    },
    age: 45,
  };

  // No mocks needed for basic PatientOverview component

  it('renders patient basic information', () => {
    render(<PatientOverview patient={mockPatient} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays patient demographics', () => {
    render(<PatientOverview patient={mockPatient} />);
    
    // Check for presence of key demographic labels (text might be split across elements)
    expect(screen.getByText(/Idade:/)).toBeInTheDocument();
    expect(screen.getByText(/Sexo:/)).toBeInTheDocument();
    expect(screen.getByText(/Diagnóstico:/)).toBeInTheDocument();
    
    // Check that the component rendered without errors
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
  });

  // The PatientOverview component appears to be a simplified card
  // It only shows basic patient info, not detailed contact info

  it('shows observations when available', () => {
    render(<PatientOverview patient={mockPatient} />);
    
    // Look for the observations text in the component using a more flexible matcher
    // The component displays "Observações: Patient is stable and responding well to treatment"
    expect(screen.getByText((content, element) => {
      return content.includes('Patient is stable and responding well to treatment');
    })).toBeInTheDocument();
  });

  it('handles patients without primary diagnosis gracefully', () => {
    const patientWithoutDiagnosis = {
      ...mockPatient,
      primary_diagnosis: undefined,
    };

    render(<PatientOverview patient={patientWithoutDiagnosis} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Idade: 45')).toBeInTheDocument();
  });
});