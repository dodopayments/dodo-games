#!/usr/bin/env node
/*
 * scripts/verify-thumbnails.mjs — DEV-ONLY (scripts/ excluded from build.js).
 *
 * Verifies the regenerated thumbnails/OG images end-to-end:
 *   1. Size table: every card .webp <=100KB, every og.jpg + composite <=300KB.
 *   2. Serves the RAW REPO ROOT on :4200 (own server — never touches :4173 /
 *      dist/ / .pwlock), loads the home page, and confirms every card image
 *      request returns 200 (no 404s) and the grid renders all cards.
 *   3. Screenshots the final grid to .omo/evidence/games-quality-revamp/home/thumbs-final.png
 *
 * Usage:  node scripts/verify-thumbnails.mjs [--port=4200]
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const EVID = path.join(ROOT, '.omo', 'evidence', 'games-quality-revamp', 'home');

const args = process.argv.slice(2);
const argVal = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORT = Number(argVal('port', '4200'));
const BASE = `http://127.0.0.1:${PORT}`;

const SLUGS = ['flappy-dodo', 'ddos-defense-dodo', 'payment-invaders-dodo', 'snake-game-dodo',
  'checkout-rush-dodo', 'dodo-dash', 'merchant-hero-dodo', 'fraud-whacker-dodo',
  'revenue-2048-dodo', 'token-match-dodo', 'dodo-pong', 'firewall-breaker-dodo',
  'api-wordle-dodo', 'ledger-blocks-dodo'];
const CARD_MAX = 100 * 1024;
const OG_MAX = 300 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain', '.xml': 'application/xml',
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath.includes('..')) { res.writeHead(400).end('bad'); return; }
      let filePath = path.join(ROOT, urlPath);
      let stat = await fs.stat(filePath).catch(() => null);
      if (stat && stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = await fs.stat(filePath).catch(() => null); }
      if (!stat) { const alt = path.join(ROOT, urlPath, 'index.html'); stat = await fs.stat(alt).catch(() => null); if (stat) filePath = alt; }
      if (!stat || !stat.isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(filePath).pipe(res);
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', () => resolve(server)); });
}

function kb(n) { return `${(n / 1024).toFixed(1)}KB`; }

async function main() {
  // ---- 1. size table ------------------------------------------------------
  console.log('================ SIZE TABLE (on disk) ================');
  console.log('slug'.padEnd(24) + 'card.webp'.padStart(11) + 'og.jpg'.padStart(11) + '  status');
  let cardTotal = 0; let ogTotal = 0; let sizeOk = true;
  for (const slug of SLUGS) {
    const cw = (await fs.stat(path.join(IMAGES_DIR, `${slug}.webp`))).size;
    const og = (await fs.stat(path.join(IMAGES_DIR, `${slug}-og.jpg`))).size;
    cardTotal += cw; ogTotal += og;
    const cardOk = cw <= CARD_MAX; const ogOk = og <= OG_MAX;
    if (!cardOk || !ogOk) sizeOk = false;
    console.log(slug.padEnd(24) + kb(cw).padStart(11) + kb(og).padStart(11) + `  ${cardOk ? 'OK' : 'CARD>100KB!'} ${ogOk ? '' : 'OG>300KB!'}`);
  }
  const comp = (await fs.stat(path.join(IMAGES_DIR, 'dodo-games.jpg'))).size;
  const compOk = comp <= OG_MAX;
  if (!compOk) sizeOk = false;
  console.log('-----------------------------------------------------');
  console.log('TOTAL'.padEnd(24) + kb(cardTotal).padStart(11) + kb(ogTotal).padStart(11));
  console.log(`composite dodo-games.jpg: ${kb(comp)}  ${compOk ? 'OK' : 'COMPOSITE>300KB!'}`);
  console.log(`SIZE GATE: ${sizeOk ? 'ALL PASS' : 'FAILURES ABOVE'}\n`);

  // ---- 2. load home, watch for 404s --------------------------------------
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const bad = [];
  const consoleErrors = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('googletagmanager') && !u.includes('google-analytics')) bad.push(`FAILED ${u}`); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#grid .card--game', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  // Force lazy images to load by scrolling through the page.
  await page.evaluate(async () => {
    const step = () => new Promise((r) => setTimeout(r, 120));
    for (let y = 0; y <= document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await step(); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  const imgReport = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('#grid .card--game img'));
    return imgs.map((im) => ({ src: im.getAttribute('src'), w: im.naturalWidth, h: im.naturalHeight, complete: im.complete }));
  });
  const cardCount = await page.$$eval('#grid .card--game', (els) => els.length);
  const brokenImgs = imgReport.filter((i) => !i.complete || i.w === 0);

  await fs.mkdir(EVID, { recursive: true });
  const shotPath = path.join(EVID, 'thumbs-final.png');
  await page.screenshot({ path: shotPath, fullPage: true });

  await browser.close();
  await new Promise((r) => server.close(r));

  // ---- 3. report ----------------------------------------------------------
  console.log('================ HOME PAGE LOAD ================');
  console.log(`game cards rendered: ${cardCount} (expected 14)`);
  console.log(`card <img> decoded OK: ${imgReport.length - brokenImgs.length}/${imgReport.length}`);
  if (brokenImgs.length) { console.log('BROKEN IMAGES:'); brokenImgs.forEach((b) => console.log(`  - ${b.src} (w=${b.w})`)); }
  const imgBad = bad.filter((b) => /\.(webp|jpg|jpeg|png)/.test(b));
  console.log(`network 4xx/failed (image): ${imgBad.length}`);
  imgBad.forEach((b) => console.log(`  - ${b}`));
  console.log(`network 4xx/failed (all non-analytics): ${bad.length}`);
  bad.filter((b) => !/\.(webp|jpg|jpeg|png)/.test(b)).forEach((b) => console.log(`  - ${b}`));
  console.log(`console errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 8).forEach((e) => console.log(`  - ${e}`));
  console.log(`\ngrid screenshot -> ${path.relative(ROOT, shotPath)}`);

  const pass = sizeOk && cardCount === 14 && brokenImgs.length === 0 && imgBad.length === 0;
  console.log(`\nVERDICT: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
