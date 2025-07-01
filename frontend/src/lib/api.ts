import axios from 'axios';
import { getAPIUrl } from '@/config';
import Cookies from 'js-cookie';

// Create axios instance with common configuration
const api = axios.create({
  baseURL: getAPIUrl() + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('session');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized errors
    if (error.response && error.response.status === 401) {
      // Redirect to login page or refresh token
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API functions
export const authAPI = {
  // Get current auth status
  getStatus: () => api.get('/auth/status'),
  
  // Manual login (if needed)
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  // Start Google OAuth flow
  googleLogin: () => {
    window.location.href = `${api.defaults.baseURL}/auth/google/login`;
  },
  
  // Logout
  logout: () => api.post('/auth/logout'),
  
  // Update user profile
  updateProfile: (data: any) => api.put('/auth/profile', data),
  
  // Set user role
  setRole: (role: string) => api.post('/auth/role', { role })
}; 