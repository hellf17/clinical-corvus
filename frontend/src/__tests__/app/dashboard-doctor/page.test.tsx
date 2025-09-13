import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard-doctor/page';

// Mock UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      data-testid="button"
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn(),
    userId: 'test-user-id',
  }),
}));

describe('Dashboard Doctor Page', () => {
  it('renders the dashboard layout', () => {
    render(<DashboardPage />);
    
    // Check that the main container is rendered
    expect(screen.getByText('Clinical Validation Dashboard')).toBeInTheDocument();
    
    // Check main container with correct classes
    const mainContainer = document.querySelector('.w-full.max-w-7xl.mx-auto.space-y-6');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('w-full', 'max-w-7xl', 'mx-auto', 'space-y-6');
  });
});