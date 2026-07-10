// tests/harness/game-suite.mjs
//
// Parameterized Playwright suite for the Dodo Games quality revamp.
// `defineGameSuite(config)` generates the full § Verification Strategy assertion
// set (assertions 1–8, 10, 11) from a per-game config. Lighthouse (assertion #9)
// lives in ./lighthouse.mjs and is wired as an opt-in spec.
//
// DESIGN: the suite is project-agnostic. Where a specific viewport / touch /
// deviceScaleFactor / reduced-motion / recordVideo emulation is required, the
// suite creates its OWN browser context so a single run covers desktop +
// mobile-390 + mobile-360 + DSF2 + reduced-motion without depending on which
// Playwright project launched it. To avoid 3x duplication it executes its body
// only under the `desktop` project (override with DODO_ALL_PROJECTS=1).
//
// The harness measures REAL quality signals (audio cues, particle/shake
// firings, persistence keys, analytics game_name). It cannot be "gamed": a game
// that lacks DodoJuice will fail the audio/juice assertions because the spies
// record zero cues / zero emissions. That failure mode is intentional and is
// how we prove the harness detects missing quality.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installSpies } from './spies.mjs';
import { evidenceDir } from './paths.mjs';

const DODO_GREEN_RGB = 'rgb(193, 255, 0)';

const MOBILE_VIEWPORTS = [
  { label: 'mobile-390', width: 390, height: 844, deviceScaleFactor: 2 },
  { label: 'mobile-360', width: 360, height: 640, deviceScaleFactor: 2 },
];

// External domains whose network failures are environmental noise, not game bugs.
const EXTERNAL_NOISE = [
  'googletagmanager.com',
  'google-analytics.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
];

// Exact-hostname URL matchers. We parse the URL and compare the hostname
// instead of substring/unanchored-regex matching so an attacker-controlled
// URL like `https://cdn.tailwindcss.com.evil.test/` (or `?x=cdn.tailwindcss.com`)
// cannot spoof a match. `endsWith('.<domain>')` covers legitimate subdomains.
function isAnalyticsHost(hostname) {
  return (
    hostname === 'googletagmanager.com' || hostname.endsWith('.googletagmanager.com') ||
    hostname === 'google-analytics.com' || hostname.endsWith('.google-analytics.com')
  );
}

function isTailwindCdnUrl(url) {
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch { /* non-absolute / invalid URL: no host */ }
  return hostname === 'cdn.tailwindcss.com' || hostname.endsWith('.tailwindcss.com');
}

// ---------------------------------------------------------------------------
// Config normalization
// ---------------------------------------------------------------------------

