import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { GroupDetail } from '@/components/groups/GroupDetail';
import { getGroup } from '@/services/groupService';
import { GroupWithMembersAndPatients } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  getGroup: jest.fn(),
}));

// Mock child components
jest.mock('@/components/groups/MemberList', () => ({
  MemberList: () => <div data-testid="member-list">Member List</div>,
}));

jest.mock('@/components/groups/PatientAssignmentList', () => ({
  PatientAssignmentList: () => <div data-testid="patient-list">Patient List</div>,
}));

describe('GroupDetail', () => {
  const mockGroup: GroupWithMembersAndPatients = {
    id: 1,
    name: 'Test Group',
    description: 'Test group description',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    members: [
      {
        id: 1,
        group_id: 1,
        user_id: 1,
        role: 'admin',
        joined_at: '2023-01-01T00:00:00Z',
      },
    ],
    patients: [
      {
        id: 1,
        group_id: 1,
        patient_id: 1,
        assigned_at: '2023-01-01T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (getGroup as jest.Mock).mockResolvedValue(mockGroup);
    
    render(<GroupDetail groupId={1} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders group details when data is loaded', async () => {
    (getGroup as jest.Mock).mockResolvedValue(mockGroup);
    
    render(<GroupDetail groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('Test group description')).toBeInTheDocument();
      expect(screen.getByTestId('member-list')).toBeInTheDocument();
      expect(screen.getByTestId('patient-list')).toBeInTheDocument();
    });
  });

  it('renders error state when group fetch fails', async () => {
    (getGroup as jest.Mock).mockRejectedValue(new Error('Failed to fetch group'));
    
    render(<GroupDetail groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load group details')).toBeInTheDocument();
    });
  });
});