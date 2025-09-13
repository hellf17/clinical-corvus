import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemberList } from '@/components/groups/MemberList';
import { listGroupMembers } from '@/services/groupService';
import { GroupMembership } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  listGroupMembers: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the MemberCard component
jest.mock('@/components/groups/MemberCard', () => ({
  MemberCard: ({ member }: { member: GroupMembership }) => (
    <div data-testid="member-card">{member.user_id}</div>
  ),
}));

describe('MemberList', () => {
  const mockMembers: GroupMembership[] = [
    {
      id: 1,
      group_id: 1,
      user_id: 1,
      role: 'admin',
      joined_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      group_id: 1,
      user_id: 2,
      role: 'member',
      joined_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listGroupMembers as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<MemberList groupId={1} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders members when data is loaded', async () => {
    (listGroupMembers as jest.Mock).mockResolvedValue({ items: mockMembers });
    
    render(<MemberList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('member-card')).toBeInTheDocument();
    });
  });

  it('renders error state when member fetch fails', async () => {
    (listGroupMembers as jest.Mock).mockRejectedValue(new Error('Failed to fetch members'));
    
    render(<MemberList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load members')).toBeInTheDocument();
    });
  });

  it('renders empty state when no members exist', async () => {
    (listGroupMembers as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<MemberList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum membro encontrado.')).toBeInTheDocument();
    });
  });
});