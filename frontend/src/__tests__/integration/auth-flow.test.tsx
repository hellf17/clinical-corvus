import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { mockZustandStore, createMockUser } from '@/__tests__/utils/test-utils';
import LoginPage from '@/app/auth/login/page';
import RoleSelectionPage from '@/app/auth/role/page';
import DashboardPage from '@/app/dashboard/page';
import AuthGuard from '@/components/providers/AuthGuard';

// Import the authAPI to mock it
const originalAuthAPI = jest.requireActual('@/lib/api');

// Mock required hooks and modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn()
}));

jest.mock('@/store/patientStore', () => ({
  usePatientStore: jest.fn(() => ({
    patients: [],
    selectedPatientId: null,
    selectPatient: jest.fn()
  }))
}));

jest.mock('@/store/chatStore', () => ({
  useChatStore: jest.fn(() => ({
    conversations: []
  }))
}));

jest.mock('@/store/uiStore', () => ({
  useUIStore: jest.fn(() => ({
    addNotification: jest.fn()
  }))
}));

// Mock authAPI separately in a way that it can be modified during tests
const mockGoogleLogin = jest.fn();
const mockGetStatus = jest.fn();
const mockLogout = jest.fn();
const mockSetRole = jest.fn((role: 'doctor' | 'patient' | 'guest' | 'admin') => {});

jest.mock('@/lib/api', () => ({
  authAPI: {
    googleLogin: () => mockGoogleLogin(),
    getStatus: () => mockGetStatus(),
    logout: () => mockLogout(),
    setRole: (role: 'doctor' | 'patient' | 'guest' | 'admin') => mockSetRole(role)
  }
}));

// Mock components
jest.mock('@/components/layout/MainLayout', () => {
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>;
  MockMainLayout.displayName = 'MockMainLayout';
  return MockMainLayout;
});

describe('Authentication Flow Integration', () => {
  // Setup common test elements
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: ''
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/');
  });
  
  it('completes the full authentication flow from login to dashboard', async () => {
    // Step 1: Initial unauthenticated state at login page
    (usePathname as jest.Mock).mockReturnValue('/auth/login');
    
    // Setup initial auth store state
    const authStoreMock = {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    };
    
    // Add mock login implementation
    const loginWithGoogleMock = jest.fn().mockImplementation(() => {
      // Update auth store directly in the next store mock
      return Promise.resolve();
    });
    
    mockZustandStore(useAuthStore, {
      ...authStoreMock,
      loginWithGoogle: loginWithGoogleMock
    });
    
    render(<LoginPage />);
    
    // Check we're on the login page
    expect(screen.getByText('Clinical Helper')).toBeInTheDocument();
    expect(screen.getByText('Faça login para acessar sua conta')).toBeInTheDocument();
    
    // Step 2: User clicks on Google login
    const googleButton = screen.getByText('Entrar com Google');
    fireEvent.click(googleButton);
    
    // Login with Google is triggered differently than in previous tests
    await waitFor(() => {
      expect(mockGoogleLogin).toHaveBeenCalled();
    });
    
    // Step 3: Mock successful authentication but without role
    const mockUser = createMockUser({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'guest'
    });
    
    const roleSetterMock = jest.fn().mockImplementation((role: 'doctor' | 'patient' | 'guest' | 'admin') => {
      mockUser.role = role;
      return Promise.resolve();
    });
    
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: mockUser,
      isLoading: false,
      error: null,
      setRole: roleSetterMock,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    });
    
    // Step 4: Render role selection page and verify redirection
    (usePathname as jest.Mock).mockReturnValue('/auth/role');
    render(<RoleSelectionPage />);
    
    // Verify we're on the role selection page
    expect(screen.getByText('Selecione seu perfil')).toBeInTheDocument();
    
    // Step 5: User selects a role
    const doctorButton = screen.getByText('Médico / Profissional de Saúde');
    fireEvent.click(doctorButton);
    
    // Verify setRole was called with 'doctor'
    expect(roleSetterMock).toHaveBeenCalledWith('doctor');
    
    // Step 6: Mock successful role assignment and redirection to dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
    
    // Step 7: Render dashboard with authenticated user
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: { ...mockUser, role: 'doctor' },
      isLoading: false,
      error: null,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    });
    
    render(<DashboardPage />);
    
    // Verify we're on the dashboard
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
  
  it('redirects unauthenticated users to login when accessing protected routes', async () => {
    // Setup AuthGuard with unauthenticated user
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockZustandStore(useAuthStore, {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    // Verify redirection to login page with redirect parameter
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?redirect=%2Fdashboard');
    });
  });
  
  it('redirects authenticated users without role to role selection', async () => {
    // Setup AuthGuard with authenticated user without role
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'guest'
      }),
      isLoading: false,
      error: null,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    // Verify redirection to role selection page
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/role');
    });
  });
  
  it('allows authenticated users with proper role to access protected content', async () => {
    // Setup AuthGuard with fully authenticated user
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'doctor'
      }),
      isLoading: false,
      error: null,
      checkAuthStatus: jest.fn().mockResolvedValue(undefined)
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    // Wait for loading state to finish before checking content
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
    
    // Verify protected content is rendered
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
}); 