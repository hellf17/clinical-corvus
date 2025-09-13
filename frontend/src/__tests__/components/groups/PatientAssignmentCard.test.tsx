import React from 'react';
import { render, screen } from '@testing-library/react';
import { PatientAssignmentCard } from '@/components/groups/PatientAssignmentCard';
import { GroupPatient } from '@/types/group';

describe('PatientAssignmentCard', () => {
  const mockAssignment: GroupPatient = {
    id: 1,
    group_id: 1,
    patient_id: 1,
    assigned_at: '2023-01-01T00:00:00Z',
  };

  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders patient assignment information correctly', () => {
    render(<PatientAssignmentCard assignment={mockAssignment} onRemove={mockOnRemove} />);
    
    expect(screen.getByText('Paciente ID: 1')).toBeInTheDocument();
    expect(screen.getByText('Atribuído em: 01/01/2023')).toBeInTheDocument();
  });

  it('renders remove button for admins', () => {
    render(<PatientAssignmentCard assignment={mockAssignment} onRemove={mockOnRemove} currentUserRole="admin" />);
    
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
  });

  it('does not render remove button for non-admins', () => {
    render(<PatientAssignmentCard assignment={mockAssignment} onRemove={mockOnRemove} currentUserRole="member" />);
    
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
 });

  it('calls onRemove when remove button is clicked', () => {
    render(<PatientAssignmentCard assignment={mockAssignment} onRemove={mockOnRemove} currentUserRole="admin" />);
    
    const removeButton = screen.getByRole('button', { name: 'Remover' });
    removeButton.click();
    
    expect(mockOnRemove).toHaveBeenCalledWith(mockAssignment);
  });
});