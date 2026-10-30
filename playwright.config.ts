import { defineConfig, devices } from '@playwright/test';

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'file:./test.db?connection_limit=1&socket_timeout=60';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npx next start -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ||
        'file:./test.db?connection_limit=1&socket_timeout=60',
    },
  },
});
