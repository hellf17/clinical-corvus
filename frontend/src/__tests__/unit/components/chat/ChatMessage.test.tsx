import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatMessage from '@/components/chat/ChatMessage';
import { Message } from '@/store/chatStore';

describe('ChatMessage', () => {
  const mockUserMessage: Message = {
    id: '1',
    content: 'Hello, this is a test message',
    role: 'user',
    timestamp: new Date('2023-01-01T12:30:00').getTime(),
  };

  const mockAssistantMessage: Message = {
    id: '2',
    content: 'Hello! How can I help you today?',
    role: 'assistant',
    timestamp: new Date('2023-01-01T12:31:00').getTime(),
  };

  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    // Check user name is displayed
    expect(screen.getByText('Você')).toBeInTheDocument();
    
    // Check message content is displayed
    expect(screen.getByText(mockUserMessage.content)).toBeInTheDocument();
    
    // Check timestamp is displayed in correct format
    const formattedTime = new Date(mockUserMessage.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(screen.getByText(formattedTime)).toBeInTheDocument();
    
    // Check styling for user message - Fix selector to target correct element
    const outerContainer = screen.getByText(mockUserMessage.content).closest('div[class*="rounded-lg"]');
    expect(outerContainer).toHaveClass('bg-primary');
    expect(outerContainer).toHaveClass('text-white');
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage message={mockAssistantMessage} />);
    
    // Check assistant name is displayed
    expect(screen.getByText('Dr. Corvus')).toBeInTheDocument();
    
    // Check message content is displayed
    expect(screen.getByText(mockAssistantMessage.content)).toBeInTheDocument();
    
    // Check timestamp is displayed in correct format
    const formattedTime = new Date(mockAssistantMessage.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(screen.getByText(formattedTime)).toBeInTheDocument();
    
    // Check styling for assistant message - Fix selector to target correct element
    const outerContainer = screen.getByText(mockAssistantMessage.content).closest('div[class*="rounded-lg"]');
    expect(outerContainer).toHaveClass('bg-gray-100');
    expect(outerContainer).not.toHaveClass('bg-primary');
  });

  it('renders multiline message content correctly', () => {
    const multilineMessage: Message = {
      id: '3',
      content: 'This is line 1\nThis is line 2\nThis is line 3',
      role: 'user',
      timestamp: new Date().getTime(),
    };
    
    render(<ChatMessage message={multilineMessage} />);
    
    // Check that content is rendered with whitespace preserved
    const contentElement = screen.getByText(/This is line 1/);
    expect(contentElement).toHaveClass('whitespace-pre-wrap');
    expect(contentElement.textContent).toBe(multilineMessage.content);
  });

  it('handles very long messages', () => {
    const longMessage: Message = {
      id: '4',
      content: 'A'.repeat(500),  // Very long message
      role: 'assistant',
      timestamp: new Date().getTime(),
    };
    
    render(<ChatMessage message={longMessage} />);
    
    // Message should still be rendered
    expect(screen.getByText('A'.repeat(500))).toBeInTheDocument();
    
    // Container should have max-width class - Fix selector to target correct element
    const outerContainer = screen.getByText('A'.repeat(500)).closest('div.max-w-\\[85\\%\\]');
    expect(outerContainer).toBeInTheDocument();
  });
}); 