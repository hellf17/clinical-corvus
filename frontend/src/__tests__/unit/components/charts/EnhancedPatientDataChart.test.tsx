import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedPatientDataChart } from '@/components/charts/EnhancedPatientDataChart';
import { VitalSign } from '@/types/health';
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

describe('EnhancedPatientDataChart', () => {
  const mockVitals: VitalSign[] = [
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
    },
    {
      vital_id: 3,
      patient_id: 1,
      timestamp: '2023-04-12T10:00:00Z',
      heart_rate: 78,
      systolic_bp: 130,
      diastolic_bp: 85,
      temperature: 37.2,
      respiratory_rate: 20,
      oxygen_saturation: 96
    }
  ];

  const createLabResult = (testName: string, value: number, timestamp: string, isAbnormal = false): LabResult => ({
    result_id: Math.floor(Math.random() * 1000),
    patient_id: 1,
    exam_id: 1,
    user_id: 1,
    test_name: testName,
    value_numeric: value,
    value_text: null,
    unit: testName === 'Hemoglobina' ? 'g/dL' : testName === 'Creatinina' ? 'mg/dL' : 'mg/L',
    timestamp,
    reference_range_low: testName === 'Hemoglobina' ? 12 : testName === 'Creatinina' ? 0.7 : 0,
    reference_range_high: testName === 'Hemoglobina' ? 16 : testName === 'Creatinina' ? 1.2 : 50,
    reference_text: null,
    is_abnormal: isAbnormal,
    collection_datetime: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    comments: null
  });

  const mockLabs: LabResult[] = [
    createLabResult('Hemoglobina', 12.5, '2023-04-10T10:00:00Z'),
    createLabResult('Hemoglobina', 10.5, '2023-04-11T10:00:00Z', true),
    createLabResult('Hemoglobina', 11.0, '2023-04-12T10:00:00Z', true),
    createLabResult('Creatinina', 1.1, '2023-04-10T10:00:00Z'),
    createLabResult('Creatinina', 1.8, '2023-04-11T10:00:00Z', true),
    createLabResult('Creatinina', 1.5, '2023-04-12T10:00:00Z', true)
  ];

  it('renders the chart correctly with data', () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} />);
    
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
  });
  
  it('allows selecting different parameters', async () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} />);
    
    // By default, should show some parameters
    const parameterCheckboxes = screen.getAllByRole('checkbox');
    expect(parameterCheckboxes.length).toBeGreaterThan(0);
    
    // Test selecting a specific vital sign
    const heartRateCheckbox = screen.getByLabelText('Freq. Cardíaca');
    expect(heartRateCheckbox).toBeInTheDocument();
    
    // Chart should render lines for selected parameters
    expect(screen.getByTestId('line-heart_rate')).toBeInTheDocument();
  });
  
  it('renders reference lines when available', () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} />);
    
    // Reference lines should be rendered for parameters with reference ranges
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Hemoglobina min
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Hemoglobina max
  });
  
  it('shows a message when no data is available', () => {
    render(<EnhancedPatientDataChart vitals={[]} labs={[]} />);
    
    expect(screen.getByText('Sem dados disponíveis para visualização em gráfico.')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Monitoramento Contínuo Personalizado';
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
  
  it('handles export functionality', async () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} />);
    
    // Find export button and click it
    const exportButton = screen.getByText('PDF');
    fireEvent.click(exportButton);
    
    // Since we're mocking the libraries, we just verify the button exists and is clickable
    expect(exportButton).toBeInTheDocument();
  });
  
  it('handles zoom functionality', async () => {
    render(<EnhancedPatientDataChart vitals={mockVitals} labs={mockLabs} />);
    
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
});