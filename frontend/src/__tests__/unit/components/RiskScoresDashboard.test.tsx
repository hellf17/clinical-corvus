import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RiskScoresDashboard } from '@/components/RiskScoresDashboard';
import { Patient, LabResult } from '@/store/patientStore';
import scoreService from '@/services/scoreService';
import { useUIStore } from '@/store/uiStore';

// Mock scoreService
jest.mock('@/services/scoreService', () => ({
  __esModule: true,
  default: {
    calculateSofa: jest.fn().mockResolvedValue({
      score: 8,
      category: 'SOFA',
      mortality_risk: 40,
      interpretation: 'Disfunção orgânica múltipla significativa',
      component_scores: {
        respiratory: 2,
        coagulation: 1,
        liver: 1,
        cardiovascular: 2,
        cns: 1,
        renal: 1
      },
      recommendations: ['Monitoramento intensivo', 'Avaliação frequente dos parâmetros'],
      abnormalities: ['Insuficiência respiratória moderada', 'Hipotensão'],
      is_critical: true,
      details: {
        respiratory_details: 'PaO2/FiO2 = 250',
        cardiovascular_details: 'Requer vasopressores'
      }
    }),
    calculateQSofa: jest.fn().mockResolvedValue({
      score: 2,
      category: 'qSOFA',
      mortality_risk: 12,
      interpretation: 'Risco moderado de sepse',
      recommendations: ['Avaliar possibilidade de sepse', 'Monitorar sinais vitais'],
      is_critical: false
    }),
    calculateApache2: jest.fn().mockResolvedValue({
      score: 15,
      category: 'APACHE II',
      mortality_risk: 25,
      interpretation: 'Risco de mortalidade moderado',
      recommendations: ['Monitoramento em UTI', 'Avaliação diária do escore'],
      is_critical: false
    })
  }
}));

// Mock UIStore
jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn().mockReturnValue({
    addNotification: jest.fn()
  })
}));

