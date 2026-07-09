// Lighthouse spec for the home page (mobile emulation), using the shared
// tests/harness/lighthouse.mjs helper against the served dist on :4173.
//
// Gates:
//   - SEO         >= 95  (STRICT — always enforced)
//   - Performance >= 90  (only under STRICT_THUMBS — the heavy legacy PNGs are
//                         swapped for optimized WebP in a later task; until then
//                         the ACTUAL Performance number is always reported).
//
//   RUN it (server auto-starts via playwright.config webServer):
//     npx playwright test tests/home/home.lighthouse.spec.mjs --project=desktop
import { test, expect } from '@playwright/test';
import { runLighthouse } from '../harness/lighthouse.mjs';

const HOME_URL = (process.env.DODO_BASE_URL || 'http://localhost:4173') + '/';

test.describe('home:lighthouse', () => {
  // Lighthouse launches its own Chrome; run it once (desktop project).
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop' && !process.env.DODO_ALL_PROJECTS,
      'lighthouse runs once under the desktop project.',
    );
  });

  test('SEO >= 95 (strict); Performance reported (>= 90 only under STRICT_THUMBS)', async () => {
    test.setTimeout(180_000);
    const { scores, lhrPath } = await runLighthouse({ url: HOME_URL, slug: 'home' });

    // Always surface the real numbers for the task report.
    // eslint-disable-next-line no-console
    console.log(`[lighthouse home] performance=${scores.performance} seo=${scores.seo} -> ${lhrPath}`);

    expect(scores.seo, `home SEO must be >= 95 (got ${scores.seo})`).toBeGreaterThanOrEqual(95);

    if (process.env.STRICT_THUMBS) {
      expect(
        scores.performance,
        `home Performance must be >= 90 under STRICT_THUMBS (got ${scores.performance})`,
      ).toBeGreaterThanOrEqual(90);
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `[lighthouse home] NOTE: Performance=${scores.performance}. The Perf>=90 gate is deferred ` +
        'behind STRICT_THUMBS until the Wave 6 thumbnail swap (heavy legacy PNGs still shipped).',
      );
    }
  });
});
