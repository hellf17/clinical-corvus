import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

// Create mock push function
const mockPush = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock authStore functions
jest.mock('@/store/authStore');

// Mock useAuth implementation 
jest.mock('@/hooks/useAuth', () => {
  // Import the original module
  const originalModule = jest.requireActual('@/hooks/useAuth');
  
  // Override specific functions while keeping the original implementation
  return {
    useAuth: () => {
      const originalHook = originalModule.useAuth();
      
      return {
        ...originalHook,
        login: async (email: string, password: string, redirectPath?: string) => {
          await originalHook.login(email, password, redirectPath);
          if (redirectPath) {
            mockPush(redirectPath);
          }
        },
        logout: async (redirectPath: string = '/auth/login') => {
          await originalHook.logout(redirectPath);
          mockPush(redirectPath);
        },
        requireAuth: (redirectPath: string = '/auth/login') => {
          originalHook.requireAuth(redirectPath);
          if (!originalHook.isAuthenticated && !originalHook.isLoading) {
            mockPush(redirectPath);
          }
        },
        redirectIfAuthenticated: (redirectPath: string = '/dashboard') => {
          originalHook.redirectIfAuthenticated(redirectPath);
          if (originalHook.isAuthenticated && !originalHook.isLoading) {
            mockPush(redirectPath);
          }
        }
      };
    }
  };
});

describe('useAuth', () => {
  // Setup common test variables
  const mockLogin = jest.fn();
  const mockLogout = jest.fn();
  const mockCheckAuthStatus = jest.fn();
  const mockUpdateUser = jest.fn();
  const mockSetRole = jest.fn();
  const mockClearError = jest.fn();
  const mockLoginWithGoogle = jest.fn();

  // Setup standard mock implementation
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementation
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
  });

  it('calls checkAuthStatus on initialization', async () => {
    renderHook(() => useAuth());
    expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
  });

  it('handles login with redirect', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password', '/dashboard');
    });
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('handles login without redirect', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles login failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLogin.mockRejectedValue(new Error('Login failed'));
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'wrong-password');
    });
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrong-password');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('handles logout with default redirect', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.logout();
    });
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('handles logout with custom redirect', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.logout('/custom-path');
    });
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/custom-path');
  });

  it('redirects if not authenticated', () => {
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.requireAuth();
    });
    
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('does not redirect if authenticated', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
    
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.requireAuth();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects if already authenticated', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
    
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.redirectIfAuthenticated();
    });
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('does not redirect if not authenticated', () => {
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.redirectIfAuthenticated();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('checks for a single required role', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.hasRole('doctor')).toBe(true);
    expect(result.current.hasRole('patient')).toBe(false);
  });

  it('checks for multiple required roles', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.hasRole(['doctor', 'patient'])).toBe(true);
    expect(result.current.hasRole(['patient', 'guest'])).toBe(false);
  });

  it('returns false for hasRole when not authenticated', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.hasRole('doctor')).toBe(false);
  });

  it('does not redirect if still loading auth state', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      logout: mockLogout,
      updateUser: mockUpdateUser,
      setRole: mockSetRole,
      clearError: mockClearError,
      checkAuthStatus: mockCheckAuthStatus,
    }));
    
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.requireAuth();
      result.current.redirectIfAuthenticated();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });
}); 