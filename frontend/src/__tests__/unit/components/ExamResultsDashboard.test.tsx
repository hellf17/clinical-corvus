import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExamResultsDashboard } from '@/components/ExamResultsDashboard';
import { Patient, Exam, LabResult } from '@/store/patientStore'; 

// Mock the Card components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="card-header" className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="card-title" className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="card-content" className={className}>{children}</div>,
}));

// Mock the chart component
jest.mock('@/components/charts/ResultsTimelineChart', () => {
  return {
    __esModule: true,
    default: ({ exams, title }: { exams: Exam[]; title?: string }) => <div data-testid="timeline-chart">Mocked Chart</div>
  };
});

// Mock patient data
const mockResults: LabResult[] = [
  {
    id: "result1",
    name: "Hemoglobina",
    value: 10,
    unit: "g/dL",
    referenceRange: "12-16",
    isAbnormal: true,
    date: "2023-01-01"
  },
  {
    id: "result2",
    name: "Creatinina",
    value: 0.9,
    unit: "mg/dL",
    referenceRange: "0.7-1.2",
    isAbnormal: false,
    date: "2023-01-01"
  }
];

const mockExams: Exam[] = [
  {
    id: "exam1",
    date: "2023-01-01",
    type: "blood",
    file: "test.pdf",
    results: mockResults
  }
];

const mockPatient: Patient = {
  id: "1",
  name: "Test Patient",
  dateOfBirth: "1980-01-01",
  gender: "male",
  vitalSigns: [],
  exams: mockExams
};

const emptyPatient: Patient = {
  ...mockPatient,
  exams: []
};

describe('ExamResultsDashboard Component', () => {
  it('displays message when no exams are available', () => {
    render(<ExamResultsDashboard patient={emptyPatient} />);
    
    expect(screen.getByText('Sem exames disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Faça upload de exames para visualizar resultados e análises.')).toBeInTheDocument();
  });
  
  it('renders dashboard with statistics and exam results', () => {
    render(<ExamResultsDashboard patient={mockPatient} />);
    
    // Check for statistic cards
    const totalExamesSection = screen.getByText('Total de Exames').closest('div');
    expect(totalExamesSection).toBeInTheDocument();
    expect(within(totalExamesSection!).getByText('1')).toBeInTheDocument();
    
    expect(screen.getByText('Primeiro Exame')).toBeInTheDocument();
    expect(screen.getByText('Último Exame')).toBeInTheDocument();
    
    const valoresAlteradosSection = screen.getByText('Valores Alterados').closest('div');
    expect(valoresAlteradosSection).toBeInTheDocument();
    expect(within(valoresAlteradosSection!).getByText('1')).toBeInTheDocument();
    
    // Check for the systems section
    expect(screen.getByText('Resultados por Sistema')).toBeInTheDocument();
    
    // Check for system titles
    expect(screen.getByText('Sistema Hematológico')).toBeInTheDocument();
    expect(screen.getByText('Função Renal')).toBeInTheDocument();
    
    // Check for table headers - using getAllByText for duplicate elements
    expect(screen.getAllByText('Exame')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Resultado')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Referência')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Data')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
    
    // Check for exam test names
    expect(screen.getByText('Hemoglobina')).toBeInTheDocument();
    expect(screen.getByText('Creatinina')).toBeInTheDocument();
    
    // Check for exam values - using regex to match values with units
    expect(screen.getByText(/10.*g\/dL/)).toBeInTheDocument();
    expect(screen.getByText(/0.9.*mg\/dL/)).toBeInTheDocument();
  });
}); 