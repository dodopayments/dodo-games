// Playwright configuration for the Dodo Games quality-revamp verification harness.
//
// Projects mirror the § Verification Strategy device matrix:
//   - desktop     1280x800
//   - mobile-390  390x844  (touch, deviceScaleFactor 2)  <- primary mobile gate + DPI
//   - mobile-360  360x640  (touch, deviceScaleFactor 2)  <- smallest supported viewport
//
// Videos are recorded for every test (`use.video = 'on'`) so a human-reviewable
// recording always exists; the game-suite additionally records dedicated,
// named gameplay sessions (gameplay-desktop.webm / gameplay-mobile.webm) into
// each game's evidence directory.
//
// The webServer builds `dist/` then serves it statically on :4173. If a server
// is already listening there (fast local iteration) it is reused.
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { EVIDENCE_ROOT, BASE_URL, SERVE_PORT } from './tests/harness/paths.mjs';

export default defineConfig({
  testDir: './tests',
  // Every Playwright artifact (traces, per-test videos, failure screenshots)
  // lands under the evidence tree for this task.
  outputDir: path.join(EVIDENCE_ROOT, '_playwright-artifacts'),

  // Games are heavy on rAF loops + real audio contexts; keep generous timeouts.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  // Never silently pass a `.only` left in a spec; be strict in CI.
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['json', { outputFile: path.join(EVIDENCE_ROOT, '_report', 'results.json') }],
    ['html', { open: 'never', outputFolder: path.join(EVIDENCE_ROOT, '_report', 'html') }],
  ],

  use: {
    baseURL: BASE_URL,
    // Videos required by the plan — recorded for every test.
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    // Build then statically serve dist/. `serve` is a devDependency.
    command: `node build.js && npx serve dist -l ${SERVE_PORT} --no-clipboard`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
