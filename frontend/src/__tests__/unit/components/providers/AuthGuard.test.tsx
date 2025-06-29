import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthGuard from '@/components/providers/AuthGuard';
import { useAuthStore } from '@/store/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { mockZustandStore, createMockUser } from '@/__tests__/utils/test-utils';

// Mock the auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn()
}));

// Mock the router and pathname
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}));

describe('AuthGuard', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn()
  };
  
  const mockCheckAuthStatus = jest.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });
  
  it('shows loading state while checking authentication', async () => {
    // Mock auth store with loading state
    mockZustandStore(useAuthStore, {
      isAuthenticated: false,
      user: null,
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: true
    });
    
    await act(async () => {
      render(
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      );
    });
    
    // Should show loading spinner using the data-testid we added
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    
    // Protected content should not be shown
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
  
  it('redirects to login if user is not authenticated', async () => {
    // Mock auth store with unauthenticated state
    mockZustandStore(useAuthStore, {
      isAuthenticated: false,
      user: null,
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: false
    });
    
    await act(async () => {
      render(
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      );
    });
    
    // Should redirect to login
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?redirect=%2Fdashboard');
  });
  
  it('redirects to role selection if user has no role', async () => {
    // Mock auth store with authenticated user but no role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: false
    });
    
    await act(async () => {
      render(
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      );
    });
    
    // Should redirect to role selection
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/role');
  });
  
  it('redirects to unauthorized if user role is not allowed', async () => {
    // Mock auth store with authenticated user with patient role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'patient' 
      }),
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: false
    });
    
    // Render with only doctor role allowed
    await act(async () => {
      render(
        <AuthGuard allowedRoles={['doctor']}>
          <div>Protected content</div>
        </AuthGuard>
      );
    });
    
    // Should redirect to unauthorized
    expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
  });
  
  it('renders children when user is authenticated with allowed role', async () => {
    // Mock auth store with authenticated user with doctor role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'doctor' 
      }),
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: false
    });
    
    await act(async () => {
      render(
        <AuthGuard allowedRoles={['doctor', 'patient']}>
          <div>Protected content</div>
        </AuthGuard>
      );
    });
    
    // Should not redirect
    expect(mockRouter.push).not.toHaveBeenCalled();
    
    // Protected content should be shown
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
  
  it('does not redirect from role selection page when user has no role', async () => {
    // Mock pathname to be the role selection page
    (usePathname as jest.Mock).mockReturnValue('/auth/role');
    
    // Mock auth store with authenticated user but no role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      checkAuthStatus: mockCheckAuthStatus,
      isLoading: false
    });
    
    await act(async () => {
      render(
        <AuthGuard allowedRoles={['doctor', 'patient', 'guest']}>
          <div>Role selection content</div>
        </AuthGuard>
      );
    });
    
    // Should not redirect since we're already on the role selection page
    expect(mockRouter.push).not.toHaveBeenCalled();
    
    // Role selection content should be shown
    expect(screen.getByText('Role selection content')).toBeInTheDocument();
  });
}); 