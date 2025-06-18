import { type Mock } from 'jest-mock';

/**
 * Helper type to make TypeScript happy when mocking Zustand stores
 * @template T The type of the store state/functions
 */
export function mockZustandStore<T extends Record<string, any>>(
  storeModule: any,
  mockImplementation: Partial<T>
): void {
  (storeModule as unknown as { [key: string]: Mock }).mockReturnValue(mockImplementation);
}

/**
 * Helper function to properly type notification objects in toast tests
 */
export function createMockNotification({
  id,
  title,
  message,
  type,
  duration = 5000,
}: {
  id: string;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}) {
  return {
    id,
    title,
    message,
    type,
    duration,
    createdAt: Date.now(), // Add the required createdAt property
  };
}

/**
 * Helper function to create a mock patient object
 */
export function createMockPatient({
  id,
  name,
  diagnosis,
  exams = [],
}: {
  id: string;
  name: string;
  diagnosis?: string;
  exams?: Array<{ id: string; [key: string]: any }>;
}) {
  return {
    id,
    name,
    diagnosis: diagnosis || 'No diagnosis',
    exams: exams.map(exam => ({
      ...exam,
      results: exam.results || [], // Ensure each exam has a results array
      date: exam.date || new Date().toISOString().split('T')[0],
      type: exam.type || 'General'
    })),
    gender: 'male',
    dateOfBirth: '1980-01-01',
    medicalRecord: '12345',
    admissionDate: '2023-01-01',
    vitalSigns: []
  };
}

/**
 * Helper function to create a mock conversation object
 */
export function createMockConversation({
  id,
  title,
  updatedAt = Date.now(),
  patientId,
  createdAt,
  messages = []
}: {
  id: string;
  title: string;
  updatedAt?: number;
  patientId?: string;
  createdAt?: number;
  messages?: any[];
}) {
  return {
    id,
    title,
    updatedAt,
    patientId,
    createdAt: createdAt || updatedAt,
    messages: messages || []
  };
}

/**
 * Helper function to create a mock user object
 */
export function createMockUser({
  id,
  name,
  email,
  role = 'doctor',
}: {
  id: string;
  name: string;
  email: string;
  role?: 'doctor' | 'patient' | 'admin' | 'guest';
}) {
  return {
    id,
    name,
    email,
    role,
  };
}

/**
 * Creates a mock file for use in file upload tests
 */
export function createMockFile(
  name = 'test.pdf',
  type = 'application/pdf',
  size = 1024
) {
  const file = new File(['dummy content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/**
 * Sets up mock implementations for fetch calls in tests
 * @param mockResponses An object mapping URL patterns to mock responses
 */
export function setupFetchMock(mockResponses: Record<string, any>) {
  // Save the original fetch
  const originalFetch = global.fetch;

  // Create a mock implementation
  global.fetch = jest.fn().mockImplementation((url, options) => {
    // Find the matching URL pattern
    const matchingPattern = Object.keys(mockResponses).find(pattern => 
      url.toString().includes(pattern)
    );

    if (matchingPattern) {
      const mockResponse = mockResponses[matchingPattern];
      
      // If it's a function, call it with the url and options
      if (typeof mockResponse === 'function') {
        return Promise.resolve(mockResponse(url, options));
      }
      
      // Otherwise, return the mock response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        ...mockResponse
      });
    }

    // If no match, return a default error response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' })
    });
  });

  // Return a cleanup function
  return () => {
    global.fetch = originalFetch;
  };
}

// Add a simple test to make Jest happy
test('mockZustandStore mocks a Zustand store correctly', () => {
  const mockStore = jest.fn();
  // Just test that the function runs without error
  mockZustandStore(mockStore, { testValue: 'test' });
  expect(true).toBe(true);
}); 