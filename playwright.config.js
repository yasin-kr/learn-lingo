import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      VITE_FIREBASE_API_KEY: 'test-only-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'learnlingo-test.firebaseapp.com',
      VITE_FIREBASE_DATABASE_URL:
        'https://learnlingo-test-default-rtdb.firebaseio.com',
      VITE_FIREBASE_PROJECT_ID: 'learnlingo-test',
      VITE_FIREBASE_APP_ID: '1:123456789:web:learnlingo-test',
    },
  },
});