describe('RiskScoresDashboard', () => {
  // Helper to create a lab result
  const createLabResult = (name: string, value: number, isAbnormal: boolean, referenceRange: string): LabResult => ({
    id: Math.random().toString(36).substring(2, 11),
    name,
    date: '2023-04-15',
    value,
    unit: name === 'Hemoglobina' ? 'g/dL' : name === 'Creatinina' ? 'mg/dL' : 'mg/L',
    referenceRange,
    isAbnormal
  });

  // Mock patient data
  const mockPatient: Patient = {
    id: 'patient123',
    name: 'João Silva',
    dateOfBirth: '1980-05-15',
    gender: 'male',
    medicalRecord: '12345',
    hospital: 'Hospital Central',
    admissionDate: '2023-04-10',
    anamnesis: 'Paciente apresentou febre e dispneia há 3 dias',
    diagnosticHypotheses: 'Pneumonia, Sepse',
    vitalSigns: [
      {
        date: '2023-04-15',
        temperature: 38.5,
        heartRate: 110,
        respiratoryRate: 24,
        bloodPressureSystolic: 100,
        bloodPressureDiastolic: 60,
        oxygenSaturation: 92,
        Glasgow: 14
      }
    ],
    exams: [
      {
        id: 'exam1',
        date: '2023-04-15',
        type: 'laboratorial',
        file: 'exam1.pdf',
        results: [
          createLabResult('pO2', 75, true, '80-100'),
          createLabResult('FiO2', 35, false, '21-100'),
          createLabResult('Plaquetas', 90000, true, '150000-400000'),
          createLabResult('Bilirrubina', 3.2, true, '0.3-1.2'),
          createLabResult('Creatinina', 1.8, true, '0.7-1.2'),
          createLabResult('Pressão Arterial Média', 65, true, '70-105'),
          createLabResult('Glasgow', 14, false, '15'),
          createLabResult('Hemoglobina', 9.5, true, '12-16'),
          createLabResult('Leucócitos', 15000, true, '4000-10000'),
          createLabResult('Sódio', 145, false, '135-145'),
          createLabResult('Potássio', 3.5, false, '3.5-5.0'),
          createLabResult('pH Arterial', 7.32, true, '7.35-7.45')
        ]
      }
    ]
  };
  
  // Patient without exams
  const patientWithoutExams: Patient = {
    ...mockPatient,
    exams: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a message when no exams are available', () => {
    render(<RiskScoresDashboard patient={patientWithoutExams} />);
    
    expect(screen.getByText('Não há dados suficientes para calcular escores de risco.')).toBeInTheDocument();
  });

  it('renders the calculated SOFA score components', () => {
    render(<RiskScoresDashboard patient={mockPatient} />);
    
    // The dashboard should show calculated SOFA components
    expect(screen.getByText('Sistema Respiratório')).toBeInTheDocument();
    expect(screen.getByText('Coagulação')).toBeInTheDocument();
    expect(screen.getByText('Função Hepática')).toBeInTheDocument();
    expect(screen.getByText('Sistema Cardiovascular')).toBeInTheDocument();
    expect(screen.getByText('Sistema Nervoso Central')).toBeInTheDocument();
    expect(screen.getByText('Função Renal')).toBeInTheDocument();
  });

  it('allows calculating API scores', async () => {
    render(<RiskScoresDashboard patient={mockPatient} />);
    
    // Find and click the SOFA calculation button - use getAllByText since there are multiple buttons
    const calcButtons = screen.getAllByText('Calcular via API');
    // The first button is for SOFA
    fireEvent.click(calcButtons[0]);
    
    // Wait for the API call to resolve and check that the scoreService was called
    await waitFor(() => {
      expect(scoreService.calculateSofa).toHaveBeenCalled();
    });
    
    // After the API call, expect to see the score - use a more specific approach to find the score
    // by looking for the score within specific text context
    await waitFor(() => {
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === '8'
      )).toBeInTheDocument();
      
      expect(screen.getByText('Disfunção orgânica múltipla significativa')).toBeInTheDocument();
    });
  });

  it('renders qSOFA details', () => {
    render(<RiskScoresDashboard patient={mockPatient} />);
    
    // The dashboard should show qSOFA criteria
    expect(screen.getByText('qSOFA Score')).toBeInTheDocument();
    expect(screen.getAllByText(/respiratória/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/mental/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/arterial/i)[0]).toBeInTheDocument();
  });

  it('allows calculating qSOFA score from API', async () => {
    render(<RiskScoresDashboard patient={mockPatient} />);
    
    // Find and click the qSOFA API calculation button
    const qsofaButtons = screen.getAllByText('Calcular via API');
    // The second button should be for qSOFA
    fireEvent.click(qsofaButtons[1]);
    
    // Wait for the API call to resolve
    await waitFor(() => {
      expect(scoreService.calculateQSofa).toHaveBeenCalled();
    });
    
    // After the API call, expect to see the score - use a more specific selector
    await waitFor(() => {
      const scoreElement = screen.getAllByText((content, element) => {
        return content === '2' && element?.closest('.mt-4.pt-3.border-t') !== null;
      })[0];
      expect(scoreElement).toBeInTheDocument();
      
      expect(screen.getByText('Risco moderado de sepse')).toBeInTheDocument();
    });
  });

  it('allows calculating APACHE II score from API', async () => {
    render(<RiskScoresDashboard patient={mockPatient} />);
    
    // Find and click the APACHE II API calculation button
    const apacheButtons = screen.getAllByText('Calcular via API');
    // The third button should be for APACHE II
    fireEvent.click(apacheButtons[2]);
    
    // Wait for the API call to resolve
    await waitFor(() => {
      expect(scoreService.calculateApache2).toHaveBeenCalled();
    });
    
    // After the API call, expect to see the score - use a more specific selector
    await waitFor(() => {
      const scoreElement = screen.getAllByText((content, element) => {
        return content === '15' && element?.closest('.mt-4.pt-3.border-t') !== null;
      })[0];
      expect(scoreElement).toBeInTheDocument();
      
      expect(screen.getByText('Risco de mortalidade moderado')).toBeInTheDocument();
    });
  });
}); 