
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseBiasAnalysisComponent from '@/components/academy/metacognition/CaseBiasAnalysisComponent';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

const mockApiResponse = {
  detected_biases: [
    {
      bias_name: 'Ancoragem',
      description: 'Dependência excessiva da informação inicial.',
      evidence_in_scenario: 'O médico focou no histórico de DPOC.',
      potential_impact: 'Atraso no diagnóstico de insuficiência cardíaca.',
      mitigation_strategy: 'Sempre gerar múltiplas hipóteses.',
    },
  ],
  overall_analysis: 'O viés de ancoragem foi um fator chave aqui.',
  educational_insights: 'É crucial reavaliar o diagnóstico inicial.',
};

describe('CaseBiasAnalysisComponent', () => {
  const mockOnBiasIdentified = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
    mockOnBiasIdentified.mockClear();
  });

  it('renders the component and allows switching modes', () => {
    render(<CaseBiasAnalysisComponent />);
    expect(screen.getByRole('heading', { name: /Análise de Vieses Cognitivos/i })).toBeInTheDocument();

    const customModeButton = screen.getByRole('button', { name: /Cenário Personalizado/i });
    fireEvent.click(customModeButton);

    expect(screen.getByPlaceholderText(/Descreva o caso clínico aqui.../i)).toBeInTheDocument();
  });

  it('allows selecting and analyzing a prepared vignette', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

    render(<CaseBiasAnalysisComponent onBiasIdentified={mockOnBiasIdentified} />);
    
    // Open the select dropdown
    fireEvent.mouseDown(screen.getByRole('combobox'));

    // Select an option
    const option = await screen.findByText(/Dispneia em DPOC/i);
    fireEvent.click(option);

    // Check if the scenario is displayed
    await waitFor(() => {
      expect(screen.getByText(/Um paciente idoso de 75 anos/i)).toBeInTheDocument();
    });

    // Fill in the suspected bias
    await userEvent.type(screen.getByLabelText(/Qual\(is\) viés\(es\) cognitivo\(s\) você suspeita\?/i), 'Ancoragem');

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Analisar com Dr. Corvus/i }));

    // Check for loading state and results
    await waitFor(() => {
      expect(screen.getByText(/Reflexões do Dr. Corvus/i)).toBeInTheDocument();
      expect(screen.getByText('Ancoragem')).toBeInTheDocument();
      expect(screen.getByText(/O viés de ancoragem foi um fator chave aqui./i)).toBeInTheDocument();
    });

    // Check callback
    expect(mockOnBiasIdentified).toHaveBeenCalledWith({
      biasName: 'Ancoragem',
      strategies: ['Sempre gerar múltiplas hipóteses.'],
    });
  });

  it('allows submitting a custom scenario', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

    render(<CaseBiasAnalysisComponent />);
    fireEvent.click(screen.getByRole('button', { name: /Cenário Personalizado/i }));

    const scenarioTextarea = screen.getByPlaceholderText(/Descreva o caso clínico aqui.../i);
    await userEvent.type(scenarioTextarea, 'Custom scenario text about a patient.');

    fireEvent.click(screen.getByRole('button', { name: /Analisar com Dr. Corvus/i }));

    await waitFor(() => {
      expect(screen.getByText(/Reflexões do Dr. Corvus/i)).toBeInTheDocument();
    });
  });

  it('handles API errors during analysis', async () => {
    mockFetch.mockResolvedValueOnce({ 
        ok: false, 
        status: 500, 
        json: async () => ({ detail: 'Analysis failed' })
      });

    render(<CaseBiasAnalysisComponent />);
    fireEvent.click(screen.getByRole('button', { name: /Cenário Personalizado/i }));
    await userEvent.type(screen.getByPlaceholderText(/Descreva o caso clínico aqui.../i), 'This will fail.');
    fireEvent.click(screen.getByRole('button', { name: /Analisar com Dr. Corvus/i }));

    await waitFor(() => {
      expect(screen.getByText(/Erro na Análise/i)).toBeInTheDocument();
      expect(screen.getByText(/Analysis failed/i)).toBeInTheDocument();
    });
  });
});
