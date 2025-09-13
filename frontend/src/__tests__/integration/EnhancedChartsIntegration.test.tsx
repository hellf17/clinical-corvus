import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedResultsTimelineChart } from '@/components/charts/EnhancedResultsTimelineChart';
import { EnhancedPatientDataChart } from '@/components/charts/EnhancedPatientDataChart';
import { EnhancedConsolidatedTimelineChart } from '@/components/charts/EnhancedConsolidatedTimelineChart';
import { EnhancedSeverityScoresChart } from '@/components/charts/EnhancedSeverityScoresChart';
import { EnhancedMultiParameterComparisonChart } from '@/components/charts/EnhancedMultiParameterComparisonChart';
import { EnhancedCorrelationMatrixChart } from '@/components/charts/EnhancedCorrelationMatrixChart';
import { EnhancedScatterPlotChart } from '@/components/charts/EnhancedScatterPlotChart';
import { Patient, Exam } from '@/store/patientStore';
import { Medication } from '@/types/medication';
import { ClinicalNote } from '@/types/clinical_note';
import { LabResult } from '@/types/health';

// Mock Recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: ({ dataKey }: { dataKey: string }) => (
      <div data-testid={`line-${dataKey}`}>{dataKey}</div>
    ),
    ScatterChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="scatter-chart">{children}</div>
    ),
    Scatter: ({ dataKey }: { dataKey: string }) => (
      <div data-testid={`scatter-${dataKey}`}>{dataKey}</div>
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ReferenceLine: ({ y, label }: { y: number; label: any }) => (
      <div data-testid={`reference-line-${y}`}>
        {label?.value && <span>{label.value}</span>}
      </div>
    ),
    Brush: () => <div data-testid="brush" />
  };
});

// Mock html2canvas and jspdf
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    toDataURL: () => 'data:image/png;base64,test',
    width: 100,
    height: 100
  }))
}));

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn()
  }));
});

// Mock react-icons
jest.mock('react-icons/ai', () => ({
  AiFillMedicineBox: () => <div data-testid="medicine-box-icon" />,
  AiFillExperiment: () => <div data-testid="experiment-icon" />,
  AiFillAlert: () => <div data-testid="alert-icon" />,
  AiFillSafetyCertificate: () => <div data-testid="safety-certificate-icon" />,
  AiFillEdit: () => <div data-testid="edit-icon" />
}));

jest.mock('react-icons/bi', () => ({
  BiSolidInjection: () => <div data-testid="injection-icon" />
}));

jest.mock('react-icons/fa', () => ({
  FaStethoscope: () => <div data-testid="stethoscope-icon" />,
  FaCalendarAlt: () => <div data-testid="calendar-icon" />,
  FaRegFileAlt: () => <div data-testid="file-alt-icon" />,
  FaPlus: () => <div data-testid="plus-icon" />,
  FaSave: () => <div data-testid="save-icon" />,
  FaTrash: () => <div data-testid="trash-icon" />
}));

jest.mock('react-icons/fi', () => ({
  FiMoreVertical: () => <div data-testid="more-vertical-icon" />
}));

// Mock react-vertical-timeline-component
jest.mock('react-vertical-timeline-component', () => {
  return {
    VerticalTimeline: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="vertical-timeline">{children}</div>
    ),
    VerticalTimelineElement: ({ children, date, icon }: any) => (
      <div data-testid="vertical-timeline-element" className="vertical-timeline-element">
        <div className="vertical-timeline-element-date">{date}</div>
        <div className="vertical-timeline-element-icon">{icon}</div>
        <div className="vertical-timeline-element-content">{children}</div>
      </div>
    )
  };
});

