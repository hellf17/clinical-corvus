
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetacognitionPage from '@/app/academy/metacognition-diagnostic-errors/page';
import { useAuth } from '@clerk/nextjs';

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock global.fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('Metacognition & Diagnostic Errors API Integration', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  describe('Case Bias Analysis API', () => {
    it('should display bias analysis on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected_biases: [
            { bias_name: 'Anchoring', description: '...', evidence_in_scenario: '...', potential_impact: '...', mitigation_strategy: '...' },
          ],
          overall_analysis: 'Anchoring bias was prominent.',
          educational_insights: 'Always reconsider initial hypotheses.',
        }),
      });

      render(<MetacognitionPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Análise de Casos/i }));

      // Use custom scenario mode for simplicity
      fireEvent.click(screen.getByRole('button', { name: /Cenário Personalizado/i }));
      await userEvent.type(screen.getByPlaceholderText(/Descreva o caso clínico aqui.../i), 'A case where the doctor anchored.');
      fireEvent.click(screen.getByRole('button', { name: /Analisar com Dr. Corvus/i }));

      await waitFor(() => {
        expect(screen.getByText(/Reflexões do Dr. Corvus/i)).toBeInTheDocument();
        expect(screen.getByText('Anchoring')).toBeInTheDocument();
        expect(screen.getByText('Anchoring bias was prominent.')).toBeInTheDocument();
      });
    });

    it('should display an error on API failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ detail: 'Bias analysis failed' }) });
    
        render(<MetacognitionPage />);
        fireEvent.click(screen.getByRole('tab', { name: /Análise de Casos/i }));
        fireEvent.click(screen.getByRole('button', { name: /Cenário Personalizado/i }));
        await userEvent.type(screen.getByPlaceholderText(/Descreva o caso clínico aqui.../i), 'This will fail.');
        fireEvent.click(screen.getByRole('button', { name: /Analisar com Dr. Corvus/i }));
    
        await waitFor(() => {
          expect(screen.getByText(/Erro na Análise/i)).toBeInTheDocument();
          expect(screen.getByText('Bias analysis failed')).toBeInTheDocument();
        });
      });
  });

  describe('Self Reflection API', () => {
    it('should display reflection feedback on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: true, 
            json: async () => ({ 
                identified_reasoning_pattern: 'Heuristic', 
                bias_reflection_points: [], 
                devils_advocate_challenge: ['Challenge question'],
                suggested_next_reflective_action: []
            }) 
        });

      render(<MetacognitionPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Auto-Reflexão/i }));

      await userEvent.type(screen.getByLabelText(/Descrição do Seu Processo de Raciocínio/i), 'My thought process was...');
      fireEvent.click(screen.getByRole('button', { name: /Analisar Reflexão/i }));

      await waitFor(() => {
        expect(screen.getByText(/Análise Metacognitiva Personalizada/i)).toBeInTheDocument();
        expect(screen.getByText('Heuristic')).toBeInTheDocument();
        expect(screen.getByText('Challenge question')).toBeInTheDocument();
      });
    });
  });

  describe('Diagnostic Timeout API', () => {
    it('should display timeout analysis on successful API call', async () => {
        mockFetch.mockResolvedValueOnce({ 
            ok: true, 
            json: async () => ({ 
                alternative_diagnoses_to_consider: ['Another diagnosis'],
                key_questions_to_ask: [],
                red_flags_to_check: [],
                next_steps_suggested: [],
                cognitive_checks: [],
                timeout_recommendation: 'Recommendation'
            }) 
        });

      render(<MetacognitionPage />);
      fireEvent.click(screen.getByRole('tab', { name: /Diagnostic Timeout/i }));

      // Start and complete a session to enable analysis
      await userEvent.type(screen.getByLabelText(/Descrição do Caso/i), 'A complex case');
      fireEvent.click(screen.getByText(/Timeout de Emergência/i));
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Diagnostic Timeout/i }));
      await userEvent.type(await screen.findByPlaceholderText(/Anote suas reflexões/i), 'My reflection');
      // Need to fill all prompts to enable analysis button
      const promptsCount = 4; // For emergency template
      for(let i=0; i < promptsCount; i++) {
        await userEvent.type(screen.getByPlaceholderText(/Anote suas reflexões/i), `My reflection ${i}`)
        if(i < promptsCount - 1) {
            fireEvent.click(screen.getByRole('button', { name: '→' }))
        }
      }

      fireEvent.click(screen.getByRole('button', { name: /Analisar Timeout/i }));

      await waitFor(() => {
        expect(screen.getByText(/Análise do Diagnostic Timeout/i)).toBeInTheDocument();
        expect(screen.getByText('Another diagnosis')).toBeInTheDocument();
      });
    });
  });
});
