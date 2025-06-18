import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FileUploadComponent } from '@/components/FileUploadComponent';
import { useUIStore } from '@/store/uiStore';
import { usePatientStore } from '@/store/patientStore';
import { createMockFile, setupFetchMock } from '../utils/test-utils';
import { alertsService } from '@/services/alertsService';

// Mock the stores
jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn()
}));

jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn()
}));

// Mock the alert service
jest.mock('@/services/alertsService', () => ({
  alertsService: {
    getAlertSummary: jest.fn().mockResolvedValue({})
  }
}));

// Mock MultiAnalysisResult and AlertsPanel components
jest.mock('@/components/analysis/MultiAnalysisResult', () => ({
  __esModule: true,
  default: () => <div data-testid="analysis-results">Analysis Results</div>
}));

jest.mock('@/components/patients/AlertsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="alerts-panel">Alerts Panel</div>
}));

describe('FileUploadComponent integration test', () => {
  const mockPatientId = '123';
  const mockAddNotification = jest.fn();
  const mockAddExam = jest.fn();
  const mockOnSuccess = jest.fn();
  let cleanupFetchMock: () => void;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup store mocks with type assertion to unknown first
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    (usePatientStore as unknown as jest.Mock).mockReturnValue({
      addExam: mockAddExam
    });
    
    // Setup fetch mock
    cleanupFetchMock = setupFetchMock({
      'api/analyze/upload': {
        ok: true,
        json: async () => ({
          exam_date: '2023-03-15',
          results: [
            {
              id: 'result-123',
              test_name: 'Glicose',
              value_numeric: 120,
              unit: 'mg/dL',
              reference_range_low: 70,
              reference_range_high: 99
            }
          ],
          analysis_results: {
            summary: 'O paciente apresenta hiperglicemia.',
            findings: [
              {
                test: 'Glicose',
                value: 120,
                interpretation: 'Valor aumentado, indicando hiperglicemia.',
                severity: 'mild'
              }
            ]
          }
        })
      }
    });
  });
  
  afterEach(() => {
    // Clean up the fetch mock
    if (cleanupFetchMock) {
      cleanupFetchMock();
    }
  });
  
  it('should handle file selection and upload correctly', async () => {
    render(<FileUploadComponent patientId={mockPatientId} onSuccess={mockOnSuccess} />);
    
    const user = userEvent.setup();
    
    // Select file
    const fileInput = screen.getByLabelText('Upload de Exame (PDF)');
    const file = createMockFile();
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    // Find and click upload button
    const uploadButton = screen.getByText('Processar Exame');
    
    await act(async () => {
      await user.click(uploadButton);
    });
    
    // Verify API was called and store was updated
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analyze/upload/${mockPatientId}`),
        expect.any(Object)
      );
      
      // Check if addExam was called with correct params
      expect(mockAddExam).toHaveBeenCalledWith(
        mockPatientId,
        expect.objectContaining({
          date: '2023-03-15',
          type: 'blood'
        })
      );
      
      // Check if success notification was shown
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Exame processado'
        })
      );
      
      // Check if onSuccess callback was called
      expect(mockOnSuccess).toHaveBeenCalled();
      
      // Check if alerts service was called
      expect(alertsService.getAlertSummary).toHaveBeenCalledWith(mockPatientId);
    });
  });
  
  it('should show error for invalid file type', async () => {
    render(<FileUploadComponent patientId={mockPatientId} />);
    
    const user = userEvent.setup();
    
    // Select invalid file (text instead of PDF)
    const fileInput = screen.getByLabelText('Upload de Exame (PDF)');
    // Use text/plain to ensure it's rejected by the component
    const invalidFile = createMockFile('test.txt', 'text/plain');
    
    // Spy on the handleFileChange function indirectly through the mock
    await act(async () => {
      // Manually trigger the change event since userEvent.upload might not be working correctly
      const changeEvent = {
        target: {
          files: [invalidFile]
        }
      };
      
      // Directly call the onChange handler
      fireEvent.change(fileInput, changeEvent);
    });
    
    // Check if error notification was shown - with more specific waitFor
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Arquivo inválido',
          message: 'Por favor, envie apenas arquivos PDF.'
        })
      );
    }, { timeout: 3000 });
    
    // Upload button should be disabled or not call the API
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should handle API errors gracefully', async () => {
    // Override fetch mock for this test only
    cleanupFetchMock();
    cleanupFetchMock = setupFetchMock({
      'api/analyze/upload': {
        ok: false,
        json: async () => ({ detail: 'Error processing file' })
      }
    });
    
    render(<FileUploadComponent patientId={mockPatientId} />);
    
    const user = userEvent.setup();
    
    // Select valid file
    const fileInput = screen.getByLabelText('Upload de Exame (PDF)');
    const file = createMockFile();
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    // Find and click upload button
    const uploadButton = screen.getByText('Processar Exame');
    
    await act(async () => {
      await user.click(uploadButton);
    });
    
    // Verify error notification was shown
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Erro no upload'
        })
      );
    });
  });
}); 