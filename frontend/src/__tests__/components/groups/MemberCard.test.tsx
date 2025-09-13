import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemberCard } from '@/components/groups/MemberCard';
import { GroupMembership } from '@/types/group';

describe('MemberCard', () => {
  const mockMember: GroupMembership = {
    id: 1,
    group_id: 1,
    user_id: 1,
    role: 'admin',
    joined_at: '2023-01-01T00:00:00Z',
  };

  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders member information correctly', () => {
    render(<MemberCard member={mockMember} onRemove={mockOnRemove} />);
    
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Membro desde: 01/01/2023')).toBeInTheDocument();
  });

  it('renders remove button for admins', () => {
    render(<MemberCard member={mockMember} onRemove={mockOnRemove} currentUserRole="admin" />);
    
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
  });

  it('does not render remove button for non-admins', () => {
    render(<MemberCard member={mockMember} onRemove={mockOnRemove} currentUserRole="member" />);
    
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
  });

  it('does not render remove button for self', () => {
    render(<MemberCard member={mockMember} onRemove={mockOnRemove} currentUserRole="admin" currentUserId={1} />);
    
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(<MemberCard member={mockMember} onRemove={mockOnRemove} currentUserRole="admin" currentUserId={2} />);
    
    const removeButton = screen.getByRole('button', { name: 'Remover' });
    removeButton.click();
    
    expect(mockOnRemove).toHaveBeenCalledWith(mockMember);
  });

  it('renders member role badge correctly', () => {
    // Test admin role
    const { rerender } = render(<MemberCard member={{...mockMember, role: 'admin'}} onRemove={mockOnRemove} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
    
    // Test member role
    rerender(<MemberCard member={{...mockMember, role: 'member'}} onRemove={mockOnRemove} />);
    expect(screen.getByText('member')).toBeInTheDocument();
  });
});