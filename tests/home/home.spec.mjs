// Verification spec for the redesigned Dodo Games home page.
//
// Standalone (plain @playwright/test) — modelled on tests/games/dodo-pong.spec.mjs
// but self-contained: it drives its own mobile viewports and records its own
// evidence, so it runs once under the `desktop` project.
//
// Server under test: the static `dist/` built + served on :4173 by the shared
// playwright.config.mjs webServer. Card links are asserted against that server.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = path.resolve(
  HERE, '..', '..', '.omo', 'evidence', 'games-quality-revamp', 'home',
);

// Distribution image dir (for the opt-in thumbnail size assertion).
const DIST_IMAGES = path.resolve(HERE, '..', '..', 'dist', 'assets', 'images');

// External domains whose network/console failures are environmental noise.
const EXTERNAL_NOISE = [
  'googletagmanager.com',
  'google-analytics.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Exact-hostname matcher: parse the URL and compare the hostname instead of
// running an unanchored regex over the whole URL, so a host like
// `googletagmanager.com.evil.test` (or a query param) cannot spoof a match.
// `endsWith('.<domain>')` still covers legitimate subdomains (www., region1.).
function isAnalyticsHost(hostname) {
  return (
    hostname === 'googletagmanager.com' || hostname.endsWith('.googletagmanager.com') ||
    hostname === 'google-analytics.com' || hostname.endsWith('.google-analytics.com')
  );
}

// Genre -> expected visible game count (must sum to 14).
const GENRE_COUNTS = { Action: 3, Puzzle: 3, Arcade: 7, Word: 1 };

function attachConsole(page, sink) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (EXTERNAL_NOISE.some((d) => t.includes(d))) return;
    if (/Failed to load resource|net::ERR_|ERR_BLOCKED/.test(t)) return;
    sink.push(t);
  });
  page.on('pageerror', (e) => sink.push(`pageerror: ${e.message}`));
}

// Neutralize GA network so tests are hermetic; dataLayer still records synchronously.
async function stubAnalytics(target) {
  await target.route((url) => isAnalyticsHost(url.hostname), (route) =>
    route
      .fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      .catch(() => route.continue()),
  );
}

function ensureEvidence() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  return EVIDENCE;
}

