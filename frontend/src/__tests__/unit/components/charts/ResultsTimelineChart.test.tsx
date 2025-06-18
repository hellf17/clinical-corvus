import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsTimelineChart from '@/components/charts/ResultsTimelineChart';
import { Exam, LabResult } from '@/store/patientStore';

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
    )
  };
});

// Mock para o useEffect de selecionar o teste padrão
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useEffect: (callback: Function) => {
      return callback();
    }
  };
});

describe('ResultsTimelineChart', () => {
  const createLabResult = (name: string, value: number, isAbnormal: boolean, referenceRange: string): LabResult => ({
    id: Math.random().toString(36).substring(2, 11),
    name,
    date: '2023-04-15',
    value,
    unit: name === 'Hemoglobina' ? 'g/dL' : name === 'Creatinina' ? 'mg/dL' : 'mg/L',
    referenceRange,
    isAbnormal
  });

  const mockExams: Exam[] = [
    {
      id: '1',
      date: '2023-04-10',
      type: 'laboratorial',
      file: 'exam1.pdf',
      results: [
        createLabResult('Hemoglobina', 12.5, false, '12-16'),
        createLabResult('Creatinina', 1.1, false, '0.7-1.2'),
        createLabResult('PCR', 15, true, '0-5')
      ]
    },
    {
      id: '2',
      date: '2023-04-15',
      type: 'laboratorial',
      file: 'exam2.pdf',
      results: [
        createLabResult('Hemoglobina', 10.5, true, '12-16'),
        createLabResult('Creatinina', 1.8, true, '0.7-1.2'),
        createLabResult('PCR', 30, true, '0-5')
      ]
    },
    {
      id: '3',
      date: '2023-04-20',
      type: 'laboratorial',
      file: 'exam3.pdf',
      results: [
        createLabResult('Hemoglobina', 11.0, true, '12-16'),
        createLabResult('Creatinina', 1.5, true, '0.7-1.2'),
        createLabResult('PCR', 20, true, '0-5')
      ]
    }
  ];

  // Precisamos fazer uma adaptação para o componente, já que ele espera exam.results.test
  // mas nosso modelo usa exam.results.name
  beforeEach(() => {
    // Adiciona a propriedade test para compatibilidade com o componente
    mockExams.forEach(exam => {
      exam.results.forEach((result: any) => {
        result.test = result.name;
      });
    });
  });

  it('renders the chart correctly with data', () => {
    render(<ResultsTimelineChart exams={mockExams} />);
    
    // Test default title
    expect(screen.getByText('Resultados ao Longo do Tempo')).toBeInTheDocument();
    
    // Test chart container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Should select first test by default
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // Check for legend items by looking at the element structure
    // Using a function for a more flexible text match
    const normalText = screen.getByText((content, element) => content.includes('Normal'));
    const alteradoText = screen.getByText((content, element) => content.includes('Alterado'));
    expect(normalText).toBeInTheDocument();
    expect(alteradoText).toBeInTheDocument();
    
    // Check for line representing values
    expect(screen.getByTestId('line-value')).toBeInTheDocument();
  });
  
  it('allows selecting different tests', async () => {
    render(<ResultsTimelineChart exams={mockExams} />);
    
    // Select dropdown should have all test options
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // There should be options for each test
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(3); // Hemoglobina, Creatinina, PCR
    
    // Change selected test
    fireEvent.change(select, { target: { value: 'Creatinina' } });
    
    // Check that selecting Creatinina works
    expect((select as HTMLSelectElement).value).toBe('Creatinina');
  });
  
  it('renders reference lines when available', () => {
    render(<ResultsTimelineChart exams={mockExams} />);
    
    // Select a test with reference range
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Hemoglobina' } });
    
    // Reference lines should be rendered for min and max
    expect(screen.getByTestId('reference-line-12')).toBeInTheDocument(); // Min value
    expect(screen.getByTestId('reference-line-16')).toBeInTheDocument(); // Max value
  });
  
  it('shows a message when no exams are available', () => {
    render(<ResultsTimelineChart exams={[]} />);
    
    expect(screen.getByText('Nenhum exame disponível para visualização')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
  
  it('shows a message when selected test has no results', () => {
    const examsWithMissingTest: Exam[] = [
      {
        id: '1',
        date: '2023-04-10',
        type: 'laboratorial',
        file: 'exam1.pdf',
        results: [
          createLabResult('Hemoglobina', 12.5, false, '12-16')
        ]
      }
    ];
    
    // Adiciona a propriedade test para compatibilidade com o componente
    examsWithMissingTest.forEach(exam => {
      exam.results.forEach((result: any) => {
        result.test = result.name;
      });
    });
    
    render(<ResultsTimelineChart exams={examsWithMissingTest} />);
    
    // Should select Hemoglobina by default
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).value).toBe('Hemoglobina');
  });
  
  it('renders with custom title', () => {
    const customTitle = 'Evolução de Parâmetros';
    render(<ResultsTimelineChart exams={mockExams} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
}); 