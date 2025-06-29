import '@testing-library/jest-dom';
// Temporarily comment out MSW server setup
// import { server } from './src/__tests__/mocks/server';

// // Start MSW Server before tests
// beforeAll(() => server.listen());

// // Reset handlers between tests
// afterEach(() => server.resetHandlers());

// // Clean up after tests
// afterAll(() => server.close());

// Add TextEncoder and TextDecoder for MSW
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Add Response for MSW
if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.init = init;
      this.status = init.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = init.statusText || '';
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Mock next/router
jest.mock('next/router', () => require('next-router-mock'));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      pathname: '/',
      query: {},
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock window.matchMedia
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