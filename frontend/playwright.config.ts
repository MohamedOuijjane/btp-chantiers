import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout sur la stack Docker complète (via la gateway), voir e2e/README.md.
 * E2E_URL : adresse de la gateway (http://localhost:8080 par défaut).
 * DEMO_MOT_DE_PASSE : mot de passe des comptes de démo (celui du .env).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:8080',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
