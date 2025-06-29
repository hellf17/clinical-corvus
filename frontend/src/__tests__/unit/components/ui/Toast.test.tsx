import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast, ToastContainer } from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';
import { createMockNotification, mockZustandStore } from '@/__tests__/utils/test-utils';

// Mock the uiStore
jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn()
}));

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders with success notification type', () => {
    const onCloseMock = jest.fn();
    const notification = createMockNotification({
      id: '1',
      title: 'Success Title',
      message: 'Success message content',
      type: 'success',
      duration: 3000
    });

    render(<Toast notification={notification} onClose={onCloseMock} />);
    
    // Check if title and message are rendered
    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success message content')).toBeInTheDocument();
    
    // Success toast should have green styling
    const toastElement = screen.getByText('Success Title').closest('div[class*="bg-green"]');
    expect(toastElement).toBeInTheDocument();
  });

  it('renders with error notification type', () => {
    const onCloseMock = jest.fn();
    const notification = createMockNotification({
      id: '2',
      title: 'Error Title',
      message: 'Error message content',
      type: 'error',
      duration: 3000
    });

    render(<Toast notification={notification} onClose={onCloseMock} />);
    
    // Check if title and message are rendered
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message content')).toBeInTheDocument();
    
    // Error toast should have red styling
    const toastElement = screen.getByText('Error Title').closest('div[class*="bg-red"]');
    expect(toastElement).toBeInTheDocument();
  });

  it('renders without title', () => {
    const onCloseMock = jest.fn();
    const notification = createMockNotification({
      id: '3',
      message: 'Message without title',
      type: 'info',
      duration: 3000,
      title: undefined // Explicitly set title to undefined
    });

    render(<Toast notification={notification} onClose={onCloseMock} />);
    
    // Check if only message is rendered
    expect(screen.getByText('Message without title')).toBeInTheDocument();
    
    // Title div should not exist - not just the text
    const messageElement = screen.getByText('Message without title');
    const parent = messageElement.parentElement;
    
    // There should be no elements with class containing "font-medium" (the class used for titles)
    expect(parent?.querySelector('.text-sm.font-medium')).toBeNull();
  });

  it('closes automatically after duration', () => {
    const onCloseMock = jest.fn();
    const notification = createMockNotification({
      id: '4',
      message: 'Auto-close message',
      type: 'info',
      duration: 1000
    });

    render(<Toast notification={notification} onClose={onCloseMock} />);
    
    // Before timeout, onClose should not be called
    expect(onCloseMock).not.toHaveBeenCalled();
    
    // Fast-forward time past the duration plus animation delay
    act(() => {
      jest.advanceTimersByTime(1300);
    });
    
    // After timeout, onClose should be called
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('closes when close button is clicked', () => {
    const onCloseMock = jest.fn();
    const notification = createMockNotification({
      id: '5',
      title: 'Close Button Test',
      message: 'Click to close',
      type: 'warning',
      duration: 5000
    });

    render(<Toast notification={notification} onClose={onCloseMock} />);
    
    // Find and click the close button - it has a span with "Fechar" as sr-only text
    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);
    
    // Advance timer for animation
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // onClose should be called
    expect(onCloseMock).toHaveBeenCalled();
  });
});

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders multiple notifications', () => {
    // Mock the useUIStore hook to return multiple notifications
    mockZustandStore(useUIStore, {
      notifications: [
        createMockNotification({
          id: '1',
          title: 'First Toast',
          message: 'First message',
          type: 'success',
          duration: 3000
        }),
        createMockNotification({
          id: '2',
          title: 'Second Toast',
          message: 'Second message',
          type: 'error',
          duration: 3000
        })
      ],
      removeNotification: jest.fn()
    });

    render(<ToastContainer />);
    
    // Both toasts should be rendered
    expect(screen.getByText('First Toast')).toBeInTheDocument();
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second Toast')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('calls removeNotification when a toast is closed', () => {
    const removeNotificationMock = jest.fn();
    
    // Mock the useUIStore hook
    mockZustandStore(useUIStore, {
      notifications: [
        createMockNotification({
          id: '1',
          title: 'Test Toast',
          message: 'Test message',
          type: 'info',
          duration: 1000
        })
      ],
      removeNotification: removeNotificationMock
    });

    render(<ToastContainer />);
    
    // Click the close button directly to ensure the event fires correctly
    const closeButton = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeButton);
    
    // Advance time for the animation delay
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // removeNotification should be called with the notification id
    expect(removeNotificationMock).toHaveBeenCalledWith('1');
  });

  it('renders empty container when no notifications', () => {
    // Mock the useUIStore hook to return empty notifications
    mockZustandStore(useUIStore, {
      notifications: [],
      removeNotification: jest.fn()
    });

    const { container } = render(<ToastContainer />);
    
    // The container should be empty (except for the outer div)
    expect(container.firstChild?.childNodes.length).toBe(0);
  });
}); 