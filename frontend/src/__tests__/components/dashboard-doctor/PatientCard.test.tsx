import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientCard from '@/components/dashboard-doctor/PatientCard';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Define the interface that matches the component
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  status: 'Internada' | 'Ambulatorial' | 'Alta';
  diagnosis: string;
  lastNote: string;
  alert?: string;
  riskScore: number;
  lastUpdated: Date;
  hasAlerts?: boolean;
}

describe('PatientCard', () => {
  const mockPatient: Patient = {
    id: '1',
    name: 'John Doe',
    age: 45,
    gender: 'Masculino',
    status: 'Internada',
    diagnosis: 'Hypertension',
    lastNote: 'Patient stable, continue monitoring',
    riskScore: 75,
    lastUpdated: new Date('2023-01-01'),
    hasAlerts: true,
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders patient information correctly', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/45 anos/)).toBeInTheDocument();
    expect(screen.getByText('Hypertension')).toBeInTheDocument();
  });

  it('displays patient age correctly', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    expect(screen.getByText(/45 anos/)).toBeInTheDocument();
  });

  it('shows status', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    expect(screen.getByText('Internada')).toBeInTheDocument();
  });

  it('handles click events', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    const card = screen.getByText('John Doe').closest('div');
    if (card) {
      fireEvent.click(card);
    }
    
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('shows alert when present', () => {
    const patientWithAlert = {
      ...mockPatient,
      alert: 'Critical lab values detected',
    };

    render(<PatientCard patient={patientWithAlert} onClick={mockOnClick} />);
    
    expect(screen.getByText('Critical lab values detected')).toBeInTheDocument();
  });

  it('displays risk score correctly', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    // Risk score should be displayed as a percentage
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows last note', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    expect(screen.getByText('Patient stable, continue monitoring')).toBeInTheDocument();
  });

  it('handles different statuses correctly', () => {
    const ambulatorialPatient = {
      ...mockPatient,
      status: 'Ambulatorial' as const,
    };

    render(<PatientCard patient={ambulatorialPatient} onClick={mockOnClick} />);
    
    expect(screen.getByText('Ambulatorial')).toBeInTheDocument();
  });

  it('displays last updated time', () => {
    render(<PatientCard patient={mockPatient} onClick={mockOnClick} />);
    
    // Should show "Atualizado" text
    expect(screen.getByText(/Atualizado/)).toBeInTheDocument();
  });
});