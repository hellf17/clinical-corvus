import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PatientAssignmentList } from '@/components/groups/PatientAssignmentList';
import { listGroupPatients } from '@/services/groupService';
import { GroupPatient } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  listGroupPatients: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the PatientAssignmentCard component
jest.mock('@/components/groups/PatientAssignmentCard', () => ({
  PatientAssignmentCard: ({ assignment }: { assignment: GroupPatient }) => (
    <div data-testid="patient-assignment-card">{assignment.patient_id}</div>
  ),
}));

describe('PatientAssignmentList', () => {
  const mockAssignments: GroupPatient[] = [
    {
      id: 1,
      group_id: 1,
      patient_id: 1,
      assigned_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      group_id: 1,
      patient_id: 2,
      assigned_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listGroupPatients as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<PatientAssignmentList groupId={1} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders patient assignments when data is loaded', async () => {
    (listGroupPatients as jest.Mock).mockResolvedValue({ items: mockAssignments });
    
    render(<PatientAssignmentList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('patient-assignment-card')).toBeInTheDocument();
    });
  });

  it('renders error state when patient assignment fetch fails', async () => {
    (listGroupPatients as jest.Mock).mockRejectedValue(new Error('Failed to fetch patient assignments'));
    
    render(<PatientAssignmentList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load patient assignments')).toBeInTheDocument();
    });
  });

  it('renders empty state when no patient assignments exist', async () => {
    (listGroupPatients as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<PatientAssignmentList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum paciente atribuído ao grupo.')).toBeInTheDocument();
    });
  });
});