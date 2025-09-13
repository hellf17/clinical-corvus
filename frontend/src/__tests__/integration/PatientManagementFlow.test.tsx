import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientManagementFlow } from '../test-wrappers/PatientManagementFlow';
import * as patientService from '@/services/patientService.client';
import * as alertsService from '@/services/alertsService';
import { Patient, PatientCreate } from '@/types/patient';

// Mock the services
jest.mock('@/services/patientService.client', () => ({
  getPatientsClient: jest.fn(),
  createPatientClient: jest.fn(),
  updatePatientClient: jest.fn(),
  deletePatientClient: jest.fn(),
  getPatientByIdClient: jest.fn(),
}));

jest.mock('@/services/alertsService', () => ({
  alertsService: {
    getAlertSummary: jest.fn(),
    getPatientAlerts: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: '1' }),
}));

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
  useUser: () => ({
    user: { id: '1', emailAddresses: [{ emailAddress: 'doctor@example.com' }] },
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Patient Management Integration Flow', () => {
  const mockPatientData: PatientCreate = {
    name: 'Integration Test Patient',
    email: 'integration@test.com',
    birthDate: '1985-05-15',
    gender: 'female',
    phone: '5551234567',
    address: '456 Test Ave',
    city: 'Test City',
    state: 'TS',
    zipCode: '54321',
    documentNumber: '987654321',
    patientNumber: 'INT001',
    emergencyContact: {
      name: 'Emergency Contact',
      relationship: 'Sister',
      phone: '5559876543',
    },
  };

  const mockCreatedPatient: Patient = {
    patient_id: 1,
    ...mockPatientData,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockAlertSummary = {
    total: 3,
    by_severity: { critical: 1, severe: 1, moderate: 1, mild: 0 },
    by_type: { abnormal: 2, trend: 1, medication: 0 },
    by_category: { hematology: 1, biochemistry: 2 },
    unacknowledged: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    (patientService.getPatientsClient as jest.Mock).mockResolvedValue({
      items: [mockCreatedPatient],
      total: 1,
    });
    (patientService.createPatientClient as jest.Mock).mockResolvedValue(mockCreatedPatient);
    (patientService.getPatientByIdClient as jest.Mock).mockResolvedValue(mockCreatedPatient);
    (alertsService.alertsService.getAlertSummary as jest.Mock).mockResolvedValue(mockAlertSummary);
    (alertsService.alertsService.getPatientAlerts as jest.Mock).mockResolvedValue({ alerts: [] });
  });

  it('completes the full patient creation and viewing workflow', async () => {
    const user = userEvent.setup();
    
    render(<PatientManagementFlow />);

    // STEP 1: Navigate to patient creation
    const createPatientButton = await screen.findByRole('button', { name: /novo paciente/i });
    await user.click(createPatientButton);

    // STEP 2: Fill out patient form
    const nameInput = await screen.findByLabelText(/nome completo/i);
    await user.type(nameInput, mockPatientData.name);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, mockPatientData.email);

    const birthDateInput = screen.getByLabelText(/data de nascimento/i);
    await user.type(birthDateInput, mockPatientData.birthDate);

    const phoneInput = screen.getByLabelText(/telefone/i);
    await user.type(phoneInput, mockPatientData.phone);

    const addressInput = screen.getByLabelText(/logradouro/i);
    await user.type(addressInput, mockPatientData.address);

    const cityInput = screen.getByLabelText(/cidade/i);
    await user.type(cityInput, mockPatientData.city);

    const stateInput = screen.getByLabelText(/estado/i);
    await user.type(stateInput, mockPatientData.state);

    const zipCodeInput = screen.getByLabelText(/cep/i);
    await user.type(zipCodeInput, mockPatientData.zipCode);

    const documentInput = screen.getByLabelText(/documento/i);
    await user.type(documentInput, mockPatientData.documentNumber);

    const patientNumberInput = screen.getByLabelText(/número do paciente/i);
    await user.type(patientNumberInput, mockPatientData.patientNumber);

    // STEP 3: Submit form
    const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
    await user.click(submitButton);

    // STEP 4: Verify patient creation API call
    await waitFor(() => {
      expect(patientService.createPatientClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockPatientData.name,
          email: mockPatientData.email,
          birthDate: mockPatientData.birthDate,
        }),
        'mock-token'
      );
    });

    // STEP 5: Navigate to patient list and verify new patient appears
    const patientListButton = await screen.findByRole('button', { name: /lista de pacientes/i });
    await user.click(patientListButton);

    await waitFor(() => {
      expect(screen.getByText(mockPatientData.name)).toBeInTheDocument();
      expect(screen.getByText(mockPatientData.patientNumber)).toBeInTheDocument();
    });

    // STEP 6: View patient details
    const patientCard = screen.getByText(mockPatientData.name).closest('[role="button"]');
    if (patientCard) {
      await user.click(patientCard);
    }

    // STEP 7: Verify patient overview loads
    await waitFor(() => {
      expect(patientService.getPatientByIdClient).toHaveBeenCalledWith('1');
      expect(alertsService.alertsService.getAlertSummary).toHaveBeenCalledWith('1');
    });

    // STEP 8: Verify patient overview displays correctly
    await waitFor(() => {
      expect(screen.getByText(mockPatientData.name)).toBeInTheDocument();
      expect(screen.getByText(mockPatientData.email)).toBeInTheDocument();
      expect(screen.getByText(mockPatientData.phone)).toBeInTheDocument();
    });
  });

  it('handles patient update workflow', async () => {
    const user = userEvent.setup();
    const updatedPatient = {
      ...mockCreatedPatient,
      name: 'Updated Patient Name',
      phone: '5555555555',
    };

    (patientService.updatePatientClient as jest.Mock).mockResolvedValue(updatedPatient);
    
    render(<PatientManagementFlow initialPatientId="1" />);

    // Wait for patient to load
    await waitFor(() => {
      expect(screen.getByText(mockCreatedPatient.name)).toBeInTheDocument();
    });

    // Navigate to edit form
    const editButton = await screen.findByRole('button', { name: /editar/i });
    await user.click(editButton);

    // Update patient information
    const nameInput = screen.getByDisplayValue(mockCreatedPatient.name);
    await user.clear(nameInput);
    await user.type(nameInput, updatedPatient.name);

    const phoneInput = screen.getByDisplayValue(mockCreatedPatient.phone);
    await user.clear(phoneInput);
    await user.type(phoneInput, updatedPatient.phone);

    // Submit update
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    await user.click(saveButton);

    // Verify update API call
    await waitFor(() => {
      expect(patientService.updatePatientClient).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: updatedPatient.name,
          phone: updatedPatient.phone,
        }),
        'mock-token'
      );
    });
  });

  it('handles patient deletion workflow', async () => {
    const user = userEvent.setup();
    
    (patientService.deletePatientClient as jest.Mock).mockResolvedValue(undefined);
    
    render(<PatientManagementFlow initialPatientId="1" />);

    // Wait for patient to load
    await waitFor(() => {
      expect(screen.getByText(mockCreatedPatient.name)).toBeInTheDocument();
    });

    // Mock confirmation dialog
    window.confirm = jest.fn(() => true);

    // Delete patient
    const deleteButton = await screen.findByRole('button', { name: /excluir/i });
    await user.click(deleteButton);

    // Verify deletion API call
    await waitFor(() => {
      expect(patientService.deletePatientClient).toHaveBeenCalledWith(1, 'mock-token');
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.'
    );
  });

  it('handles error states appropriately', async () => {
    // Mock API failure
    (patientService.createPatientClient as jest.Mock).mockRejectedValue(
      new Error('Failed to create patient')
    );

    const user = userEvent.setup();
    
    render(<PatientManagementFlow />);

    // Fill out and submit form
    const createPatientButton = await screen.findByRole('button', { name: /novo paciente/i });
    await user.click(createPatientButton);

    const nameInput = await screen.findByLabelText(/nome completo/i);
    await user.type(nameInput, 'Test Patient');

    const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
    await user.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/erro ao criar paciente/i)).toBeInTheDocument();
    });
  });

  it('validates form inputs correctly', async () => {
    const user = userEvent.setup();
    
    render(<PatientManagementFlow />);

    const createPatientButton = await screen.findByRole('button', { name: /novo paciente/i });
    await user.click(createPatientButton);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
    await user.click(submitButton);

    // Verify validation errors
    await waitFor(() => {
      expect(screen.getByText(/nome completo é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
    });

    // Verify API is not called with invalid data
    expect(patientService.createPatientClient).not.toHaveBeenCalled();
  });

  it('filters and searches patients correctly', async () => {
    const additionalPatients = [
      { ...mockCreatedPatient, patient_id: 2, name: 'Alice Smith', patientNumber: 'P002' },
      { ...mockCreatedPatient, patient_id: 3, name: 'Bob Johnson', patientNumber: 'P003' },
    ];

    (patientService.getPatientsClient as jest.Mock).mockResolvedValue({
      items: [mockCreatedPatient, ...additionalPatients],
      total: 3,
    });

    const user = userEvent.setup();
    
    render(<PatientManagementFlow />);

    // Wait for patients to load
    await waitFor(() => {
      expect(screen.getByText('Integration Test Patient')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    // Search for specific patient
    const searchInput = screen.getByPlaceholderText(/buscar pacientes/i);
    await user.type(searchInput, 'Alice');

    // Verify search API call
    await waitFor(() => {
      expect(patientService.getPatientsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Alice',
        }),
        'mock-token'
      );
    });
  });
});