
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeepResearchComponent from '@/components/academy/research/DeepResearchComponent';
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
  original_query: 'Expanded query about anticoagulants',
  executive_summary: 'This is the executive summary.',
  key_findings_by_theme: [
    { theme_name: 'Efficacy', summary: 'It is effective.', supporting_references: [1], strength_of_evidence: 'High' },
  ],
  evidence_quality_assessment: 'Good quality evidence.',
  clinical_implications: ['Use with caution.'],
  research_gaps_identified: ['More research needed.'],
  relevant_references: [
    { reference_id: 1, title: 'Great Study', authors: ['Doe, J.'], journal: 'JAMA', year: 2023, study_type: 'RCT' },
  ],
  research_metrics: { total_articles_analyzed: 10, sources_consulted: ['PubMed'], rct_count: 1, systematic_reviews_count: 0, meta_analysis_count: 0, guideline_count: 0 },
};

describe('DeepResearchComponent', () => {
  const mockOnResultsGenerated = jest.fn();
  const mockOnTransferToPico = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
    mockOnResultsGenerated.mockClear();
    mockOnTransferToPico.mockClear();
  });

  it('renders the component with an initial question', () => {
    render(
      <DeepResearchComponent 
        initialQuestion="Initial PICO question" 
        onResultsGenerated={mockOnResultsGenerated} 
        onTransferToPico={mockOnTransferToPico} 
      />
    );
    expect(screen.getByRole('heading', { name: /Pesquisa Avançada de Evidências/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Pergunta de Pesquisa/i)).toHaveValue('Initial PICO question');
  });

  it('allows switching between research modes', () => {
    render(<DeepResearchComponent />);
    const quickModeRadio = screen.getByLabelText(/Pesquisa Rápida/i);
    const autonomousModeRadio = screen.getByLabelText(/Análise Autônoma/i);

    fireEvent.click(autonomousModeRadio);
    expect(autonomousModeRadio).toBeChecked();
    expect(quickModeRadio).not.toBeChecked();

    fireEvent.click(quickModeRadio);
    expect(quickModeRadio).toBeChecked();
    expect(autonomousModeRadio).not.toBeChecked();
  });

  it('submits a quick search and displays results', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

    render(<DeepResearchComponent />);
    fireEvent.change(screen.getByLabelText(/Pergunta de Pesquisa/i), { target: { value: 'test question' } });
    fireEvent.click(screen.getByRole('button', { name: /Pesquisar Evidências/i }));

    expect(screen.getByText(/Pesquisando.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Análise de Evidências Concluída/i)).toBeInTheDocument();
      expect(screen.getByText(/This is the executive summary./i)).toBeInTheDocument();
      expect(screen.getByText(/Great Study/i)).toBeInTheDocument();
    });

    expect(mockOnResultsGenerated).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ 
      ok: false, 
      status: 500, 
      json: async () => ({ detail: 'Internal Server Error' })
    });

    render(<DeepResearchComponent />);
    fireEvent.change(screen.getByLabelText(/Pergunta de Pesquisa/i), { target: { value: 'a question that will fail' } });
    fireEvent.click(screen.getByRole('button', { name: /Pesquisar Evidências/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();
      expect(screen.getByText(/Internal Server Error/i)).toBeInTheDocument();
    });
  });

  it('calls onTransferToPico when the corresponding button is clicked', () => {
    render(<DeepResearchComponent initialQuestion="Test question" onTransferToPico={mockOnTransferToPico} />);
    const transferButton = screen.getByRole('button', { name: /Usar no PICO/i });
    fireEvent.click(transferButton);
    expect(mockOnTransferToPico).toHaveBeenCalledWith('Test question');
  });
});
