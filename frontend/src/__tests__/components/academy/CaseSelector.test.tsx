
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseSelector } from '@/components/academy/clinical-simulation/CaseSelector';
import { ClinicalCase } from '@/components/academy/clinical-simulation/cases';

const mockCases: ClinicalCase[] = [
  {
    id: 'case-001',
    title: 'Dor Torácica Súbita',
    brief: 'Paciente de 58 anos, masculino, com dor torácica.',
    details: '...',
    difficulty: { level: 'Intermediário', focus: 'Diagnóstico Diferencial' },
    specialties: ['Cardiologia', 'Clínica Médica'],
    learning_objectives: ['Diferenciar SCA'],
  },
  {
    id: 'case-002',
    title: 'Dor Articular e Febre',
    brief: 'Jovem de 28 anos com dor em múltiplas articulações.',
    details: '...',
    difficulty: { level: 'Avançado', focus: 'Doenças Sistêmicas' },
    specialties: ['Reumatologia', 'Clínica Médica'],
    learning_objectives: ['Construir diagnóstico de LES'],
  },
  {
    id: 'case-003',
    title: 'Cefaleia Intensa',
    brief: 'Paciente com a pior dor de cabeça da vida.',
    details: '...',
    difficulty: { level: 'Avançado', focus: 'Emergências Neurológicas' },
    specialties: ['Neurologia'],
    learning_objectives: ['Diagnosticar HSA'],
  },
];

describe('CaseSelector', () => {
  const mockOnSelectCase = jest.fn();

  beforeEach(() => {
    mockOnSelectCase.mockClear();
  });

  it('renders all cases initially', () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    expect(screen.getByText('Dor Torácica Súbita')).toBeInTheDocument();
    expect(screen.getByText('Dor Articular e Febre')).toBeInTheDocument();
    expect(screen.getByText('Cefaleia Intensa')).toBeInTheDocument();
  });

  it('filters cases by search term', async () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    const searchInput = screen.getByPlaceholderText(/Pesquisar por título/i);
    await userEvent.type(searchInput, 'Cefaleia');
    expect(screen.getByText('Cefaleia Intensa')).toBeInTheDocument();
    expect(screen.queryByText('Dor Torácica Súbita')).not.toBeInTheDocument();
  });

  it('filters cases by a single specialty', () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    const neuroButton = screen.getByRole('button', { name: /Neurologia/i });
    fireEvent.click(neuroButton);
    expect(screen.getByText('Cefaleia Intensa')).toBeInTheDocument();
    expect(screen.queryByText('Dor Torácica Súbita')).not.toBeInTheDocument();
    expect(screen.queryByText('Dor Articular e Febre')).not.toBeInTheDocument();
  });

  it('filters cases by multiple specialties (AND logic)', () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    const reumaButton = screen.getByRole('button', { name: /Reumatologia/i });
    const cmButton = screen.getByRole('button', { name: /Clínica Médica/i });
    fireEvent.click(reumaButton);
    fireEvent.click(cmButton);

    expect(screen.getByText('Dor Articular e Febre')).toBeInTheDocument();
    expect(screen.queryByText('Dor Torácica Súbita')).not.toBeInTheDocument(); // Does not have Reumatologia
    expect(screen.queryByText('Cefaleia Intensa')).not.toBeInTheDocument();
  });

  it('shows a message when no cases match the filter', async () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    const searchInput = screen.getByPlaceholderText(/Pesquisar por título/i);
    await userEvent.type(searchInput, 'Caso Inexistente');
    expect(screen.getByText(/Nenhum caso encontrado/i)).toBeInTheDocument();
  });

  it('calls onSelectCase with the correct case when a simulation is started', () => {
    render(<CaseSelector cases={mockCases} onSelectCase={mockOnSelectCase} />);
    const startButton = screen.getAllByRole('button', { name: /Iniciar Simulação/i })[0]; // First case
    fireEvent.click(startButton);
    expect(mockOnSelectCase).toHaveBeenCalledWith(mockCases[0]);
  });
});
