const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Add mocks for Clerk modules that cause issues
    '^@clerk/backend$': '<rootDir>/src/__tests__/mocks/clerk-backend.js',
    '^@clerk/nextjs$': '<rootDir>/src/__tests__/mocks/clerk-nextjs.js',
    // Map msw/node to msw for JSDOM environment
    '^msw/node$': 'msw',
  },
  // ADDED: transform entry for .mjs files
  transform: {
    '^.+\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/__tests__/mocks/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/e2e/'
  ],
  // MODIFIED: transformIgnorePatterns with the new regex and correct syntax
  transformIgnorePatterns: [
    '/node_modules/(?!.*(esm|es6)/)', // This is a common pattern to include esm modules
    '^.+\.module\.(css|sass|scss)$'
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/e2e/'
  ],
};

module.exports = createJestConfig(customJestConfig);