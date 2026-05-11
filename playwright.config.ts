import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — E2E 시연 검증용.
 * dev 서버는 이미 외부에서 띄워둔 상태로 가정 (port 3032).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3032',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
