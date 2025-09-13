import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedSeverityScoresChart } from '@/components/charts/EnhancedSeverityScoresChart';

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

describe('EnhancedSeverityScoresChart', () => {
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
      score_type: 'SOFA',
      value: 5,
      timestamp: '2023-04-12T10:00:00Z'
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
      score_type: 'qSOFA',
      value: 0,
      timestamp: '2023-04-12T10:00:00Z'
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
    },
    {
      score_type: 'APACHE II',
      value: 12,
      timestamp: '2023-04-12T10:00:00Z'
    }
  ];

  it('renders the chart correctly with data', () => {
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
    
    // Should have score lines
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-qSOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-APACHE II')).toBeInTheDocument();
  });
  
  it('allows selecting different scores', async () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // By default, should show all available scores
    const scoreCheckboxes = screen.getAllByRole('checkbox');
    expect(scoreCheckboxes.length).toBe(3); // SOFA, qSOFA, APACHE II
    
    // Test selecting a specific score
    const sofaCheckbox = screen.getByLabelText('SOFA');
    expect(sofaCheckbox).toBeInTheDocument();
    
    // Chart should render lines for selected scores
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
    
    // Uncheck SOFA
    fireEvent.click(sofaCheckbox);
    expect(sofaCheckbox).not.toBeChecked();
    
    // Check SOFA again
    fireEvent.click(sofaCheckbox);
    expect(sofaCheckbox).toBeChecked();
  });
  
  it('renders reference lines when available', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // Reference lines should be rendered for scores with reference ranges
    expect(screen.getByTestId('reference-line-2-leve')).toBeInTheDocument(); // qSOFA high risk
    expect(screen.getByTestId('reference-line-8-moderado')).toBeInTheDocument(); // SOFA moderate
    expect(screen.getByTestId('reference-line-11-grave')).toBeInTheDocument(); // SOFA severe
    expect(screen.getByTestId('reference-line-15-moderado')).toBeInTheDocument(); // APACHE II moderate
    expect(screen.getByTestId('reference-line-25-grave')).toBeInTheDocument(); // APACHE II severe
  });
  
  it('shows a message when no scores are available', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={[]} />);
    
    expect(screen.getByText('Sem escores de gravidade disponíveis para visualização.')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Evolução de Escores de Gravidade Personalizada';
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
  
  it('handles export functionality', async () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
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
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
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
  
  it('handles date range filtering', async () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // Find date range selector
    const dateRangeButton = screen.getByText('Selecione o período');
    fireEvent.click(dateRangeButton);
    
    // Since we're mocking the calendar component, we just verify the button exists and is clickable
    expect(dateRangeButton).toBeInTheDocument();
  });
  
  it('displays clinical interpretation', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // Should display interpretation for selected scores
    expect(screen.getByText('Interpretação:')).toBeInTheDocument();
    expect(screen.getByText('SOFA (Sequential Organ Failure Assessment):')).toBeInTheDocument();
    expect(screen.getByText('qSOFA (Quick SOFA):')).toBeInTheDocument();
    expect(screen.getByText('APACHE II (Acute Physiology and Chronic Health Evaluation II):')).toBeInTheDocument();
  });
  
  it('handles loading state', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} loading={true} />);
    
    // Should show loading spinner
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
  
  it('handles error state', () => {
    render(<EnhancedSeverityScoresChart clinicalScores={mockClinicalScores} error="Erro ao carregar dados" />);
    
    // Should show error message
    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
  });
});