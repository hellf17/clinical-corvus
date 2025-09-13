import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MedicationCard from '@/components/dashboard-doctor/MedicationCard';
import { Medication } from '@/types/medication';
import { MedicationStatus, MedicationRoute, MedicationFrequency } from '@/types/enums';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      data-testid="button"
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div className={className} data-testid="badge" data-variant={variant}>{children}</div>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Pill: () => <div data-testid="pill-icon" />,
  Edit2: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Microscope: () => <div data-testid="microscope-icon" />,
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MedicationCard', () => {
  const mockMedication: Medication = {
    medication_id: 1,
    patient_id: 1,
    name: 'Metformin',
    dosage: '500mg',
    route: MedicationRoute.ORAL,
    frequency: MedicationFrequency.TWICE_DAILY,
    start_date: '2022-12-30',
    status: MedicationStatus.ACTIVE,
    prescriber: 'Dr. Smith',
    notes: 'Take with meals',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders medication information correctly', () => {
    render(
      <MedicationCard 
        medication={mockMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('500mg')).toBeInTheDocument();
    expect(screen.getByText('2x ao dia')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Take with meals')).toBeInTheDocument();
  });

  it('displays correct status badge for active medication', () => {
    render(
      <MedicationCard 
        medication={mockMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('displays correct status badge for suspended medication', () => {
    const suspendedMedication = {
      ...mockMedication,
      status: MedicationStatus.SUSPENDED,
    };

    render(
      <MedicationCard 
        medication={suspendedMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <MedicationCard
        medication={mockMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Find edit button by its icon
    const editButtons = screen.getAllByTestId('edit-icon');
    expect(editButtons).toHaveLength(1);
    
    fireEvent.click(editButtons[0].closest('button')!);

    expect(mockOnEdit).toHaveBeenCalledWith(mockMedication);
  });

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(
      <MedicationCard
        medication={mockMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Find delete button by its icon
    const trashButtons = screen.getAllByTestId('trash-icon');
    expect(trashButtons).toHaveLength(1);
    
    fireEvent.click(trashButtons[0].closest('button')!);

    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir esta medicação?'
    );
    expect(mockOnDelete).toHaveBeenCalledWith(mockMedication.medication_id);
  });

  it('does not call onDelete when deletion is cancelled', () => {
    window.confirm = jest.fn(() => false);

    render(
      <MedicationCard
        medication={mockMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Find delete button by its icon
    const trashButtons = screen.getAllByTestId('trash-icon');
    expect(trashButtons).toHaveLength(1);
    
    fireEvent.click(trashButtons[0].closest('button')!);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('shows end date when medication is completed', () => {
    const completedMedication = {
      ...mockMedication,
      status: 'completed' as MedicationStatus,
      end_date: '2023-06-01',
    };

    render(
      <MedicationCard
        medication={completedMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Concluído')).toBeInTheDocument();
    // Use a more specific selector - look for the end date in a more targeted way
    expect(screen.getByText((content, element) => {
      return content.includes('31/05/2023');
    })).toBeInTheDocument();
  });

  it('handles different medication routes correctly', () => {
    const intravenousMedication = {
      ...mockMedication,
      route: MedicationRoute.INTRAVENOUS,
    };

    render(
      <MedicationCard
        medication={intravenousMedication}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Intravenosa')).toBeInTheDocument();
  });

  it('handles different frequencies correctly', () => {
    const onceDaily = {
      ...mockMedication,
      frequency: MedicationFrequency.ONCE_DAILY,
    };

    render(
      <MedicationCard
        medication={onceDaily}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('1x ao dia')).toBeInTheDocument();
  });
});