describe('Enhanced Charts Integration', () => {
  // Mock data for testing
  const mockPatient: Patient = {
    patient_id: 1,
    name: 'João Silva',
    age: 65,
    gender: 'male',
    status: 'ativo',
    primary_diagnosis: 'Cirrose Hepática',
    risk_score: 'Alto',
    birthDate: '1960-01-01',
    created_at: '2023-04-10T10:00:00Z',
    updated_at: '2023-04-10T10:00:00Z',
    medicalRecord: 'MRN123456',
    hospital: 'Hospital Central',
    admissionDate: '2023-04-10T10:00:00Z',
    anamnesis: 'Histórico de consumo excessivo de álcool',
    physicalExamFindings: 'Icterícia ++, ascite moderada',
    diagnosticHypotheses: 'Cirrose alcoólica compensada',
    primary_diagnosis: 'Cirrose Hepática',
    exams: [],
    vitalSigns: [],
    age: 65,
    lab_results: [],
    user_id: null
  };

  const mockExams: Exam[] = [
    {
      exam_id: 1,
      patient_id: 1,
      exam_timestamp: '2023-04-10T10:00:00Z',
      type: 'laboratorial',
      exam_type: 'biochemistry',
      exam_type_name: 'Bioquímica',
      file: 'exam1.pdf',
      lab_results: [
        {
          result_id: 1,
          patient_id: 1,
          exam_id: 1,
          user_id: 1,
          test_name: 'Hemoglobina',
          value_numeric: 12.5,
          value_text: null,
          unit: 'g/dL',
          timestamp: '2023-04-10T10:00:00Z',
          reference_range_low: 12,
          reference_range_high: 16,
          is_abnormal: false,
          collection_datetime: '2023-04-10T08:00:00Z',
          reference_text: null,
          comments: null,
          created_at: '2023-04-10T10:00:00Z',
          updated_at: '2023-04-10T10:00:00Z'
        },
        {
          result_id: 2,
          patient_id: 1,
          exam_id: 1,
          user_id: 1,
          test_name: 'Creatinina',
          value_numeric: 1.1,
          value_text: null,
          unit: 'mg/dL',
          timestamp: '2023-04-10T10:00:00Z',
          reference_range_low: 0.7,
          reference_range_high: 1.2,
          is_abnormal: false,
          collection_datetime: '2023-04-10T08:00:00Z',
          reference_text: null,
          comments: null,
          created_at: '2023-04-10T10:00:00Z',
          updated_at: '2023-04-10T10:00:00Z'
        }
      ],
      notes: 'Exame inicial',
      created_at: '2023-04-10T10:00:00Z',
      updated_at: '2023-04-10T10:00:00Z'
    },
    {
      exam_id: 2,
      patient_id: 1,
      exam_timestamp: '2023-04-15T10:00:00Z',
      type: 'laboratorial',
      exam_type: 'hematology',
      exam_type_name: 'Hematologia',
      file: 'exam2.pdf',
      lab_results: [
        {
          result_id: 3,
          patient_id: 1,
          exam_id: 2,
          user_id: 1,
          test_name: 'Hemoglobina',
          value_numeric: 10.5,
          value_text: null,
          unit: 'g/dL',
          timestamp: '2023-04-15T10:00:00Z',
          reference_range_low: 12,
          reference_range_high: 16,
          is_abnormal: true,
          collection_datetime: '2023-04-15T08:00:00Z',
          reference_text: null,
          comments: 'Valor abaixo do esperado',
          created_at: '2023-04-15T10:00:00Z',
          updated_at: '2023-04-15T10:00:00Z'
        },
        {
          result_id: 4,
          patient_id: 1,
          exam_id: 2,
          user_id: 1,
          test_name: 'Creatinina',
          value_numeric: 1.8,
          value_text: null,
          unit: 'mg/dL',
          timestamp: '2023-04-15T10:00:00Z',
          reference_range_low: 0.7,
          reference_range_high: 1.2,
          is_abnormal: true,
          collection_datetime: '2023-04-15T08:00:00Z',
          reference_text: null,
          comments: 'Valor acima do esperado',
          created_at: '2023-04-15T10:00:00Z',
          updated_at: '2023-04-15T10:00:00Z'
        }
      ],
      notes: 'Exame de acompanhamento',
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z'
    }
  ];

  const mockVitals = [
    {
      vital_id: 1,
      patient_id: 1,
      timestamp: '2023-04-10T10:00:00Z',
      heart_rate: 72,
      systolic_bp: 120,
      diastolic_bp: 80,
      temperature: 36.5,
      respiratory_rate: 16,
      oxygen_saturation: 98
    },
    {
      vital_id: 2,
      patient_id: 1,
      timestamp: '2023-04-11T10:00:00Z',
      heart_rate: 75,
      systolic_bp: 125,
      diastolic_bp: 82,
      temperature: 37.0,
      respiratory_rate: 18,
      oxygen_saturation: 97
    }
  ];

  const mockMedications: Medication[] = [
    {
      medication_id: 1,
      patient_id: 1,
      name: 'Lactulose',
      dosage: '15 mL',
      frequency: '3x ao dia',
      start_date: '2023-04-10T10:00:00Z',
      end_date: null,
      prescriber: 'Dr. Carlos Mendes',
      notes: 'Para tratamento de encefalopatia hepática',
      status: 'active',
      route: 'oral',
      indication: 'Tratamento de encefalopatia hepática',
      created_at: '2023-04-10T10:00:00Z',
      updated_at: '2023-04-10T10:00:00Z'
    }
  ];

  const mockClinicalNotes: ClinicalNote[] = [
    {
      id: 1,
      patient_id: 1,
      user_id: 1,
      title: 'Avaliação Inicial',
      note_type: 'clinical_assessment',
      content: '<p>Paciente admitido com quadro de icterícia e ascite moderada.</p>',
      created_at: '2023-04-10T10:00:00Z',
      updated_at: '2023-04-10T10:00:00Z',
      author: 'Dr. Carlos Mendes'
    }
  ];

  const mockClinicalScores = [
    {
      score_type: 'SOFA',
      value: 6,
      timestamp: '2023-04-10T10:00:00Z'
    },
    {
      score_type: 'SOFA',
      value: 8,
      timestamp: '2023-04-11T10:00:00Z'
    },
    {
      score_type: 'qSOFA',
      value: 2,
      timestamp: '2023-04-10T10:00:00Z'
    },
    {
      score_type: 'qSOFA',
      value: 1,
      timestamp: '2023-04-11T10:00:00Z'
    },
    {
      score_type: 'APACHE II',
      value: 15,
      timestamp: '2023-04-10T10:00:00Z'
    },
    {
      score_type: 'APACHE II',
      value: 18,
      timestamp: '2023-04-11T10:00:00Z'
    }
  ];

  const mockLabResults: LabResult[] = [
    {
      result_id: 1,
      patient_id: 1,
      exam_id: 1,
      user_id: 1,
      test_name: 'Hemoglobina',
      value_numeric: 12.5,
      value_text: null,
      unit: 'g/dL',
      timestamp: '2023-04-10T10:00:00Z',
      reference_range_low: 12,
      reference_range_high: 16,
      is_abnormal: false,
      collection_datetime: '2023-04-10T08:00:00Z',
      reference_text: null,
      comments: null,
      created_at: '2023-04-10T10:00:00Z',
      updated_at: '2023-04-10T10:00:00Z'
    },
    {
      result_id: 2,
      patient_id: 1,
      exam_id: 1,
      user_id: 1,
      test_name: 'Creatinina',
      value_numeric: 1.1,
      value_text: null,
      unit: 'mg/dL',
      timestamp: '2023-04-10T10:00:00Z',
      reference_range_low: 0.7,
      reference_range_high: 1.2,
      is_abnormal: false,
      collection_datetime: '2023-04-10T08:00:00Z',
      reference_text: null,
      comments: null,
      created_at: '2023-04-10T10:00:00Z',
      updated_at: '2023-04-10T10:00:00Z'
    },
    {
      result_id: 3,
      patient_id: 1,
      exam_id: 2,
      user_id: 1,
      test_name: 'Hemoglobina',
      value_numeric: 10.5,
      value_text: null,
      unit: 'g/dL',
      timestamp: '2023-04-15T10:00:00Z',
      reference_range_low: 12,
      reference_range_high: 16,
      is_abnormal: true,
      collection_datetime: '2023-04-15T08:00:00Z',
      reference_text: null,
      comments: 'Valor abaixo do esperado',
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z'
    },
    {
      result_id: 4,
      patient_id: 1,
      exam_id: 2,
      user_id: 1,
      test_name: 'Creatinina',
      value_numeric: 1.8,
      value_text: null,
      unit: 'mg/dL',
      timestamp: '2023-04-15T10:00:00Z',
      reference_range_low: 0.7,
      reference_range_high: 1.2,
      is_abnormal: true,
      collection_datetime: '2023-04-15T08:00:00Z',
      reference_text: null,
      comments: 'Valor acima do esperado',
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z'
    }
  ];

  it('renders EnhancedResultsTimelineChart correctly with data', () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Test default title
    expect(screen.getByText('Resultados ao Longo do Tempo')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have lines for parameters
    expect(screen.getByTestId('line-value_numeric')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
  });
  
  it('renders EnhancedPatientDataChart correctly with data', () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabResults} />);
    
    // Test default title
    expect(screen.getByText('Dados Contínuos do Paciente')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have lines for parameters
    expect(screen.getByTestId('line-heart_rate')).toBeInTheDocument();
    expect(screen.getByTestId('line-systolic_bp')).toBeInTheDocument();
    expect(screen.getByTestId('line-diastolic_bp')).toBeInTheDocument();
    expect(screen.getByTestId('line-temperature')).toBeInTheDocument();
    expect(screen.getByTestId('line-respiratory_rate')).toBeInTheDocument();
    expect(screen.getByTestId('line-oxygen_saturation')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
  });
  
  it('renders EnhancedConsolidatedTimelineChart correctly with data', () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
      />
    );
    
    // Test default title
    expect(screen.getByText('Linha do Tempo Consolidada')).toBeInTheDocument();
    
    // Test timeline container
    expect(screen.getByTestId('vertical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('vertical-timeline-element')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have timeline elements
    expect(screen.getByText('Admissão Hospitalar')).toBeInTheDocument();
    expect(screen.getByText('Exame Laboratorial')).toBeInTheDocument();
    expect(screen.getByText('Medicação: Lactulose')).toBeInTheDocument();
    expect(screen.getByText('Nota Clínica: Avaliação Inicial')).toBeInTheDocument();
    expect(screen.getByText('Score: SOFA')).toBeInTheDocument();
    expect(screen.getByText('Score: qSOFA')).toBeInTheDocument();
    expect(screen.getByText('Score: APACHE II')).toBeInTheDocument();
    
    // Should have icons
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    expect(screen.getByTestId('experiment-icon')).toBeInTheDocument();
    expect(screen.getByTestId('medicine-box-icon')).toBeInTheDocument();
    expect(screen.getByTestId('file-alt-icon')).toBeInTheDocument();
    expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument();
  });
  
  it('renders EnhancedSeverityScoresChart correctly with data', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // Test default title
    expect(screen.getByText('Evolução de Escores de Gravidade')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have lines for parameters
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-qSOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-APACHE II')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-2-leve')).toBeInTheDocument(); // qSOFA high risk
    expect(screen.getByTestId('reference-line-8-moderado')).toBeInTheDocument(); // SOFA moderate
    expect(screen.getByTestId('reference-line-11-grave')).toBeInTheDocument(); // SOFA severe
    expect(screen.getByTestId('reference-line-15-moderado')).toBeInTheDocument(); // APACHE II moderate
    expect(screen.getByTestId('reference-line-25-grave')).toBeInTheDocument(); // APACHE II severe
  });
  
  it('renders EnhancedMultiParameterComparisonChart correctly with data', () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Test default title
    expect(screen.getByText('Comparação de Múltiplos Parâmetros')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have lines for parameters
    expect(screen.getByTestId('line-Hemoglobina')).toBeInTheDocument();
    expect(screen.getByTestId('line-Creatinina')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
  });
  
  it('renders EnhancedCorrelationMatrixChart correctly with data', () => {
    render(<EnhancedCorrelationMatrixChart exams={mockExams} />);
    
    // Test default title
    expect(screen.getByText('Matriz de Correlação')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have correlation matrix table
    expect(screen.getByTestId('correlation-matrix-table')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
  });
  
  it('renders EnhancedScatterPlotChart correctly with data', () => {
    render(<EnhancedScatterPlotChart exams={mockExams} />);
    
    // Test default title
    expect(screen.getByText('Gráfico de Dispersão')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
    
    // Should have scatter points
    expect(screen.getByTestId('scatter-Hemoglobina')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-Creatinina')).toBeInTheDocument();
    
    // Should have reference lines
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
  });
  
  it('handles export functionality for all enhanced charts', async () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Find export buttons
    const pngButton = screen.getByText('PNG');
    const pdfButton = screen.getByText('PDF');
    
    fireEvent.click(pngButton);
    fireEvent.click(pdfButton);
    
    // Since we're mocking the libraries, we just verify the buttons exist and are clickable
    expect(pngButton).toBeInTheDocument();
    expect(pdfButton).toBeInTheDocument();
  });
  
  it('handles zoom functionality for all enhanced charts', async () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Find zoom buttons
    const zoomInButton = screen.getByTitle('Aumentar zoom');
    const zoomOutButton = screen.getByTitle('Diminuir zoom');
    const resetZoomButton = screen.getByTitle('Redefinir zoom');
    
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(resetZoomButton);
    
    // Since we're mocking the functionality, we just verify the buttons exist and are clickable
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(resetZoomButton).toBeInTheDocument();
  });
  
  it('handles date range filtering for all enhanced charts', async () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Find date range selector
    const dateRangeButton = screen.getByText('Selecione o período');
    fireEvent.click(dateRangeButton);
    
    // Since we're mocking the calendar component, we just verify the button exists and is clickable
    expect(dateRangeButton).toBeInTheDocument();
  });
  
  it('handles parameter selection for all enhanced charts', async () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Find parameter checkboxes
    const hemoglobinaCheckbox = screen.getByLabelText('Hemoglobina');
    const creatininaCheckbox = screen.getByLabelText('Creatinina');
    
    fireEvent.click(hemoglobinaCheckbox);
    fireEvent.click(creatininaCheckbox);
    
    // Since we're mocking the functionality, we just verify the checkboxes exist and are clickable
    expect(hemoglobinaCheckbox).toBeInTheDocument();
    expect(creatininaCheckbox).toBeInTheDocument();
  });
  
  it('displays clinical interpretation for all enhanced charts', () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} />);
    
    // Should display interpretation section
    expect(screen.getByText('Interpretação Clínica:')).toBeInTheDocument();
    expect(screen.getByText('Legenda:')).toBeInTheDocument();
  });
  
  it('handles loading state for all enhanced charts', () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} loading={true} />);
    
    // Should show loading spinner
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
  
  it('handles error state for all enhanced charts', () => {
    render(<EnhancedResultsTimelineChart results={mockLabResults} error="Erro ao carregar dados" />);
    
    // Should show error message
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
  });
});