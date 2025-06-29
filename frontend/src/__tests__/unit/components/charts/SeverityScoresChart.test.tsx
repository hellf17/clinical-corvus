import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SeverityScoresChart } from '@/components/charts/SeverityScoresChart';

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
    Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
      <div data-testid={`line-${dataKey}`}>{name}</div>
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ReferenceLine: ({ y, label }: { y: number; label: any }) => (
      <div data-testid={`reference-line-${y}-${label?.value?.replace(/\s+/g, '-').toLowerCase() || 'default'}`}>
        {label?.value && <span>{label.value}</span>}
      </div>
    ),
    Brush: () => <div data-testid="brush" />
  };
});

describe('SeverityScoresChart', () => {
  const mockClinicalScores = [
    { score_type: 'SOFA', value: 6, timestamp: '2023-04-10T10:00:00Z' },
    { score_type: 'SOFA', value: 8, timestamp: '2023-04-11T10:00:00Z' },
    { score_type: 'SOFA', value: 5, timestamp: '2023-04-12T10:00:00Z' },
    { score_type: 'qSOFA', value: 2, timestamp: '2023-04-10T10:00:00Z' },
    { score_type: 'qSOFA', value: 1, timestamp: '2023-04-11T10:00:00Z' },
    { score_type: 'qSOFA', value: 0, timestamp: '2023-04-12T10:00:00Z' },
    { score_type: 'APACHE II', value: 15, timestamp: '2023-04-10T10:00:00Z' },
    { score_type: 'APACHE II', value: 18, timestamp: '2023-04-11T10:00:00Z' },
    { score_type: 'APACHE II', value: 12, timestamp: '2023-04-12T10:00:00Z' }
  ];

  it('renders the chart correctly with data', () => {
    render(<SeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // Test title
    expect(screen.getByText('Evolução de Escores de Gravidade')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Test score lines
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-qSOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-APACHE II')).toBeInTheDocument();
    
    // Test score toggle buttons
    const buttonElements = screen.getAllByRole('button');
    const buttonLabels = buttonElements.map(button => button.textContent);
    expect(buttonLabels).toContain('SOFA');
    expect(buttonLabels).toContain('qSOFA');
    expect(buttonLabels).toContain('APACHE II');
  });
  
  it('allows toggling score visibility', () => {
    render(<SeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // All score lines should be visible initially
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-qSOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-APACHE II')).toBeInTheDocument();
    
    // Find all buttons and get the one for SOFA
    const buttons = screen.getAllByRole('button');
    const sofaButton = buttons.find(button => button.textContent === 'SOFA');
    
    // Click to toggle SOFA visibility
    fireEvent.click(sofaButton!);
    
    // SOFA should no longer be in the document
    expect(screen.queryByTestId('line-SOFA')).not.toBeInTheDocument();
    
    // But the other scores should still be there
    expect(screen.getByTestId('line-qSOFA')).toBeInTheDocument();
    expect(screen.getByTestId('line-APACHE II')).toBeInTheDocument();
    
    // Click to toggle SOFA back on
    fireEvent.click(sofaButton!);
    
    // SOFA should be visible again
    expect(screen.getByTestId('line-SOFA')).toBeInTheDocument();
  });
  
  it('renders appropriate reference lines', () => {
    render(<SeverityScoresChart clinicalScores={mockClinicalScores} />);
    
    // SOFA reference lines - now with unique testIds
    expect(screen.getByTestId('reference-line-2-leve')).toBeInTheDocument();
    expect(screen.getByTestId('reference-line-8-moderado')).toBeInTheDocument();
    expect(screen.getByTestId('reference-line-11-grave')).toBeInTheDocument();
    
    // qSOFA reference line
    expect(screen.getByTestId('reference-line-2-alto-risco')).toBeInTheDocument();
    
    // APACHE II reference lines
    // These will now be matched by unique ID combinations
    const refLines = screen.getAllByTestId(/reference-line-/);
    const referenceIds = refLines.map(line => line.dataset.testid);
    
    expect(referenceIds).toContain('reference-line-8-leve');
    expect(referenceIds).toContain('reference-line-15-moderado');
    expect(referenceIds).toContain('reference-line-25-grave');
  });
  
  it('shows a message when no data is available', () => {
    render(<SeverityScoresChart clinicalScores={[]} />);
    
    expect(screen.getByText('Nenhum escore de gravidade disponível para visualização')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Escores de UTI';
    render(<SeverityScoresChart clinicalScores={mockClinicalScores} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
}); 