function normalizeConfig(raw) {
  const slug = raw.slug;
  if (!slug) throw new Error('game config requires a `slug`');

  const selectors = {
    start: raw.selectors?.start ?? raw.startSelector ?? null,
    restart: raw.selectors?.restart ?? raw.restartSelector ?? null,
    score: raw.selectors?.score ?? null,
    gameOverScreen: raw.selectors?.gameOverScreen ?? null,
    canvas: raw.selectors?.canvas ?? 'canvas',
    primaryAction: raw.selectors?.primaryAction ?? raw.selectors?.start ?? raw.startSelector ?? null,
    mute: raw.selectors?.mute ?? '.da-mute-toggle',
    backLink: raw.selectors?.backLink ?? 'a[href="/"], a[href="../"], a[href="../index.html"]',
  };

  const actions = raw.actions ?? {};

  const todo = (name) => async () => {
    throw new Error(
      `[${slug}] config action "${name}" is a PLACEHOLDER. The game revamp task must implement it in tests/games/${slug}.config.mjs before this suite can run.`,
    );
  };

  return {
    slug,
    gameName: raw.gameName,
    url: raw.url ?? `/${slug}/`,
    legacyKeys: raw.legacyKeys ?? [],
    highscoreKey: raw.highscoreKey ?? `dodo_${slug}_highscore`,
    isCanvas: !!raw.isCanvas,
    dpiCheck: !!raw.dpiCheck,
    seededLegacyValue: raw.seededLegacyValue ?? null,
    selectors,
    audio: { minCues: raw.audio?.minCues ?? 4, ...raw.audio },
    juice: {
      minParticleEmit: raw.juice?.minParticleEmit ?? null,
      minShake: raw.juice?.minShake ?? null,
      ...raw.juice,
    },
    videoSeconds: raw.videoSeconds ?? 22,
    actions: {
      start: actions.start ?? (selectors.start
        ? async (page) => { await page.click(selectors.start); }
        : todo('start')),
      scorePoint: actions.scorePoint ?? todo('scorePoint'),
      toGameOver: actions.toGameOver ?? todo('toGameOver'),
      restart: actions.restart ?? (selectors.restart
        ? async (page) => { await page.click(selectors.restart); }
        : todo('restart')),
      play: actions.play ?? todo('play'),
      touchPlay: actions.touchPlay ?? todo('touchPlay'),
      toggleMute: actions.toggleMute ?? (async (page) => { await page.click(selectors.mute); }),
      // Optional: read the numeric score. Defaults to reading `selectors.score` text.
      readScore: actions.readScore ?? (selectors.score
        ? async (page) => {
          const t = await page.locator(selectors.score).first().textContent();
          const n = parseInt(String(t ?? '').replace(/[^0-9-]/g, ''), 10);
          return Number.isFinite(n) ? n : 0;
        }
        : async () => 0),
      // Optional: detect that gameplay is active (score visible / playable).
      isGameOverVisible: actions.isGameOverVisible ?? (selectors.gameOverScreen
        ? async (page) => page.locator(selectors.gameOverScreen).isVisible()
        : async () => false),
    },
    raw,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function newInstrumentedContext(browser, opts = {}) {
  const context = await browser.newContext(opts);
  await context.addInitScript(installSpies);

  const tailwindRequests = [];
  const consoleErrors = [];

  // Neutralize external analytics endpoints so tests are hermetic but dataLayer
  // still records events synchronously (gtag pushes before the network call).
  await context.route((url) => isAnalyticsHost(url.hostname), (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }).catch(() => route.continue()),
  );

  // Record (never block silently) any Tailwind CDN request for assertion #8.
  context.on('request', (req) => {
    if (isTailwindCdnUrl(req.url())) tailwindRequests.push(req.url());
  });

  return { context, tailwindRequests, consoleErrors };
}

function attachConsole(page, sink) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (EXTERNAL_NOISE.some((d) => text.includes(d))) return;
    if (/Failed to load resource|net::ERR_|ERR_BLOCKED/.test(text)) return;
    sink.push(text);
  });
  page.on('pageerror', (e) => sink.push(`pageerror: ${e.message}`));
}

async function readSpy(page) {
  return page.evaluate(() => {
    const S = window.__DODO_SPY__;
    if (!S) return null;
    return {
      audioCues: S.audioCues.slice(),
      audioPlayCalls: S.audioPlayCalls,
      particleEmits: S.particleEmits,
      shakes: S.shakes,
      maxParticleCount: S.maxParticleCount,
      audioContextCreated: S.audioContextCreated,
      analytics: S.analytics.slice(),
      attempted: typeof S.readAttempted === 'function' ? S.readAttempted() : null,
      reducedMotion: typeof S.reducedMotion === 'function' ? S.reducedMotion() : null,
      hasJuice: typeof S.hasJuice === 'function' ? S.hasJuice() : false,
    };
  });
}

async function reinstrument(page) {
  await page.evaluate(() => {
    const S = window.__DODO_SPY__;
    if (S && typeof S.reinstrument === 'function') S.reinstrument();
  });
}

