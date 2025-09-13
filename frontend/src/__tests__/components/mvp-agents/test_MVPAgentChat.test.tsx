/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MVPAgentChat } from '@/components/chat/MVPAgentChat';
import { useChat } from '@ai-sdk/react';

// Mock the useChat hook
jest.mock('ai/react', () => ({
  useChat: jest.fn(),
}));

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe('MVPAgentChat', () => {
  const mockProps = {
    patientId: 'test-patient-001',
    conversationId: 'test-conversation-001',
    onAgentSwitch: jest.fn(),
  };

  const mockUseChat = {
    messages: [
      { id: '1', role: 'user', content: 'Patient with chest pain' },
      { id: '2', role: 'assistant', content: 'This appears to be a cardiac case.' },
    ],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    setMessages: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useChat as jest.Mock).mockReturnValue(mockUseChat);
  });

  it('renders the chat interface correctly', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Clinical Discussion Agent')).toBeInTheDocument();
    expect(screen.getByText('Patient with chest pain')).toBeInTheDocument();
    expect(screen.getByText('This appears to be a cardiac case.')).toBeInTheDocument();
  });

  it('displays agent type indicator', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Clinical Discussion Agent')).toBeInTheDocument();
  });

  it('shows agent switching toggle', () => {
    render(<MVPAgentChat {...mockProps} />);

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText('Enable Intelligent Agent')).toBeInTheDocument();
  });

  it('handles agent switching', () => {
    render(<MVPAgentChat {...mockProps} />);

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(mockProps.onAgentSwitch).toHaveBeenCalledWith(true);
  });

  it('displays loading state when processing', () => {
    (useChat as jest.Mock).mockReturnValue({
      ...mockUseChat,
      isLoading: true,
    });

    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Analyzing with Clinical Discussion Agent...')).toBeInTheDocument();
  });

  it('shows patient context information', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Patient Context: test-patient-001')).toBeInTheDocument();
  });

  it('handles message submission', () => {
    render(<MVPAgentChat {...mockProps} />);

    const input = screen.getByPlaceholderText('Describe the clinical case...');
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'New test message' } });
    fireEvent.click(submitButton);

    expect(mockUseChat.handleInputChange).toHaveBeenCalled();
    expect(mockUseChat.handleSubmit).toHaveBeenCalled();
  });

  it('displays quick reply suggestions', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('What are the possible diagnoses?')).toBeInTheDocument();
    expect(screen.getByText('What diagnostic tests should I order?')).toBeInTheDocument();
    expect(screen.getByText('What is the treatment plan?')).toBeInTheDocument();
  });

  it('handles quick reply selection', () => {
    render(<MVPAgentChat {...mockProps} />);

    const quickReply = screen.getByText('What are the possible diagnoses?');
    fireEvent.click(quickReply);

    expect(mockUseChat.handleInputChange).toHaveBeenCalled();
  });

  it('shows agent capabilities when enabled', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Case Analysis')).toBeInTheDocument();
    expect(screen.getByText('Differential Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Management Planning')).toBeInTheDocument();
  });

  it('displays agent metadata in messages', () => {
    const messagesWithMetadata = [
      { id: '1', role: 'user', content: 'Patient with chest pain' },
      {
        id: '2',
        role: 'assistant',
        content: 'This appears to be a cardiac case.',
        metadata: {
          agent_type: 'clinical_discussion',
          confidence: 0.95,
          reasoning_steps: ['symptom_analysis', 'differential_generation']
        }
      },
    ];

    (useChat as jest.Mock).mockReturnValue({
      ...mockUseChat,
      messages: messagesWithMetadata,
    });

    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
    expect(screen.getByText('Reasoning: symptom_analysis, differential_generation')).toBeInTheDocument();
  });

  it('handles agent switching mid-conversation', async () => {
    render(<MVPAgentChat {...mockProps} />);

    const toggle = screen.getByRole('checkbox');

    // Enable agent
    fireEvent.click(toggle);
    expect(mockProps.onAgentSwitch).toHaveBeenCalledWith(true);

    // Disable agent
    fireEvent.click(toggle);
    expect(mockProps.onAgentSwitch).toHaveBeenCalledWith(false);
  });

  it('shows error state when agent fails', () => {
    const errorMessages = [
      { id: '1', role: 'user', content: 'Patient with chest pain' },
      {
        id: '2',
        role: 'assistant',
        content: 'I apologize, but I encountered an error analyzing this case.',
        metadata: {
          error: true,
          error_type: 'agent_failure',
          fallback_message: 'Please try rephrasing your question.'
        }
      },
    ];

    (useChat as jest.Mock).mockReturnValue({
      ...mockUseChat,
      messages: errorMessages,
    });

    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Agent Error')).toBeInTheDocument();
    expect(screen.getByText('Please try rephrasing your question.')).toBeInTheDocument();
  });

  it('displays conversation history', () => {
    const longConversation = [
      { id: '1', role: 'user', content: 'Patient with chest pain' },
      { id: '2', role: 'assistant', content: 'This appears to be a cardiac case.' },
      { id: '3', role: 'user', content: 'What tests should I order?' },
      { id: '4', role: 'assistant', content: 'I recommend ECG, troponin, and chest X-ray.' },
      { id: '5', role: 'user', content: 'How should I manage this patient?' },
      { id: '6', role: 'assistant', content: 'Start with MONA-B protocol and cardiology consult.' },
    ];

    (useChat as jest.Mock).mockReturnValue({
      ...mockUseChat,
      messages: longConversation,
    });

    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Patient with chest pain')).toBeInTheDocument();
    expect(screen.getByText('MONA-B protocol and cardiology consult.')).toBeInTheDocument();
  });

  it('handles empty conversation gracefully', () => {
    (useChat as jest.Mock).mockReturnValue({
      ...mockUseChat,
      messages: [],
    });

    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Clinical Discussion Agent')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the clinical case...')).toBeInTheDocument();
  });

  it('shows agent status indicator', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('🟢 Agent Active')).toBeInTheDocument();
  });

  it('displays agent switching history', () => {
    render(<MVPAgentChat {...mockProps} />);

    expect(screen.getByText('Agent History')).toBeInTheDocument();
    expect(screen.getByText('Switched to Clinical Discussion Agent')).toBeInTheDocument();
  });
});