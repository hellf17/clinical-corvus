import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
  timeout: 60000, // 60 seconds
});
