
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FundamentalDiagnosticReasoningPage from '@/app/academy/fundamental-diagnostic-reasoning/page';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('Fundamental Diagnostic Reasoning API Integration', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  describe('Problem Representation API', () => {
    it('should display feedback on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall_assessment: 'Excellent problem representation.',
          feedback_strengths: ['Clear and concise'],
          feedback_improvements: [],
          missing_elements: [],
          socratic_questions: [],
          next_step_guidance: 'Proceed to DDx.',
        }),
      });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Representação do Problema/i }));

      await userEvent.type(screen.getByLabelText(/Seu "One-Sentence Summary":/i), 'Test summary');
      await userEvent.type(screen.getByLabelText(/Seus Qualificadores Semânticos/i), 'agudo');
      fireEvent.click(screen.getByRole('button', { name: /Obter Feedback/i }));

      await waitFor(() => {
        expect(screen.getByText('Excellent problem representation.')).toBeInTheDocument();
        expect(screen.getByText('Clear and concise')).toBeInTheDocument();
      });
    });

    it('should display an error message on API failure', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: false, 
            status: 500, 
            json: async () => ({ detail: 'Server error during feedback' })
        });
  
        render(<FundamentalDiagnosticReasoningPage />);
        fireEvent.click(screen.getByRole('tab', { name: /Representação do Problema/i }));
  
        await userEvent.type(screen.getByLabelText(/Seu "One-Sentence Summary":/i), 'Test summary');
        await userEvent.type(screen.getByLabelText(/Seus Qualificadores Semânticos/i), 'agudo');
        fireEvent.click(screen.getByRole('button', { name: /Obter Feedback/i }));
  
        await waitFor(() => {
          expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();
          expect(screen.getByText('Server error during feedback')).toBeInTheDocument();
        });
      });
  });

  describe('Illness Script API', () => {
    it('should display the illness script on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              disease_name: 'Myocarditis',
              predisposing_conditions: ['Viral infection'],
              pathophysiology_summary: 'Inflammation of the heart muscle.',
              key_symptoms_and_signs: ['Chest pain', 'Fever'],
              disclaimer: 'For educational use.',
            }),
          });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Illness Scripts/i }));

      await userEvent.type(screen.getByLabelText(/Nome da Doença/i), 'Myocarditis');
      fireEvent.click(screen.getByRole('button', { name: /Buscar Illness Script/i }));

      await waitFor(() => {
        expect(screen.getByText(/Illness Script para: Myocarditis/i)).toBeInTheDocument();
        expect(screen.getByText('Inflammation of the heart muscle.')).toBeInTheDocument();
      });
    });
  });

  describe('Data Collection API', () => {
    it('should display generated questions on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              prioritized_questions: ['How long has this been going on?'],
              complementary_questions: [],
              questioning_rationale: '...',
              potential_systems_to_explore: [],
            }),
          });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Coleta de Dados/i }));

      await userEvent.type(screen.getByLabelText(/Queixa Principal/i), 'Dizziness');
      await userEvent.type(screen.getByLabelText(/Dados Demográficos/i), '25yo female');
      fireEvent.click(screen.getByRole('button', { name: /Gerar Perguntas-Chave/i }));

      await waitFor(() => {
        expect(screen.getByText(/Perguntas Sugeridas por Dr. Corvus/i)).toBeInTheDocument();
        expect(screen.getByText('How long has this been going on?')).toBeInTheDocument();
      });
    });
  });
});
