import React from 'react';
import { render } from '@testing-library/react';
import { GroupDetail } from '@/components/groups/GroupDetail';
import { GroupWithMembersAndPatients } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  getGroup: jest.fn(),
}));

// Mock child components
jest.mock('@/components/groups/MemberList', () => ({
  MemberList: () => <div data-testid="member-list-mock">Mock Member List</div>,
}));

jest.mock('@/components/groups/PatientAssignmentList', () => ({
  PatientAssignmentList: () => <div data-testid="patient-list-mock">Mock Patient List</div>,
}));

jest.mock('@/components/groups/InvitationList', () => ({
  InvitationList: () => <div data-testid="invitation-list-mock">Mock Invitation List</div>,
}));

describe('GroupDetail Snapshot Tests', () => {
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

  it('matches snapshot with group details', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { asFragment } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while loading', () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { asFragment } = render(<GroupDetail groupId={1} />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with error', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockRejectedValue(new Error('Failed to load group'));
    
    const { asFragment } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to handle the error
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with empty group', async () => {
    const emptyGroup: GroupWithMembersAndPatients = {
      id: 1,
      name: 'Empty Group',
      description: '',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      members: [],
      patients: [],
    };
    
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(emptyGroup);
    
    const { asFragment } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });
});