import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 45000,
  expect: { timeout: 12000 },
  use: { baseURL: 'http://127.0.0.1:4312', channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'postman simulation run postman/simulations/financas.sim.yaml --port 4310 --no-history --output ndjson > .angular/simulation.ndjson', url: 'http://127.0.0.1:4310/financas/api/auth/me', timeout: 30000 },
    { command: 'node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4312 --proxy-config tests/e2e/proxy.conf.json', url: 'http://127.0.0.1:4312', timeout: 60000 },
  ],
});
