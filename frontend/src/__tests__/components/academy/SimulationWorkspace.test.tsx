
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimulationWorkspace } from '@/components/academy/clinical-simulation/SimulationWorkspace';
import { ClinicalCase } from '@/components/academy/clinical-simulation/cases';

// Mock the child feedback components
jest.mock('@/components/academy/clinical-simulation/SummaryFeedbackComponent', () => {
  const MockSummaryFeedback = (props: any) => <div data-testid="summary-feedback">{props.feedback.overall_assessment}</div>;
  MockSummaryFeedback.displayName = 'SummaryFeedbackComponent';
  return MockSummaryFeedback;
});
jest.mock('@/components/academy/clinical-simulation/DifferentialFeedbackComponent', () => {
  const MockDifferentialFeedback = (props: any) => <div data-testid="ddx-feedback">{props.feedback.prioritization_feedback}</div>;
  MockDifferentialFeedback.displayName = 'DifferentialFeedbackComponent';
  return MockDifferentialFeedback;
});
jest.mock('@/components/academy/clinical-simulation/AnalysisFeedbackComponent', () => {
  const MockAnalysisFeedback = (props: any) => <div data-testid="analysis-feedback">{props.feedback.response}</div>;
  MockAnalysisFeedback.displayName = 'AnalysisFeedbackComponent';
  return MockAnalysisFeedback;
});
jest.mock('@/components/academy/clinical-simulation/ProbeFeedbackComponent', () => {
  const MockProbeFeedback = (props: any) => <div data-testid="probe-feedback">{props.feedback.additional_considerations[0]}</div>;
  MockProbeFeedback.displayName = 'ProbeFeedbackComponent';
  return MockProbeFeedback;
});
jest.mock('@/components/academy/clinical-simulation/PlanFeedbackComponent', () => {
  const MockPlanFeedback = (props: any) => <div data-testid="plan-feedback">{props.feedback.guidelines_alignment}</div>;
  MockPlanFeedback.displayName = 'PlanFeedbackComponent';
  return MockPlanFeedback;
});
jest.mock('@/components/academy/clinical-simulation/SessionSummaryComponent', () => {
  const MockSessionSummary = (props: any) => <div data-testid="session-summary">{props.feedback.overall_performance}</div>;
  MockSessionSummary.displayName = 'SessionSummaryComponent';
  return MockSessionSummary;
});

const mockCase: ClinicalCase = {
  id: 'case-001',
  title: 'Test Case Title',
  brief: 'A test case brief.',
  details: 'More details about the case.',
  difficulty: { level: 'Iniciante', focus: 'Test' },
  specialties: ['Testing'],
  learning_objectives: ['Learn to test'],
};

describe('SimulationWorkspace', () => {
  const mockOnInputChange = jest.fn();
  const mockOnSubmitStep = jest.fn();

  const defaultProps = {
    isLoading: false,
    onInputChange: mockOnInputChange,
    onSubmitStep: mockOnSubmitStep,
    clinicalCase: mockCase,
  };

  it('renders the current step title and description', () => {
    const currentStep = { id: 'SUMMARIZE', title: 'Sumarizar (S)', description: 'Resuma o caso.', completed: false };
    render(<SimulationWorkspace {...defaultProps} currentStep={currentStep} feedbackHistory={[]} />);
    expect(screen.getByText('Sumarizar (S)')).toBeInTheDocument();
    // The description is part of the placeholder in the textarea
    expect(screen.getByPlaceholderText(/Resuma o caso/i)).toBeInTheDocument();
  });

  it('renders the clinical case information', () => {
    const currentStep = { id: 'SUMMARIZE', title: 'Sumarizar (S)', description: 'Resuma o caso.', completed: false };
    render(<SimulationWorkspace {...defaultProps} currentStep={currentStep} feedbackHistory={[]} />);
    expect(screen.getByText(/Informações do Caso/i)).toBeInTheDocument();
    expect(screen.getByText(/A test case brief./i)).toBeInTheDocument();
  });

  it('renders the correct feedback component for a completed step', () => {
    const currentStep = { id: 'NARROW', title: 'Afunilar DDx (N)', description: 'Liste seu DDx.', completed: false };
    const feedbackHistory = [
      {
        step: 'SUMMARIZE',
        userInput: 'User summary.',
        feedback: { overall_assessment: 'Good summary.' },
      },
    ];
    render(<SimulationWorkspace {...defaultProps} currentStep={currentStep} feedbackHistory={feedbackHistory} />);
    
    // Check for the user's previous input
    expect(screen.getByText('User summary.')).toBeInTheDocument();
    
    // Check that the correct feedback component was rendered with the right content
    expect(screen.getByTestId('summary-feedback')).toBeInTheDocument();
    expect(screen.getByText('Good summary.')).toBeInTheDocument();
  });

  it('does not render the input textarea for completed steps', () => {
    const currentStep = { id: 'SUMMARIZE', title: 'Sumarizar (S)', description: 'Resuma o caso.', completed: true };
    render(<SimulationWorkspace {...defaultProps} currentStep={currentStep} feedbackHistory={[]} />);
    expect(screen.queryByPlaceholderText(/Resuma o caso/i)).not.toBeInTheDocument();
  });

  it('renders the chat history with user and AI messages', () => {
    const currentStep = { id: 'ANALYZE', title: 'Analisar DDx (A)', description: '...', completed: false };
    const feedbackHistory = [
        {
            step: 'SUMMARIZE',
            userInput: 'User summary.',
            feedback: { overall_assessment: 'Good summary.' },
        },
        {
            step: 'NARROW',
            userInput: 'DDx: A, B, C',
            feedback: { prioritization_feedback: 'Well prioritized.' },
        },
    ];

    render(<SimulationWorkspace {...defaultProps} currentStep={currentStep} feedbackHistory={feedbackHistory} />);

    // Check for user inputs
    expect(screen.getByText('User summary.')).toBeInTheDocument();
    expect(screen.getByText('DDx: A, B, C')).toBeInTheDocument();

    // Check for AI feedback components
    expect(screen.getByTestId('summary-feedback')).toBeInTheDocument();
    expect(screen.getByTestId('ddx-feedback')).toBeInTheDocument();
  });
});
