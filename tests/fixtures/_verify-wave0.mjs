// Independent adversarial verifier for Wave 0 (games-quality-revamp).
// NOT written by the workers under test. Drives Chromium against the live
// substrate.html + juice.html fixtures served at http://localhost:4321 and
// tries to BREAK the done-claims. Prints a JSON verdict block per claim.
//
// Run:  node tests/fixtures/_verify-wave0.mjs
// Requires a static server at repo root:  npx serve . -l 4321 --no-clipboard
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.VERIFY_BASE || 'http://localhost:4321';
const EV = path.resolve('.omo/evidence/games-quality-revamp/_wave0');
fs.mkdirSync(EV, { recursive: true });

const results = { claim1: { checks: [] }, claim2: { checks: [] } };
function rec(claim, name, pass, detail) {
  results[claim].checks.push({ name, pass: !!pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' :: ' + detail : ''}`);
}

// AudioContext instrumentation: prove DodoJuice actually creates one on gesture.
const AC_SPY = `
  window.__acCount = 0; window.__acStates = [];
  (function(){
    var O = window.AudioContext || window.webkitAudioContext;
    if(!O) return;
    function Wrapped(){ window.__acCount++; var inst = new O(); try{window.__acStates.push(inst.state);}catch(e){} return inst; }
    Wrapped.prototype = O.prototype;
    window.AudioContext = Wrapped; window.webkitAudioContext = Wrapped;
  })();
`;

async function run() {
  const browser = await chromium.launch();

  // ===================================================================
  // CLAIM 1 — substrate.html renders, stylesheet loaded, a11y anim, RM
  // ===================================================================
  console.log('\n=== CLAIM 1: assets/dodo-arcade.css + substrate.html ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

    const resp = await page.goto(`${BASE}/tests/fixtures/substrate.html`, { waitUntil: 'load' });
    rec('claim1', 'substrate.html loads (HTTP ok)', resp && resp.ok(), `status=${resp && resp.status()}`);

    // Stylesheet actually loaded: .da-btn--primary must resolve --dodo-green.
    const primary = await page.evaluate(() => {
      const el = document.querySelector('.da-btn--primary');
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      return {
        found: true,
        bg: cs.backgroundColor,
        border: cs.borderTopColor,
        boxShadow: cs.boxShadow,
      };
    });
    const GREEN = 'rgb(193, 255, 0)';
    const styleLoaded = primary.found &&
      (String(primary.bg).includes(GREEN) || String(primary.border).includes(GREEN));
    rec('claim1', 'dodo-arcade.css loaded (.da-btn--primary is Dodo Green)', styleLoaded,
      `bg=${primary.bg} border=${primary.border}`);

    // Sheet count / href sanity — external stylesheet present & no CSSOM error.
    const sheetInfo = await page.evaluate(() => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
      let ruleCount = 0;
      try { for (const s of document.styleSheets) { try { ruleCount += (s.cssRules ? s.cssRules.length : 0); } catch (e) {} } } catch (e) {}
      return { links, ruleCount };
    });
    rec('claim1', 'external dodo-arcade.css linked & CSSOM readable',
      sheetInfo.links.some((h) => h.includes('dodo-arcade.css')) && sheetInfo.ruleCount > 20,
      `links=${sheetInfo.links.length} rules=${sheetInfo.ruleCount}`);

    // Capture animated state BEFORE reduced motion (control): combo-t3 pulses, toast slides.
    const normalAnim = await page.evaluate(() => {
      const t3 = document.querySelector('.da-combo-badge--t3');
      const toast = document.querySelector('.da-toast');
      return {
        t3: t3 ? getComputedStyle(t3).animationName : null,
        toast: toast ? getComputedStyle(toast).animationName : null,
      };
    });
    rec('claim1', 'normal motion: decorated elements ARE animated (control)',
      normalAnim.t3 && normalAnim.t3 !== 'none',
      `combo-t3 animation-name=${normalAnim.t3}; toast=${normalAnim.toast}`);

    // Click every animation-trigger button; must not throw / error.
    const triggers = await page.locator('[data-anim]').all();
    for (const t of triggers) await t.click();
    await page.click('[data-pop]'); // score pop demo too
    await page.waitForTimeout(500);
    rec('claim1', 'all animation-trigger buttons click without console errors',
      consoleErrors.length === 0, `triggers=${triggers.length} errors=${JSON.stringify(consoleErrors)}`);

    await page.screenshot({ path: path.join(EV, 'substrate.png'), fullPage: true });
    rec('claim1', 'screenshot written to _wave0/substrate.png',
      fs.existsSync(path.join(EV, 'substrate.png')) && fs.statSync(path.join(EV, 'substrate.png')).size > 0,
      `${fs.statSync(path.join(EV, 'substrate.png')).size} bytes`);

    rec('claim1', 'zero console errors on load + interaction', consoleErrors.length === 0,
      JSON.stringify(consoleErrors));
    await ctx.close();
  }

  // Reduced-motion emulation: decorated element animation-name must be none.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tests/fixtures/substrate.html`, { waitUntil: 'load' });
    const rm = await page.evaluate(() => {
      const t3 = document.querySelector('.da-combo-badge--t3');
      const toast = document.querySelector('.da-toast');
      const screen = document.querySelector('.da-screen');
      return {
        t3: t3 ? getComputedStyle(t3).animationName : null,
        toast: toast ? getComputedStyle(toast).animationName : null,
        screen: screen ? getComputedStyle(screen).animationName : null,
        mq: matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });
    rec('claim1', 'reduced-motion: matchMedia reports reduce', rm.mq === true, `mq=${rm.mq}`);
    rec('claim1', 'reduced-motion: decorated animation-name === none',
      rm.t3 === 'none' && rm.toast === 'none' && rm.screen === 'none',
      `combo-t3=${rm.t3} toast=${rm.toast} screen=${rm.screen}`);
    await ctx.close();
  }

  // ===================================================================
  // CLAIM 2 — dodo-juice.js APIs work in a real browser
  // ===================================================================
  console.log('\n=== CLAIM 2: assets/dodo-juice.js + juice.html ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
    await ctx.addInitScript(AC_SPY);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

    await page.goto(`${BASE}/tests/fixtures/juice.html`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    rec('claim2', 'juice.html loads with zero console errors', consoleErrors.length === 0,
      JSON.stringify(consoleErrors));

    const apiShape = await page.evaluate(() => ({
      hasJuice: typeof window.DodoJuice === 'object',
      audio: typeof window.DodoJuice?.audio?.play === 'function',
      particles: typeof window.DodoJuice?.particles?.emit === 'function',
      highscore: typeof window.DodoJuice?.highscore === 'function',
    }));
    rec('claim2', 'window.DodoJuice API present', apiShape.hasJuice && apiShape.audio && apiShape.particles && apiShape.highscore, JSON.stringify(apiShape));

    // User gesture: click a real button (triggers autoplay unlock + a cue).
    await page.click('[data-testid="cue-tap"]');
    await page.waitForTimeout(150);

    // Call all 10 cues in page context; assert no throw.
    const cueResult = await page.evaluate(() => {
      const cues = ['tap','score','combo','powerup','hit','fail','gameover','win','tick','whoosh'];
      const errors = [];
      for (const c of cues) { try { window.DodoJuice.audio.play(c); } catch (e) { errors.push(c + ': ' + e.message); } }
      return { errors, acCount: window.__acCount, acStates: window.__acStates };
    });
    rec('claim2', '10 audio cues play without throwing', cueResult.errors.length === 0, JSON.stringify(cueResult.errors));
    rec('claim2', 'AudioContext created after gesture (DodoJuice.audio)', cueResult.acCount > 0,
      `acCount=${cueResult.acCount} states=${JSON.stringify(cueResult.acStates)}`);

    // Particles: overlay() + emit('burst') -> count() > 0 (single tick, pre-decay).
    const partResult = await page.evaluate(() => {
      window.DodoJuice.particles.overlay();
      window.DodoJuice.particles.emit('burst', 200, 200);
      return { count: window.DodoJuice.particles.count() };
    });
    rec('claim2', 'particles.overlay()+emit(burst) -> count() > 0', partResult.count > 0, `count=${partResult.count}`);

    // shake / flash / floatText no-throw; floatText node appears then disappears.
    const fxResult = await page.evaluate(() => {
      const errs = [];
      const target = document.getElementById('flashTarget');
      try { window.DodoJuice.shake(target, 12, 300); } catch (e) { errs.push('shake: ' + e.message); }
      try { window.DodoJuice.flash(target, '#C1FF00', 200); } catch (e) { errs.push('flash: ' + e.message); }
      try { window.DodoJuice.floatText(300, 300, '+500', { color: '#C1FF00' }); } catch (e) { errs.push('floatText: ' + e.message); }
      const appeared = !!document.querySelector('.dodo-juice-float');
      return { errs, appeared };
    });
    rec('claim2', 'shake/flash/floatText do not throw', fxResult.errs.length === 0, JSON.stringify(fxResult.errs));
    rec('claim2', 'floatText node appears in DOM', fxResult.appeared, `appeared=${fxResult.appeared}`);
    await page.waitForTimeout(1200);
    const gone = await page.evaluate(() => !document.querySelector('.dodo-juice-float'));
    rec('claim2', 'floatText node auto-removed (disappears)', gone, `gone=${gone}`);

    // Screenshot with particles visible mid-emit (into the visible attach canvas + overlay).
    await page.evaluate(() => {
      const cv = document.getElementById('attach');
      for (let i = 0; i < 3; i++) {
        window.DodoJuice.particles.emit('explosion', cv.width * (0.3 + 0.2 * i), cv.height / 2, {});
        window.DodoJuice.particles.emit('confetti', window.innerWidth / 2, window.innerHeight / 2, {});
      }
    });
    await page.waitForTimeout(90);
    await page.screenshot({ path: path.join(EV, 'juice.png') });
    const juiceShotOk = fs.existsSync(path.join(EV, 'juice.png')) && fs.statSync(path.join(EV, 'juice.png')).size > 0;
    rec('claim2', 'screenshot written to _wave0/juice.png (particles mid-emit)', juiceShotOk,
      `${fs.statSync(path.join(EV, 'juice.png')).size} bytes`);

    // Mute toggle persists to shared key.
    const muteResult = await page.evaluate(() => {
      window.DodoJuice.audio.setMuted(true);
      return { ls: localStorage.getItem('dodo_audio_muted'), isMuted: window.DodoJuice.audio.isMuted() };
    });
    rec('claim2', "setMuted(true) -> localStorage.dodo_audio_muted === '1'", muteResult.ls === '1' && muteResult.isMuted === true,
      `ls=${muteResult.ls} isMuted=${muteResult.isMuted}`);

    // Highscore migration: seed legacy_test=77, migrate under verify-probe.
    const hsResult = await page.evaluate(() => {
      localStorage.setItem('legacy_test', '77');
      const hs = window.DodoJuice.highscore('verify-probe', ['legacy_test']);
      return {
        best: hs.best,
        get: hs.get(),
        stored: localStorage.getItem('dodo_verify-probe_highscore'),
        legacyRemoved: localStorage.getItem('legacy_test') === null,
      };
    });
    rec('claim2', 'highscore .best === 77', hsResult.best === 77, `best=${hsResult.best} get=${hsResult.get}`);
    rec('claim2', "highscore stored under dodo_verify-probe_highscore === '77'", hsResult.stored === '77', `stored=${hsResult.stored}`);
    rec('claim2', 'legacy key removed after migration', hsResult.legacyRemoved === true, `legacyRemoved=${hsResult.legacyRemoved}`);

    rec('claim2', 'no console errors across full API exercise', consoleErrors.length === 0, JSON.stringify(consoleErrors));
    await ctx.close();
  }

  // Reduced-motion: emit -> count()===0 while _attempted.emit > 0.
  {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tests/fixtures/juice.html`, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const rmJuice = await page.evaluate(() => {
      window.DodoJuice.particles.overlay();
      window.DodoJuice.particles.emit('burst', 200, 200);
      window.DodoJuice.particles.emit('explosion', 300, 300);
      return {
        count: window.DodoJuice.particles.count(),
        attemptedEmit: window.DodoJuice._attempted.emit,
        reducedMotion: window.DodoJuice.reducedMotion,
      };
    });
    rec('claim2', 'reduced-motion: emit -> count()===0 while _attempted.emit>0',
      rmJuice.count === 0 && rmJuice.attemptedEmit > 0,
      `count=${rmJuice.count} attempted=${rmJuice.attemptedEmit} rm=${rmJuice.reducedMotion}`);
    await ctx.close();
  }

  await browser.close();

  // Verdicts
  for (const claim of ['claim1', 'claim2']) {
    const failed = results[claim].checks.filter((c) => !c.pass);
    results[claim].verdict = failed.length === 0 ? 'confirmed' : 'needs-fix';
    results[claim].failures = failed;
  }
  console.log('\n=== VERDICT JSON ===');
  console.log(JSON.stringify(results, null, 2));
  const allPass = results.claim1.verdict === 'confirmed' && results.claim2.verdict === 'confirmed';
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => { console.error('VERIFIER CRASH:', e); process.exit(2); });
