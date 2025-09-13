import React from 'react';
import { render, screen } from '@testing-library/react';
import { GroupCard } from '@/components/groups/GroupCard';
import { Group } from '@/types/group';

describe('GroupCard', () => {
  const mockGroup: Group = {
    id: 1,
    name: 'Test Group',
    description: 'A test group for collaboration',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders group information correctly', () => {
    render(<GroupCard group={mockGroup} onClick={mockOnClick} />);
    
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('A test group for collaboration')).toBeInTheDocument();
    expect(screen.getByText('Criado em: 01/01/2023')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<GroupCard group={mockGroup} onClick={mockOnClick} />);
    
    const card = screen.getByTestId('group-card');
    card.click();
    
    expect(mockOnClick).toHaveBeenCalledWith(mockGroup);
  });

  it('renders group without description', () => {
    const groupWithoutDescription = { ...mockGroup, description: undefined };
    render(<GroupCard group={groupWithoutDescription} onClick={mockOnClick} />);
    
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('Criado em: 01/01/2023')).toBeInTheDocument();
  });

  it('renders group with empty description', () => {
    const groupWithEmptyDescription = { ...mockGroup, description: '' };
    render(<GroupCard group={groupWithEmptyDescription} onClick={mockOnClick} />);
    
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('Criado em: 01/01/2023')).toBeInTheDocument();
  });
});