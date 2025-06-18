import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientsPage from '@/app/patients/page';
import { usePatientStore } from '@/store/patientStore';
import { useUIStore } from '@/store/uiStore';
import { createMockPatient, mockZustandStore } from '@/__tests__/utils/test-utils';

// Mock the stores
jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn()
}));

jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn()
}));

// Mock the components
jest.mock('@/components/layout/MainLayout', () => {
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>;
  MockMainLayout.displayName = 'MockMainLayout';
  return MockMainLayout;
});

jest.mock('@/components/patients/PatientCard', () => {
  function MockPatientCard({ patient, onDelete, onSelect }: any) {
    return (
      <div data-testid={`patient-card-${patient.id}`}>
        <h3>{patient.name}</h3>
        <button onClick={() => onDelete(patient.id)}>Delete</button>
        <button onClick={() => onSelect(patient.id)}>View</button>
      </div>
    );
  }
  MockPatientCard.displayName = 'MockPatientCard';
  return MockPatientCard;
});

jest.mock('@/components/patients/PatientForm', () => {
  function MockPatientForm({ onSubmit, onCancel }: any) {
    return (
      <div data-testid="patient-form">
        <button 
          onClick={() => onSubmit({ 
            name: 'Test Patient', 
            dateOfBirth: '1990-01-01', 
            gender: 'male' 
          })}
        >
          Submit Form
        </button>
        <button onClick={onCancel}>Cancel Form</button>
      </div>
    );
  };
});

describe('PatientsPage', () => {
  // Mock store functions
  const mockAddPatient = jest.fn();
  const mockDeletePatient = jest.fn();
  const mockAddNotification = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockZustandStore(usePatientStore, {
      patients: [
        createMockPatient({ id: '1', name: 'John Doe', diagnosis: 'Fever' }),
        createMockPatient({ id: '2', name: 'Jane Smith', diagnosis: 'Headache' })
      ],
      addPatient: mockAddPatient,
      deletePatient: mockDeletePatient
    });
    
    mockZustandStore(useUIStore, {
      addNotification: mockAddNotification
    });
  });
  
  it('renders the patients list', () => {
    render(<PatientsPage />);
    
    // Check title
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    
    // Check patients are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Check "Add Patient" button is displayed
    expect(screen.getByText('Adicionar Paciente')).toBeInTheDocument();
  });
  
  it('shows empty state when no patients exist', () => {
    // Mock empty patients list
    mockZustandStore(usePatientStore, {
      patients: [],
      addPatient: mockAddPatient,
      deletePatient: mockDeletePatient
    });
    
    render(<PatientsPage />);
    
    // Check empty state message
    expect(screen.getByText('Nenhum paciente cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Adicione seu primeiro paciente para começar a usar o Dr. Corvus.')).toBeInTheDocument();
    expect(screen.getByText('Adicionar Primeiro Paciente')).toBeInTheDocument();
  });
  
  it('shows the patient form when "Add Patient" button is clicked', () => {
    render(<PatientsPage />);
    
    // Click the "Add Patient" button
    fireEvent.click(screen.getByText('Adicionar Paciente'));
    
    // Check that the form is displayed
    expect(screen.getByTestId('patient-form')).toBeInTheDocument();
    
    // The "Add Patient" button should be hidden
    expect(screen.queryByText('Adicionar Paciente')).not.toBeInTheDocument();
  });
  
  it('hides the form when cancel is clicked', () => {
    render(<PatientsPage />);
    
    // Click the "Add Patient" button to show form
    fireEvent.click(screen.getByText('Adicionar Paciente'));
    
    // Check that the form is displayed
    expect(screen.getByTestId('patient-form')).toBeInTheDocument();
    
    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel Form'));
    
    // The form should be hidden
    expect(screen.queryByTestId('patient-form')).not.toBeInTheDocument();
    
    // The "Add Patient" button should be visible again
    expect(screen.getByText('Adicionar Paciente')).toBeInTheDocument();
  });
  
  it('adds a new patient when form is submitted', async () => {
    render(<PatientsPage />);
    
    // Click the "Add Patient" button to show form
    fireEvent.click(screen.getByText('Adicionar Paciente'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Form'));
    
    // Check that addPatient was called with correct data
    expect(mockAddPatient).toHaveBeenCalledWith({
      name: 'Test Patient', 
      dateOfBirth: '1990-01-01', 
      gender: 'male'
    });
    
    // Check that notification was added
    expect(mockAddNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Paciente adicionado',
      message: 'Test Patient foi adicionado com sucesso.'
    });
    
    // The form should be hidden after submission
    expect(screen.queryByTestId('patient-form')).not.toBeInTheDocument();
  });
  
  it('deletes a patient when delete button is clicked', () => {
    render(<PatientsPage />);
    
    // Get the first delete button
    const deleteButton = screen.getAllByText('Delete')[0];
    
    // Click the delete button
    fireEvent.click(deleteButton);
    
    // Check that deletePatient was called with correct id
    expect(mockDeletePatient).toHaveBeenCalledWith('1');
    
    // Check that notification was added
    expect(mockAddNotification).toHaveBeenCalledWith({
      type: 'info',
      message: 'John Doe foi removido.'
    });
  });
  
  it('handles add patient error', () => {
    // Mock addPatient to throw error
    mockAddPatient.mockImplementation(() => {
      throw new Error('Failed to add patient');
    });
    
    render(<PatientsPage />);
    
    // Click the "Add Patient" button to show form
    fireEvent.click(screen.getByText('Adicionar Paciente'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Form'));
    
    // Check that error notification was added
    expect(mockAddNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Erro',
      message: 'Não foi possível adicionar o paciente. Tente novamente.'
    });
  });
  
  it('shows form when clicking "Add First Patient" in empty state', () => {
    // Mock empty patients list
    mockZustandStore(usePatientStore, {
      patients: [],
      addPatient: mockAddPatient,
      deletePatient: mockDeletePatient
    });
    
    render(<PatientsPage />);
    
    // Click the "Add First Patient" button
    fireEvent.click(screen.getByText('Adicionar Primeiro Paciente'));
    
    // Check that the form is displayed
    expect(screen.getByTestId('patient-form')).toBeInTheDocument();
  });
}); 