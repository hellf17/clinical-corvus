import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClinicalValidationPage from '@/app/dashboard-doctor/clinical-validation/page';

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

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: (props: any) => <textarea {...props} data-testid="textarea" />,
}));

jest.mock('@/components/ui/Accordion', () => ({
  Accordion: ({ children, type, className }: any) => <div className={className} data-testid="accordion">{children}</div>,
  AccordionContent: ({ children, className }: any) => <div className={className} data-testid="accordion-content">{children}</div>,
  AccordionItem: ({ children, value, className }: any) => <div className={className} data-testid="accordion-item" data-value={value}>{children}</div>,
  AccordionTrigger: ({ children, className }: any) => <div className={className} data-testid="accordion-trigger">{children}</div>,
}));

jest.mock('@/components/ui/Radio-group', () => ({
  RadioGroupComponent: ({ children, onValueChange, className }: any) => (
    <div className={className} data-testid="radio-group" data-onchange={onValueChange}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id, className }: any) => <input type="radio" value={value} id={id} className={className} data-testid="radio-group-item" />,
}));

jest.mock('@/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className }: any) => <label htmlFor={htmlFor} className={className} data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/Checkbox', () => ({
  Checkbox: ({ id, onCheckedChange, className }: any) => (
    <input 
      type="checkbox" 
      id={id} 
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)} 
      className={className} 
      data-testid="checkbox"
    />
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Check: () => <div data-testid="check-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Microscope: () => <div data-testid="microscope-icon" />,
}));

// Mock clinical scenarios
jest.mock('@/lib/clinical-validation-scenarios', () => ({
  clinicalScenarios: [
    {
      id: 1,
      title: 'Test Scenario 1',
      description: 'Test description 1',
      endpoint: 'test-endpoint-1',
      requestBody: { test: 'data1' },
    },
    {
      id: 2,
      title: 'Test Scenario 2',
      description: 'Test description 2',
      endpoint: 'test-endpoint-2',
      requestBody: { test: 'data2' },
    },
  ],
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
    isLoaded: true,
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Clinical Validation Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({ result: 'test response', agent_type: 'test-agent' }),
    });
  });

  it('renders without crashing', () => {
    render(<ClinicalValidationPage />);
    
    expect(screen.getByText('Clinical Validation Dashboard')).toBeInTheDocument();
  });

  it('renders test scenarios', () => {
    render(<ClinicalValidationPage />);
    
    expect(screen.getByText('Test Scenario 1')).toBeInTheDocument();
    expect(screen.getByText('Test Scenario 2')).toBeInTheDocument();
  });

  it('allows scenario selection', async () => {
    render(<ClinicalValidationPage />);
    
    // Initially, no scenario should be selected
    expect(screen.queryByText('Test description 1')).not.toBeInTheDocument();
    
    // Select the second scenario
    const scenarioButton = screen.getByRole('button', { name: 'Test Scenario 2' });
    fireEvent.click(scenarioButton);
    
    // Check if the scenario details are displayed
    await waitFor(() => {
      expect(screen.getByText('Test description 2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Input Query:')).toBeInTheDocument();
  });

  it('handles scenario run', async () => {
    render(<ClinicalValidationPage />);
    
    // Select a scenario
    const scenarioButton = screen.getByRole('button', { name: 'Test Scenario 1' });
    fireEvent.click(scenarioButton);
    
    // Wait for the component to update
    await waitFor(() => {
      expect(screen.getByText('Test description 1')).toBeInTheDocument();
    });
    
    // Click run button
    const runButton = screen.getByRole('button', { name: /Run Scenario/i });
    fireEvent.click(runButton);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Agent Response')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    expect(screen.getByText('Agent Response')).toBeInTheDocument();
  });
});