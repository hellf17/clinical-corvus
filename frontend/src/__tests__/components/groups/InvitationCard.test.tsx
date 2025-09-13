import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvitationCard } from '@/components/groups/InvitationCard';
import { GroupInvitation } from '@/types/groupInvitation';

describe('InvitationCard', () => {
  const mockInvitation: GroupInvitation = {
    id: 1,
    group_id: 1,
    email: 'invitee@example.com',
    role: 'member',
    expires_at: '2023-02-01T00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockOnRevoke = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invitation information correctly', () => {
    render(<InvitationCard invitation={mockInvitation} onRevoke={mockOnRevoke} />);
    
    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('Expira em: 01/02/2023')).toBeInTheDocument();
  });

  it('renders revoke button for admins', () => {
    render(<InvitationCard invitation={mockInvitation} onRevoke={mockOnRevoke} currentUserRole="admin" />);
    
    expect(screen.getByRole('button', { name: 'Revogar' })).toBeInTheDocument();
  });

  it('does not render revoke button for non-admins', () => {
    render(<InvitationCard invitation={mockInvitation} onRevoke={mockOnRevoke} currentUserRole="member" />);
    
    expect(screen.queryByRole('button', { name: 'Revogar' })).not.toBeInTheDocument();
  });

  it('calls onRevoke when revoke button is clicked', () => {
    render(<InvitationCard invitation={mockInvitation} onRevoke={mockOnRevoke} currentUserRole="admin" />);
    
    const revokeButton = screen.getByRole('button', { name: 'Revogar' });
    revokeButton.click();
    
    expect(mockOnRevoke).toHaveBeenCalledWith(mockInvitation);
  });

  it('renders invitation role badge correctly', () => {
    // Test member role
    const { rerender } = render(<InvitationCard invitation={{...mockInvitation, role: 'member'}} onRevoke={mockOnRevoke} />);
    expect(screen.getByText('member')).toBeInTheDocument();
    
    // Test admin role
    rerender(<InvitationCard invitation={{...mockInvitation, role: 'admin'}} onRevoke={mockOnRevoke} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});