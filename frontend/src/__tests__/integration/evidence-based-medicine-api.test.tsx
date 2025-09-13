
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvidenceBasedMedicinePage from '@/app/academy/evidence-based-medicine/page';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('Evidence Based Medicine API Integration', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  describe('PICO Formulation API', () => {
    it('should display a structured PICO question on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          structured_question: 'This is the structured PICO question.',
          structured_pico_question: { patient_population: 'P', intervention: 'I', comparison: 'C', outcome: 'O' },
          pico_derivation_reasoning: '',
          explanation: '',
          search_terms_suggestions: ['term1'],
          boolean_search_strategies: ['term1 AND term2'],
          recommended_study_types: [],
          alternative_pico_formulations: [],
        }),
      });

      render(<EvidenceBasedMedicinePage />);
      fireEvent.click(screen.getByRole('tab', { name: /Formulação PICO/i }));

      await userEvent.type(screen.getByLabelText(/Cenário Clínico/i), 'A clinical scenario.');
      fireEvent.click(screen.getByRole('button', { name: /Formular Pergunta PICO/i }));

      await waitFor(() => {
        expect(screen.getByText(/Pergunta PICO Estruturada/i)).toBeInTheDocument();
        expect(screen.getByText(/This is the structured PICO question./i)).toBeInTheDocument();
      });
    });
  });

  describe('Deep Research API', () => {
    it('should display research results on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: true, 
            json: async () => ({ executive_summary: 'Key research summary.', relevant_references: [] }) 
        });

      render(<EvidenceBasedMedicinePage />);
      fireEvent.click(screen.getByRole('tab', { name: /Pesquisa Avançada/i }));

      await userEvent.type(screen.getByLabelText(/Pergunta de Pesquisa/i), 'A research question.');
      fireEvent.click(screen.getByRole('button', { name: /Pesquisar Evidências/i }));

      await waitFor(() => {
        expect(screen.getByText(/Análise de Evidências Concluída/i)).toBeInTheDocument();
        expect(screen.getByText('Key research summary.')).toBeInTheDocument();
      });
    });
  });

  describe('Evidence Appraisal API', () => {
    it('should display appraisal results on successful API call for text input', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: true, 
            json: async () => ({ 
                grade_summary: { 
                    overall_quality: 'ALTA', 
                    recommendation_strength: 'FORTE', 
                    summary_of_findings: 'High quality evidence found.',
                    recommendation_balance: { positive_factors: [], negative_factors: [], overall_balance: 'Positive' }
                },
                quality_factors: [],
                bias_analysis: [],
                practice_recommendations: { clinical_application: 'Apply broadly.', monitoring_points: [], evidence_caveats: 'None' }
            }) 
        });

      render(<EvidenceBasedMedicinePage />);
      fireEvent.click(screen.getByRole('tab', { name: /Análise de Evidências/i }));

      // Switch to text analysis tab inside the component
      fireEvent.click(screen.getByRole('tab', { name: /Analisar Texto/i }));

      await userEvent.type(screen.getByLabelText(/Pergunta Clínica/i), 'A clinical question.');
      await userEvent.type(screen.getByLabelText(/Texto Completo do Artigo/i), 'Full text of the article.');
      fireEvent.click(screen.getByRole('button', { name: /Analisar Evidência/i }));

      await waitFor(() => {
        expect(screen.getByText(/Dashboard de Confiança da Evidência/i)).toBeInTheDocument();
        expect(screen.getByText('High quality evidence found.')).toBeInTheDocument();
      });
    });
  });
});
