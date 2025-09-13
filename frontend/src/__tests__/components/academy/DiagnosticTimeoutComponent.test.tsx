
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosticTimeoutComponent from '@/components/academy/metacognition/DiagnosticTimeoutComponent';
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
  alternative_diagnoses_to_consider: ['Costochondritis'],
  key_questions_to_ask: ['Is the pain reproducible on palpation?'],
  red_flags_to_check: ['Check for leg swelling.'],
  next_steps_suggested: ['Consider a D-dimer test.'],
  cognitive_checks: ['Have you considered non-cardiac causes equally?'],
  timeout_recommendation: 'A good timeout session.',
};

describe('DiagnosticTimeoutComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ getToken: async () => 'mock-token', isLoaded: true });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the setup screen correctly', () => {
    render(<DiagnosticTimeoutComponent />);
    expect(screen.getByRole('heading', { name: /Prática de Diagnostic Timeout/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição do Caso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Diagnostic Timeout/i })).toBeDisabled();
  });

  it('starts a session when a template is selected and form is filled', async () => {
    render(<DiagnosticTimeoutComponent />);
    await userEvent.type(screen.getByLabelText(/Descrição do Caso/i), 'Patient with chest pain');
    
    // Select a template
    fireEvent.click(screen.getByText(/Timeout de Emergência/i));

    const startButton = screen.getByRole('button', { name: /Iniciar Diagnostic Timeout/i });
    expect(startButton).not.toBeDisabled();
    fireEvent.click(startButton);

    // Check that the session has started
    expect(await screen.findByText(/Timeout de Emergência/i)).toBeInTheDocument();
    expect(screen.getByText(/0:02:00/)).toBeInTheDocument(); // 2 minutes for the emergency template
    expect(screen.getByText(/O que mais poderia causar estes sintomas\?/i)).toBeInTheDocument();
  });

  it('timer counts down during a session', async () => {
    render(<DiagnosticTimeoutComponent />);
    await userEvent.type(screen.getByLabelText(/Descrição do Caso/i), 'Patient with chest pain');
    fireEvent.click(screen.getByText(/Timeout de Emergência/i));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Diagnostic Timeout/i }));

    expect(await screen.findByText(/0:02:00/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/0:01:59/)).toBeInTheDocument();
  });

  it('submits for analysis after completing prompts and shows results', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

    render(<DiagnosticTimeoutComponent />);
    await userEvent.type(screen.getByLabelText(/Descrição do Caso/i), 'Patient with chest pain');
    fireEvent.click(screen.getByText(/Timeout de Emergência/i));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Diagnostic Timeout/i }));

    // Fill out all prompts
    const promptTextarea = await screen.findByPlaceholderText(/Anote suas reflexões/i);
    await userEvent.type(promptTextarea, 'Response 1');
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    await userEvent.type(promptTextarea, 'Response 2');
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    await userEvent.type(promptTextarea, 'Response 3');
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    await userEvent.type(promptTextarea, 'Response 4');

    const analyzeButton = screen.getByRole('button', { name: /Analisar Timeout/i });
    expect(analyzeButton).not.toBeDisabled();
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/Análise do Diagnostic Timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/Costochondritis/i)).toBeInTheDocument();
      expect(screen.getByText(/Consider a D-dimer test./i)).toBeInTheDocument();
    });
  });
});
