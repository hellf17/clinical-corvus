import axios from 'axios';
import Cookies from 'js-cookie';

// Mock Cookies.get
(Cookies.get as jest.Mock) = jest.fn();

// Define type for our mock axios
interface MockAxios {
  create: jest.Mock;
  interceptors: {
    request: {
      use: jest.Mock;
      successHandler: any;
      errorHandler: any;
    },
    response: {
      use: jest.Mock;
      successHandler: any;
      errorHandler: any;
    }
  };
  defaults: { baseURL: string };
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
}

// Mock axios.create to return a mock axios instance
jest.mock('axios', () => {
  const mockAxios: MockAxios = {
    create: jest.fn().mockReturnThis(),
    interceptors: {
      request: { 
        use: jest.fn((successFn, errorFn) => {
          // Store the functions for testing
          mockAxios.interceptors.request.successHandler = successFn;
          mockAxios.interceptors.request.errorHandler = errorFn;
        }),
        successHandler: null,
        errorHandler: null
      },
      response: { 
        use: jest.fn((successFn, errorFn) => {
          // Store the functions for testing
          mockAxios.interceptors.response.successHandler = successFn;
          mockAxios.interceptors.response.errorHandler = errorFn;
        }),
        successHandler: null,
        errorHandler: null
      }
    },
    defaults: { baseURL: 'http://backend-api:8000/api' },
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({})
  };
  return mockAxios;
});

// Import the real module which will use our mocks
import api, { authAPI } from '@/lib/api';

describe('API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up a simple window.location mock
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true
    });
  });
  
  describe('Request Interceptor', () => {
    it('adds auth token to request headers when token exists', () => {
      // Setup - mock Cookies.get to return a token
      (Cookies.get as jest.Mock).mockReturnValue('test-token');
      
      // Create a test config
      const config = { headers: {} };
      
      // Call the interceptor success handler
      const result = (axios as any).interceptors.request.successHandler(config);
      
      // Assert that the token was added to the config
      expect(result.headers['Authorization']).toBe('Bearer test-token');
      expect(Cookies.get).toHaveBeenCalledWith('session');
    });
    
    it('does not add auth token when no token exists', () => {
      // Setup - mock Cookies.get to return null
      (Cookies.get as jest.Mock).mockReturnValue(null);
      
      // Create a test config
      const config = { headers: {} };
      
      // Call the interceptor success handler
      const result = (axios as any).interceptors.request.successHandler(config);
      
      // Assert that no token was added
      expect(result.headers['Authorization']).toBeUndefined();
      expect(Cookies.get).toHaveBeenCalledWith('session');
    });
  });
  
  describe('Response Interceptor', () => {
    it('redirects to login on 401 error', async () => {
      // Create a test error with 401 response
      const error = {
        response: {
          status: 401
        }
      };
      
      // Mock the Promise.reject to avoid unhandled rejection
      const mockPromiseReject = jest.fn();
      global.Promise.reject = mockPromiseReject;
      
      // Call the error handler
      (axios as any).interceptors.response.errorHandler(error);
      
      // Assert that we redirected to login
      expect(window.location.href).toBe('/auth/login');
      expect(mockPromiseReject).toHaveBeenCalledWith(error);
    });
    
    it('does not redirect on non-401 errors', () => {
      // Create a test error with non-401 response
      const error = {
        response: {
          status: 500
        }
      };
      
      // Mock the Promise.reject to avoid unhandled rejection
      const mockPromiseReject = jest.fn();
      global.Promise.reject = mockPromiseReject;
      
      // Call the error handler
      (axios as any).interceptors.response.errorHandler(error);
      
      // Assert that we did not redirect
      expect(window.location.href).not.toBe('/auth/login');
      expect(mockPromiseReject).toHaveBeenCalledWith(error);
    });
  });
  
  describe('Auth API Functions', () => {
    // Test the mocked functions directly
    it('authAPI functions should be defined', () => {
      expect(authAPI.getStatus).toBeDefined();
      expect(authAPI.login).toBeDefined();
      expect(authAPI.googleLogin).toBeDefined();
      expect(authAPI.logout).toBeDefined();
      expect(authAPI.updateProfile).toBeDefined();
      expect(authAPI.setRole).toBeDefined();
    });
    
    // A simple test that we can call each function
    it('can call the API functions', () => {
      // Just verify we can call these functions without error
      authAPI.getStatus();
      authAPI.login('email', 'password');
      authAPI.googleLogin();
      authAPI.logout();
      authAPI.updateProfile({});
      authAPI.setRole('doctor');
      
      // No assertions needed, just checking they don't throw
      expect(true).toBe(true);
    });
  });
}); 