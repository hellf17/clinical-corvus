import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientDetailsPage from '@/app/patients/[id]/page';
import { usePatientStore } from '@/store/patientStore';
import { useUIStore } from '@/store/uiStore';
import { createMockPatient, mockZustandStore } from '@/__tests__/utils/test-utils';
import { renderWithTabsProvider } from '@/__tests__/utils/test-wrappers';

// Mock the necessary hooks and components
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '123' }),
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn()
}));

jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn()
}));

// Mock components
jest.mock('@/components/layout/MainLayout', () => {
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>;
  MockMainLayout.displayName = 'MockMainLayout';
  return MockMainLayout;
});

// Mock the Tab components from Radix UI
jest.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children, defaultValue, onValueChange }: any) => (
    <div data-testid="tabs-root" data-default-value={defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`} role="tab" data-value={value} onClick={() => {}}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel" data-value={value} style={{ display: 'block' }}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/patients/AIChat', () => {
  const MockAIChat = ({ patientId }: { patientId: string }) => <div data-testid="ai-chat">AI Chat for {patientId}</div>;
  MockAIChat.displayName = 'MockAIChat';
  return MockAIChat;
});

jest.mock('@/components/patients/AlertsPanel', () => {
  const MockAlertsPanel = ({ patientId, compact }: { patientId: string, compact?: boolean }) => (
    <div data-testid="alerts-panel">Alerts Panel for {patientId}</div>
  );
  MockAlertsPanel.displayName = 'MockAlertsPanel';
  return MockAlertsPanel;
});

jest.mock('@/components/patients/AlertsHistoryChart', () => {
  const MockAlertsHistoryChart = ({ patientId }: { patientId: string }) => (
    <div data-testid="alerts-history-chart">Alerts History for {patientId}</div>
  );
  MockAlertsHistoryChart.displayName = 'MockAlertsHistoryChart';
  return MockAlertsHistoryChart;
});

jest.mock('@/components/ExamResultsDashboard', () => {
  const MockExamResultsDashboard = ({ patient }: any) => (
    <div data-testid="exam-results-dashboard">Exam Results for {patient?.name || 'Unknown'}</div>
  );
  MockExamResultsDashboard.displayName = 'MockExamResultsDashboard';
  return MockExamResultsDashboard;
});

jest.mock('@/components/SystemExamsViewer', () => {
  const MockSystemExamsViewer = ({ patient }: any) => (
    <div data-testid="system-exams-viewer">System Exams for {patient?.name || 'Unknown'}</div>
  );
  MockSystemExamsViewer.displayName = 'MockSystemExamsViewer';
  return MockSystemExamsViewer;
});

jest.mock('@/components/RiskScoresDashboard', () => {
  const MockRiskScoresDashboard = ({ patient }: any) => (
    <div data-testid="risk-scores-dashboard">Risk Scores for {patient?.name || 'Unknown'}</div>
  );
  MockRiskScoresDashboard.displayName = 'MockRiskScoresDashboard';
  return MockRiskScoresDashboard;
});

jest.mock('@/components/patients/MedicationsTable', () => {
  const MockMedicationsTable = ({ patientId }: { patientId: string }) => (
    <div data-testid="medications-table">Medications for {patientId}</div>
  );
  MockMedicationsTable.displayName = 'MockMedicationsTable';
  return MockMedicationsTable;
});

jest.mock('@/components/FileUploadComponent', () => {
  const MockFileUploadComponent = ({ patientId }: { patientId: string }) => (
    <div data-testid="file-upload">File Upload for {patientId}</div>
  );
  MockFileUploadComponent.displayName = 'MockFileUploadComponent';
  return MockFileUploadComponent;
});

// Mock chart components
jest.mock('@/components/charts', () => ({
  ResultsTimelineChart: ({ patient }: any) => (
    <div data-testid="results-timeline-chart">Timeline Chart for {patient?.name || 'Unknown'}</div>
  ),
  MultiParameterComparisonChart: ({ patient }: any) => (
    <div data-testid="multi-parameter-chart">Multi Parameter Chart for {patient?.name || 'Unknown'}</div>
  ),
  CorrelationMatrixChart: ({ patient }: any) => (
    <div data-testid="correlation-matrix-chart">Correlation Matrix for {patient?.name || 'Unknown'}</div>
  ),
  ScatterPlotChart: ({ patient }: any) => (
    <div data-testid="scatter-plot-chart">Scatter Plot for {patient?.name || 'Unknown'}</div>
  ),
  ConsolidatedTimelineChart: ({ patient }: any) => (
    <div data-testid="consolidated-timeline-chart">Consolidated Timeline for {patient?.name || 'Unknown'}</div>
  ),
  SeverityScoresChart: ({ patient }: any) => (
    <div data-testid="severity-scores-chart">Severity Scores for {patient?.name || 'Unknown'}</div>
  ),
}));

describe('PatientDetailsPage', () => {
  const mockSelectPatient = jest.fn();
  const mockAddNotification = jest.fn();
  
  // Create a fully populated patient object with properly structured exam results
  const samplePatient = {
    id: '123',
    name: 'John Doe',
    diagnosis: 'Pneumonia',
    gender: 'male',
    dateOfBirth: '1980-01-01',
    medicalRecord: '12345',
    admissionDate: '2023-01-15',
    exams: [
      { 
        id: 'exam1', 
        type: 'Blood Test', 
        date: '2023-01-16',
        results: [
          { 
            id: 'result1',
            test: 'Hemoglobina', 
            value: 14.5, 
            unit: 'g/dL', 
            referenceRange: '12-16', 
            isAbnormal: false 
          },
          { 
            id: 'result2',
            test: 'Leucócitos', 
            value: 12000, 
            unit: '/mm³', 
            referenceRange: '4000-10000', 
            isAbnormal: true 
          }
        ]
      },
      { 
        id: 'exam2', 
        type: 'X-Ray', 
        date: '2023-01-17',
        results: [] 
      }
    ],
    vitalSigns: [
      { 
        temperature: 37.2,
        heartRate: 80,
        respiratoryRate: 18,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        oxygenSaturation: 98,
        date: '2023-01-16'
      }
    ],
    anamnesis: 'Patient history notes',
    physicalExamFindings: 'Normal chest examination',
    diagnosticHypotheses: 'Community-acquired pneumonia'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockZustandStore(usePatientStore, {
      patients: [samplePatient],
      selectPatient: mockSelectPatient
    });
    
    mockZustandStore(useUIStore, {
      addNotification: mockAddNotification
    });
  });
  
  it('renders patient details correctly', () => {
    render(<PatientDetailsPage />);
    
    // Check patient name is displayed - use getAllByText since there are multiple elements with this text
    const patientNameElements = screen.getAllByText('John Doe');
    expect(patientNameElements.length).toBeGreaterThan(0);
    
    // Check patient details are displayed - use getAllByText for gender too since it appears multiple times
    const genderElements = screen.getAllByText('Masculino');
    expect(genderElements.length).toBeGreaterThan(0);
    
    const recordElements = screen.getAllByText('12345');
    expect(recordElements.length).toBeGreaterThan(0);
    
    // Check tabs are displayed
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-info')).toBeInTheDocument();
    expect(screen.getByTestId('tab-exams')).toBeInTheDocument();
    expect(screen.getByTestId('tab-medications')).toBeInTheDocument();
  });
  
  it('calls selectPatient on load', () => {
    render(<PatientDetailsPage />);
    
    // Should call selectPatient with the correct ID
    expect(mockSelectPatient).toHaveBeenCalledWith('123');
  });
  
  it('shows "Patient not found" message when patient is not found', () => {
    // Mock store with empty patients array
    mockZustandStore(usePatientStore, {
      patients: [],
      selectPatient: mockSelectPatient
    });
    
    render(<PatientDetailsPage />);
    
    // Should show not found message
    expect(screen.getByText('Paciente não encontrado')).toBeInTheDocument();
    expect(screen.getByText('O paciente que você está procurando não existe ou foi removido.')).toBeInTheDocument();
  });
  
  it('renders exam results when patient has exams', () => {
    render(<PatientDetailsPage />);
    
    // Should show exam results dashboard - use getAllByTestId since there might be multiple elements with this ID
    const examResultsElements = screen.getAllByTestId('exam-results-dashboard');
    expect(examResultsElements.length).toBeGreaterThan(0);
    
    const riskScoresElements = screen.getAllByTestId('risk-scores-dashboard');
    expect(riskScoresElements.length).toBeGreaterThan(0);
    
    // Should show timeline chart
    const timelineChartElements = screen.getAllByTestId('consolidated-timeline-chart');
    expect(timelineChartElements.length).toBeGreaterThan(0);
  });
  
  it('shows file upload option when patient has no exams', () => {
    // Mock patient with no exams
    const patientNoExams = {
      ...samplePatient,
      exams: []
    };
    
    mockZustandStore(usePatientStore, {
      patients: [patientNoExams],
      selectPatient: mockSelectPatient
    });
    
    render(<PatientDetailsPage />);
    
    // Should show no exams message
    expect(screen.getByText('Não há exames cadastrados para este paciente.')).toBeInTheDocument();
    
    // Should show file upload component - use getAllByTestId since there might be multiple elements with this ID
    const fileUploadElements = screen.getAllByTestId('file-upload');
    expect(fileUploadElements.length).toBeGreaterThan(0);
  });
  
  it('renders AI Chat tab content', () => {
    render(<PatientDetailsPage />);
    
    // Should show AI Chat component
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument();
  });
  
  it('renders medications tab content', () => {
    render(<PatientDetailsPage />);
    
    // Should show Medications table
    expect(screen.getByTestId('medications-table')).toBeInTheDocument();
  });
}); 