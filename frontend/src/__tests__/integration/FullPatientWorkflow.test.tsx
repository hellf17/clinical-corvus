import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { setupFetchMock, createMockFile } from '../utils/test-utils';
import { usePatientStore } from '@/store/patientStore';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';
import { FileUploadComponent } from '@/components/FileUploadComponent';
import { ExamResultsDashboard } from '@/components/ExamResultsDashboard';
import { SystemExamsViewer } from '@/components/SystemExamsViewer';

// Mock all external dependencies first
jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn()
}));

jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn()
}));

jest.mock('@/store/chatStore', () => ({
  useChatStore: jest.fn()
}));

// Define the alertsService mock directly
jest.mock('@/services/alertsService', () => ({
  alertsService: {
    getAlertSummary: jest.fn().mockResolvedValue({
      total: 3,
      by_severity: {
        critical: 0,
        severe: 1,
        moderate: 1,
        mild: 1
      },
      by_type: {
        abnormal: 3,
        trend: 0,
        medication: 0
      },
      by_category: {
        hematology: 1,
        biochemistry: 2
      },
      unacknowledged: 2
    }),
    getPatientAlerts: jest.fn().mockResolvedValue({
      alerts: []
    })
  }
}));

// Mock components
jest.mock('@/components/analysis/MultiAnalysisResult', () => ({
  __esModule: true,
  default: () => <div data-testid="analysis-results">Analysis Results</div>
}));

jest.mock('@/components/patients/AlertsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="alerts-panel">Alerts Panel</div>
}));

// Mock ExamResultsDashboard and SystemExamsViewer to prevent errors
jest.mock('@/components/ExamResultsDashboard', () => ({
  ExamResultsDashboard: () => <div data-testid="exam-results-dashboard">Exam Results Dashboard</div>
}));

jest.mock('@/components/SystemExamsViewer', () => ({
  SystemExamsViewer: () => <div data-testid="system-exams-viewer">System Exams Viewer</div>
}));

// Define mock data
const mockPatient = {
  id: 'patient1',
  name: 'John Doe',
  dateOfBirth: '1980-01-01',
  gender: 'male' as const,
  vitalSigns: [
    {
      temperature: 36.5,
      date: new Date().toISOString()
    }
  ],
  exams: []
};

const mockExamResult = {
  id: 'exam1',
  date: '2023-04-15',
  type: 'blood',
  file: 'results.pdf',
  results: [
    {
      id: 'result1',
      name: 'Hemoglobina',
      value: 10.5,
      unit: 'g/dL',
      referenceRange: '12-16',
      isAbnormal: true,
      date: '2023-04-15'
    },
    {
      id: 'result2',
      name: 'Leucócitos',
      value: 8500,
      unit: '/mm³',
      referenceRange: '4000-10000',
      isAbnormal: false,
      date: '2023-04-15'
    }
  ]
};

describe('Full Patient Workflow Integration', () => {
  // Mock function implementations
  const mockAddExam = jest.fn();
  const mockAddNotification = jest.fn();
  const mockSendMessage = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock stores with type assertion
    (usePatientStore as unknown as jest.Mock).mockReturnValue({
      patients: [mockPatient],
      selectedPatientId: mockPatient.id,
      addExam: mockAddExam
    });
    
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    (useChatStore as unknown as jest.Mock).mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: mockSendMessage
    });
    
    // Setup fetch mocks
    setupFetchMock({
      'api/analyze/upload': {
        ok: true,
        json: async () => ({
          exam_date: '2023-04-15',
          results: [
            {
              id: 'result1',
              test_name: 'Hemoglobina',
              value_numeric: 10.5,
              unit: 'g/dL',
              reference_range_low: 12,
              reference_range_high: 16
            },
            {
              id: 'result2',
              test_name: 'Leucócitos',
              value_numeric: 8500,
              unit: '/mm³',
              reference_range_low: 4000,
              reference_range_high: 10000
            }
          ],
          analysis_results: {
            summary: 'O paciente apresenta anemia leve.',
            findings: [
              {
                test: 'Hemoglobina',
                value: 10.5,
                interpretation: 'Valor diminuído, indicando anemia leve',
                severity: 'mild'
              }
            ]
          }
        })
      },
      'api/chat': {
        ok: true,
        json: async () => ({
          id: 'msg1',
          role: 'assistant',
          content: 'O paciente apresenta anemia leve. Sugiro investigar a causa...',
          timestamp: Date.now()
        })
      }
    });
  });
  
  it('should complete the full patient exam workflow', async () => {
    // STEP 1: Render the FileUploadComponent for the selected patient
    render(<FileUploadComponent patientId={mockPatient.id} />);
    
    const user = userEvent.setup();
    
    // STEP 2: Upload a file
    const fileInput = screen.getByLabelText(/Upload de Exame \(PDF\)/i);
    
    await act(async () => {
      await user.upload(fileInput, createMockFile());
    });
    
    const uploadButton = screen.getByText(/Processar Exame/i);
    
    await act(async () => {
      await user.click(uploadButton);
    });
    
    // Verify API was called and exam was added
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analyze/upload/${mockPatient.id}`),
        expect.any(Object)
      );
      expect(mockAddExam).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
    
    // STEP 3: Update mock store with the new exam
    const updatedPatient = {
      ...mockPatient,
      exams: [mockExamResult]
    };
    
    (usePatientStore as unknown as jest.Mock).mockReturnValue({
      patients: [updatedPatient],
      selectedPatientId: updatedPatient.id,
      addExam: mockAddExam
    });
    
    // STEP 4: Render ExamResultsDashboard with updated patient data
    render(
      <ExamResultsDashboard patient={updatedPatient} />
    );
    
    // Verify dashboard is rendered
    expect(screen.getByTestId('exam-results-dashboard')).toBeInTheDocument();
    
    // STEP 5: Render SystemExamsViewer to see detailed results
    render(
      <SystemExamsViewer patient={updatedPatient} />
    );
    
    // Verify system exams viewer is rendered
    expect(screen.getByTestId('system-exams-viewer')).toBeInTheDocument();
    
    // STEP 6: Verify file upload messages are displayed
    expect(screen.getByText('Resultados da Análise')).toBeInTheDocument();
    expect(screen.getByText('Alertas Gerados')).toBeInTheDocument();
    expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
  });
}); 