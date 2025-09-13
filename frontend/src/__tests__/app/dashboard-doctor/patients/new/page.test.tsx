import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewPatientPage from '@/app/dashboard-doctor/patients/new/page';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className} data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant, type }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      data-testid="button"
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Input', () => ({
  Input: ({ placeholder, ...props }: any) => <input placeholder={placeholder} {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className }: any) => <label htmlFor={htmlFor} className={className} data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: ({ placeholder, rows, ...props }: any) => <textarea placeholder={placeholder} rows={rows} {...props} data-testid="textarea" />,
}));

jest.mock('@/components/ui/Select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}));

jest.mock('@/components/ui/Form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormDescription: ({ children }: any) => <div data-testid="form-description">{children}</div>,
  FormField: ({ children, control, name }: any) => (
    <div data-testid={`form-field-${name}`}>
      {typeof children === 'function' ? children({ field: { name, value: '', onChange: jest.fn() } }) : children}
    </div>
  ),
  FormItem: ({ children, className }: any) => <div className={className} data-testid="form-item">{children}</div>,
  FormLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor} data-testid="form-label">{children}</label>,
  FormMessage: () => <div data-testid="form-message">Error message</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
}));

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('mock-token'),
  }),
}));

// Mock services
jest.mock('@/services/groupService', () => ({
  listGroups: jest.fn(),
  assignPatientToGroup: jest.fn(),
}));

jest.mock('@/services/patientService.client', () => ({
  createPatientWithGroupAssignment: jest.fn(),
}));

describe('New Patient Page', () => {
  const { listGroups } = require('@/services/groupService');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock listGroups to return sample data
    listGroups.mockResolvedValue({
      items: [
        { id: 1, name: 'Cardiology Team' },
        { id: 2, name: 'Neurology Unit' },
      ],
    });
  });

  it('renders the new patient form', async () => {
    render(<NewPatientPage />);
    
    expect(screen.getByText('Adicionar Novo Paciente')).toBeInTheDocument();
    expect(screen.getByText('Informações Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Contato de Emergência')).toBeInTheDocument();
  });

  it('loads and displays groups for selection', async () => {
    render(<NewPatientPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });
    
    // Check that groups are displayed
    expect(screen.getByText('Cardiology Team')).toBeInTheDocument();
    expect(screen.getByText('Neurology Unit')).toBeInTheDocument();
  });

  it('shows error message when groups fail to load', async () => {
    // Mock listGroups to reject
    listGroups.mockRejectedValue(new Error('Failed to load groups'));
    
    render(<NewPatientPage />);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load groups')).toBeInTheDocument();
    });
  });
});