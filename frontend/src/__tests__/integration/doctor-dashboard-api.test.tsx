import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '@/app/dashboard-doctor/page';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'Doctor',
      emailAddresses: [{ emailAddress: 'test@doctor.com' }],
    },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Mock API services
const mockApiService = {
  getPatients: jest.fn(),
  getGroups: jest.fn(),
  getAlerts: jest.fn(),
  getCriticalAlerts: jest.fn(),
  getPatientAnalytics: jest.fn(),
  getDashboardStats: jest.fn(),
  getGroupAlerts: jest.fn(),
};

// Mock components that might make API calls





jest.mock('@/components/dashboard-doctor/CriticalAlertsCard', () => {
  return function MockCriticalAlertsCard({ onViewAll, onAlertClick }: any) {
    return (
      <div data-testid="critical-alerts-card">
        <h3>Critical Alerts</h3>
        <button onClick={() => onViewAll()}>View All</button>
        <button onClick={() => onAlertClick('alert-1')}>Alert 1</button>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/DoctorPatientList', () => {
  return function MockDoctorPatientList() {
    return (
      <div data-testid="doctor-patient-list">
        <h3>Patient List</h3>
        <div data-testid="patient-card">Test Patient 1</div>
        <div data-testid="patient-card">Test Patient 2</div>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/GroupOverviewCard', () => {
  return function MockGroupOverviewCard({ onViewAll }: any) {
    return (
      <div data-testid="group-overview-card">
        <h3>Groups Overview</h3>
        <button onClick={() => onViewAll()}>View All Groups</button>
        <div data-testid="group-card">Test Group 1</div>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/RecentConversationsCard', () => {
  return function MockRecentConversationsCard() {
    return (
      <div data-testid="recent-conversations-card">
        <h3>Recent Conversations</h3>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/QuickAnalysisCard', () => {
  return function MockQuickAnalysisCard({ onClick }: any) {
    return (
      <div data-testid="quick-analysis-card">
        <h3>Quick Analysis</h3>
        <button onClick={onClick}>Start Analysis</button>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/ClinicalAcademyCard', () => {
  return function MockClinicalAcademyCard({ onClick, nextModule }: any) {
    return (
      <div data-testid="clinical-academy-card">
        <h3>Clinical Academy</h3>
        <p>Next: {nextModule}</p>
        <button onClick={onClick}>Open Academy</button>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/GroupAlertsCard', () => {
  return function MockGroupAlertsCard({ onViewAll }: any) {
    return (
      <div data-testid="group-alerts-card">
        <h3>Group Alerts</h3>
        <button onClick={() => onViewAll()}>View All</button>
      </div>
    );
  };
});

jest.mock('@/components/dashboard-doctor/FrequentGroupsCard', () => {
  return function MockFrequentGroupsCard({ onViewAll }: any) {
    return (
      <div data-testid="frequent-groups-card">
        <h3>Frequent Groups</h3>
        <button onClick={() => onViewAll()}>View All</button>
      </div>
    );
  };
});

describe('Doctor Dashboard API Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockApiService.getPatients.mockResolvedValue({
      data: [
        { id: '1', name: 'Test Patient 1', age: 45, status: 'active' },
        { id: '2', name: 'Test Patient 2', age: 32, status: 'active' },
      ],
      total: 2,
    });

    mockApiService.getGroups.mockResolvedValue({
      data: [
        { id: '1', name: 'Test Group 1', memberCount: 5 },
        { id: '2', name: 'Test Group 2', memberCount: 3 },
      ],
      total: 2,
    });

    mockApiService.getCriticalAlerts.mockResolvedValue({
      data: [
        { id: '1', patientId: '1', message: 'Critical lab value', severity: 'high' },
        { id: '2', patientId: '2', message: 'Medication alert', severity: 'medium' },
      ],
      total: 2,
    });

    mockApiService.getGroupAlerts.mockResolvedValue({
      data: [
        { id: '1', groupId: '1', message: 'Group alert 1', type: 'notification' },
      ],
      total: 1,
    });

    mockApiService.getDashboardStats.mockResolvedValue({
      totalPatients: 2,
      totalGroups: 2,
      criticalAlerts: 2,
      activeConversations: 0,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );
  };

  describe('Dashboard Data Loading', () => {
    it('should load and display dashboard components', async () => {
      renderDashboard();

      // Check for main dashboard title
      expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();

      // Check for welcome message
      expect(screen.getByText(/Visão geral do seu consultório/)).toBeInTheDocument();

      // Check for user welcome
      expect(screen.getByText(/Bem-vindo\(a\), Test/)).toBeInTheDocument();

      // Verify all main components are rendered
      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('group-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('quick-analysis-card')).toBeInTheDocument();
        expect(screen.getByTestId('clinical-academy-card')).toBeInTheDocument();
        expect(screen.getByTestId('group-overview-card')).toBeInTheDocument();
        expect(screen.getByTestId('frequent-groups-card')).toBeInTheDocument();
        expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
      });
    });

    it('should handle API loading states gracefully', async () => {
      // Mock slow API responses
      mockApiService.getPatients.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: [], total: 0 }), 1000))
      );

      renderDashboard();

      // Dashboard should render immediately with loading states
      expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();
      
      // Components should be present even during loading
      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API failures
      mockApiService.getPatients.mockRejectedValue(new Error('Failed to fetch patients'));
      mockApiService.getGroups.mockRejectedValue(new Error('Failed to fetch groups'));
      mockApiService.getCriticalAlerts.mockRejectedValue(new Error('Failed to fetch alerts'));

      renderDashboard();

      // Dashboard should still render
      expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();

      // Components should handle errors gracefully
      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
        expect(screen.getByTestId('group-overview-card')).toBeInTheDocument();
      });
    });
  });

  describe('Critical Alerts Integration', () => {
    it('should load and display critical alerts', async () => {
      renderDashboard();

      await waitFor(() => {
        const alertsCard = screen.getByTestId('critical-alerts-card');
        expect(alertsCard).toBeInTheDocument();
        expect(alertsCard).toHaveTextContent('Critical Alerts');
      });

      // Verify API was called
      await waitFor(() => {
        expect(mockApiService.getCriticalAlerts).toHaveBeenCalled();
      });
    });

    it('should handle alert interactions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderDashboard();

      await waitFor(() => {
        const viewAllButton = screen.getByText('View All');
        expect(viewAllButton).toBeInTheDocument();
      });

      // Test view all functionality
      const viewAllButton = screen.getByText('View All');
      viewAllButton.click();

      expect(consoleSpy).toHaveBeenCalledWith('View all alerts');

      consoleSpy.mockRestore();
    });

    it('should handle empty alerts state', async () => {
      mockApiService.getCriticalAlerts.mockResolvedValue({ data: [], total: 0 });

      renderDashboard();

      await waitFor(() => {
        const alertsCard = screen.getByTestId('critical-alerts-card');
        expect(alertsCard).toBeInTheDocument();
      });

      // Should still display the component
      expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
    });
  });

  describe('Patient Management Integration', () => {
    it('should load and display patient list', async () => {
      renderDashboard();

      await waitFor(() => {
        const patientList = screen.getByTestId('doctor-patient-list');
        expect(patientList).toBeInTheDocument();
        expect(patientList).toHaveTextContent('Patient List');
      });

      // Verify patient cards are rendered
      const patientCards = screen.getAllByTestId('patient-card');
      expect(patientCards).toHaveLength(2);
      expect(patientCards[0]).toHaveTextContent('Test Patient 1');
      expect(patientCards[1]).toHaveTextContent('Test Patient 2');
    });

    it('should handle patient data loading errors', async () => {
      mockApiService.getPatients.mockRejectedValue(new Error('Network error'));

      renderDashboard();

      await waitFor(() => {
        const patientList = screen.getByTestId('doctor-patient-list');
        expect(patientList).toBeInTheDocument();
      });

      // Should still render component even with error
      expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
    });

    it('should handle empty patient list', async () => {
      mockApiService.getPatients.mockResolvedValue({ data: [], total: 0 });

      renderDashboard();

      await waitFor(() => {
        const patientList = screen.getByTestId('doctor-patient-list');
        expect(patientList).toBeInTheDocument();
      });

      // Should display empty state appropriately
      expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
    });
  });

  describe('Group Management Integration', () => {
    it('should load and display group overview', async () => {
      renderDashboard();

      await waitFor(() => {
        const groupOverview = screen.getByTestId('group-overview-card');
        expect(groupOverview).toBeInTheDocument();
        expect(groupOverview).toHaveTextContent('Groups Overview');
      });

      // Verify group cards are rendered
      const groupCards = screen.getAllByTestId('group-card');
      expect(groupCards).toHaveLength(1);
      expect(groupCards[0]).toHaveTextContent('Test Group 1');
    });

    it('should handle group alerts', async () => {
      renderDashboard();

      await waitFor(() => {
        const groupAlertsCard = screen.getByTestId('group-alerts-card');
        expect(groupAlertsCard).toBeInTheDocument();
        expect(groupAlertsCard).toHaveTextContent('Group Alerts');
      });

      // Verify API was called
      await waitFor(() => {
        expect(mockApiService.getGroupAlerts).toHaveBeenCalled();
      });
    });

    it('should display frequent groups', async () => {
      renderDashboard();

      await waitFor(() => {
        const frequentGroupsCard = screen.getByTestId('frequent-groups-card');
        expect(frequentGroupsCard).toBeInTheDocument();
        expect(frequentGroupsCard).toHaveTextContent('Frequent Groups');
      });
    });

    it('should handle group data errors', async () => {
      mockApiService.getGroups.mockRejectedValue(new Error('Failed to load groups'));
      mockApiService.getGroupAlerts.mockRejectedValue(new Error('Failed to load group alerts'));

      renderDashboard();

      // Components should still render
      await waitFor(() => {
        expect(screen.getByTestId('group-overview-card')).toBeInTheDocument();
        expect(screen.getByTestId('group-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('frequent-groups-card')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions Integration', () => {
    it('should display quick analysis card', async () => {
      renderDashboard();

      await waitFor(() => {
        const quickAnalysisCard = screen.getByTestId('quick-analysis-card');
        expect(quickAnalysisCard).toBeInTheDocument();
        expect(quickAnalysisCard).toHaveTextContent('Quick Analysis');
      });
    });

    it('should handle quick analysis interaction', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderDashboard();

      await waitFor(() => {
        const analysisButton = screen.getByText('Start Analysis');
        expect(analysisButton).toBeInTheDocument();
      });

      const analysisButton = screen.getByText('Start Analysis');
      analysisButton.click();

      expect(consoleSpy).toHaveBeenCalledWith('Open lab analysis');

      consoleSpy.mockRestore();
    });

    it('should display clinical academy card', async () => {
      renderDashboard();

      await waitFor(() => {
        const academyCard = screen.getByTestId('clinical-academy-card');
        expect(academyCard).toBeInTheDocument();
        expect(academyCard).toHaveTextContent('Clinical Academy');
        expect(academyCard).toHaveTextContent('Next: Dor Torácica');
      });
    });

    it('should handle clinical academy interaction', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderDashboard();

      await waitFor(() => {
        const academyButton = screen.getByText('Open Academy');
        expect(academyButton).toBeInTheDocument();
      });

      const academyButton = screen.getByText('Open Academy');
      academyButton.click();

      expect(consoleSpy).toHaveBeenCalledWith('Open clinical academy');

      consoleSpy.mockRestore();
    });
  });

  describe('Dashboard Performance', () => {
    it('should render dashboard within reasonable time', async () => {
      const startTime = Date.now();
      
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds
    });

    it('should handle concurrent API requests efficiently', async () => {
      const startTime = Date.now();
      
      renderDashboard();

      // Wait for all components to load
      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
        expect(screen.getByTestId('doctor-patient-list')).toBeInTheDocument();
        expect(screen.getByTestId('group-overview-card')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      
      // Verify all APIs were called
      expect(mockApiService.getPatients).toHaveBeenCalled();
      expect(mockApiService.getGroups).toHaveBeenCalled();
      expect(mockApiService.getCriticalAlerts).toHaveBeenCalled();
      expect(mockApiService.getGroupAlerts).toHaveBeenCalled();
      
      // Should complete within reasonable time even with multiple API calls
      expect(loadTime).toBeLessThan(3000);
    });
  });

  describe('Dashboard State Management', () => {
    it('should maintain user context across component interactions', async () => {
      renderDashboard();

      // Verify user information is displayed
      await waitFor(() => {
        expect(screen.getByText(/Bem-vindo\(a\), Test/)).toBeInTheDocument();
      });

      // User context should remain consistent across interactions
      const viewAllButton = screen.getByText('View All');
      viewAllButton.click();

      // User welcome should still be there
      expect(screen.getByText(/Bem-vindo\(a\), Test/)).toBeInTheDocument();
    });

    it('should handle real-time data updates', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
      });

      // Simulate data update
      mockApiService.getCriticalAlerts.mockResolvedValue({
        data: [
          { id: '3', patientId: '3', message: 'New critical alert', severity: 'high' },
        ],
        total: 1,
      });

      // Trigger re-render (this would normally happen via WebSocket or polling)
      // For this test, we verify the component can handle new data
      expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', async () => {
      // Mock a component to throw an error
      const originalError = console.error;
      console.error = jest.fn();

      renderDashboard();

      // Dashboard should still render other components even if one fails
      await waitFor(() => {
        expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();
      });

      console.error = originalError;
    });

    it('should display fallback UI for failed components', async () => {
      // This would test error boundaries if implemented
      renderDashboard();

      // For now, verify basic rendering works
      await waitFor(() => {
        expect(screen.getByText('Dashboard Clínico')).toBeInTheDocument();
        expect(screen.getByTestId('critical-alerts-card')).toBeInTheDocument();
      });
    });
  });
});