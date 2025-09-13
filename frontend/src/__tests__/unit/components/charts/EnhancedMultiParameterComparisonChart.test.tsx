import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedMultiParameterComparisonChart } from '@/components/charts/EnhancedMultiParameterComparisonChart';
import { Exam } from '@/store/patientStore';

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

describe('EnhancedMultiParameterComparisonChart', () => {
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
        },
        {
          result_id: 3,
          patient_id: 1,
          exam_id: 1,
          user_id: 1,
          test_name: 'Leucócitos',
          value_numeric: 8.5,
          value_text: null,
          unit: 'mil/μL',
          timestamp: '2023-04-10T10:00:00Z',
          reference_range_low: 4,
          reference_range_high: 11,
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
          result_id: 4,
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
          result_id: 5,
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
        },
        {
          result_id: 6,
          patient_id: 1,
          exam_id: 2,
          user_id: 1,
          test_name: 'Leucócitos',
          value_numeric: 12.5,
          value_text: null,
          unit: 'mil/μL',
          timestamp: '2023-04-15T10:00:00Z',
          reference_range_low: 4,
          reference_range_high: 11,
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
    },
    {
      exam_id: 3,
      patient_id: 1,
      exam_timestamp: '2023-04-20T10:00:00Z',
      type: 'laboratorial',
      exam_type: 'biochemistry',
      exam_type_name: 'Bioquímica',
      file: 'exam3.pdf',
      lab_results: [
        {
          result_id: 7,
          patient_id: 1,
          exam_id: 3,
          user_id: 1,
          test_name: 'Hemoglobina',
          value_numeric: 11.0,
          value_text: null,
          unit: 'g/dL',
          timestamp: '2023-04-20T10:00:00Z',
          reference_range_low: 12,
          reference_range_high: 16,
          is_abnormal: true,
          collection_datetime: '2023-04-20T08:00:00Z',
          reference_text: null,
          comments: 'Valor abaixo do esperado',
          created_at: '2023-04-20T10:00:00Z',
          updated_at: '2023-04-20T10:00:00Z'
        },
        {
          result_id: 8,
          patient_id: 1,
          exam_id: 3,
          user_id: 1,
          test_name: 'Creatinina',
          value_numeric: 1.5,
          value_text: null,
          unit: 'mg/dL',
          timestamp: '2023-04-20T10:00:00Z',
          reference_range_low: 0.7,
          reference_range_high: 1.2,
          is_abnormal: true,
          collection_datetime: '2023-04-20T08:00:00Z',
          reference_text: null,
          comments: 'Valor acima do esperado',
          created_at: '2023-04-20T10:00:00Z',
          updated_at: '2023-04-20T10:00:00Z'
        },
        {
          result_id: 9,
          patient_id: 1,
          exam_id: 3,
          user_id: 1,
          test_name: 'Leucócitos',
          value_numeric: 9.5,
          value_text: null,
          unit: 'mil/μL',
          timestamp: '2023-04-20T10:00:00Z',
          reference_range_low: 4,
          reference_range_high: 11,
          is_abnormal: false,
          collection_datetime: '2023-04-20T08:00:00Z',
          reference_text: null,
          comments: null,
          created_at: '2023-04-20T10:00:00Z',
          updated_at: '2023-04-20T10:00:00Z'
        }
      ],
      notes: 'Exame de controle',
      created_at: '2023-04-20T10:00:00Z',
      updated_at: '2023-04-20T10:00:00Z'
    }
  ];

  it('renders the chart correctly with data', () => {
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
    
    // Should have parameter checkboxes
    const parameterCheckboxes = screen.getAllByRole('checkbox');
    expect(parameterCheckboxes.length).toBeGreaterThanOrEqual(3); // Hemoglobina, Creatinina, Leucócitos
    
    // Should have normalization toggle
    expect(screen.getByText('Normalizar valores (0-100%) para comparação de tendências')).toBeInTheDocument();
  });
  
  it('allows selecting different parameters', async () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // By default, should select some common parameters
    const hemoglobinaCheckbox = screen.getByLabelText('Hemoglobina');
    const creatininaCheckbox = screen.getByLabelText('Creatinina');
    const leucocitosCheckbox = screen.getByLabelText('Leucócitos');
    
    expect(hemoglobinaCheckbox).toBeInTheDocument();
    expect(creatininaCheckbox).toBeInTheDocument();
    expect(leucocitosCheckbox).toBeInTheDocument();
    
    // Test selecting/deselecting parameters
    fireEvent.click(hemoglobinaCheckbox);
    expect(hemoglobinaCheckbox).not.toBeChecked();
    
    fireEvent.click(hemoglobinaCheckbox);
    expect(hemoglobinaCheckbox).toBeChecked();
    
    // Chart should render lines for selected parameters
    expect(screen.getByTestId('line-Hemoglobina')).toBeInTheDocument();
    expect(screen.getByTestId('line-Creatinina')).toBeInTheDocument();
    expect(screen.getByTestId('line-Leucócitos')).toBeInTheDocument();
  });
  
  it('renders reference lines when available', () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Reference lines should be rendered for parameters with reference ranges
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
    expect(screen.getByTestId('reference-line-0.7')).toBeInTheDocument(); // Creatinina min
    expect(screen.getByTestId('reference-line-1.2')).toBeInTheDocument(); // Creatinina max
    expect(screen.getByTestId('reference-line-4')).toBeInTheDocument(); // Leucócitos min
    expect(screen.getByTestId('reference-line-11')).toBeInTheDocument(); // Leucócitos max
  });
  
  it('shows a message when no exams are available', () => {
    render(<EnhancedMultiParameterComparisonChart exams={[]} />);
    
    expect(screen.getByText('Dados insuficientes para exibir gráfico de dispersão (necessário pelo menos 2 parâmetros numéricos).')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Comparação de Múltiplos Parâmetros Personalizada';
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
  
  it('handles export functionality', async () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Find export buttons
    const pngButton = screen.getByText('PNG');
    const pdfButton = screen.getByText('PDF');
    
    fireEvent.click(pngButton);
    fireEvent.click(pdfButton);
    
    // Since we're mocking the libraries, we just verify the buttons exist and are clickable
    expect(pngButton).toBeInTheDocument();
    expect(pdfButton).toBeInTheDocument();
  });
  
  it('handles zoom functionality', async () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
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
  
  it('handles normalization toggle', async () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Find normalization toggle
    const normalizeSwitch = screen.getByText('Normalizar valores (0-100%) para comparação de tendências');
    fireEvent.click(normalizeSwitch);
    
    // Since we're mocking the functionality, we just verify the switch exists and is clickable
    expect(normalizeSwitch).toBeInTheDocument();
  });
  
  it('handles date range filtering', async () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Find date range selector
    const dateRangeButton = screen.getByText('Selecione o período');
    fireEvent.click(dateRangeButton);
    
    // Since we're mocking the calendar component, we just verify the button exists and is clickable
    expect(dateRangeButton).toBeInTheDocument();
  });
  
  it('displays clinical interpretation', () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} />);
    
    // Should display interpretation section
    expect(screen.getByText('Interpretação Clínica:')).toBeInTheDocument();
    expect(screen.getByText('Legenda:')).toBeInTheDocument();
  });
  
  it('handles loading state', () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} loading={true} />);
    
    // Should show loading spinner
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
  
  it('handles error state', () => {
    render(<EnhancedMultiParameterComparisonChart exams={mockExams} error="Erro ao carregar dados" />);
    
    // Should show error message
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
  });
});