import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedResultsTimelineChart } from '@/components/charts/EnhancedResultsTimelineChart';
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
    ReferenceArea: ({ y1, y2 }: { y1: number; y2: number }) => (
      <div data-testid={`reference-area-${y1}-${y2}`} />
    )
  };
});

// Mock html2canvas and jspdf
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    toDataURL: () => 'data:image/png;base64,test',
    width: 800,
    height: 600
  }))
}));

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn()
  }));
});

describe('EnhancedResultsTimelineChart', () => {
  const mockResults: LabResult[] = [
    {
      result_id: 1,
      patient_id: 1,
      exam_id: 1,
      test_name: 'Hemoglobina',
      value_numeric: 12.5,
      value_text: null,
      unit: 'g/dL',
      timestamp: '2023-04-15T10:00:00Z',
      reference_range_low: 12,
      reference_range_high: 16,
      is_abnormal: false,
      collection_datetime: '2023-04-15T08:00:00Z',
      reference_text: null,
      comments: null,
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z'
    },
    {
      result_id: 2,
      patient_id: 1,
      exam_id: 1,
      test_name: 'Hemoglobina',
      value_numeric: 10.5,
      value_text: null,
      unit: 'g/dL',
      timestamp: '2023-04-16T10:00:00Z',
      reference_range_low: 12,
      reference_range_high: 16,
      is_abnormal: true,
      collection_datetime: '2023-04-16T08:00:00Z',
      reference_text: null,
      comments: 'Valor abaixo do esperado',
      created_at: '2023-04-16T10:00:00Z',
      updated_at: '2023-04-16T10:00:00Z'
    },
    {
      result_id: 3,
      patient_id: 1,
      exam_id: 2,
      test_name: 'Creatinina',
      value_numeric: 1.1,
      value_text: null,
      unit: 'mg/dL',
      timestamp: '2023-04-15T10:00:00Z',
      reference_range_low: 0.7,
      reference_range_high: 1.2,
      is_abnormal: false,
      collection_datetime: '2023-04-15T08:00:00Z',
      reference_text: null,
      comments: null,
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2023-04-15T10:00:00Z'
    },
    {
      result_id: 4,
      patient_id: 1,
      exam_id: 2,
      test_name: 'Creatinina',
      value_numeric: 1.8,
      value_text: null,
      unit: 'mg/dL',
      timestamp: '2023-04-16T10:00:00Z',
      reference_range_low: 0.7,
      reference_range_high: 1.2,
      is_abnormal: true,
      collection_datetime: '2023-04-16T08:00:00Z',
      reference_text: null,
      comments: 'Valor acima do esperado',
      created_at: '2023-04-16T10:00:00Z',
      updated_at: '2023-04-16T10:00:00Z'
    }
  ];

  it('renders the chart correctly with data', () => {
    render(<EnhancedResultsTimelineChart results={mockResults} />);
    
    // Test default title
    expect(screen.getByText('Resultados ao Longo do Tempo: Hemoglobina')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should have date range selector
    expect(screen.getByText('Selecione o período')).toBeInTheDocument();
    
    // Should have export buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    
    // Should have parameter selection
    expect(screen.getByText('Hemoglobina')).toBeInTheDocument();
  });
  
  it('allows selecting different tests', async () => {
    render(<EnhancedResultsTimelineChart results={mockResults} />);
    
    // Find select element
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // There should be options for each test
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(2); // Hemoglobina, Creatinina
    
    // Change selected test
    fireEvent.change(select, { target: { value: 'Creatinina' } });
    
    // Check that selecting Creatinina works
    expect((select as HTMLSelectElement).value).toBe('Creatinina');
  });
  
  it('renders reference area when available', () => {
    render(<EnhancedResultsTimelineChart results={mockResults} />);
    
    // Reference area should be rendered for Hemoglobina (12-16)
    expect(screen.getByTestId('reference-area-12-16')).toBeInTheDocument();
  });
  
  it('shows a message when no results are available', () => {
    render(<EnhancedResultsTimelineChart results={[]} />);
    
    expect(screen.getByText('Sem resultados disponíveis para visualização em gráfico.')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Evolução Laboratorial Personalizada';
    render(<EnhancedResultsTimelineChart results={mockResults} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
  
  it('handles export functionality', async () => {
    render(<EnhancedResultsTimelineChart results={mockResults} />);
    
    // Find export buttons
    const pngButton = screen.getByText('PNG');
    const pdfButton = screen.getByText('PDF');
    
    fireEvent.click(pngButton);
    fireEvent.click(pdfButton);
    
    // Since we're mocking the libraries, we just verify the buttons exist and are clickable
    expect(pngButton).toBeInTheDocument();
    expect(pdfButton).toBeInTheDocument();
  });
});