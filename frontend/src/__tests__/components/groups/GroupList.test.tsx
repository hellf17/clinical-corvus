import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { GroupList } from '@/components/groups/GroupList';
import { listGroups } from '@/services/groupService';
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
    <div data-testid="group-card">{group.name}</div>
  ),
}));

describe('GroupList', () => {
  const mockGroups: Group[] = [
    {
      id: 1,
      name: 'Test Group 1',
      description: 'Test group description 1',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Test Group 2',
      description: 'Test group description 2',
      created_at: '2023-01-02T00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listGroups as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<GroupList />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders groups when data is loaded', async () => {
    (listGroups as jest.Mock).mockResolvedValue({ items: mockGroups });
    
    render(<GroupList />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Group 1')).toBeInTheDocument();
      expect(screen.getByText('Test Group 2')).toBeInTheDocument();
    });
  });

  it('renders empty state when no groups exist', async () => {
    (listGroups as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<GroupList />);
    
    await waitFor(() => {
      expect(screen.getByText('Você ainda não tem grupos.')).toBeInTheDocument();
    });
  });
});