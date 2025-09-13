
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationContainer } from '@/components/academy/clinical-simulation/SimulationContainer';
import { ClinicalCase } from '@/components/academy/clinical-simulation/cases';

// Mock child components to isolate the container logic
jest.mock('@/components/academy/clinical-simulation/SimulationHeader', () => ({
  SimulationHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock('@/components/academy/clinical-simulation/StepNavigation', () => ({
  StepNavigation: () => <div>Step Navigation</div>,
}));
jest.mock('@/components/academy/clinical-simulation/SimulationWorkspace', () => ({
  SimulationWorkspace: ({ onSubmitStep, onInputChange }: any) => (
    <div>
      <textarea data-testid="workspace-input" onChange={(e) => onInputChange(e.target.value)} />
      <button onClick={onSubmitStep}>Submit</button>
    </div>
  ),
}));
jest.mock('@/components/academy/clinical-simulation/SimulationSummaryDashboard', () => ({
    SimulationSummaryDashboard: () => <div>Summary Dashboard</div>,
  }));

// Mock global.fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const mockCase: ClinicalCase = {
  id: 'case-001',
  title: 'Test Case Title',
  brief: 'A test case.',
  details: 'More details.',
  difficulty: { level: 'Iniciante', focus: 'Test' },
  specialties: ['Testing'],
  learning_objectives: ['Learn to test'],
};

const mockInitialState = {
    case_context: mockCase,
    feedback_history: [],
};

const mockStepResponse = (step: string) => ({
    updated_session_state: { ...mockInitialState, student_summary: 'Updated state' },
    feedback: { overall_assessment: `Feedback for ${step}` }
});

describe('SimulationContainer', () => {
  const mockOnExit = jest.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockOnExit.mockClear();
  });

  it('shows a loading state and initializes the session', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockInitialState });
    render(<SimulationContainer selectedCase={mockCase} onExit={mockOnExit} />);
    expect(screen.getByText(/Iniciando simulação clínica.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Test Case Title')).toBeInTheDocument();
      expect(screen.getByText('Step Navigation')).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/clinical-simulation/initialize', expect.any(Object));
  });

  it('shows an error message if initialization fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server Error' });
    render(<SimulationContainer selectedCase={mockCase} onExit={mockOnExit} />);
    await waitFor(() => {
      expect(screen.getByText(/Ocorreu um Erro/i)).toBeInTheDocument();
      expect(screen.getByText(/Falha ao iniciar a simulação \(500\): Server Error/i)).toBeInTheDocument();
    });
  });

  it('progresses through a step when user submits input', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockInitialState });
    // Step submission response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockStepResponse('SUMMARIZE') });

    render(<SimulationContainer selectedCase={mockCase} onExit={mockOnExit} />);
    await waitFor(() => expect(screen.getByTestId('workspace-input')).toBeInTheDocument());

    const input = screen.getByTestId('workspace-input');
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    await userEvent.type(input, 'This is my summary.');
    fireEvent.click(submitButton);

    await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/clinical-simulation/step-translated', expect.any(Object));
    });
  });

  it('shows the summary dashboard upon completion', async () => {
    // Mock fetch for all 6 steps + initial call
    mockFetch.mockResolvedValue( { ok: true, json: async () => mockStepResponse('STEP') });

    render(<SimulationContainer selectedCase={mockCase} onExit={mockOnExit} />);
    await waitFor(() => expect(screen.getByTestId('workspace-input')).toBeInTheDocument());

    const input = screen.getByTestId('workspace-input');
    const submitButton = screen.getByRole('button', { name: /Submit/i });

    // Simulate going through all steps
    for (let i = 0; i < 6; i++) {
        await userEvent.clear(input);
        await userEvent.type(input, `Response for step ${i + 1}`);
        fireEvent.click(submitButton);
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(i + 2)); // init + steps
    }

    // After the last step, the summary should appear
    await waitFor(() => {
      expect(screen.getByText('Summary Dashboard')).toBeInTheDocument();
    });
  });
});
