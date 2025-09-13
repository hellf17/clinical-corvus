import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { GroupPatientIntegration } from '@/__tests__/integration/GroupPatientIntegration';
import { createPatientClient, getPatientsClient } from '@/services/patientService.client';
import { createGroup, listGroups, assignPatientToGroup } from '@/services/groupService';
import { PatientCreate, Patient } from '@/types/patient';
import { GroupCreate, Group } from '@/types/group';

// Mock the services
jest.mock('@/services/patientService.client', () => ({
  createPatientClient: jest.fn(),
  getPatientsClient: jest.fn(),
}));

jest.mock('@/services/groupService', () => ({
  createGroup: jest.fn(),
  listGroups: jest.fn(),
  assignPatientToGroup: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useParams: () => ({
    id: '1',
  }),
}));

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
}));

describe('GroupPatientIntegration', () => {
  const mockPatientData: PatientCreate = {
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
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '0987654321',
    },
  };

  const mockGroupData: GroupCreate = {
    name: 'Test Group',
    description: 'A test group for integration',
    max_patients: 100,
    max_members: 10,
  };

  const mockCreatedPatient: Patient = {
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
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '0987654321',
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockCreatedGroup: Group = {
    id: 1,
    name: 'Test Group',
    description: 'A test group for integration',
    max_patients: 100,
    max_members: 10,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a patient and assigns to a group', async () => {
    // Mock service responses
    (createPatientClient as jest.Mock).mockResolvedValue(mockCreatedPatient);
    (createGroup as jest.Mock).mockResolvedValue(mockCreatedGroup);
    (listGroups as jest.Mock).mockResolvedValue({ items: [mockCreatedGroup], total: 1 });
    (assignPatientToGroup as jest.Mock).mockResolvedValue({ 
      id: 1, 
      group_id: 1, 
      patient_id: 1, 
      assigned_at: '2023-01-01T00:00:00Z' 
    });

    // Render the component
    render(<GroupPatientIntegration />);

    // Fill in patient form
    const nameInput = screen.getByLabelText(/nome/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    // Continue filling out the form...

    // Select group from dropdown
    const groupSelect = screen.getByLabelText(/grupo/i);
    fireEvent.click(groupSelect);
    
    const groupOption = await screen.findByText('Test Group');
    fireEvent.click(groupOption);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
    fireEvent.click(submitButton);

    // Verify patient was created
    await waitFor(() => {
      expect(createPatientClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
        }),
        'mock-token'
      );
    });

    // Verify patient was assigned to group
    await waitFor(() => {
      expect(assignPatientToGroup).toHaveBeenCalledWith(
        1,
        { patient_id: 1 },
        'mock-token'
      );
    });

    // Verify success message
    expect(await screen.findByText(/paciente criado e atribuído ao grupo com sucesso/i)).toBeInTheDocument();
  });

  it('filters patients by group in the patient list', async () => {
    // Mock service responses
    (getPatientsClient as jest.Mock).mockResolvedValue({ 
      items: [mockCreatedPatient], 
      total: 1 
    });
    (listGroups as jest.Mock).mockResolvedValue({ 
      items: [mockCreatedGroup], 
      total: 1 
    });

    // Render the component
    render(<GroupPatientIntegration />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select group filter
    const groupFilter = screen.getByLabelText(/grupo/i);
    fireEvent.click(groupFilter);
    
    const groupOption = await screen.findByText('Test Group');
    fireEvent.click(groupOption);

    // Verify patients are filtered
    await waitFor(() => {
      expect(getPatientsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 1,
        }),
        'mock-token'
      );
    });
  });

  it('displays group context in patient detail view', async () => {
    // Mock service responses
    (getPatientsClient as jest.Mock).mockResolvedValue({ 
      items: [mockCreatedPatient], 
      total: 1 
    });

    // Render the component
    render(<GroupPatientIntegration />);

    // Navigate to patient detail view
    const detailButton = await screen.findByRole('button', { name: /detalhes/i });
    fireEvent.click(detailButton);

    // Verify group information is displayed
    await waitFor(() => {
      expect(screen.getByText(/grupo #1/i)).toBeInTheDocument();
    });
  });
});