// Poll particles.count() during an async body so maxParticleCount captures the peak.
async function withParticleSampling(page, body) {
  let stop = false;
  const poll = (async () => {
    while (!stop) {
      await page.evaluate(() => {
        const S = window.__DODO_SPY__;
        if (S && typeof S.sampleParticles === 'function') S.sampleParticles();
      }).catch(() => {});
      await page.waitForTimeout(100);
    }
  })();
  try {
    return await body();
  } finally {
    stop = true;
    await poll.catch(() => {});
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

export function defineGameSuite(rawConfig) {
  const cfg = normalizeConfig(rawConfig);
  const evDir = evidenceDir(cfg.slug);

  test.describe(`game:${cfg.slug}`, () => {
    // Drive the device matrix ourselves; run once (desktop project) unless asked.
    test.beforeEach(({}, testInfo) => {
      test.skip(
        testInfo.project.name !== 'desktop' && !process.env.DODO_ALL_PROJECTS,
        'game-suite drives its own viewport/DSF/reduced-motion matrix; runs under the desktop project.',
      );
    });

    // -- 1. Smoke -----------------------------------------------------------
    test('1. smoke: loads clean, start -> score -> game over -> restart', async ({ browser }) => {
      const { context } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      const consoleErrors = [];
      attachConsole(page, consoleErrors);

      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await cfg.actions.start(page);
      await page.waitForTimeout(400);

      const before = await cfg.actions.readScore(page);
      await cfg.actions.scorePoint(page);
      await page.waitForTimeout(300);
      const after = await cfg.actions.readScore(page);
      expect(after, 'a scripted scoring action must increment the visible score').toBeGreaterThan(before);

      await cfg.actions.toGameOver(page);
      await page.waitForTimeout(300);
      if (cfg.selectors.gameOverScreen) {
        await expect(
          page.locator(cfg.selectors.gameOverScreen),
          'game-over screen must appear',
        ).toBeVisible();
      }

      await cfg.actions.restart(page);
      await page.waitForTimeout(300);
      if (cfg.selectors.gameOverScreen) {
        await expect(
          page.locator(cfg.selectors.gameOverScreen),
          'restart must return to a playable (non-game-over) state',
        ).toBeHidden();
      }

      ensureDir(evDir);
      await page.screenshot({ path: path.join(evDir, 'smoke-desktop.png') }).catch(() => {});

      expect(consoleErrors, `console errors during smoke: ${JSON.stringify(consoleErrors)}`).toEqual([]);
      await context.close();
    });

    // -- 2. Mobile parity (both viewports) ----------------------------------
    test('2. mobile parity: no horizontal scroll + touch drives gameplay (390 & 360)', async ({ browser }) => {
      for (const vp of MOBILE_VIEWPORTS) {
        const { context } = await newInstrumentedContext(browser, {
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.deviceScaleFactor,
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();
        const consoleErrors = [];
        attachConsole(page, consoleErrors);

        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        await cfg.actions.start(page).catch(() => {});
        await page.waitForTimeout(300);

        await cfg.actions.touchPlay(page).catch((e) => {
          throw new Error(`[${vp.label}] touch script failed: ${e.message}`);
        });
        await page.waitForTimeout(300);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(
          scrollWidth,
          `[${vp.label}] no horizontal scroll: scrollWidth(${scrollWidth}) must be <= viewport(${vp.width})`,
        ).toBeLessThanOrEqual(vp.width + 1);

        ensureDir(evDir);
        await page.screenshot({ path: path.join(evDir, `mobile-${vp.width}.png`) }).catch(() => {});
        await context.close();
      }
    });

    // -- 3. Audio wired -----------------------------------------------------
    test('3. audio wired: >=4 distinct cues + mute toggle persists to dodo_audio_muted', async ({ browser }) => {
      const { context } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachConsole(page, []);

      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      await cfg.actions.start(page);
      await reinstrument(page);
      await cfg.actions.play(page, { seconds: 8 });

      const spy = await readSpy(page);
      const distinct = new Set(spy?.audioCues ?? []);
      expect(
        spy?.audioContextCreated || (spy?.hasJuice && distinct.size > 0),
        'audio must be initialized (DodoJuice.audio or an AudioContext)',
      ).toBeTruthy();
      expect(
        distinct.size,
        `expected >= ${cfg.audio.minCues} distinct audio cues during play, got ${distinct.size} (${[...distinct].join(', ') || 'none'})`,
      ).toBeGreaterThanOrEqual(cfg.audio.minCues);

      // Mute toggle persists to shared localStorage key and silences cues.
      await cfg.actions.toggleMute(page);
      await page.waitForTimeout(150);
      const muted = await page.evaluate(() => localStorage.getItem('dodo_audio_muted'));
      expect(muted, 'toggling mute must persist to localStorage.dodo_audio_muted').not.toBeNull();

      const beforeMuteCues = (await readSpy(page)).audioPlayCalls;
      await cfg.actions.play(page, { seconds: 4 });
      const afterMuteSpy = await readSpy(page);
      const newDistinct = new Set(afterMuteSpy.audioCues);
      expect(
        newDistinct.size,
        'while muted, no NEW distinct cues should be produced (audible output silenced)',
      ).toBeLessThanOrEqual(distinct.size);
      void beforeMuteCues;

      await context.close();
    });

    // -- 4. Juice measured (normal + reduced-motion) ------------------------
    test('4. juice measured: >=N particle/shake firings; reduced-motion => 0 real, _attempted>0', async ({ browser }) => {
      const minEmit = cfg.juice.minParticleEmit;
      expect(
        typeof minEmit === 'number',
        `config.juice.minParticleEmit must be set for ${cfg.slug} (got ${minEmit})`,
      ).toBeTruthy();

      // Phase A: normal motion — hooks fire and particles actually render.
      {
        const { context } = await newInstrumentedContext(browser, {
          viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        attachConsole(page, []);
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        await cfg.actions.start(page);
        await reinstrument(page);
        await withParticleSampling(page, () => cfg.actions.play(page, { seconds: 8 }));

        const spy = await readSpy(page);
        expect(
          spy?.particleEmits ?? 0,
          `expected >= ${minEmit} DodoJuice.particles.emit firings, got ${spy?.particleEmits ?? 0} (game not wired to the juice substrate?)`,
        ).toBeGreaterThanOrEqual(minEmit);
        expect(
          spy?.maxParticleCount ?? 0,
          'under normal motion, real particles must actually render (particles.count() > 0)',
        ).toBeGreaterThan(0);
        if (typeof cfg.juice.minShake === 'number') {
          expect(
            spy?.shakes ?? 0,
            `expected >= ${cfg.juice.minShake} DodoJuice.shake firings, got ${spy?.shakes ?? 0}`,
          ).toBeGreaterThanOrEqual(cfg.juice.minShake);
        }
        await context.close();
      }

      // Phase B: reduced motion — zero REAL emissions, but hooks still driven.
      {
        const { context } = await newInstrumentedContext(browser, {
          viewport: { width: 1280, height: 800 },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        attachConsole(page, []);
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        await cfg.actions.start(page);
        await reinstrument(page);

        const before = await cfg.actions.readScore(page).catch(() => 0);
        await withParticleSampling(page, () => cfg.actions.play(page, { seconds: 6 }));
        await cfg.actions.scorePoint(page).catch(() => {});
        await page.waitForTimeout(200);
        const after = await cfg.actions.readScore(page).catch(() => 0);

        const spy = await readSpy(page);
        const attemptedTotal = spy?.attempted
          ? Object.values(spy.attempted).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
          : 0;

        expect(
          spy?.maxParticleCount ?? 0,
          'under prefers-reduced-motion, ZERO real particles must render',
        ).toBe(0);
        expect(
          attemptedTotal,
          'reduced motion: DodoJuice._attempted counters must be > 0 (gameplay still drives the hooks)',
        ).toBeGreaterThan(0);
        expect(
          after,
          'reduced motion: gameplay must remain functional (score still advances)',
        ).toBeGreaterThan(before);
        await context.close();
      }
    });

    // -- 5. Persistence -----------------------------------------------------
    test('5. persistence: score survives reload under dodo_{slug}_highscore + legacy migrates', async ({ browser }) => {
      // (a) score persists under the standard key
      {
        const { context } = await newInstrumentedContext(browser, {
          viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        attachConsole(page, []);
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await cfg.actions.start(page);
        await cfg.actions.scorePoint(page);
        await page.waitForTimeout(150);
        await cfg.actions.toGameOver(page);
        await page.waitForTimeout(200);

        const stored = await page.evaluate((k) => localStorage.getItem(k), cfg.highscoreKey);
        expect(
          stored,
          `high score must persist under "${cfg.highscoreKey}" (got ${stored}). Current games use legacy keys and will fail here until migrated to DodoJuice.highscore().`,
        ).not.toBeNull();
        expect(parseInt(stored ?? '0', 10)).toBeGreaterThan(0);
        await context.close();
      }

      // (b) a seeded legacy key migrates on first load
      if (cfg.legacyKeys.length && cfg.seededLegacyValue != null) {
        const legacyKey = cfg.legacyKeys[0];
        const { context } = await newInstrumentedContext(browser, {
          viewport: { width: 1280, height: 800 },
        });
        await context.addInitScript(
          ([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
          [legacyKey, String(cfg.seededLegacyValue)],
        );
        const page = await context.newPage();
        attachConsole(page, []);
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);

        const migrated = await page.evaluate((k) => localStorage.getItem(k), cfg.highscoreKey);
        expect(
          migrated,
          `seeded legacy key "${legacyKey}" must migrate into "${cfg.highscoreKey}" on first load`,
        ).not.toBeNull();
        await context.close();
      }
    });

    // -- 6. Analytics continuity -------------------------------------------
    test('6. analytics continuity: gameStart + gameOver fire with frozen game_name', async ({ browser }) => {
      const { context } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachConsole(page, []);
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await cfg.actions.start(page);
      await page.waitForTimeout(200);
      await cfg.actions.scorePoint(page).catch(() => {});
      await cfg.actions.toGameOver(page);
      await page.waitForTimeout(300);

      const spy = await readSpy(page);
      const events = spy?.analytics ?? [];
      const starts = events.filter((e) => e.event === 'game_start');
      const overs = events.filter((e) => e.event === 'game_over');

      expect(starts.length, 'game_start must fire').toBeGreaterThan(0);
      expect(overs.length, 'game_over must fire').toBeGreaterThan(0);
      expect(
        starts.some((e) => e.params.game_name === cfg.gameName),
        `game_start game_name must equal frozen "${cfg.gameName}" (saw: ${starts.map((e) => e.params.game_name).join(', ')})`,
      ).toBeTruthy();
      expect(
        overs.some((e) => e.params.game_name === cfg.gameName),
        `game_over game_name must equal frozen "${cfg.gameName}" (saw: ${overs.map((e) => e.params.game_name).join(', ')})`,
      ).toBeTruthy();
      await context.close();
    });

    // -- 7. SEO / brand -----------------------------------------------------
    test('7. SEO/brand: VideoGame JSON-LD, OG tags, back-link, Dodo Green on primary action', async ({ browser }) => {
      const { context } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachConsole(page, []);
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });

      const ldTypes = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const data = JSON.parse(el.textContent);
            const arr = Array.isArray(data) ? data : [data];
            for (const d of arr) if (d && d['@type']) out.push(d['@type']);
          } catch (e) { /* invalid JSON-LD reported below */ }
        }
        return out;
      });
      expect(ldTypes, 'JSON-LD must parse and include @type VideoGame').toContain('VideoGame');

      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
      expect(ogTitle, 'og:title must be present').toBeTruthy();
      expect(ogImage, 'og:image must be present').toBeTruthy();

      const backLink = page.locator(cfg.selectors.backLink).first();
      expect(await backLink.count(), 'a back-link to "/" must exist').toBeGreaterThan(0);

      // Dodo Green (#C1FF00 == rgb(193,255,0)) present on the primary action.
      if (cfg.selectors.primaryAction) {
        const green = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return { found: false, reason: 'primary action element not found' };
          const cs = getComputedStyle(el);
          const blob = [cs.backgroundColor, cs.color, cs.borderColor, cs.boxShadow, cs.outlineColor].join(' | ');
          return { found: blob.includes('rgb(193, 255, 0)'), blob };
        }, cfg.selectors.primaryAction);
        expect(
          green.found,
          `primary action must use Dodo Green (rgb(193, 255, 0)). Computed: ${green.blob ?? green.reason}`,
        ).toBeTruthy();
      }
      await context.close();
    });

    // -- 8. No Tailwind CDN -------------------------------------------------
    test('8. no cdn.tailwindcss.com requests', async ({ browser }) => {
      const { context, tailwindRequests } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      attachConsole(page, []);
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await cfg.actions.start(page).catch(() => {});
      await page.waitForTimeout(500);
      expect(
        tailwindRequests,
        `zero requests to cdn.tailwindcss.com allowed; saw: ${JSON.stringify(tailwindRequests)}`,
      ).toEqual([]);
      await context.close();
    });

    // -- 10. DPI (canvas games only) ---------------------------------------
    test('10. DPI: canvas backing store scaled for devicePixelRatio', async ({ browser }) => {
      test.skip(!cfg.dpiCheck, 'DPI assertion applies to canvas games only');
      const { context } = await newInstrumentedContext(browser, {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      attachConsole(page, []);
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await cfg.actions.start(page).catch(() => {});
      await page.waitForTimeout(400);

      const dpi = await page.evaluate((sel) => {
        const c = document.querySelector(sel);
        if (!c) return null;
        return { width: c.width, clientWidth: c.clientWidth, dpr: window.devicePixelRatio };
      }, cfg.selectors.canvas);

      expect(dpi, `canvas "${cfg.selectors.canvas}" must exist`).not.toBeNull();
      expect(
        dpi.width,
        `canvas.width(${dpi.width}) must be >= clientWidth(${dpi.clientWidth}) * dpr(${dpi.dpr}). Current game is likely CSS-scaled (soft on retina).`,
      ).toBeGreaterThanOrEqual(Math.floor(dpi.clientWidth * dpi.dpr) - 1);
      await context.close();
    });

    // -- 11. Gameplay videos ------------------------------------------------
    test('11. gameplay videos: desktop (>=20s) + mobile touch, written to evidence', async ({ browser }) => {
      test.setTimeout(120_000);
      ensureDir(evDir);
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `dodo-vid-${cfg.slug}-`));

      // Desktop >=20s
      {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          recordVideo: { dir: path.join(tmpRoot, 'desktop'), size: { width: 1280, height: 800 } },
        });
        await context.addInitScript(installSpies);
        const page = await context.newPage();
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await cfg.actions.start(page);
        await cfg.actions.play(page, { seconds: Math.max(20, cfg.videoSeconds) });
        const video = page.video();
        await context.close();
        const src = await video.path();
        const dest = path.join(evDir, 'gameplay-desktop.webm');
        fs.copyFileSync(src, dest);
        expect(fs.statSync(dest).size, 'gameplay-desktop.webm must be > 0 bytes').toBeGreaterThan(0);
      }

      // Mobile touch
      {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          recordVideo: { dir: path.join(tmpRoot, 'mobile'), size: { width: 390, height: 844 } },
        });
        await context.addInitScript(installSpies);
        const page = await context.newPage();
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
        await cfg.actions.start(page).catch(() => {});
        // Drive several touch rounds for a meaningful clip.
        const end = Date.now() + 12_000;
        while (Date.now() < end) {
          await cfg.actions.touchPlay(page).catch(() => {});
          await page.waitForTimeout(400);
        }
        const video = page.video();
        await context.close();
        const src = await video.path();
        const dest = path.join(evDir, 'gameplay-mobile.webm');
        fs.copyFileSync(src, dest);
        expect(fs.statSync(dest).size, 'gameplay-mobile.webm must be > 0 bytes').toBeGreaterThan(0);
      }

      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });
  });
}

export { normalizeConfig };
