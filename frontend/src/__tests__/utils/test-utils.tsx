import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that can include providers if needed
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

/**
 * Mock file creation helper
 */
export const createMockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/**
 * Mock the window.matchMedia function for tests
 */
export const setupMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

/**
 * Type for mock fetch responses
 */
interface MockResponse {
  ok: boolean;
  json: () => Promise<any>;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

interface MockResponses {
  [key: string]: MockResponse;
}

/**
 * Mock fetch implementation for testing
 */
export const setupFetchMock = (customResponses: MockResponses = {}) => {
  const defaultResponses: MockResponses = {
    'api/auth/login': {
      ok: true,
      json: async () => ({
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'doctor'
        },
        token: 'mock-token'
      })
    },
    'api/patients': {
      ok: true,
      json: async () => ([{
        id: '1',
        name: 'Test Patient',
        dateOfBirth: '1980-01-01',
        gender: 'male'
      }])
    },
    'api/analyze/upload': {
      ok: true,
      json: async () => ({
        exam_date: '2023-03-01',
        results: [
          {
            id: 'result-1',
            test_name: 'Hemoglobina',
            value_numeric: 11.2,
            unit: 'g/dL',
            reference_range_low: 12,
            reference_range_high: 16
          }
        ]
      })
    }
  };
  
  const responses: MockResponses = { ...defaultResponses, ...customResponses };
  
  global.fetch = jest.fn().mockImplementation((url: string) => {
    // Find the matching response based on URL substring
    const matchingKey = Object.keys(responses).find(key => url.includes(key));
    
    if (matchingKey) {
      return Promise.resolve(responses[matchingKey]);
    }
    
    // Default fallback response
    return Promise.resolve({
      ok: true,
      json: async () => ({})
    });
  });
};

/**
 * Mock store hookss with default values
 */
export const mockStores = () => {
  jest.mock('@/store/patientStore', () => ({
    usePatientStore: jest.fn().mockReturnValue({
      patients: [],
      selectedPatientId: null,
      addPatient: jest.fn(),
      updatePatient: jest.fn(),
      selectPatient: jest.fn(),
      addExam: jest.fn()
    })
  }));
  
  jest.mock('@/store/authStore', () => ({
    useAuthStore: jest.fn().mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuthStatus: jest.fn()
    })
  }));
  
  jest.mock('@/store/uiStore', () => ({
    useUIStore: jest.fn().mockReturnValue({
      theme: 'light',
      language: 'pt-BR',
      isSidebarOpen: true,
      addNotification: jest.fn(),
      setTheme: jest.fn(),
      setLanguage: jest.fn(),
      toggleSidebar: jest.fn()
    })
  }));
  
  jest.mock('@/store/chatStore', () => ({
    useChatStore: jest.fn().mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: jest.fn(),
      clearMessages: jest.fn(),
      loadMessages: jest.fn()
    })
  }));
};

// Add a simple test to make Jest happy
describe('Test utilities', () => {
  it('createMockFile creates a file with the correct properties', () => {
    const mockFile = createMockFile('test-file.pdf', 'application/pdf', 2048);
    expect(mockFile.name).toBe('test-file.pdf');
    expect(mockFile.type).toBe('application/pdf');
    expect(mockFile.size).toBe(2048);
  });
  
  it('setupMatchMedia correctly mocks matchMedia', () => {
    setupMatchMedia();
    expect(window.matchMedia).toBeDefined();
    const result = window.matchMedia('(prefers-color-scheme: dark)');
    expect(result.matches).toBe(false);
  });
});

export * from '@testing-library/react';
export { customRender as render }; 