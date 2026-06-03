import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['smoke.spec.js'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['list']],
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.TEST_URL || 'https://devops-quiz-2c930.web.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    hasTouch: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
  ],
})