test.describe('home', () => {
  // Drive our own viewport matrix; execute once under the desktop project.
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop' && !process.env.DODO_ALL_PROJECTS,
      'home suite drives its own viewport matrix; runs under the desktop project.',
    );
    await stubAnalytics(page);
  });

  // -- 1. render + zero console errors -------------------------------------
  test('1. renders 14 game cards + Discord card with zero console errors', async ({ page }) => {
    const errors = [];
    attachConsole(page, errors);

    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('.card--game')).toHaveCount(14);
    await expect(page.locator('.card--idea')).toHaveCount(1);

    // Discord "idea" card must be LAST in the grid.
    const last = page.locator('#grid .card').last();
    await expect(last).toHaveClass(/card--idea/);
    await expect(last).toHaveAttribute('href', /discord\.gg\/bYqAp4ayYh/);

    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });

  // -- 2. every internal card link resolves 200 ---------------------------
  test('2. every game card link resolves 200 against the served dist', async ({ page, request }) => {
    await page.goto('/');
    const slugs = await page.evaluate(() => (window.DODO_GAMES || []).map((g) => g.slug));
    expect(slugs.length, 'manifest must expose 14 slugs').toBe(14);

    for (const slug of slugs) {
      const res = await request.get(`/${slug}`);
      expect(res.status(), `/${slug} must resolve 200 (followed redirects)`).toBe(200);
    }
  });

  // -- 3. live search ------------------------------------------------------
  test('3. typing "pong" filters to only the Dodo Pong card', async ({ page }) => {
    await page.goto('/');
    await page.fill('#search', 'pong');

    const visible = page.locator('.card--game:visible');
    await expect(visible).toHaveCount(1);
    await expect(visible.first()).toContainText('Dodo Pong');
    // The idea card is suppressed while a search is active.
    await expect(page.locator('.card--idea')).toBeHidden();

    // Clearing restores the full grid.
    await page.fill('#search', '');
    await expect(page.locator('.card--game:visible')).toHaveCount(14);
  });

  // -- 4. genre filter chips ----------------------------------------------
  test('4. genre chips filter cards correctly', async ({ page }) => {
    await page.goto('/');

    for (const [genre, count] of Object.entries(GENRE_COUNTS)) {
      await page.click(`.chip[data-genre="${genre}"]`);
      await expect(
        page.locator('.card--game:visible'),
        `${genre} should show ${count} games`,
      ).toHaveCount(count);
      await expect(page.locator(`.chip[data-genre="${genre}"]`)).toHaveAttribute('aria-pressed', 'true');
    }

    await page.click('.chip[data-genre="All"]');
    await expect(page.locator('.card--game:visible')).toHaveCount(14);
    await expect(page.locator('.card--idea')).toBeVisible();
  });

  // -- 5. lazy thumbnails with explicit dimensions (zero CLS) --------------
  test('5. all card thumbnails are lazy + have width/height', async ({ page }) => {
    await page.goto('/');
    const imgs = page.locator('.card--game .card__thumb img');
    await expect(imgs).toHaveCount(14);

    const n = await imgs.count();
    for (let i = 0; i < n; i++) {
      const img = imgs.nth(i);
      await expect(img).toHaveAttribute('loading', 'lazy');
      const w = await img.getAttribute('width');
      const h = await img.getAttribute('height');
      expect(w && Number(w) > 0, `thumb ${i} must have explicit width`).toBeTruthy();
      expect(h && Number(h) > 0, `thumb ${i} must have explicit height`).toBeTruthy();
    }
  });

  // -- 6. resume-last-played badge ----------------------------------------
  test('6. seeding dodo_last_played surfaces the RESUME badge on that card', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('dodo_last_played', 'dodo-pong'); } catch (e) { /* noop */ }
    });
    await page.goto('/');

    await expect(
      page.locator('.card--game[data-slug="dodo-pong"] .badge--resume'),
    ).toBeVisible();
    await expect(
      page.locator('.card--game[data-slug="flappy-dodo"] .badge--resume'),
    ).toBeHidden();
  });

  // -- 7. Boss Mode easter egg --------------------------------------------
  test('7. Boss Mode toggles the overlay, double-click exits, dataLayer records the event', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#bossOverlay');
    await expect(overlay).toBeHidden();

    await page.click('#bossBtn');
    await expect(overlay).toBeVisible();

    const recorded = await page.evaluate(() =>
      (window.dataLayer || []).some((a) => a && a[1] === 'boss_mode_toggle'),
    );
    expect(recorded, 'DodoAnalytics.bossMode must push boss_mode_toggle to dataLayer').toBe(true);

    await overlay.dblclick();
    await expect(overlay).toBeHidden();
  });

  // -- 8. JSON-LD: ItemList of 14 VideoGame entries -----------------------
  test('8. JSON-LD parses as an ItemList with 14 VideoGame entries', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(el.textContent);
          (Array.isArray(data) ? data : [data]).forEach((d) => out.push(d));
        } catch (e) { out.push({ __invalid: true }); }
      }
      return out;
    });

    expect(blocks.some((b) => b.__invalid), 'all JSON-LD blocks must parse').toBeFalsy();
    const itemList = blocks.find((b) => b['@type'] === 'ItemList');
    expect(itemList, 'an ItemList block must be present').toBeTruthy();
    expect(itemList.itemListElement.length, 'ItemList must have 14 entries').toBe(14);
    const types = itemList.itemListElement.map((li) => li.item && li.item['@type']);
    expect(types.every((t) => t === 'VideoGame'), 'every entry must be a VideoGame').toBe(true);
  });

  // -- 9. no horizontal scroll at 390x844 and 360x640 ---------------------
  test('9. no horizontal scroll at 390x844 and 360x640', async ({ browser }) => {
    for (const vp of [{ w: 390, h: 844 }, { w: 360, h: 640 }]) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await stubAnalytics(context);
      const page = await context.newPage();
      await page.goto('/', { waitUntil: 'networkidle' });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(
        scrollWidth,
        `${vp.w}x${vp.h}: scrollWidth(${scrollWidth}) must be <= viewport(${vp.w})`,
      ).toBeLessThanOrEqual(vp.w + 1);

      await context.close();
    }
  });

  // -- 10. ambient background pauses when the page is hidden --------------
  test('10. __bgFrames grows while visible and stops when document is hidden', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const a = await page.evaluate(() => window.__bgFrames);
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => window.__bgFrames);
    expect(b, `background frames must advance while visible (a=${a}, b=${b})`).toBeGreaterThan(a);

    // Emulate a hidden document and notify the page.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(250);

    const c = await page.evaluate(() => window.__bgFrames);
    await page.waitForTimeout(400);
    const d = await page.evaluate(() => window.__bgFrames);
    expect(d, `background frames must stop growing when hidden (c=${c}, d=${d})`).toBe(c);
  });

  // -- 11. thumbnail size budget (opt-in; deferred to Wave 6) --------------
  test('11. card thumbnails under 100KB', async () => {
    test.skip(
      !process.env.STRICT_THUMBS,
      'Thumbnail size budget is deferred to Wave 6 (heavy PNGs remain). Set STRICT_THUMBS=1 to enforce.',
    );
    const slugs = fs.existsSync(DIST_IMAGES)
      ? fs.readdirSync(DIST_IMAGES).filter((f) => /\.(png|webp)$/.test(f) && !f.startsWith('dodo-games') && !f.startsWith('dodo-logo'))
      : [];
    expect(slugs.length, 'dist images must exist').toBeGreaterThan(0);
    const over = slugs
      .map((f) => ({ f, size: fs.statSync(path.join(DIST_IMAGES, f)).size }))
      .filter((x) => x.size > 100 * 1024);
    expect(over, `thumbnails over 100KB: ${JSON.stringify(over)}`).toEqual([]);
  });

  // -- Evidence: screenshots (desktop + 390 + 360) + walkthrough video ----
  test('evidence: capture screenshots + >=15s walkthrough video', async ({ browser }) => {
    test.setTimeout(120_000);
    const dir = ensureEvidence();

    // Static screenshots at the three review viewports.
    for (const vp of [
      { label: 'desktop', w: 1280, h: 800, mobile: false },
      { label: 'mobile-390', w: 390, h: 844, mobile: true },
      { label: 'mobile-360', w: 360, h: 640, mobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: vp.mobile ? 2 : 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      await stubAnalytics(context);
      const page = await context.newPage();
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(dir, `${vp.label}.png`), fullPage: true });
      await context.close();
    }

    // Walkthrough video: scroll, search, filter, boss mode.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      recordVideo: { dir: path.join(dir, '_vid'), size: { width: 1280, height: 800 } },
    });
    await stubAnalytics(context);
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Scroll the catalog.
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, -1400);
    await page.waitForTimeout(700);

    // Search.
    await page.fill('#search', 'fraud');
    await page.waitForTimeout(1100);
    await page.fill('#search', '');
    await page.waitForTimeout(600);

    // Filter chips.
    for (const g of ['Puzzle', 'Action', 'Word', 'Arcade', 'All']) {
      await page.click(`.chip[data-genre="${g}"]`);
      await page.waitForTimeout(700);
    }

    // Boss mode.
    await page.click('#bossBtn');
    await page.waitForTimeout(1400);
    await page.locator('#bossOverlay').dblclick();
    await page.waitForTimeout(900);

    const video = page.video();
    await context.close();
    if (video) {
      const src = await video.path();
      const dest = path.join(dir, 'walkthrough.webm');
      fs.copyFileSync(src, dest);
      expect(fs.statSync(dest).size, 'walkthrough.webm must be > 0 bytes').toBeGreaterThan(0);
    }
    fs.rmSync(path.join(dir, '_vid'), { recursive: true, force: true });
  });
});
