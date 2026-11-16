import { defineConfig, devices } from '@playwright/test';

// Build first. Verifies the reset entry with production analytics enabled in Vite.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'user-invitations.spec.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
  },
});
