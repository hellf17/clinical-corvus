import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// MSW Server setup for API mocking
let server;

// Dynamically import and setup MSW server if available
beforeAll(async () => {
  try {
    const { server: mockServer } = await import('./src/__tests__/mocks/server');
    server = mockServer;
    server.listen();
  } catch (error) {
    // MSW server not available, tests will run without it
    console.warn('MSW server not available, running tests without API mocking:', error.message);
  }
});

// Reset handlers between tests
afterEach(() => {
  if (server) {
    server.resetHandlers();
  }
});

// Clean up after tests
afterAll(() => {
  if (server) {
    server.close();
  }
});

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

// Fix for Radix UI compatibility with JSDOM
// Add missing hasPointerCapture method to HTMLElement
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: jest.fn().mockReturnValue(false),
});

// Add missing scrollIntoView method to Element
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  writable: true,
  value: jest.fn(),
});

// Mock PointerEvent for Radix UI
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId || 1;
    this.pointerType = init.pointerType || 'mouse';
    this.isPrimary = init.isPrimary !== false;
  }
};