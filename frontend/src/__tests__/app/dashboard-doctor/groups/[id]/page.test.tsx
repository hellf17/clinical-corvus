import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupDetailPage from '@/app/dashboard-doctor/groups/[id]/page';

// Mock the GroupDetail component
jest.mock('@/components/groups/GroupDetail', () => ({
  GroupDetail: ({ groupId }: any) => (
    <div data-testid="group-detail">
      Group Detail for group {groupId}
    </div>
  ),
}));

describe('Group Detail Page', () => {
  it('renders group detail component with valid group ID', () => {
    // Mock router params
    const mockParams = { id: '1' };
    
    render(<GroupDetailPage params={mockParams} />);
    
    expect(screen.getByTestId('group-detail')).toBeInTheDocument();
    expect(screen.getByText('Group Detail for group 1')).toBeInTheDocument();
  });

  it('shows error message for invalid group ID', () => {
    // Mock router params with invalid ID
    const mockParams = { id: 'invalid' };
    
    render(<GroupDetailPage params={mockParams} />);
    
    expect(screen.getByText('Grupo não encontrado.')).toBeInTheDocument();
  });

  it('shows error message for missing group ID', () => {
    // Mock router params with missing ID
    const mockParams = { id: undefined } as any;
    
    render(<GroupDetailPage params={mockParams} />);
    
    expect(screen.getByText('Grupo não encontrado.')).toBeInTheDocument();
  });
});