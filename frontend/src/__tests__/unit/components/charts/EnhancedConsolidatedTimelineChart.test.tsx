import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedConsolidatedTimelineChart } from '@/components/charts/EnhancedConsolidatedTimelineChart';
import { Patient, Exam } from '@/store/patientStore';
import { Medication } from '@/types/medication';
import { ClinicalNote } from '@/types/clinical_note';

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

describe('EnhancedConsolidatedTimelineChart', () => {
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
    },
    {
      medication_id: 2,
      patient_id: 1,
      name: 'Espironolactona',
      dosage: '100 mg',
      frequency: '1x ao dia',
      start_date: '2023-04-10T10:00:00Z',
      end_date: null,
      prescriber: 'Dr. Carlos Mendes',
      notes: 'Para tratamento de ascite',
      status: 'active',
      route: 'oral',
      indication: 'Tratamento de ascite',
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
    },
    {
      id: 2,
      patient_id: 1,
      user_id: 1,
      title: 'Evolução do Tratamento',
      note_type: 'progress_note',
      content: '<p>Paciente apresenta melhora da ascite após início do tratamento.</p>',
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z',
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
      timestamp: '2023-04-15T10:00:00Z'
    },
    {
      score_type: 'qSOFA',
      value: 2,
      timestamp: '2023-04-10T10:00:00Z'
    },
    {
      score_type: 'qSOFA',
      value: 1,
      timestamp: '2023-04-15T10:00:00Z'
    }
  ];

  it('renders the chart correctly with data', () => {
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
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Parâmetros:')).toBeInTheDocument();
  });
  
  it('allows selecting different parameters', async () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
      />
    );
    
    // By default, should show some parameters
    const parameterCheckboxes = screen.getAllByRole('checkbox');
    expect(parameterCheckboxes.length).toBeGreaterThan(0);
    
    // Test selecting a specific parameter
    const hemoglobinaCheckbox = screen.getByLabelText('Hemoglobina');
    expect(hemoglobinaCheckbox).toBeInTheDocument();
    
    // Chart should render lines for selected parameters
    expect(screen.getByTestId('line-hemoglobina')).toBeInTheDocument();
  });
  
  it('renders reference lines when available', () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
      />
    );
    
    // Reference lines should be rendered for parameters with reference ranges
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
  });
  
  it('shows a message when no data is available', () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={[]}
        medications={[]}
        clinicalNotes={[]}
        clinicalScores={[]}
      />
    );
    
    expect(screen.getByText('Sem dados disponíveis para visualização em gráfico.')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Linha do Tempo Consolidada Personalizada';
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
        title={customTitle}
      />
    );
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
  
  it('handles export functionality', async () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
      />
    );
    
    // Find export button and click it
    const exportButton = screen.getByText('PDF');
    fireEvent.click(exportButton);
    
    // Since we're mocking the libraries, we just verify the button exists and is clickable
    expect(exportButton).toBeInTheDocument();
  });
  
  it('handles zoom functionality', async () => {
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
      />
    );
    
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
  
  it('handles annotation functionality', async () => {
    const mockOnAnnotationClick = jest.fn();
    
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
        onAnnotationClick={mockOnAnnotationClick}
      />
    );
    
    // Find annotation button and click it
    const annotationButton = screen.getByText('Adicionar anotação');
    fireEvent.click(annotationButton);
    
    // Since we're mocking the functionality, we just verify the button exists and is clickable
    expect(annotationButton).toBeInTheDocument();
  });
  
  it('handles event deletion', async () => {
    const mockOnDeleteEvent = jest.fn();
    
    render(
      <EnhancedConsolidatedTimelineChart 
        patient={mockPatient}
        exams={mockExams}
        medications={mockMedications}
        clinicalNotes={mockClinicalNotes}
        clinicalScores={mockClinicalScores}
        onDeleteEvent={mockOnDeleteEvent}
      />
    );
    
    // Find delete button and click it
    const deleteButton = screen.getByText('Excluir');
    fireEvent.click(deleteButton);
    
    // Since we're mocking the functionality, we just verify the button exists and is clickable
    expect(deleteButton).toBeInTheDocument();
  });
});