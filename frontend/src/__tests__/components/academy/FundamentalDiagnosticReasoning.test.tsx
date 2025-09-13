
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('FundamentalDiagnosticReasoningPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  it('renders the main title and tabs', () => {
    render(<FundamentalDiagnosticReasoningPage />);
    expect(screen.getByRole('heading', { name: /Raciocínio Diagnóstico Fundamental/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tipos de Raciocínio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Representação do Problema/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Illness Scripts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Coleta de Dados/i })).toBeInTheDocument();
  });

  describe('Representação do Problema Tab', () => {
    it('allows form input and submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall_assessment: 'Good summary!',
          feedback_strengths: ['Concise'],
          feedback_improvements: ['More detail needed'],
          missing_elements: ['Patient age'],
          socratic_questions: ['Why this diagnosis?'],
          next_step_guidance: 'Consider a broader differential.',
        }),
      });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Representação do Problema/i }));

      const summaryInput = screen.getByLabelText(/Seu "One-Sentence Summary":/i);
      const qualifiersInput = screen.getByLabelText(/Seus Qualificadores Semânticos/i);
      const submitButton = screen.getByRole('button', { name: /Obter Feedback do Dr. Corvus/i });

      fireEvent.change(summaryInput, { target: { value: 'Test summary' } });
      fireEvent.change(qualifiersInput, { target: { value: 'agudo, febril' } });

      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);

      expect(screen.getByText(/Analisando.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Good summary!/i)).toBeInTheDocument();
        expect(screen.getByText(/Concise/i)).toBeInTheDocument();
      });
    });
  });

  describe('Illness Scripts Tab', () => {
    it('allows fetching an illness script', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          disease_name: 'Pneumonia',
          predisposing_conditions: ['Age > 65'],
          pathophysiology_summary: 'Infection of the lung parenchyma.',
          key_symptoms_and_signs: ['Cough', 'Fever'],
          disclaimer: 'Educational use only.',
        }),
      });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Illness Scripts/i }));

      const diseaseInput = screen.getByLabelText(/Nome da Doença:/i);
      const fetchButton = screen.getByRole('button', { name: /Buscar Illness Script/i });

      fireEvent.change(diseaseInput, { target: { value: 'Pneumonia' } });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/Illness Script para: Pneumonia/i)).toBeInTheDocument();
        expect(screen.getByText(/Infection of the lung parenchyma./i)).toBeInTheDocument();
      });
    });
  });

  describe('Coleta de Dados Tab', () => {
    it('allows generating key questions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prioritized_questions: ['Characterize the pain.'],
          complementary_questions: ['Any associated symptoms?'],
          questioning_rationale: 'Focus on the chief complaint first.',
          potential_systems_to_explore: ['Cardiovascular'],
        }),
      });

      render(<FundamentalDiagnosticReasoningPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Coleta de Dados/i }));

      const complaintInput = screen.getByLabelText(/Queixa Principal:/i);
      const demographicsInput = screen.getByLabelText(/Dados Demográficos:/i);
      const generateButton = screen.getByRole('button', { name: /Gerar Perguntas-Chave/i });

      fireEvent.change(complaintInput, { target: { value: 'Chest Pain' } });
      fireEvent.change(demographicsInput, { target: { value: '60yo male' } });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Perguntas Sugeridas por Dr. Corvus:/i)).toBeInTheDocument();
        expect(screen.getByText(/Characterize the pain./i)).toBeInTheDocument();
      });
    });
  });
});
