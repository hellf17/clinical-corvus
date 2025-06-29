import { useAuthStore, type User, type UserRole } from '@/store/authStore';
import { authAPI } from '@/lib/api';

// Mock API module
jest.mock('@/lib/api', () => ({
  authAPI: {
    login: jest.fn(),
    googleLogin: jest.fn(),
    logout: jest.fn(),
    getStatus: jest.fn(),
    setRole: jest.fn(),
    updateProfile: jest.fn(),
  }
}));

describe('authStore', () => {
  // Clear all mocks and reset store before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  // Test initial state
  it('should initialize with default values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  // Test login success
  it('should update state after successful login', async () => {
    const mockUser = {
      user_id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'doctor',
      avatar: 'avatar.jpg'
    };

    // Mock API response
    (authAPI.login as jest.Mock).mockResolvedValue({
      data: { user: mockUser }
    });

    // Execute login action
    await useAuthStore.getState().login('test@example.com', 'password');

    // Verify API was called with correct params
    expect(authAPI.login).toHaveBeenCalledWith('test@example.com', 'password');

    // Check store state after login
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'doctor',
      avatar: 'avatar.jpg'
    });
  });

  // Test login failure
  it('should handle login failure', async () => {
    // Mock API error response
    const errorMessage = 'Invalid credentials';
    (authAPI.login as jest.Mock).mockRejectedValue({
      response: { data: { detail: errorMessage } }
    });

    // Execute login action
    await useAuthStore.getState().login('test@example.com', 'wrong-password');

    // Check store state after failed login
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(errorMessage);
    expect(state.user).toBeNull();
  });

  // Test logout
  it('should clear auth state after logout', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' as UserRole },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // Mock successful logout
    (authAPI.logout as jest.Mock).mockResolvedValue({});

    // Execute logout action
    await useAuthStore.getState().logout();

    // Verify API was called
    expect(authAPI.logout).toHaveBeenCalled();

    // Check store state after logout
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  // Test setRole
  it('should update user role', async () => {
    // Set initial state with user
    const initialUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'doctor' as UserRole };
    useAuthStore.setState({
      user: initialUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // Mock successful role update
    (authAPI.setRole as jest.Mock).mockResolvedValue({});

    // Execute setRole action
    await useAuthStore.getState().setRole('patient' as UserRole);

    // Verify API was called with correct params
    expect(authAPI.setRole).toHaveBeenCalledWith('patient');

    // Check store state after role update
    const state = useAuthStore.getState();
    expect(state.user?.role).toBe('patient');
    expect(state.isLoading).toBe(false);
  });

  // Test updateUser
  it('should update user data', () => {
    // Set initial state with user
    const initialUser = { 
      id: '1', 
      name: 'Test User', 
      email: 'test@example.com', 
      role: 'doctor' as UserRole 
    };
    
    useAuthStore.setState({
      user: initialUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // Execute updateUser action
    useAuthStore.getState().updateUser({ 
      name: 'Updated Name',
      avatar: 'new-avatar.jpg'
    });

    // Check store state after update
    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      ...initialUser,
      name: 'Updated Name',
      avatar: 'new-avatar.jpg'
    });
  });

  // Test checkAuthStatus
  it('should update state after checking auth status', async () => {
    // Mock successful auth status response
    const mockUser = {
      user_id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'doctor',
      avatar: 'avatar.jpg'
    };
    
    (authAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { 
        is_authenticated: true,
        user: mockUser
      }
    });

    // Execute checkAuthStatus action
    await useAuthStore.getState().checkAuthStatus();

    // Verify API was called
    expect(authAPI.getStatus).toHaveBeenCalled();

    // Check store state after status check
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'doctor',
      avatar: 'avatar.jpg'
    });
  });
}); 