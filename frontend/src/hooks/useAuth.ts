import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user';

export const useAuth = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    setRole,
    clearError,
    checkAuthStatus
  } = useAuthStore();

  // Check auth status when the hook is initialized
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Handle authenticated login with redirect
  const handleLogin = useCallback(async (email: string, password: string, redirectPath?: string) => {
    try {
      await login(email, password);
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [login, router]);

  // Handle logout with redirect
  const handleLogout = useCallback(async (redirectPath: string = '/auth/login') => {
    await logout();
    router.push(redirectPath);
  }, [logout, router]);

  // Redirect if not authenticated
  const requireAuth = useCallback((redirectPath: string = '/auth/login') => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectPath);
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect if already authenticated
  const redirectIfAuthenticated = useCallback((redirectPath: string = '/dashboard') => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectPath);
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if user has required role
  const hasRole = useCallback((requiredRole: UserRole | UserRole[]) => {
    if (!user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  }, [user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    loginWithGoogle,
    logout: handleLogout,
    updateUser,
    setRole,
    clearError,
    requireAuth,
    redirectIfAuthenticated,
    hasRole
  };
}; 