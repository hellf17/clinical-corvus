/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MVPAgentIntegration } from '@/components/chat/MVPAgentIntegration';

// Mock fetch
global.fetch = jest.fn();

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('MVPAgentIntegration', () => {
  const mockProps = {
    patientId: 'test-patient-001',
    conversationId: 'test-conversation-001',
    onAgentEnabled: jest.fn(),
  };

  const mockHealthResponse = {
    status: 'healthy',
    agents: {
      clinical_discussion: { status: 'healthy', response_time: 1.2 },
      clinical_research: { status: 'healthy', response_time: 0.8 }
    },
    uptime: '99.9%',
    last_check: '2024-08-29T10:30:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockHealthResponse),
    });
  });

  it('renders the integration component correctly', () => {
    render(<MVPAgentIntegration {...mockProps} />);

    expect(screen.getByText('MVP Agents')).toBeInTheDocument();
    expect(screen.getByText('Enable Intelligent Clinical Agents')).toBeInTheDocument();
  });

  it('shows agent status on initial load', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('🟢 System Healthy')).toBeInTheDocument();
    });
  });

  it('displays agent health information', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Clinical Discussion Agent')).toBeInTheDocument();
      expect(screen.getByText('Clinical Research Agent')).toBeInTheDocument();
      expect(screen.getByText('1.2s')).toBeInTheDocument(); // Response time
      expect(screen.getByText('0.8s')).toBeInTheDocument(); // Response time
    });
  });

  it('handles agent toggle functionality', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    const toggle = screen.getByRole('checkbox');
    expect(toggle).not.toBeChecked();

    // Enable agents
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(mockProps.onAgentEnabled).toHaveBeenCalledWith(true);

    // Disable agents
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(mockProps.onAgentEnabled).toHaveBeenCalledWith(false);
  });

  it('shows agent capabilities when expanded', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Agent Capabilities')).toBeInTheDocument();
    });

    // Click to expand capabilities
    const expandButton = screen.getByText('Show Capabilities');
    fireEvent.click(expandButton);

    expect(screen.getByText('Case Analysis & Differential Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Evidence-Based Research & Literature Review')).toBeInTheDocument();
  });

  it('displays usage tips', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('💡 Usage Tips')).toBeInTheDocument();
    });

    expect(screen.getByText('Describe clinical cases in detail for better analysis')).toBeInTheDocument();
    expect(screen.getByText('Ask specific research questions for targeted literature review')).toBeInTheDocument();
  });

  it('handles health check API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('🔴 System Status Unknown')).toBeInTheDocument();
    });
  });

  it('shows degraded health status', async () => {
    const degradedHealthResponse = {
      ...mockHealthResponse,
      status: 'degraded',
      agents: {
        clinical_discussion: { status: 'healthy', response_time: 1.2 },
        clinical_research: { status: 'unhealthy', response_time: null }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(degradedHealthResponse),
    });

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('🟡 System Degraded')).toBeInTheDocument();
      expect(screen.getByText('Clinical Research Agent: Unhealthy')).toBeInTheDocument();
    });
  });

  it('displays system uptime information', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('99.9%')).toBeInTheDocument();
    });
  });

  it('shows last health check timestamp', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Last checked: 2024-08-29T10:30:00Z')).toBeInTheDocument();
    });
  });

  it('handles missing conversation ID gracefully', () => {
    const propsWithoutConversation = {
      patientId: 'test-patient-001',
      onAgentEnabled: jest.fn(),
    };

    render(<MVPAgentIntegration {...propsWithoutConversation} />);

    expect(screen.getByText('MVP Agents')).toBeInTheDocument();
    // Should still work without conversation ID
  });

  it('shows loading state during health check', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<MVPAgentIntegration {...mockProps} />);

    expect(screen.getByText('🔄 Checking system status...')).toBeInTheDocument();
  });

  it('displays agent-specific error messages', async () => {
    const errorHealthResponse = {
      status: 'error',
      agents: {
        clinical_discussion: { status: 'error', error: 'Service timeout' },
        clinical_research: { status: 'healthy', response_time: 0.8 }
      },
      uptime: '99.9%',
      last_check: '2024-08-29T10:30:00Z'
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(errorHealthResponse),
    });

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Clinical Discussion Agent: Service timeout')).toBeInTheDocument();
    });
  });

  it('provides agent switching feedback', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    const toggle = screen.getByRole('checkbox');

    // Enable agents
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('✅ Agents Enabled')).toBeInTheDocument();
    });

    // Disable agents
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('❌ Agents Disabled')).toBeInTheDocument();
    });
  });

  it('shows agent initialization status', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('🚀 Agents Ready')).toBeInTheDocument();
    });
  });

  it('displays performance metrics', async () => {
    const performanceResponse = {
      ...mockHealthResponse,
      performance: {
        average_response_time: 1.0,
        success_rate: 98.5,
        concurrent_users: 15
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(performanceResponse),
    });

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Average Response Time: 1.0s')).toBeInTheDocument();
      expect(screen.getByText('Success Rate: 98.5%')).toBeInTheDocument();
      expect(screen.getByText('Concurrent Users: 15')).toBeInTheDocument();
    });
  });

  it('handles API response errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ detail: 'Internal server error' }),
    });

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('🔴 System Error')).toBeInTheDocument();
    });
  });

  it('shows agent recovery information', async () => {
    const recoveryResponse = {
      ...mockHealthResponse,
      recovery: {
        last_incident: '2024-08-28T15:30:00Z',
        recovery_time: '5 minutes',
        incident_count: 2
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(recoveryResponse),
    });

    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Last Incident: 2024-08-28T15:30:00Z')).toBeInTheDocument();
      expect(screen.getByText('Recovery Time: 5 minutes')).toBeInTheDocument();
      expect(screen.getByText('Incident Count: 2')).toBeInTheDocument();
    });
  });

  it('provides agent help and documentation links', async () => {
    render(<MVPAgentIntegration {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('📚 Help & Documentation')).toBeInTheDocument();
      expect(screen.getByText('View Agent Guide')).toBeInTheDocument();
      expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });
  });

  it('handles component unmounting gracefully', () => {
    const { unmount } = render(<MVPAgentIntegration {...mockProps} />);

    // Should not throw errors when unmounting
    expect(() => unmount()).not.toThrow();
  });
});