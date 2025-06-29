import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '@/components/layout/MainLayout';
import { usePathname } from 'next/navigation';

// Mock the components and hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}));

jest.mock('@/components/layout/Header', () => {
  const MockHeader = () => <div data-testid="header">Header Component</div>;
  MockHeader.displayName = 'MockHeader';
  return MockHeader;
});

jest.mock('@/components/layout/ChatFloatingButton', () => {
  const MockChatFloatingButton = () => <div data-testid="chat-floating-button">Chat Button</div>;
  MockChatFloatingButton.displayName = 'MockChatFloatingButton';
  return MockChatFloatingButton;
});

jest.mock('@/components/providers/AuthGuard', () => {
  const MockAuthGuard = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => (
    <div data-testid="auth-guard" data-roles={allowedRoles?.join(',')}>
      {children}
    </div>
  );
  MockAuthGuard.displayName = 'MockAuthGuard';
  return MockAuthGuard;
});

describe('MainLayout', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the layout with header, main content, and footer', () => {
    // Mock non-public path to test with auth guard
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    
    render(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );
    
    // Check that header is rendered
    expect(screen.getByTestId('header')).toBeInTheDocument();
    
    // Check that content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    
    // Check that footer is rendered
    expect(screen.getByText(`© ${new Date().getFullYear()} Dr. Corvus. Todos os direitos reservados.`)).toBeInTheDocument();
    
    // Check that chat button is rendered by default
    expect(screen.getByTestId('chat-floating-button')).toBeInTheDocument();
    
    // Check that auth guard is used
    expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
  });
  
  it('does not wrap content with AuthGuard for public paths', () => {
    // Mock public path
    (usePathname as jest.Mock).mockReturnValue('/auth/login');
    
    render(
      <MainLayout>
        <div>Public Content</div>
      </MainLayout>
    );
    
    // Auth guard should not be used
    expect(screen.queryByTestId('auth-guard')).not.toBeInTheDocument();
    
    // Content should be rendered directly
    expect(screen.getByText('Public Content')).toBeInTheDocument();
  });
  
  it('hides the chat button when showChatButton is false', () => {
    // Mock non-public path
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    
    render(
      <MainLayout showChatButton={false}>
        <div>Test Content</div>
      </MainLayout>
    );
    
    // Chat button should not be rendered
    expect(screen.queryByTestId('chat-floating-button')).not.toBeInTheDocument();
  });
  
  it('respects explicit requireAuth parameter', () => {
    // Mock public path, but explicitly require auth
    (usePathname as jest.Mock).mockReturnValue('/auth/login');
    
    render(
      <MainLayout requireAuth={true}>
        <div>Protected Content</div>
      </MainLayout>
    );
    
    // Auth guard should be used despite public path
    expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
  });
  
  it('passes allowedRoles to AuthGuard', () => {
    // Mock non-public path
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    
    render(
      <MainLayout allowedRoles={['doctor']}>
        <div>Doctor Only Content</div>
      </MainLayout>
    );
    
    // Auth guard should have doctor role only
    const authGuard = screen.getByTestId('auth-guard');
    expect(authGuard).toHaveAttribute('data-roles', 'doctor');
  });
  
  it('does not require auth for explicitly marked public content', () => {
    // Mock non-public path
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    
    render(
      <MainLayout requireAuth={false}>
        <div>Public Dashboard Content</div>
      </MainLayout>
    );
    
    // Auth guard should not be used
    expect(screen.queryByTestId('auth-guard')).not.toBeInTheDocument();
  });
  
  it('treats unknown paths as requiring authentication', () => {
    // Mock an unknown path
    (usePathname as jest.Mock).mockReturnValue('/some-random-path');
    
    render(
      <MainLayout>
        <div>Protected Content</div>
      </MainLayout>
    );
    
    // Auth guard should be used
    expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
  });
  
  it('treats paths starting with /auth/ as public', () => {
    // Mock a path in the auth directory
    (usePathname as jest.Mock).mockReturnValue('/auth/reset-password');
    
    render(
      <MainLayout>
        <div>Auth Content</div>
      </MainLayout>
    );
    
    // Auth guard should not be used
    expect(screen.queryByTestId('auth-guard')).not.toBeInTheDocument();
  });
}); 