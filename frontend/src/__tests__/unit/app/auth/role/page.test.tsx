import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleSelectionPage from '@/app/auth/role/page';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { mockZustandStore, createMockUser } from '@/__tests__/utils/test-utils';

// Mock the auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn()
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('RoleSelectionPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/auth/role'
  };
  
  const mockSetRole = jest.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('redirects to login if user is not authenticated', () => {
    // Mock auth store with unauthenticated state
    mockZustandStore(useAuthStore, {
      isAuthenticated: false,
      user: null,
      setRole: mockSetRole
    });

    render(<RoleSelectionPage />);

    // Check that router.push was called with login path
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to dashboard if user already has a role', () => {
    // Mock auth store with authenticated user with role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'doctor' 
      }),
      setRole: mockSetRole
    });

    render(<RoleSelectionPage />);

    // Check that router.push was called with dashboard path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('renders role selection buttons for authenticated user without role', () => {
    // Mock auth store with authenticated user without role (guest)
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      setRole: mockSetRole
    });

    render(<RoleSelectionPage />);

    // Check that the component renders correctly
    expect(screen.getByText('Selecione seu perfil')).toBeInTheDocument();
    expect(screen.getByText('Médico / Profissional de Saúde')).toBeInTheDocument();
    expect(screen.getByText('Paciente')).toBeInTheDocument();
  });

  it('calls setRole with "doctor" when doctor button is clicked', async () => {
    // Mock auth store with authenticated user without role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      setRole: mockSetRole
    });

    render(<RoleSelectionPage />);

    // Click the doctor button
    const doctorButton = screen.getByText('Médico / Profissional de Saúde');
    fireEvent.click(doctorButton);

    // Check that setRole was called with 'doctor'
    expect(mockSetRole).toHaveBeenCalledWith('doctor');
    
    // Wait for the router push
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('calls setRole with "patient" when patient button is clicked', async () => {
    // Mock auth store with authenticated user without role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      setRole: mockSetRole
    });

    render(<RoleSelectionPage />);

    // Click the patient button
    const patientButton = screen.getByText('Paciente');
    fireEvent.click(patientButton);

    // Check that setRole was called with 'patient'
    expect(mockSetRole).toHaveBeenCalledWith('patient');
    
    // Wait for the router push
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles error case when setRole fails', async () => {
    // Mock setRole to reject
    const mockSetRoleWithError = jest.fn().mockRejectedValue(new Error('Role setting failed'));
    
    // Mock console.error to prevent error logging in tests
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock auth store with authenticated user without role
    mockZustandStore(useAuthStore, {
      isAuthenticated: true,
      user: createMockUser({ 
        id: '1', 
        name: 'Test User', 
        email: 'test@example.com',
        role: 'guest' 
      }),
      setRole: mockSetRoleWithError
    });

    render(<RoleSelectionPage />);

    // Click the doctor button
    const doctorButton = screen.getByText('Médico / Profissional de Saúde');
    fireEvent.click(doctorButton);

    // Check that setRole was called
    expect(mockSetRoleWithError).toHaveBeenCalledWith('doctor');
    
    // Wait for the error to be logged
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    
    // Check that we did not navigate
    expect(mockRouter.push).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
}); 