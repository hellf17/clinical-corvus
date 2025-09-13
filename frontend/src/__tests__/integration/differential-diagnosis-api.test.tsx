
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DifferentialDiagnosisPage from '@/app/academy/differential-diagnosis/page';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('Differential Diagnosis API Integration', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  describe('Expand DDx API', () => {
    it('should display expanded diagnoses on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          applied_approach_description: 'VINDICATE',
          suggested_additional_diagnoses_with_rationale: ['Costochondritis: Pain is often localized and pleuritic.'],
        }),
      });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Expandindo o DDx/i }));

      await userEvent.type(screen.getByLabelText(/Sintomas/i), 'Chest pain');
      await userEvent.type(screen.getByLabelText(/Seus Diagnósticos Diferenciais Iniciais/i), 'Myocardial Infarction');
      fireEvent.click(screen.getByRole('button', { name: /Expandir DDx/i }));

      await waitFor(() => {
        expect(screen.getByText(/Sugestões de Diagnósticos Adicionais/i)).toBeInTheDocument();
        expect(screen.getByText(/Costochondritis: Pain is often localized and pleuritic./i)).toBeInTheDocument();
      });
    });

    it('should display an error message on API failure', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: false, 
            status: 500, 
            json: async () => ({ detail: 'Expansion failed' })
        });
    
        render(<DifferentialDiagnosisPage />);
        fireEvent.click(screen.getByRole('tab', { name: /Expandindo o DDx/i }));
    
        await userEvent.type(screen.getByLabelText(/Sintomas/i), 'Chest pain');
        await userEvent.type(screen.getByLabelText(/Seus Diagnósticos Diferenciais Iniciais/i), 'Myocardial Infarction');
        fireEvent.click(screen.getByRole('button', { name: /Expandir DDx/i }));
    
        await waitFor(() => {
          expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();
          expect(screen.getByText('Expansion failed')).toBeInTheDocument();
        });
      });
  });

  describe('Generate Questions API', () => {
    it('should display generated questions on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              question_categories: [
                { category_name: 'Pain Characterization', questions: ['Where is the pain?'], category_rationale: '...' },
              ],
              red_flag_questions: ['Does the pain radiate?'],
              overall_rationale: '...',
            }),
          });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Gerar Perguntas/i }));

      await userEvent.type(screen.getByLabelText(/Queixa Principal/i), 'Headache');
      await userEvent.type(screen.getByLabelText(/Dados Demográficos/i), '30yo female');
      fireEvent.click(screen.getByRole('button', { name: /Gerar Perguntas-Chave/i }));

      await waitFor(() => {
        expect(screen.getByText(/Sinais de Alarme/i)).toBeInTheDocument();
        expect(screen.getByText('Does the pain radiate?')).toBeInTheDocument();
        expect(screen.getByText('Pain Characterization')).toBeInTheDocument();
      });
    });
  });

  describe('Compare Hypotheses (Matrix) API', () => {
    it('should display feedback on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              overall_matrix_feedback: 'Your analysis is sound.',
              discriminator_feedback: 'You correctly identified the key discriminator.',
              expert_matrix_analysis: [],
              expert_recommended_discriminator: 'Fever',
              expert_discriminator_rationale: '...',
              learning_focus_suggestions: [],
            }),
          });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Comparando Hipóteses/i }));

      // Select a discriminator to enable the submit button
      const discriminatorSelect = screen.getByLabelText(/Selecione o discriminador chave:/i);
      await userEvent.selectOptions(discriminatorSelect, 'Febre');

      fireEvent.click(screen.getByRole('button', { name: /Ver Feedback do Dr. Corvus/i }));

      await waitFor(() => {
        expect(screen.getByText(/Análise da Matriz - Dr. Corvus/i)).toBeInTheDocument();
        expect(screen.getByText('Your analysis is sound.')).toBeInTheDocument();
      });
    });
  });
});
