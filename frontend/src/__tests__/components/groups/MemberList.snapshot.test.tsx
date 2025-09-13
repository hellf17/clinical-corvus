import React from 'react';
import { render } from '@testing-library/react';
import { MemberList } from '@/components/groups/MemberList';
import { GroupMembership } from '@/types/group';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  listGroupMembers: jest.fn(),
}));

// Mock the MemberCard component
jest.mock('@/components/groups/MemberCard', () => ({
  MemberCard: ({ member }: { member: GroupMembership }) => (
    <div data-testid="member-card-mock">Mock Member Card: User {member.user_id}</div>
  ),
}));

describe('MemberList Snapshot Tests', () => {
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
      joined_at: '2023-01-02T00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot with members', async () => {
    const { listGroupMembers } = require('@/services/groupService');
    listGroupMembers.mockResolvedValue({ items: mockMembers });
    
    const { asFragment } = render(<MemberList groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with empty members', async () => {
    const { listGroupMembers } = require('@/services/groupService');
    listGroupMembers.mockResolvedValue({ items: [] });
    
    const { asFragment } = render(<MemberList groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot while loading', () => {
    const { listGroupMembers } = require('@/services/groupService');
    listGroupMembers.mockResolvedValue({ items: [] });
    
    const { asFragment } = render(<MemberList groupId={1} />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with error', async () => {
    const { listGroupMembers } = require('@/services/groupService');
    listGroupMembers.mockRejectedValue(new Error('Failed to load members'));
    
    const { asFragment } = render(<MemberList groupId={1} />);
    
    // Wait for the component to handle the error
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with pagination', async () => {
    const manyMembers: GroupMembership[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      group_id: 1,
      user_id: i + 1,
      role: i === 0 ? 'admin' : 'member',
      joined_at: `2023-01-${String(i + 1).padStart(2, '0')}T00:00Z`,
    }));
    
    const { listGroupMembers } = require('@/services/groupService');
    listGroupMembers.mockResolvedValue({ items: manyMembers, total: 25 });
    
    const { asFragment } = render(<MemberList groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asFragment()).toMatchSnapshot();
  });
});