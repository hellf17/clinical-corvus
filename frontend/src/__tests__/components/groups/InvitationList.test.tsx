import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { InvitationList } from '@/components/groups/InvitationList';
import { listGroupInvitations } from '@/services/groupInvitationService';
import { GroupInvitation } from '@/types/groupInvitation';

// Mock the group invitation service
jest.mock('@/services/groupInvitationService', () => ({
  listGroupInvitations: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
 }),
}));

// Mock the InvitationCard component
jest.mock('@/components/groups/InvitationCard', () => ({
  InvitationCard: ({ invitation }: { invitation: GroupInvitation }) => (
    <div data-testid="invitation-card">{invitation.email}</div>
  ),
}));

describe('InvitationList', () => {
  const mockInvitations: GroupInvitation[] = [
    {
      id: 1,
      group_id: 1,
      email: 'invitee1@example.com',
      role: 'member',
      expires_at: '2023-02-01T0:00:00Z',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      group_id: 1,
      email: 'invitee2@example.com',
      role: 'admin',
      expires_at: '2023-02-01T00:00:00Z',
      created_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (listGroupInvitations as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<InvitationList groupId={1} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders invitations when data is loaded', async () => {
    (listGroupInvitations as jest.Mock).mockResolvedValue({ items: mockInvitations });
    
    render(<InvitationList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('invitation-card')).toBeInTheDocument();
    });
  });

  it('renders error state when invitation fetch fails', async () => {
    (listGroupInvitations as jest.Mock).mockRejectedValue(new Error('Failed to fetch invitations'));
    
    render(<InvitationList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load invitations')).toBeInTheDocument();
    });
  });

  it('renders empty state when no invitations exist', async () => {
    (listGroupInvitations as jest.Mock).mockResolvedValue({ items: [] });
    
    render(<InvitationList groupId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum convite pendente.')).toBeInTheDocument();
    });
  });
});