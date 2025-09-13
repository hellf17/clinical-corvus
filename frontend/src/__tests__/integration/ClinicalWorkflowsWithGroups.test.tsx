import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PatientLabsPage from '@/app/dashboard-doctor/patients/[id]/labs/page';
import PatientNotesPage from '@/app/dashboard-doctor/patients/[id]/notes/page';
import MedicationsPage from '@/app/dashboard-doctor/patients/[id]/medications/page';
import AlertsPage from '@/app/dashboard-doctor/patients/[id]/alerts/page';
import { getPatientLabResultsClient } from '@/services/patientService.client';
import { listGroups } from '@/services/groupService';
import { LabResult } from '@/types/health';
import { Group, GroupPatient } from '@/types/group';

// Mock the services
jest.mock('@/services/patientService.client', () => ({
  getPatientLabResultsClient: jest.fn(),
}));

jest.mock('@/services/groupService', () => ({
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

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [] }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
}));

// Mock SWR
jest.mock('swr/infinite', () => ({
  __esModule: true,
  default: () => ({
    data: [{ notes: [], total: 0 }],
    error: null,
    isLoading: false,
    size: 1,
    setSize: jest.fn(),
    isValidating: false,
    mutate: jest.fn(),
  }),
}));

jest.mock('swr', () => ({
  __esModule: true,
 default: () => ({
    data: null,
    error: null,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  }),
}));

describe('ClinicalWorkflowsWithGroups', () => {
  const mockLabResults: LabResult[] = [
    {
      result_id: 1,
      patient_id: 1,
      test_name: 'Hemoglobina',
      value_numeric: 14.5,
      unit: 'g/dL',
      reference_range_low: 12.0,
      reference_range_high: 16.0,
      is_abnormal: false,
      timestamp: '2023-01-01T10:00:00Z',
    },
  ];

  const mockGroup: Group = {
    id: 1,
    name: 'Test Group',
    description: 'A test group',
    max_patients: 100,
    max_members: 10,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockGroupPatient: GroupPatient = {
    id: 1,
    group_id: 1,
    patient_id: 1,
    assigned_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays group context in lab results view', async () => {
    // Mock service responses
    (getPatientLabResultsClient as jest.Mock).mockResolvedValue({ 
      items: mockLabResults, 
      total: 1 
    });
    (listGroups as jest.Mock).mockResolvedValue({ 
      items: [mockGroup], 
      total: 1 
    });

    // Mock fetch for group patients
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [mockGroupPatient], total: 1 }),
      } as Response)
    );

    // Render the component
    render(<PatientLabsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Resultados Laboratoriais')).toBeInTheDocument();
    });

    // Verify group information is displayed
    expect(screen.getByText(/grupo #1/i)).toBeInTheDocument();
  });

  it('displays group context in clinical notes view', async () => {
    // Mock fetch for groups
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [mockGroup], total: 1 }),
      } as Response)
    );

    // Render the component
    render(<PatientNotesPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Notas Clínicas')).toBeInTheDocument();
    });

    // Verify group information is displayed
    expect(screen.getByText(/grupo #1/i)).toBeInTheDocument();
  });

  it('displays group context in medications view', async () => {
    // Mock fetch for groups
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [mockGroup], total: 1 }),
      } as Response)
    );

    // Render the component
    render(<MedicationsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Medicações')).toBeInTheDocument();
    });

    // Verify group information is displayed
    expect(screen.getByText(/grupo #1/i)).toBeInTheDocument();
  });

  it('displays group context in alerts view', async () => {
    // Mock fetch for groups
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [mockGroup], total: 1 }),
      } as Response)
    );

    // Mock axios
        jest.mock('axios', () => ({
          get: jest.fn().mockResolvedValue({ data: [] }),
          post: jest.fn().mockResolvedValue({ data: {} }),
          put: jest.fn().mockResolvedValue({ data: {} }),
          delete: jest.fn().mockResolvedValue({ data: {} }),
        }));
    
        // Render the component
        render(<AlertsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Alertas do Paciente')).toBeInTheDocument();
    });

    // Verify group information is displayed
    expect(screen.getByText(/grupo #1/i)).toBeInTheDocument();
  });
});