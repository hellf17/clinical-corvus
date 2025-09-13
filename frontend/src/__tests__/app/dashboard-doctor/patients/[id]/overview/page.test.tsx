import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientOverviewPage from '@/app/dashboard-doctor/patients/[id]/overview/page';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton">Loading...</div>,
}));

jest.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid="tabs-content" data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid="tabs-trigger" data-value={value}>{children}</button>,
}));

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div className={className} data-testid="badge" data-variant={variant}>{children}</div>
  ),
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      data-testid="button"
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

// Mock chart components
jest.mock('@/components/charts/EnhancedPatientDataChart', () => ({
  EnhancedPatientDataChart: () => <div data-testid="enhanced-patient-data-chart">Enhanced Patient Data Chart</div>,
}));

jest.mock('@/components/charts/EnhancedSeverityScoresChart', () => ({
  EnhancedSeverityScoresChart: () => <div data-testid="enhanced-severity-scores-chart">Enhanced Severity Scores Chart</div>,
}));

jest.mock('@/components/charts/EnhancedResultsTimelineChart', () => ({
  EnhancedResultsTimelineChart: () => <div data-testid="enhanced-results-timeline-chart">Enhanced Results Timeline Chart</div>,
}));

jest.mock('@/components/charts/EnhancedConsolidatedTimelineChart', () => ({
  EnhancedConsolidatedTimelineChart: () => <div data-testid="enhanced-consolidated-timeline-chart">Enhanced Consolidated Timeline Chart</div>,
}));

jest.mock('@/components/charts/EnhancedMultiParameterComparisonChart', () => ({
  EnhancedMultiParameterComparisonChart: () => <div data-testid="enhanced-multi-parameter-comparison-chart">Enhanced Multi Parameter Comparison Chart</div>,
}));

jest.mock('@/components/charts/EnhancedCorrelationMatrixChart', () => ({
  EnhancedCorrelationMatrixChart: () => <div data-testid="enhanced-correlation-matrix-chart">Enhanced Correlation Matrix Chart</div>,
}));

jest.mock('@/components/charts/EnhancedScatterPlotChart', () => ({
  EnhancedScatterPlotChart: () => <div data-testid="enhanced-scatter-plot-chart">Enhanced Scatter Plot Chart</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
}));

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useParams: () => ({
    id: '1',
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('mock-token'),
  }),
}));

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
  })),
}));

describe('Patient Overview Page', () => {
  const mockSWR = require('swr');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock SWR to return loading state
    mockSWR.default.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    
    render(<PatientOverviewPage />);
    
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
    // Check that at least one skeleton element has the text
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons[0]).toHaveTextContent('Loading...');
  });

  it('renders error state when data fetching fails', () => {
    // Mock SWR to return error state
    mockSWR.default.mockReturnValue({
      data: undefined,
      error: new Error('Failed to load'),
      isLoading: false,
    });
    
    render(<PatientOverviewPage />);
    
    expect(screen.getByText('Erro')).toBeInTheDocument();
    expect(screen.getByText('Erro ao carregar dados do paciente.')).toBeInTheDocument();
  });

  it('renders patient overview when data is loaded', () => {
    // Mock SWR to return patient data
    mockSWR.default
      .mockReturnValueOnce({
        data: {
          patient_id: 1,
          name: 'John Doe',
          age: 45,
          gender: 'male',
          status: 'ativo',
          primary_diagnosis: 'Hypertension',
          birthDate: '1980-01-01',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          vitalSigns: [],
          lab_results: [],
          exams: [],
          medications: [],
          clinicalNotes: [],
        },
        error: undefined,
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: {
          patient_id: 1,
          name: 'John Doe',
          age: 45,
          gender: 'male',
          status: 'ativo',
          primary_diagnosis: 'Hypertension',
          risk_score: 'Low',
          last_updated: '2023-01-01T00:00:00Z',
          summary: 'Patient is stable',
        },
        error: undefined,
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [],
        error: undefined,
        isLoading: false,
      });
    
    render(<PatientOverviewPage />);
    
    expect(screen.getByText('Visão Geral do Paciente')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('45 anos')).toBeInTheDocument();
    expect(screen.getByText('male')).toBeInTheDocument();
    
    // Check for the first occurrence of 'ativo' (in the patient demographics section)
    const statusElements = screen.getAllByText('ativo');
    expect(statusElements[0]).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    
    // Get all tab triggers and check specific ones
    const tabTriggers = screen.getAllByTestId('tabs-trigger');
    expect(tabTriggers).toHaveLength(6);
    expect(tabTriggers[0]).toHaveTextContent('Sinais Vitais');
    expect(tabTriggers[1]).toHaveTextContent('Escore de Gravidade');
    expect(tabTriggers[2]).toHaveTextContent('Laboratório');
    expect(tabTriggers[3]).toHaveTextContent('Medicações');
    expect(tabTriggers[4]).toHaveTextContent('Exames');
    expect(tabTriggers[5]).toHaveTextContent('Linha do Tempo Consolidada');
  });
});