
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('DifferentialDiagnosisPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  it('renders the main title and tabs', () => {
    render(<DifferentialDiagnosisPage />);
    expect(screen.getByRole('heading', { name: /Diagnóstico Diferencial/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Expandindo o DDx/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gerar Perguntas para DDx/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Comparando Hipóteses/i })).toBeInTheDocument();
  });

  describe('Expandindo o DDx Tab', () => {
    it('allows form input and submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          applied_approach_description: 'VINDICATE',
          suggested_additional_diagnoses_with_rationale: ['Pericarditis: a dor pode ser semelhante.'],
        }),
      });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Expandindo o DDx/i }));

      fireEvent.change(screen.getByLabelText(/Sintomas \(Subjetivos\)/i), { target: { value: 'Dor torácica' } });
      fireEvent.change(screen.getByLabelText(/Seus Diagnósticos Diferenciais Iniciais/i), { target: { value: 'IAM' } });

      const submitButton = screen.getByRole('button', { name: /Expandir DDx com Dr. Corvus/i });
      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);

      expect(screen.getByText(/Analisando.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Estratégia do Dr. Corvus/i)).toBeInTheDocument();
        expect(screen.getByText(/Pericarditis: a dor pode ser semelhante./i)).toBeInTheDocument();
      });
    });
  });

  describe('Gerar Perguntas para DDx Tab', () => {
    it('allows generating questions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          question_categories: [
            { category_name: 'Caracterização da Dor', questions: ['Onde dói?'], category_rationale: '...' },
          ],
          red_flag_questions: ['A dor irradia?'],
          overall_rationale: 'Initial investigation...',
        }),
      });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Gerar Perguntas para DDx/i }));

      fireEvent.change(screen.getByLabelText(/Queixa Principal/i), { target: { value: 'Dor abdominal' } });
      fireEvent.change(screen.getByLabelText(/Dados Demográficos do Paciente/i), { target: { value: 'Homem, 40 anos' } });

      const submitButton = screen.getByRole('button', { name: /Gerar Perguntas-Chave/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Estratégia de Investigação/i)).toBeInTheDocument();
        expect(screen.getByText(/Sinais de Alarme \(Red Flags\)/i)).toBeInTheDocument();
        expect(screen.getByText(/A dor irradia\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Caracterização da Dor/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comparando Hipóteses Tab', () => {
    it('renders the matrix and allows submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall_matrix_feedback: 'Good analysis.',
          discriminator_feedback: 'Correct choice.',
          expert_matrix_analysis: [],
          expert_recommended_discriminator: 'Febre',
          expert_discriminator_rationale: '...',
          learning_focus_suggestions: ['Study more about appendicitis'],
        }),
      });

      render(<DifferentialDiagnosisPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Comparando Hipóteses/i }));

      // Check that the default case is rendered
      expect(screen.getByText(/Paciente feminina, 25 anos/i)).toBeInTheDocument();

      // Interact with the matrix - click a radio button
      const firstRadioButton = screen.getAllByRole('radio')[0]; // First radio button for SUPPORTS
      fireEvent.click(firstRadioButton);

      // Select a discriminator
      const discriminatorSelect = screen.getByLabelText(/Selecione o discriminador chave:/i);
      fireEvent.change(discriminatorSelect, { target: { value: 'Febre' } });

      const submitButton = screen.getByRole('button', { name: /Ver Feedback do Dr. Corvus/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Análise da Matriz - Dr. Corvus/i)).toBeInTheDocument();
        expect(screen.getByText(/Good analysis./i)).toBeInTheDocument();
      });
    });
  });
});
