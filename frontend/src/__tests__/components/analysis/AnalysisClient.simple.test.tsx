import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalysisClient from '@/components/analysis/AnalysisClient';

// Mock dependencies
jest.mock('@/services/patientService.client', () => ({
  getPatientByIdClient: jest.fn(),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(() => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  })),
}));

jest.mock('@/components/FileUploadComponent', () => {
  const MockFileUploadComponent = () => <div data-testid="file-upload-component">File Upload</div>;
  return {
    default: MockFileUploadComponent,
    FileUploadComponent: MockFileUploadComponent,
  };
});

describe('AnalysisClient Simple Test', () => {
  it('should render with empty patients list', () => {
    render(<AnalysisClient initialPatients={[]} />);
    
    expect(screen.getByText('Selecionar Paciente')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
  });
});