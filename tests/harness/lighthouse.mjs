// tests/harness/lighthouse.mjs
//
// Assertion #9 (Performance) — implemented separately because Lighthouse is slow
// and launches its own Chrome via CDP. Wired as an OPT-IN spec: game lighthouse
// specs live at tests/games/{slug}.lighthouse.spec.mjs and skip unless
// RUN_LIGHTHOUSE=1 is set.
//
// Usage in a spec:
//   import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
//   import config from './dodo-pong.config.mjs';
//   defineLighthouseSpec(config);
//
// Or programmatically:
//   const { scores, lhrPath } = await runLighthouse({ url, slug });

import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { BASE_URL, evidenceDir } from './paths.mjs';

const THRESHOLDS = { performance: 90, seo: 95 };

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Run Lighthouse (mobile emulation) against a served game page.
 * @returns {Promise<{scores: {performance:number, seo:number}, lhrPath: string, lhr: object}>}
 */
export async function runLighthouse({ url, slug, categories = ['performance', 'seo'] }) {
  // Lighthouse is ESM in v12; import dynamically so the harness loads even if it
  // is not installed in a given environment.
  const { default: lighthouse } = await import('lighthouse');

  const port = await getFreePort();
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${port}`, '--no-sandbox'],
  });

  try {
    const flags = {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: categories,
      // Mobile emulation (Lighthouse's default form factor + Moto G power profile).
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
    };

    const result = await lighthouse(url, flags);
    const lhr = result.lhr;

    const scores = {};
    for (const cat of categories) {
      scores[cat] = Math.round((lhr.categories[cat]?.score ?? 0) * 100);
    }

    const dir = evidenceDir(slug);
    fs.mkdirSync(dir, { recursive: true });
    const lhrPath = path.join(dir, 'lighthouse.json');
    fs.writeFileSync(lhrPath, JSON.stringify(lhr, null, 2));

    return { scores, lhrPath, lhr };
  } finally {
    await browser.close();
  }
}

/**
 * Define an opt-in Lighthouse spec for a game. Skips unless RUN_LIGHTHOUSE is set.
 */
export function defineLighthouseSpec(rawConfig) {
  const slug = rawConfig.slug;
  const url = `${BASE_URL}${rawConfig.url ?? `/${slug}/`}`;

  test.describe(`lighthouse:${slug}`, () => {
    test.skip(!process.env.RUN_LIGHTHOUSE, 'Lighthouse is opt-in; set RUN_LIGHTHOUSE=1 to run.');

    test(`9. performance/SEO: mobile Perf >= ${THRESHOLDS.performance}, SEO >= ${THRESHOLDS.seo}`, async () => {
      test.setTimeout(180_000);
      const { scores, lhrPath } = await runLighthouse({ url, slug });
      // eslint-disable-next-line no-console
      console.log(`[lighthouse ${slug}] performance=${scores.performance} seo=${scores.seo} -> ${lhrPath}`);
      expect(scores.performance, `mobile Performance must be >= ${THRESHOLDS.performance}`).toBeGreaterThanOrEqual(THRESHOLDS.performance);
      expect(scores.seo, `SEO must be >= ${THRESHOLDS.seo}`).toBeGreaterThanOrEqual(THRESHOLDS.seo);
    });
  });
}

export { THRESHOLDS };
