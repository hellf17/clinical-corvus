
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelfReflectionComponent from '@/components/academy/metacognition/SelfReflectionComponent';
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
  identified_reasoning_pattern: 'Pattern recognition',
  bias_reflection_points: [
    { bias_type: 'ANCHORING', reflection_question: 'Did you anchor on the initial diagnosis?' },
  ],
  devils_advocate_challenge: ['What if the patient was younger?'],
  suggested_next_reflective_action: ['Review the case with a colleague.'],
};

describe('SelfReflectionComponent', () => {
  const mockOnInsightsGenerated = jest.fn();
  const mockOnTransferToTimeout = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
    mockOnInsightsGenerated.mockClear();
    mockOnTransferToTimeout.mockClear();
  });

  it('renders the component and its tabs', () => {
    render(<SelfReflectionComponent />);
    expect(screen.getByRole('heading', { name: /Ferramenta de Auto-Reflexão/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Reflexão Guiada/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Templates Estruturados/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Exemplos Práticos/i })).toBeInTheDocument();
  });

  describe('Guided Reflection Mode', () => {
    it('submits the form and displays analysis', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });
      render(<SelfReflectionComponent onInsightsGenerated={mockOnInsightsGenerated} />);

      const reasoningTextarea = screen.getByLabelText(/Descrição do Seu Processo de Raciocínio/i);
      await userEvent.type(reasoningTextarea, 'My reasoning process was...');

      fireEvent.click(screen.getByRole('button', { name: /Analisar Reflexão/i }));

      await waitFor(() => {
        expect(screen.getByText(/Análise Metacognitiva Personalizada/i)).toBeInTheDocument();
        expect(screen.getByText(/Pattern recognition/i)).toBeInTheDocument();
        expect(screen.getByText(/Did you anchor on the initial diagnosis\?/i)).toBeInTheDocument();
      });

      expect(mockOnInsightsGenerated).toHaveBeenCalled();
    });
  });

  describe('Structured Templates Mode', () => {
    it('allows selecting a template and filling it out', async () => {
      render(<SelfReflectionComponent />);
      fireEvent.click(screen.getByRole('tab', { name: /Templates Estruturados/i }));

      const templateButton = screen.getByText(/Reflexão Diagnóstica/i);
      fireEvent.click(templateButton);

      const firstQuestionTextarea = await screen.findByLabelText(/Quais foram as primeiras hipóteses que considerei\?/i);
      expect(firstQuestionTextarea).toBeInTheDocument();

      await userEvent.type(firstQuestionTextarea, 'Initial hypothesis was X.');
      expect(firstQuestionTextarea).toHaveValue('Initial hypothesis was X.');
    });
  });

  describe('Practical Examples Mode', () => {
    it('allows selecting an example and viewing its details', async () => {
      render(<SelfReflectionComponent />);
      fireEvent.click(screen.getByRole('tab', { name: /Exemplos Práticos/i }));

      const exampleButton = screen.getByText(/Dor Torácica em Jovem Atleta/i);
      fireEvent.click(exampleButton);

      const scenarioText = await screen.findByText(/Carlos, 28 anos, maratonista/i);
      expect(scenarioText).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /Analisar Reflexão/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
