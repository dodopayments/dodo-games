#!/usr/bin/env node
/*
 * scripts/shoot-thumbnails.mjs — DEV-ONLY (scripts/ is excluded from build.js).
 *
 * Regenerates every game card thumbnail + Open Graph image from the REVAMPED
 * games, straight out of real gameplay:
 *
 *   1. Serves the RAW REPO ROOT on :4200 (its own static server — never touches
 *      the shared Playwright harness on :4173, dist/, or the .pwlock).
 *   2. For each of the 14 games (13 revamped + flappy-dodo) it launches the game
 *      at 1200x630 (deviceScaleFactor 1), starts gameplay through the game's
 *      window.*Test debug hooks (reusing the frozen tests/games/*.config.mjs
 *      actions.start/actions.play — READ ONLY, never modified) or simulates
 *      input (flappy-dodo), lets the juice/particles render, sprays a fresh
 *      burst of richness, then screenshots a representative ACTION frame.
 *   3. Rejects blank/near-black frames and re-shoots with more play time.
 *   4. sharp-processes each raw 1200x630 PNG into:
 *        - assets/images/{slug}.webp     600x315, tuned <=100KB  (home card)
 *        - assets/images/{slug}-og.jpg   1200x630, tuned <=300KB (og:image)
 *   5. Builds a branded 2x2 composite assets/images/dodo-games.jpg (<=300KB)
 *      from the 4 most visually-rich shots.
 *   6. Prints a size table.
 *
 * Usage:  node scripts/shoot-thumbnails.mjs [--only=slug,slug] [--port=4200]
 *
 * Env:    KEEP_RAW=1  keep the temp raw-PNG dir (default: deleted on success)
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const CONFIG_DIR = path.join(ROOT, 'tests', 'games');

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const PORT = Number(argVal('port', '4200'));
const ONLY = (argVal('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const BASE = `http://127.0.0.1:${PORT}`;

// Card + OG geometry.
const CARD_W = 600;
const CARD_H = 315;
const OG_W = 1200;
const OG_H = 630;
const CARD_MAX = 100 * 1024;
const OG_MAX = 300 * 1024;

// All 14 games (order mirrors the home manifest). flappy-dodo has no test config.
const GAMES = [
  'flappy-dodo', 'ddos-defense-dodo', 'payment-invaders-dodo', 'snake-game-dodo',
  'checkout-rush-dodo', 'dodo-dash', 'merchant-hero-dodo', 'fraud-whacker-dodo',
  'revenue-2048-dodo', 'token-match-dodo', 'dodo-pong', 'firewall-breaker-dodo',
  'api-wordle-dodo', 'ledger-blocks-dodo',
];

/* ------------------------------------------------------------------ server */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath.includes('..')) { res.writeHead(400).end('bad'); return; }
      let filePath = path.join(ROOT, urlPath);
      let stat;
      try { stat = await fs.stat(filePath); } catch { stat = null; }
      if (stat && stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = await fs.stat(filePath).catch(() => null); }
      if (!stat) {
        // Slug without trailing slash → try {slug}/index.html
        const alt = path.join(ROOT, urlPath, 'index.html');
        stat = await fs.stat(alt).catch(() => null);
        if (stat) filePath = alt;
      }
      if (!stat || !stat.isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(filePath).pipe(res);
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

/* ------------------------------------------------------------- game driving */
// Safe, game-alive richness methods on any window.*Test hook (NEVER game-over
// methods like endGame/forceGameOver/toGameOver/endMatchPlayer).
const SAFE_METHODS = ['setEndless', 'trackBall', 'pulse', 'scriptedBeat',
  'scorePoint', 'shoot', 'spawnAndPickup', 'breakBrick', 'popBot', 'shield',
  'waveClearPulse'];

async function sprayRichness(page) {
  await page.evaluate((methods) => {
    const testKeys = Object.keys(window).filter((k) => /Test$/.test(k) && window[k] && typeof window[k] === 'object');
    for (const k of testKeys) {
      const T = window[k];
      try { if (typeof T.setEndless === 'function') T.setEndless(true); } catch (e) { /* noop */ }
      try { if (typeof T.trackBall === 'function') T.trackBall(); } catch (e) { /* noop */ }
      for (let n = 0; n < 4; n += 1) {
        for (const m of methods) {
          if (m === 'setEndless' || m === 'trackBall') continue;
          try { if (typeof T[m] === 'function') T[m](); } catch (e) { /* noop */ }
        }
      }
    }
  }, SAFE_METHODS);
}

async function flappyPlay(page, seconds) {
  // Wait for assets so startGame() proceeds, then flap on a cadence.
  await page.waitForFunction(() => typeof window.startGame === 'function', null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => { try { if (window.assetsLoaded === false) { /* let loop set it */ } startGame(); } catch (e) { /* noop */ } });
  const end = Date.now() + seconds * 1000;
  let flaps = 0;
  while (Date.now() < end) {
    // Keep the bird alive with a steady flap; restart if it died.
    const state = await page.evaluate(() => (typeof gameState !== 'undefined' ? gameState : 'PLAYING')).catch(() => 'PLAYING');
    if (state === 'GAMEOVER') {
      await page.evaluate(() => { try { resetGame(); } catch (e) { try { startGame(); } catch (e2) {} } });
      await page.waitForTimeout(120);
    } else if (state === 'START') {
      await page.evaluate(() => { try { startGame(); } catch (e) {} });
    }
    await page.keyboard.press('Space');
    flaps += 1;
    await page.waitForTimeout(280);
  }
  void flaps;
}

async function loadConfig(slug) {
  if (slug === 'flappy-dodo') return null;
  const url = pathToFileURL(path.join(CONFIG_DIR, `${slug}.config.mjs`)).href;
  const mod = await import(url);
  return mod.default;
}

async function shootOne(browser, slug, cfg, attempt) {
  const seconds = 2.6 + attempt * 1.8; // more play on re-shoots
  const ctx = await browser.newContext({
    viewport: { width: OG_W, height: OG_H },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  page.on('console', () => {});
  try {
    await page.goto(`${BASE}/${slug}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(450);
    if (slug === 'flappy-dodo') {
      await flappyPlay(page, seconds);
    } else {
      try { await cfg.actions.start(page); } catch (e) { /* start may auto-run */ }
      await page.waitForTimeout(300);
      try { await cfg.actions.play(page, { seconds }); } catch (e) { /* keep going */ }
      await sprayRichness(page);
    }
    await page.waitForTimeout(140);
    const raw = await page.screenshot({ type: 'png' });
    return raw;
  } finally {
    await ctx.close();
  }
}

// Blank/near-black detector: reject if the frame is essentially flat & dark.
async function frameRichness(buf) {
  const stats = await sharp(buf).stats();
  const meanAvg = stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
  const stdAvg = stats.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
  return { meanAvg, stdAvg, ok: meanAvg > 6 && stdAvg > 10 };
}

/* ---------------------------------------------------------------- encoding */
async function encodeCardWebp(rawBuf, outPath) {
  const base = sharp(rawBuf).resize(CARD_W, CARD_H, { fit: 'cover', position: 'centre' });
  for (const q of [82, 78, 72, 66, 60, 54, 48, 42]) {
    const out = await base.clone().webp({ quality: q, effort: 6 }).toBuffer();
    if (out.length <= CARD_MAX) { await fs.writeFile(outPath, out); return { size: out.length, quality: q }; }
  }
  const out = await base.clone().webp({ quality: 40, effort: 6 }).toBuffer();
  await fs.writeFile(outPath, out);
  return { size: out.length, quality: 40 };
}

async function encodeOgJpeg(rawBuf, outPath) {
  const base = sharp(rawBuf).resize(OG_W, OG_H, { fit: 'cover', position: 'centre' });
  for (const q of [84, 80, 75, 70, 64, 58, 52]) {
    const out = await base.clone().jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
    if (out.length <= OG_MAX) { await fs.writeFile(outPath, out); return { size: out.length, quality: q }; }
  }
  const out = await base.clone().jpeg({ quality: 48, mozjpeg: true }).toBuffer();
  await fs.writeFile(outPath, out);
  return { size: out.length, quality: 48 };
}

/* ------------------------------------------------------- root OG composite */
async function buildComposite(shots, outPath) {
  // shots: [{slug, raw, richness}] — pick the 4 richest.
  const picks = [...shots].sort((a, b) => b.richness.stdAvg - a.richness.stdAvg).slice(0, 4);
  const cellW = OG_W / 2;   // 600
  const cellH = OG_H / 2;   // 315
  const tiles = await Promise.all(picks.map(async (s, i) => ({
    input: await sharp(s.raw).resize(Math.round(cellW), Math.round(cellH), { fit: 'cover', position: 'centre' }).toBuffer(),
    left: (i % 2) * Math.round(cellW),
    top: Math.floor(i / 2) * Math.round(cellH),
  })));

  // Dark base + Dodo-green title bar overlay via SVG.
  const svg = Buffer.from(`
<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#050505" stop-opacity="0.94"/>
      <stop offset="1" stop-color="#0b0b0b" stop-opacity="0.94"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${OG_H / 2 - 66}" width="${OG_W}" height="132" fill="url(#bar)"/>
  <rect x="0" y="${OG_H / 2 - 66}" width="${OG_W}" height="4" fill="#C1FF00"/>
  <rect x="0" y="${OG_H / 2 + 62}" width="${OG_W}" height="4" fill="#C1FF00"/>
  <text x="${OG_W / 2}" y="${OG_H / 2 - 6}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
        font-size="72" font-weight="900" fill="#C1FF00" letter-spacing="4">DODO GAMES</text>
  <text x="${OG_W / 2}" y="${OG_H / 2 + 42}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="26" font-weight="600" fill="#f2f2f2" letter-spacing="6">14 ARCADE GAMES · PLAY FREE</text>
</svg>`);

  const composed = await sharp({ create: { width: OG_W, height: OG_H, channels: 3, background: { r: 5, g: 5, b: 5 } } })
    .composite([...tiles, { input: svg, left: 0, top: 0 }])
    .png()
    .toBuffer();

  for (const q of [86, 82, 78, 72, 66, 60]) {
    const out = await sharp(composed).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
    if (out.length <= OG_MAX) { await fs.writeFile(outPath, out); return { size: out.length, quality: q, picks: picks.map((p) => p.slug) }; }
  }
  const out = await sharp(composed).jpeg({ quality: 55, mozjpeg: true }).toBuffer();
  await fs.writeFile(outPath, out);
  return { size: out.length, quality: 55, picks: picks.map((p) => p.slug) };
}

/* ------------------------------------------------------------------- main */
function kb(n) { return `${(n / 1024).toFixed(1)}KB`; }

async function main() {
  const targets = ONLY.length ? GAMES.filter((g) => ONLY.includes(g)) : GAMES;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dodo-thumbs-'));
  console.log(`raw shots → ${tmpDir}`);
  console.log(`serving repo root on ${BASE} (NOT :4173)\n`);

  const server = await startServer();
  const browser = await chromium.launch();
  const results = [];
  const shots = [];

  try {
    for (const slug of targets) {
      const cfg = await loadConfig(slug);
      let raw = null;
      let richness = null;
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        raw = await shootOne(browser, slug, cfg, attempts);
        richness = await frameRichness(raw);
        if (richness.ok) break;
        attempts += 1;
        console.log(`  · ${slug}: frame weak (mean ${richness.meanAvg.toFixed(1)}, std ${richness.stdAvg.toFixed(1)}) — re-shoot ${attempts}/${maxAttempts - 1}`);
      }
      await fs.writeFile(path.join(tmpDir, `${slug}.png`), raw);
      shots.push({ slug, raw, richness });

      const webpPath = path.join(IMAGES_DIR, `${slug}.webp`);
      const ogPath = path.join(IMAGES_DIR, `${slug}-og.jpg`);
      const card = await encodeCardWebp(raw, webpPath);
      const og = await encodeOgJpeg(raw, ogPath);
      results.push({ slug, card, og, richness, reshoots: attempts });
      console.log(`✓ ${slug.padEnd(22)} card ${kb(card.size).padStart(8)} q${card.quality}  og ${kb(og.size).padStart(8)} q${og.quality}  (mean ${richness.meanAvg.toFixed(0)}/std ${richness.stdAvg.toFixed(0)}${attempts ? `, ${attempts} re-shoot` : ''})`);
    }

    // Root branded composite from the 4 richest shots.
    const comp = await buildComposite(shots, path.join(IMAGES_DIR, 'dodo-games.jpg'));
    console.log(`\n✓ dodo-games.jpg composite ${kb(comp.size)} q${comp.quality} from [${comp.picks.join(', ')}]`);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }

  // Size table
  console.log('\n================ SIZE TABLE ================');
  console.log('slug'.padEnd(24) + 'card.webp'.padStart(11) + 'og.jpg'.padStart(11) + '  status');
  let cardTotal = 0;
  let ogTotal = 0;
  let allOk = true;
  for (const r of results) {
    cardTotal += r.card.size;
    ogTotal += r.og.size;
    const cardOk = r.card.size <= CARD_MAX;
    const ogOk = r.og.size <= OG_MAX;
    if (!cardOk || !ogOk) allOk = false;
    console.log(r.slug.padEnd(24) + kb(r.card.size).padStart(11) + kb(r.og.size).padStart(11) + `  ${cardOk ? 'OK' : 'CARD>100KB'} ${ogOk ? '' : 'OG>300KB'}`);
  }
  console.log('-------------------------------------------');
  console.log('TOTAL'.padEnd(24) + kb(cardTotal).padStart(11) + kb(ogTotal).padStart(11));
  console.log(`cards <=100KB: ${allOk ? 'ALL PASS' : 'FAILURES ABOVE'}  |  count: ${results.length}`);

  if (!process.env.KEEP_RAW) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log(`\ncleaned temp ${tmpDir}`);
  } else {
    console.log(`\nkept temp ${tmpDir}`);
  }

  if (!allOk) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
