import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/auth/login/page';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { mockZustandStore } from '@/__tests__/utils/test-utils';

// Mock the auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn()
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/auth/login'
  })
}));

// Mock the API module
jest.mock('@/lib/api', () => ({
  authAPI: {
    googleLogin: jest.fn(),
  }
}));

// Mock Button component
jest.mock('@/components/ui/Button', () => {
  const MockButton = ({ 
    children, 
    onClick, 
    isLoading, 
    variant, 
    className, 
    ...props 
  }: { 
    children: React.ReactNode;
    onClick?: () => void;
    isLoading?: boolean;
    variant?: string;
    className?: string;
    [key: string]: any;
  }) => (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={className}
      {...props}
    >
      {children}
      {isLoading && ' Loading...'}
    </button>
  );
  MockButton.displayName = 'MockButton';
  return {
    __esModule: true,
    Button: MockButton
  };
});

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  );
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth store with default values
    mockZustandStore(useAuthStore, {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      error: null,
      clearError: jest.fn(),
      isLoading: false
    });
  });

  it('renders login page with title and description', () => {
    render(<LoginPage />);
    
    // Check for page title and description
    expect(screen.getByText('Clinical Helper')).toBeInTheDocument();
    expect(screen.getByText('Faça login para acessar sua conta')).toBeInTheDocument();
    
    // Check for Google login button
    expect(screen.getByText('Entrar com Google')).toBeInTheDocument();
    
    // Check for home page link
    expect(screen.getByText('Voltar para a página inicial')).toBeInTheDocument();
  });

  it('displays error message when there is an auth error', () => {
    // Mock auth store with error
    mockZustandStore(useAuthStore, {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      error: 'Credenciais inválidas',
      clearError: jest.fn(),
      isLoading: false
    });
    
    render(<LoginPage />);
    
    // Check for error message
    expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
  });

  it('calls clearError when close button is clicked', () => {
    const clearErrorMock = jest.fn();
    
    // Mock auth store with error
    mockZustandStore(useAuthStore, {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      error: 'Credenciais inválidas',
      clearError: clearErrorMock,
      isLoading: false
    });
    
    render(<LoginPage />);
    
    // Click the close button (× symbol)
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    // Check if clearError was called
    expect(clearErrorMock).toHaveBeenCalled();
  });

  it('calls googleLogin when Google button is clicked', () => {
    render(<LoginPage />);
    
    // Click the Google login button
    const googleButton = screen.getByText('Entrar com Google');
    fireEvent.click(googleButton);
    
    // Check if googleLogin API method was called
    expect(authAPI.googleLogin).toHaveBeenCalled();
  });

  it('disables the login button during loading state', () => {
    // Mock auth store with loading state
    mockZustandStore(useAuthStore, {
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      error: null,
      clearError: jest.fn(),
      isLoading: true
    });
    
    render(<LoginPage />);
    
    // Check that the button has the loading indicator
    // Use a function matcher to find the text even if it has Loading... appended to it
    const loginButton = screen.getByText((content: any, element: any) => {
      return content.includes('Entrar com Google');
    });
    expect(loginButton.closest('button')).toHaveAttribute('disabled');
  });

  it('provides a link back to home page', () => {
    render(<LoginPage />);
    
    // Check that the home link exists and points to the right place
    const homeLink = screen.getByText('Voltar para a página inicial');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
}); 