import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertDisplay from '../../../../components/ui/AlertDisplay';
import { AlertProvider } from '../../../../components/providers/AlertProvider';
import { mockAlerts } from '../../../mocks/alertMocks';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('AlertDisplay Component', () => {
  const renderWithProvider = (ui: React.ReactNode) => {
    return render(
      <AlertProvider>
        {ui}
      </AlertProvider>
    );
  };

  test('renders without crashing', () => {
    renderWithProvider(<AlertDisplay alerts={[]} />);
    expect(screen.getByTestId('alert-display')).toBeInTheDocument();
  });

  test('displays alerts properly', () => {
    renderWithProvider(<AlertDisplay alerts={mockAlerts} />);
    
    // Check that all alerts are displayed
    expect(screen.getAllByTestId('alert-item')).toHaveLength(mockAlerts.length);
    
    // Check that critical alerts are styled correctly
    const criticalAlerts = mockAlerts.filter(alert => alert.severity === 'critical');
    criticalAlerts.forEach(alert => {
      const alertElement = screen.getByText(alert.message);
      const alertItem = alertElement.closest('[data-testid="alert-item"]');
      expect(alertItem).toHaveClass('alert-critical');
    });
  });

  test('filters alerts by severity', async () => {
    renderWithProvider(<AlertDisplay alerts={mockAlerts} />);
    
    // Click on the severity filter
    fireEvent.click(screen.getByTestId('severity-filter'));
    
    // Select 'critical' from dropdown
    fireEvent.click(screen.getByText('Critical'));
    
    // Verify only critical alerts are shown
    await waitFor(() => {
      const visibleAlerts = screen.getAllByTestId('alert-item');
      const criticalAlerts = mockAlerts.filter(alert => alert.severity === 'critical');
      expect(visibleAlerts).toHaveLength(criticalAlerts.length);
    });
  });

  test('acknowledges an alert when button is clicked', async () => {
    const mockAcknowledgeCallback = jest.fn();
    
    renderWithProvider(
      <AlertDisplay 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledgeCallback} 
      />
    );
    
    // Click the acknowledge button on the first alert
    fireEvent.click(screen.getAllByTestId('acknowledge-button')[0]);
    
    // Verify the callback was called with the correct alert ID
    expect(mockAcknowledgeCallback).toHaveBeenCalledWith(mockAlerts[0].id);
  });

  test('sorts alerts by priority correctly', async () => {
    renderWithProvider(<AlertDisplay alerts={mockAlerts} />);
    
    // Click on sort button
    fireEvent.click(screen.getByTestId('sort-button'));
    
    // Sort by 'Priority High to Low'
    fireEvent.click(screen.getByText('Priority High to Low'));
    
    // Get all displayed alerts
    const displayedAlerts = screen.getAllByTestId('alert-item');
    
    // Verify the first alert is the most critical one
    const mostCriticalAlert = mockAlerts.reduce((prev, current) => {
      const severityMap = { 'critical': 4, 'severe': 3, 'moderate': 2, 'mild': 1, 'info': 0 };
      return severityMap[current.severity] > severityMap[prev.severity] ? current : prev;
    });
    
    await waitFor(() => {
      const firstAlertText = displayedAlerts[0].textContent;
      expect(firstAlertText).toContain(mostCriticalAlert.message);
    });
  });

  test('displays empty state when no alerts match filter', async () => {
    renderWithProvider(<AlertDisplay alerts={mockAlerts} />);
    
    // Apply a filter that won't match any alerts
    fireEvent.click(screen.getByTestId('category-filter'));
    fireEvent.click(screen.getByText('Custom Category')); // Assuming no alerts have this category
    
    // Verify empty state is shown
    await waitFor(() => {
      expect(screen.getByText('No alerts match your filters')).toBeInTheDocument();
    });
  });

  test('shows alert details when an alert is clicked', async () => {
    renderWithProvider(<AlertDisplay alerts={mockAlerts} />);
    
    // Click on an alert to show details
    fireEvent.click(screen.getAllByTestId('alert-item')[0]);
    
    // Verify details dialog is shown
    await waitFor(() => {
      expect(screen.getByTestId('alert-details-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('alert-detail-message')).toHaveTextContent(mockAlerts[0].message);
      expect(screen.getByTestId('alert-detail-category')).toHaveTextContent(`Category: ${mockAlerts[0].category}`);
    });
  });

  test('bulk action applies to selected alerts', async () => {
    const mockBulkAcknowledgeCallback = jest.fn();
    
    renderWithProvider(
      <AlertDisplay 
        alerts={mockAlerts} 
        onBulkAcknowledge={mockBulkAcknowledgeCallback} 
      />
    );
    
    // Select multiple alerts using checkboxes
    fireEvent.click(screen.getAllByTestId('alert-checkbox')[0]);
    fireEvent.click(screen.getAllByTestId('alert-checkbox')[1]);
    
    // Click bulk action button
    fireEvent.click(screen.getByTestId('bulk-action-button'));
    
    // Select 'Acknowledge' from dropdown
    fireEvent.click(screen.getByText('Acknowledge Selected'));
    
    // Verify the callback was called with the correct alert IDs
    expect(mockBulkAcknowledgeCallback).toHaveBeenCalledWith([mockAlerts[0].id, mockAlerts[1].id]);
  });
}); 