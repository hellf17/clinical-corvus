import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupForm } from '@/components/groups/GroupForm';
import { createGroup, updateGroup } from '@/services/groupService';

// Mock the group service
jest.mock('@/services/groupService', () => ({
  createGroup: jest.fn(),
  updateGroup: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('GroupForm', () => {
  const mockGroup = {
    id: 1,
    name: 'Test Group',
    description: 'Test group description',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(<GroupForm />);
    
    expect(screen.getByLabelText('Nome do Grupo *')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo de Pacientes')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo de Membros')).toBeInTheDocument();
    expect(screen.getByText('Criar Grupo')).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    render(<GroupForm group={mockGroup} />);
    
    expect(screen.getByLabelText('Nome do Grupo *')).toHaveValue('Test Group');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Test group description');
    expect(screen.getByText('Atualizar Grupo')).toBeInTheDocument();
  });

  it('calls createGroup when submitting new group', async () => {
    const mockOnSuccess = jest.fn();
    (createGroup as jest.Mock).mockResolvedValue(mockGroup);
    
    render(<GroupForm onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Nome do Grupo *'), {
      target: { value: 'New Group' },
    });
    
    fireEvent.click(screen.getByText('Criar Grupo'));
    
    await waitFor(() => {
      expect(createGroup).toHaveBeenCalledWith({
        name: 'New Group',
        description: '',
        max_patients: 100,
        max_members: 10,
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockGroup);
    });
  });

  it('calls updateGroup when submitting existing group', async () => {
    const mockOnSuccess = jest.fn();
    (updateGroup as jest.Mock).mockResolvedValue(mockGroup);
    
    render(<GroupForm group={mockGroup} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Nome do Grupo *'), {
      target: { value: 'Updated Group' },
    });
    
    fireEvent.click(screen.getByText('Atualizar Grupo'));
    
    await waitFor(() => {
      expect(updateGroup).toHaveBeenCalledWith(1, {
        name: 'Updated Group',
        description: 'Test group description',
        max_patients: undefined,
        max_members: undefined,
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockGroup);
    });
  });
});