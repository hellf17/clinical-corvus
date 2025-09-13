import React from 'react';
import { render } from '@testing-library/react';
import { GroupList } from '@/components/groups/GroupList';
import { Group } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  listGroups: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the GroupCard component
jest.mock('@/components/groups/GroupCard', () => ({
  GroupCard: ({ group }: { group: Group }) => (
    <div data-testid="group-card-mock">Mock Group Card: {group.name}</div>
  ),
}));

describe('GroupList Snapshot Tests', () => {
  const mockGroups: Group[] = [
    {
      id: 1,
      name: 'Test Group 1',
      description: 'First test group',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Test Group 2',
      description: 'Second test group',
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot with groups', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { asFragment } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with empty groups', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: [] });
    
    const { asFragment } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while loading', () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: [] });
    
    const { asFragment } = render(<GroupList />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with error', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockRejectedValue(new Error('Failed to load groups'));
    
    const { asFragment } = render(<GroupList />);
    
    // Wait for the component to handle the error
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });
});