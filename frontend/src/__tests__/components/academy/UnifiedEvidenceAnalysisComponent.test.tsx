
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnifiedEvidenceAnalysisComponent from '@/components/academy/research/UnifiedEvidenceAnalysisComponent';
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
  grade_summary: {
    overall_quality: 'ALTA',
    recommendation_strength: 'FORTE',
    summary_of_findings: 'The evidence is strong and consistent.',
    recommendation_balance: { 
      positive_factors: ['Large effect size'], 
      negative_factors: ['Slight imprecision'], 
      overall_balance: 'Benefits outweigh risks.',
      reasoning_tags: []
    },
    reasoning_tags: [],
  },
  quality_factors: [
    { id: 'q1', factor_name: 'Study Design', assessment: 'POSITIVO', justification: 'Randomized Controlled Trial' },
  ],
  bias_analysis: [
    { id: 'b1', bias_type: 'Selection Bias', potential_impact: 'Low', mitigation_strategies: 'Randomization', actionable_suggestion: 'Check allocation concealment.' },
  ],
  practice_recommendations: {
    clinical_application: 'Applicable to most patients.',
    monitoring_points: ['Monitor blood pressure.'],
    evidence_caveats: 'Not tested in patients over 80.',
  },
};

describe('UnifiedEvidenceAnalysisComponent', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  it('renders the component with PDF and Text tabs', () => {
    render(<UnifiedEvidenceAnalysisComponent />);
    expect(screen.getByRole('heading', { name: /Análise de Evidências Unificada/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Analisar PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Analisar Texto/i })).toBeInTheDocument();
  });

  describe('Text Analysis Tab', () => {
    it('submits text content and displays results', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

      render(<UnifiedEvidenceAnalysisComponent />);
      fireEvent.click(screen.getByRole('tab', { name: /Analisar Texto/i }));

      await userEvent.type(screen.getByLabelText(/Pergunta Clínica/i), 'Does aspirin work?');
      await userEvent.type(screen.getByLabelText(/Texto Completo do Artigo/i), 'Aspirin is effective...');

      fireEvent.click(screen.getByRole('button', { name: /Analisar Evidência/i }));

      await waitFor(() => {
        expect(screen.getByText(/Dashboard de Confiança da Evidência/i)).toBeInTheDocument();
        expect(screen.getByText(/The evidence is strong and consistent./i)).toBeInTheDocument();
        expect(screen.getByText(/Randomized Controlled Trial/i)).toBeInTheDocument();
      });
    });
  });

  describe('PDF Analysis Tab', () => {
    it('allows a user to select a PDF file', async () => {
      render(<UnifiedEvidenceAnalysisComponent />);
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/Clique para selecionar um PDF/i);

      await userEvent.upload(fileInput, file);

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('submits a PDF file and displays results', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });
    
        render(<UnifiedEvidenceAnalysisComponent />);
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByLabelText(/Clique para selecionar um PDF/i);
    
        await userEvent.upload(fileInput, file);
    
        // The button is now inside the form for the PDF tab
        const submitButton = screen.getByRole('button', { name: /Analisar PDF/i });
        fireEvent.click(submitButton);
    
        await waitFor(() => {
          expect(screen.getByText(/Dashboard de Confiança da Evidência/i)).toBeInTheDocument();
          expect(screen.getByText(/The evidence is strong and consistent./i)).toBeInTheDocument();
        });
      });

    it('shows an error for invalid file type', async () => {
        render(<UnifiedEvidenceAnalysisComponent />);
        const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
        const fileInput = screen.getByLabelText(/Clique para selecionar um PDF/i);
    
        await userEvent.upload(fileInput, file);
    
        expect(screen.getByText(/Por favor, selecione apenas arquivos PDF./i)).toBeInTheDocument();
      });
  });
});
