import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlertsPage from '@/app/dashboard-doctor/patients/[id]/alerts/page';
import * as alertsAPI from '@/services/alertsService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('AlertsPage', () => {
  const mockAlerts = [
    {
      alert_id: 1,
      patient_id: 1,
      user_id: 1,
      alert_type: 'Hemoglobina Baixa',
      message: 'Valor de hemoglobina abaixo do normal',
      severity: 'high',
      is_read: false,
      details: {},
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      parameter: 'Hemoglobina',
      value: 8.5,
      reference: '12-16 g/dL',
      interpretation: 'Anemia severa',
      recommendation: 'Investigar causa da anemia',
    },
    {
      alert_id: 2,
      patient_id: 1,
      user_id: 1,
      alert_type: 'Leucócitos Elevados',
      message: 'Contagem de leucócitos elevada',
      severity: 'medium',
      is_read: true,
      details: {},
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      parameter: 'Leucócitos',
      value: 12000,
      reference: '4000-10000 /mm³',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock alerts API response
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/alerts')) {
        return Promise.resolve({ data: mockAlerts });
      }
      if (url.includes('/api/groups')) {
        return Promise.resolve({ data: { items: [] } });
      }
      return Promise.reject(new Error('Not mocked'));
    });

    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    // Mock fetch for groups
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/groups')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        });
      }
      return Promise.reject(new Error('Not mocked'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders alerts page with patient alerts', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Alertas do Paciente')).toBeInTheDocument();
    });

    // Check if alerts are rendered
    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.getByText('Leucócitos Elevados')).toBeInTheDocument();
    });
  });

  it('displays alert statistics correctly', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      // Total alerts
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // High severity alerts
      const highSeverityCount = screen.getAllByText('1').find(el => 
        el.closest('.text-red-600')
      );
      expect(highSeverityCount).toBeInTheDocument();
    });
  });

  it('filters alerts by severity', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.getByText('Leucócitos Elevados')).toBeInTheDocument();
    });

    // Open severity filter - find by combobox role (first one is severity)
    const comboboxes = screen.getAllByRole('combobox');
    const severityCombobox = comboboxes[0];
    await user.click(severityCombobox);

    // Select high severity
    const highOption = await screen.findByRole('option', { name: /alta/i });
    await user.click(highOption);

    // Only high severity alert should be visible
    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.queryByText('Leucócitos Elevados')).not.toBeInTheDocument();
    });
  });

  it('filters alerts by status', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.getByText('Leucócitos Elevados')).toBeInTheDocument();
    });

    // Open status filter - find by combobox role (second one is status)
    const comboboxes = screen.getAllByRole('combobox');
    const statusCombobox = comboboxes[1];
    await user.click(statusCombobox);

    // Select unread alerts
    const unreadOption = await screen.findByRole('option', { name: /não lidos/i });
    await user.click(unreadOption);

    // Only unread alert should be visible
    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.queryByText('Leucócitos Elevados')).not.toBeInTheDocument();
    });
  });

  it('searches alerts by message', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.getByText('Leucócitos Elevados')).toBeInTheDocument();
    });

    // Search for specific alert
    const searchInput = screen.getByPlaceholderText(/buscar por mensagem/i);
    await user.type(searchInput, 'hemoglobina');

    // Only matching alert should be visible
    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
      expect(screen.queryByText('Leucócitos Elevados')).not.toBeInTheDocument();
    });
  });

  it('marks alert as read', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    // Wait for unread alert to appear
    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
    });

    // Find and click "Mark as Read" button
    const markAsReadButton = screen.getByRole('button', { name: /marcar como lido/i });
    await user.click(markAsReadButton);

    // Verify API call
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/patients/1/alerts/1/acknowledge'
      );
    });
  });

  it('displays alert details correctly', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Hemoglobina Baixa')).toBeInTheDocument();
    });

    // Check if alert details are displayed for the first alert
    expect(screen.getAllByText('Parâmetro:')).toHaveLength(2); // Two alerts have parameters
    expect(screen.getByText('Hemoglobina')).toBeInTheDocument();
    expect(screen.getAllByText('Valor:')).toHaveLength(2); // Two alerts have values
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getAllByText('Referência:')).toHaveLength(2); // Two alerts have references
    expect(screen.getByText('12-16 g/dL')).toBeInTheDocument();
    expect(screen.getByText('Interpretação:')).toBeInTheDocument();
    expect(screen.getByText('Anemia severa')).toBeInTheDocument();
    expect(screen.getByText('Recomendação:')).toBeInTheDocument();
    expect(screen.getByText('Investigar causa da anemia')).toBeInTheDocument();
  });

  it('shows different severity badges correctly', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      // High severity badge
      expect(screen.getByText('Alta')).toBeInTheDocument();
      // Medium severity badge  
      expect(screen.getByText('Média')).toBeInTheDocument();
    });
  });

  it('shows new badge for unread alerts', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      // Should show "Novo" badge for unread alert
      expect(screen.getByText('Novo')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Carregando alertas...')).toBeInTheDocument();
    });

    // Should eventually show empty state or error
    await waitFor(() => {
      expect(screen.queryByText('Carregando alertas...')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no alerts', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum alerta disponível')).toBeInTheDocument();
      expect(screen.getByText('Não há alertas registrados para este paciente.')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<AlertsPage />);

    // Should start on alerts tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /lista de alertas/i })).toHaveAttribute('aria-selected', 'true');
    });

    // Switch to timeline tab
    const timelineTab = screen.getByRole('tab', { name: /linha do tempo/i });
    await user.click(timelineTab);

    expect(timelineTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Linha do Tempo de Alertas')).toBeInTheDocument();
  });
});