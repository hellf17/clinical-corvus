import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUploadComponent } from '@/components/FileUploadComponent';
import { useUIStore } from '@/store/uiStore';
import { usePatientStore } from '@/store/patientStore';

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

// Mock the MultiAnalysisResult component
jest.mock('@/components/analysis/MultiAnalysisResult', () => ({
  __esModule: true,
  default: () => <div data-testid="analysis-results">Analysis Results</div>
}));

// Mock the AlertsPanel component
jest.mock('@/components/patients/AlertsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="alerts-panel">Alerts Panel</div>
}));

// Create a custom file mock
const createFileMock = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUploadComponent', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup store mocks with type assertion to unknown first
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: jest.fn()
    });
    
    (usePatientStore as unknown as jest.Mock).mockReturnValue({
      addExam: jest.fn()
    });
    
    // Setup fetch mock
    global.fetch = jest.fn();
  });
  
  it('renders upload interface correctly', () => {
    render(<FileUploadComponent patientId="123" />);
    
    expect(screen.getByText('Upload de Exame (PDF)')).toBeInTheDocument();
    expect(screen.getByText('Processar Exame')).toBeInTheDocument();
  });
  
  it('handles file selection', () => {
    render(<FileUploadComponent patientId="123" />);
    
    const file = createFileMock();
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText(/test.pdf/)).toBeInTheDocument();
  });
  
  it('shows error for invalid file type', () => {
    const mockAddNotification = jest.fn();
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    render(<FileUploadComponent patientId="123" />);
    
    const file = createFileMock('test.txt', 'text/plain');
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      title: 'Arquivo inválido'
    }));
  });
  
  it('shows error for file too large', () => {
    const mockAddNotification = jest.fn();
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    render(<FileUploadComponent patientId="123" />);
    
    const file = createFileMock('large.pdf', 'application/pdf', 20 * 1024 * 1024); // 20MB
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      title: 'Arquivo muito grande'
    }));
  });
  
  it('calls API and adds exam on successful upload', async () => {
    const mockAddNotification = jest.fn();
    const mockAddExam = jest.fn();
    
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    (usePatientStore as unknown as jest.Mock).mockReturnValue({
      addExam: mockAddExam
    });
    
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        exam_date: '2023-01-01',
        results: [
          {
            id: 'result1',
            test_name: 'Glucose',
            value_numeric: 100,
            unit: 'mg/dL',
            reference_range_low: 70,
            reference_range_high: 99
          }
        ]
      })
    });
    
    render(<FileUploadComponent patientId="123" />);
    
    // Select a file
    const file = createFileMock();
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    fireEvent.change(input, { target: { files: [file] } });
    
    // Click upload button
    const uploadButton = screen.getByText('Processar Exame');
    fireEvent.click(uploadButton);
    
    // Wait for the API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockAddExam).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Exame processado'
      }));
    });
  });
  
  it('shows error notification when API call fails', async () => {
    const mockAddNotification = jest.fn();
    
    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification
    });
    
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        detail: 'Error processing file'
      })
    });
    
    render(<FileUploadComponent patientId="123" />);
    
    // Select a file
    const file = createFileMock();
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    fireEvent.change(input, { target: { files: [file] } });
    
    // Click upload button
    const uploadButton = screen.getByText('Processar Exame');
    fireEvent.click(uploadButton);
    
    // Wait for the API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Erro no upload'
      }));
    });
  });
  
  it('calls onSuccess callback after successful upload', async () => {
    const onSuccessMock = jest.fn();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        exam_date: '2023-01-01',
        results: []
      })
    });
    
    render(<FileUploadComponent patientId="123" onSuccess={onSuccessMock} />);
    
    // Select a file
    const file = createFileMock();
    const input = screen.getByLabelText('Upload de Exame (PDF)');
    fireEvent.change(input, { target: { files: [file] } });
    
    // Click upload button
    const uploadButton = screen.getByText('Processar Exame');
    fireEvent.click(uploadButton);
    
    // Wait for the API call to complete
    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });
}); 