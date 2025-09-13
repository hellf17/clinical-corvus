
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PICOFormulationComponent from '@/components/academy/research/PICOFormulationComponent';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('PICOFormulationComponent', () => {
  const mockOnPicoGenerated = jest.fn();
  const mockOnTransferToResearch = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
    mockOnPicoGenerated.mockClear();
    mockOnTransferToResearch.mockClear();
  });

  it('renders the component title and form elements', () => {
    render(<PICOFormulationComponent onPicoGenerated={mockOnPicoGenerated} onTransferToResearch={mockOnTransferToResearch} />);
    expect(screen.getByRole('heading', { name: /Formulação de Perguntas PICO/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cenário Clínico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Formular Pergunta PICO/i })).toBeInTheDocument();
  });

  it('shows examples when the button is clicked', () => {
    render(<PICOFormulationComponent onPicoGenerated={mockOnPicoGenerated} onTransferToResearch={mockOnTransferToResearch} />);
    const examplesButton = screen.getByRole('button', { name: /Ver Exemplos/i });
    fireEvent.click(examplesButton);
    expect(screen.getByText(/Tratamento Farmacológico/i)).toBeInTheDocument();
  });

  it('loads an example into the textarea when clicked', () => {
    render(<PICOFormulationComponent onPicoGenerated={mockOnPicoGenerated} onTransferToResearch={mockOnTransferToResearch} />);
    const examplesButton = screen.getByRole('button', { name: /Ver Exemplos/i });
    fireEvent.click(examplesButton);

    const exampleCard = screen.getByText(/Tratamento Farmacológico/i);
    fireEvent.click(exampleCard);

    const scenarioTextarea = screen.getByLabelText(/Cenário Clínico/i);
    expect(scenarioTextarea).toHaveValue(/Paciente de 65 anos com hipertensão/i);
  });

  it('submits the form and displays results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        structured_question: 'In elderly patients with uncontrolled hypertension, does adding amlodipine improve BP control?',
        structured_pico_question: {
          patient_population: 'Elderly patients with uncontrolled hypertension',
          intervention: 'Adding amlodipine',
          comparison: 'No change',
          outcome: 'BP control',
        },
        pico_derivation_reasoning: 'Reasoning text',
        explanation: 'Explanation text',
        search_terms_suggestions: ['hypertension', 'amlodipine'],
        boolean_search_strategies: ['hypertension AND amlodipine'],
        recommended_study_types: ['RCT'],
        alternative_pico_formulations: [],
      }),
    });

    render(<PICOFormulationComponent onPicoGenerated={mockOnPicoGenerated} onTransferToResearch={mockOnTransferToResearch} />);

    const scenarioTextarea = screen.getByLabelText(/Cenário Clínico/i);
    fireEvent.change(scenarioTextarea, { target: { value: 'A detailed clinical scenario about hypertension.' } });

    const submitButton = screen.getByRole('button', { name: /Formular Pergunta PICO/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Formulando PICO.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Pergunta PICO Estruturada/i)).toBeInTheDocument();
      expect(screen.getByText(/In elderly patients with uncontrolled hypertension/i)).toBeInTheDocument();
      expect(screen.getByText(/hypertension AND amlodipine/i)).toBeInTheDocument();
    });

    // Check if the callback was called
    expect(mockOnPicoGenerated).toHaveBeenCalledWith({
      structuredQuestion: 'In elderly patients with uncontrolled hypertension, does adding amlodipine improve BP control?',
      searchTerms: ['hypertension', 'amlodipine'],
    });
  });

  it('calls onTransferToResearch when the research button is clicked', async () => {
    const mockResults = {
      structured_question: 'Test Question',
      search_terms_suggestions: ['test'],
      // Add other required fields for the type
      structured_pico_question: { patient_population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
      pico_derivation_reasoning: '',
      explanation: '',
      boolean_search_strategies: [],
      recommended_study_types: [],
      alternative_pico_formulations: [],
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResults });

    render(<PICOFormulationComponent onPicoGenerated={mockOnPicoGenerated} onTransferToResearch={mockOnTransferToResearch} />);
    fireEvent.change(screen.getByLabelText(/Cenário Clínico/i), { target: { value: 'A scenario' } });
    fireEvent.click(screen.getByRole('button', { name: /Formular Pergunta PICO/i }));

    await waitFor(() => {
      const transferButton = screen.getByRole('button', { name: /Pesquisar Evidências/i });
      fireEvent.click(transferButton);
      expect(mockOnTransferToResearch).toHaveBeenCalledWith('Test Question', ['test']);
    });
  });
});
