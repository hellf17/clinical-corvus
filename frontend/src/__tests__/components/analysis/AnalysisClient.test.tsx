import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalysisClient from '@/components/analysis/AnalysisClient';
import { getPatientByIdClient } from '@/services/patientService.client';
import { useAuth } from '@clerk/nextjs';
import type { PatientSummary, Patient } from '@/types/patient';

// Mock dependencies
jest.mock('@/services/patientService.client', () => ({
  getPatientByIdClient: jest.fn(),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/FileUploadComponent', () => ({
  default: ({ patientId }: { patientId: string | null }) => (
    <div data-testid="file-upload-component">
      File Upload Component (Patient ID: {patientId || 'None'})
    </div>
  ),
}));

const mockGetPatientById = getPatientByIdClient as jest.MockedFunction<typeof getPatientByIdClient>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AnalysisClient', () => {
  const user = userEvent.setup();

  const mockPatients: PatientSummary[] = [
    {
      patient_id: 1,
      name: 'John Doe',
      age: 45,
      gender: 'M',
    },
    {
      patient_id: 2,
      name: 'Jane Smith', 
      age: 32,
      gender: 'F',
    },
  ];

  const mockPatientDetails: Patient = {
    patient_id: 1,
    name: 'John Doe',
    age: 45,
    gender: 'M',
    date_of_birth: '1978-01-01',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    emergency_contact: {
      name: 'Jane Doe',
      phone: '+0987654321',
      relationship: 'Spouse'
    },
    medical_history: [],
    allergies: [],
    medications: [],
    exams: [
      {
        exam_id: 1,
        exam_timestamp: '2023-12-01T10:00:00Z',
        lab_results: [
          { test_name: 'Hemoglobin', value_numeric: 14.5 },
          { test_name: 'Glucose', value_numeric: 95 }
        ]
      },
      {
        exam_id: 2,
        exam_timestamp: '2023-11-15T09:30:00Z',
        lab_results: [
          { test_name: 'Cholesterol', value_numeric: 180 }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockUseAuth.mockReturnValue({
      getToken: jest.fn().mockResolvedValue('mock-token'),
    });
    
    mockGetPatientById.mockResolvedValue(mockPatientDetails);
  });

  describe('Component Rendering', () => {
    it('should render with patients list', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByText('Selecionar Paciente')).toBeInTheDocument();
      expect(screen.getByLabelText('Paciente (opcional)')).toBeInTheDocument();
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
    });

    it('should render without patients', () => {
      render(<AnalysisClient initialPatients={[]} />);
      
      expect(screen.getByText('Selecionar Paciente')).toBeInTheDocument();
      expect(screen.getByText(/Nenhum paciente associado encontrado/)).toBeInTheDocument();
      expect(screen.getByText(/Use a análise rápida anônima abaixo/)).toBeInTheDocument();
    });

    it('should show default state in right panel', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByText('Selecione um paciente ou faça upload anônimo')).toBeInTheDocument();
    });

    it('should have proper grid layout structure', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const gridContainer = screen.getByText('Selecionar Paciente').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3', 'gap-6');
      
      const leftPanel = screen.getByText('Selecionar Paciente').closest('.md\\:col-span-1');
      expect(leftPanel).toBeInTheDocument();
      
      const rightPanel = screen.getByText('Selecione um paciente ou faça upload anônimo').closest('.md\\:col-span-2');
      expect(rightPanel).toBeInTheDocument();
    });
  });

  describe('Patient Selection', () => {
    it('should display all patients in dropdown', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should allow selecting a patient', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(mockGetPatientById).toHaveBeenCalledWith('1');
      });
    });

    it('should show loading state when fetching patient details', async () => {
      mockGetPatientById.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPatientDetails), 100))
      );
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.getByText('Carregando detalhes do paciente...')).toBeInTheDocument();
    });

    it('should display patient details after loading', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Exames de John Doe')).toBeInTheDocument();
      });
    });

    it('should pass selected patient ID to FileUploadComponent', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      // Initially should show no patient ID
      expect(screen.getByText('File Upload Component (Patient ID: None)')).toBeInTheDocument();
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('File Upload Component (Patient ID: 1)')).toBeInTheDocument();
      });
    });

    it('should clear selection when switching back to anonymous', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      // Select a patient first
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('File Upload Component (Patient ID: 1)')).toBeInTheDocument();
      });
      
      // Clear selection by setting empty value
      await user.click(select);
      await user.selectOptions(select, '');
      
      expect(screen.getByText('File Upload Component (Patient ID: None)')).toBeInTheDocument();
    });
  });

  describe('Patient Details Display', () => {
    it('should display patient exam table when patient has exams', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Data')).toBeInTheDocument();
        expect(screen.getByText('Resultados')).toBeInTheDocument();
      });
      
      // Should show exam rows
      expect(screen.getByText('12/1/2023')).toBeInTheDocument(); // Formatted date
      expect(screen.getByText('11/15/2023')).toBeInTheDocument(); // Formatted date
      expect(screen.getByText('2')).toBeInTheDocument(); // Number of results in first exam
      expect(screen.getByText('1')).toBeInTheDocument(); // Number of results in second exam
    });

    it('should handle patient with no exams', async () => {
      const patientWithoutExams = { ...mockPatientDetails, exams: [] };
      mockGetPatientById.mockResolvedValue(patientWithoutExams);
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum exame encontrado para este paciente')).toBeInTheDocument();
        expect(screen.getByText('Faça upload de um exame para começar a análise')).toBeInTheDocument();
      });
    });

    it('should format exam dates correctly', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        // Should display formatted dates
        expect(screen.getByText('12/1/2023')).toBeInTheDocument();
        expect(screen.getByText('11/15/2023')).toBeInTheDocument();
      });
    });

    it('should handle missing exam timestamps gracefully', async () => {
      const patientWithMissingDates = {
        ...mockPatientDetails,
        exams: [
          {
            exam_id: 1,
            exam_timestamp: undefined,
            lab_results: []
          }
        ]
      };
      mockGetPatientById.mockResolvedValue(patientWithMissingDates);
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });

    it('should count lab results correctly', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        // First exam has 2 results, second has 1
        const resultCells = screen.getAllByRole('cell');
        const resultCountCells = resultCells.filter(cell => cell.textContent === '2' || cell.textContent === '1');
        expect(resultCountCells).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle patient fetch errors', async () => {
      mockGetPatientById.mockRejectedValue(new Error('Patient not found'));
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Paciente não encontrado ou acesso negado.')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockGetPatientById.mockRejectedValue(new Error('Network error'));
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle null patient response', async () => {
      mockGetPatientById.mockResolvedValue(null);
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Paciente não encontrado ou acesso negado.')).toBeInTheDocument();
      });
    });

    it('should clear error when selecting different patient', async () => {
      // First patient fails
      mockGetPatientById.mockRejectedValueOnce(new Error('Patient not found'));
      // Second patient succeeds
      mockGetPatientById.mockResolvedValueOnce(mockPatientDetails);
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      
      // Select first patient (fails)
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Patient not found')).toBeInTheDocument();
      });
      
      // Select second patient (succeeds)
      await user.click(select);
      await user.click(screen.getByText('Jane Smith'));
      
      await waitFor(() => {
        expect(screen.queryByText('Patient not found')).not.toBeInTheDocument();
        expect(screen.getByText('Exames de John Doe')).toBeInTheDocument(); // Should show loaded patient
      });
    });

    it('should handle authentication token errors', async () => {
      mockUseAuth.mockReturnValue({
        getToken: vi.fn().mockRejectedValue(new Error('Token expired')),
      });
      
      // Patient service should handle this, but component should still work
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByText('Selecionar Paciente')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should clear patient details when selection is cleared', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      
      // Select patient
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Exames de John Doe')).toBeInTheDocument();
      });
      
      // Clear selection
      await user.click(select);
      await user.selectOptions(select, '');
      
      expect(screen.getByText('Selecione um paciente ou faça upload anônimo')).toBeInTheDocument();
    });

    it('should maintain patient selection across re-renders', async () => {
      const { rerender } = render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        expect(screen.getByText('Exames de John Doe')).toBeInTheDocument();
      });
      
      // Re-render with same props
      rerender(<AnalysisClient initialPatients={mockPatients} />);
      
      // Should still show selected patient
      expect(screen.getByText('Exames de John Doe')).toBeInTheDocument();
    });

    it('should update when initialPatients prop changes', () => {
      const { rerender } = render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      const newPatients: PatientSummary[] = [
        { patient_id: 3, name: 'Bob Wilson', age: 55, gender: 'M' }
      ];
      
      rerender(<AnalysisClient initialPatients={newPatients} />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByLabelText('Paciente (opcional)')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'patientSelect');
    });

    it('should support keyboard navigation', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      
      // Should be focusable
      select.focus();
      expect(document.activeElement).toBe(select);
      
      // Should open with Enter
      await user.keyboard('{Enter}');
      
      // Options should be visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      // CardTitle should create proper heading structure
      expect(screen.getByText('Selecionar Paciente')).toBeInTheDocument();
    });

    it('should have proper table structure for exam data', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(2);
        expect(headers[0]).toHaveTextContent('Data');
        expect(headers[1]).toHaveTextContent('Resultados');
      });
    });
  });

  describe('Integration with FileUploadComponent', () => {
    it('should pass null patientId when no patient selected', () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      expect(screen.getByText('File Upload Component (Patient ID: None)')).toBeInTheDocument();
    });

    it('should pass correct patientId when patient selected', async () => {
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Jane Smith'));
      
      await waitFor(() => {
        expect(screen.getByText('File Upload Component (Patient ID: 2)')).toBeInTheDocument();
      });
    });

    it('should show FileUploadComponent even when no patients available', () => {
      render(<AnalysisClient initialPatients={[]} />);
      
      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();
      expect(screen.getByText('File Upload Component (Patient ID: None)')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle patients with special characters in names', () => {
      const specialPatients: PatientSummary[] = [
        { patient_id: 1, name: 'João da Silva', age: 30, gender: 'M' },
        { patient_id: 2, name: 'María José', age: 25, gender: 'F' },
      ];
      
      render(<AnalysisClient initialPatients={specialPatients} />);
      
      expect(screen.getByText('João da Silva')).toBeInTheDocument();
      expect(screen.getByText('María José')).toBeInTheDocument();
    });

    it('should handle very long patient names', async () => {
      const longNamePatients: PatientSummary[] = [
        { 
          patient_id: 1, 
          name: 'Very Long Patient Name That Exceeds Normal Length Expectations', 
          age: 30, 
          gender: 'M' 
        },
      ];
      
      render(<AnalysisClient initialPatients={longNamePatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      
      expect(screen.getByText('Very Long Patient Name That Exceeds Normal Length Expectations')).toBeInTheDocument();
    });

    it('should handle missing exam data gracefully', async () => {
      const patientWithIncompleteExams = {
        ...mockPatientDetails,
        exams: [
          {
            exam_id: 1,
            exam_timestamp: '2023-12-01T10:00:00Z',
            lab_results: null as any // Simulate missing lab_results
          }
        ]
      };
      mockGetPatientById.mockResolvedValue(patientWithIncompleteExams);
      
      render(<AnalysisClient initialPatients={mockPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('John Doe'));
      
      await waitFor(() => {
        // Should show 0 results for incomplete exam
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should handle patient ID type conversion correctly', async () => {
      const numericIdPatients: PatientSummary[] = [
        { patient_id: 123, name: 'Numeric ID Patient', age: 30, gender: 'M' },
      ];
      
      render(<AnalysisClient initialPatients={numericIdPatients} />);
      
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Numeric ID Patient'));
      
      await waitFor(() => {
        expect(mockGetPatientById).toHaveBeenCalledWith('123'); // Should convert to string
      });
    });
  });
});