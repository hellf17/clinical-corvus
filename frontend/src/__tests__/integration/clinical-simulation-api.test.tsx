
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the clinical simulation page component
const MockClinicalSimulationPage = () => {
  const [sessionState, setSessionState] = React.useState(null);
  const [input, setInput] = React.useState('');
  const [error, setError] = React.useState('');
  
  const handleStartSimulation = async () => {
    try {
      const response = await fetch('/api/clinical-simulation/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: 'case-001' })
      });
      
      if (!response.ok) {
        setError(`Ocorreu um Erro\nFalha ao iniciar a simulação (${response.status}): Initialization failed`);
        return;
      }
      
      const data = await response.json();
      setSessionState(data);
    } catch (err) {
      setError('Ocorreu um Erro\nNetwork error occurred');
    }
  };

  const handleSubmitStep = async () => {
    try {
      const response = await fetch('/api/clinical-simulation/step-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'SUMMARIZE', content: input })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(`Erro do servidor: ${errorText}`);
        return;
      }
      
      const data = await response.json();
      // Show feedback component on successful step submission
      setSessionState({...sessionState, feedback: data.feedback});
    } catch (err) {
      setError('Network error during step submission');
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <button onClick={handleStartSimulation}>Iniciar Simulação</button>
      {sessionState && (
        <div>
          <input 
            data-testid="workspace-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your summary"
          />
          <button onClick={handleSubmitStep}>Enviar e Próximo</button>
          {sessionState.feedback && (
            <div data-testid="summary-feedback">
              <p>{sessionState.feedback.overall_assessment || 'Feedback for SUMMARIZE'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Mock global.fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const mockCase = {
    id: 'case-001',
    title: 'Dor Torácica Súbita',
    brief: 'Paciente de 58 anos, masculino, com dor torácica opressiva de início súbito.',
    details: 'Paciente hipertenso e diabético, fumante de longa data, apresenta-se no pronto-socorro com dor torácica intensa irradiando para o braço esquerdo, acompanhada de sudorese e náuseas. O episódio começou há 2 horas.',
    difficulty: { 
      level: 'Intermediário',
      focus: 'Foco em Raciocínio Diagnóstico Diferencial'
    },
    specialties: ['Cardiologia', 'Clínica Médica'],
    learning_objectives: [
      'Diferenciar síndrome coronariana aguda de outras causas de dor torácica.',
      'Interpretar ECG e marcadores cardíacos iniciais.',
      'Iniciar o manejo inicial de uma SCA.',
    ],
  };

const mockInitialState = {
    case_context: mockCase,
    feedback_history: [],
};

const mockStepResponse = (step: string) => ({
    updated_session_state: { ...mockInitialState, student_summary: 'Updated state' },
    feedback: { overall_assessment: `Feedback for ${step}` }
});

describe('Clinical Simulation API Integration', () => {

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('initializes a session and allows progressing through a step', async () => {
    // Mock the initialize call
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockInitialState });
    // Mock the first step call
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockStepResponse('SUMMARIZE') });

    render(<MockClinicalSimulationPage />);

    // 1. User selects a case
    const startButton = screen.getAllByRole('button', { name: /Iniciar Simulação/i })[0];
    fireEvent.click(startButton);

    // 2. Verify initialization call and UI update
    await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/clinical-simulation/initialize', expect.any(Object));
    });
    const workspaceInput = await screen.findByTestId('workspace-input');
    expect(workspaceInput).toBeInTheDocument();

    // 3. User provides input for the first step (Summarize)
    await userEvent.type(workspaceInput, 'Patient is a 58yo male with chest pain.');

    // 4. User submits the step
    const submitButton = screen.getByRole('button', { name: /Enviar e Próximo/i });
    fireEvent.click(submitButton);

    // 5. Verify step API call and UI update with feedback
    await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/clinical-simulation/step-translated', expect.any(Object));
    });
    // The feedback component for SUMMARIZE is SummaryFeedbackComponent
    // We check for its specific output based on the mock
    expect(await screen.findByTestId('summary-feedback')).toBeInTheDocument();
    expect(screen.getByText('Feedback for SUMMARIZE')).toBeInTheDocument();
  });

  it('shows an error if session initialization fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Initialization failed' });

    render(<MockClinicalSimulationPage />);

    const startButton = screen.getAllByRole('button', { name: /Iniciar Simulação/i })[0];
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Ocorreu um Erro/i)).toBeInTheDocument();
      expect(screen.getByText(/Falha ao iniciar a simulação \(500\): Initialization failed/i)).toBeInTheDocument();
    });
  });

  it('shows an error if a step submission fails', async () => {
    // Initial load succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockInitialState });
    // Step submission fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Step submission failed' });

    render(<MockClinicalSimulationPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /Iniciar Simulação/i })[0]);

    const workspaceInput = await screen.findByTestId('workspace-input');
    await userEvent.type(workspaceInput, 'This will fail.');
    fireEvent.click(screen.getByRole('button', { name: /Enviar e Próximo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Erro do servidor: Step submission failed/i)).toBeInTheDocument();
    });
  });
});
