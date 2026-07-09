/**
 * DodoJuice node smoke test.
 *
 * Loads assets/dodo-juice.js (a browser IIFE) inside a vm sandbox with stubbed
 * window / localStorage / matchMedia, then asserts the pure-logic contracts that
 * do not need a real browser:
 *   1. cue registry exposes all 10 named presets
 *   2. mute persistence (setMuted writes '1'/'0'; muted state read from ls on init)
 *   3. highscore migration (max legacy value migrates, legacy keys removed)
 *
 * Run: node tests/fixtures/juice-node-smoke.mjs
 * (No dependencies, no npm install.)
 */
import vm from 'node:vm';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../assets/dodo-juice.js');
const CODE = fs.readFileSync(SRC, 'utf8');

/** Build a fresh sandboxed DodoJuice instance backed by `store`. */
function loadDodoJuice(store) {
  store = store || {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const win = {};
  win.window = win;                         // typeof window !== 'undefined' inside IIFE
  win.localStorage = localStorage;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  win.navigator = {};                       // no `vibrate` -> haptics no-op
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.console = console;
  win.addEventListener = () => {};          // gesture binding no-op
  win.removeEventListener = () => {};
  // Deliberately NO document / AudioContext / requestAnimationFrame:
  // every browser-only path must degrade to a safe no-op.
  vm.createContext(win);
  vm.runInContext(CODE, win, { filename: 'dodo-juice.js' });
  return { DJ: win.DodoJuice, store };
}

/* ---- tiny assertion harness -------------------------------------------- */
let passed = 0;
const failures = [];
function ok(label, cond) {
  if (cond) { passed++; console.log('  \u2713 ' + label); }
  else { failures.push(label); console.log('  \u2717 ' + label); }
}
function eq(label, actual, expected) {
  ok(label + ' (=> ' + JSON.stringify(actual) + ')', actual === expected);
}

/* ====================================================================== */
console.log('\n[1] cue registry — all 10 presets present');
{
  const { DJ } = loadDodoJuice();
  const expected = ['tap', 'score', 'combo', 'powerup', 'hit', 'fail', 'gameover', 'win', 'tick', 'whoosh'];
  const keys = Object.keys(DJ.audio.cues);
  eq('cue count is 10', keys.length, 10);
  for (const name of expected) {
    ok('has cue "' + name + '" (function)', typeof DJ.audio.cues[name] === 'function');
  }
  ok('audio.play is a plain function (spyable)', typeof DJ.audio.play === 'function');
  ok('particles.emit is a plain function (spyable)', typeof DJ.particles.emit === 'function');
  ok('play() before AudioContext is a safe no-op', (function () {
    try { DJ.audio.play('score'); DJ.audio.play('nope'); return true; } catch (e) { return false; }
  })());
}

/* ====================================================================== */
console.log('\n[2] mute persistence');
{
  const { DJ, store } = loadDodoJuice();
  eq('starts unmuted (no ls key)', DJ.audio.isMuted(), false);
  DJ.audio.setMuted(true);
  eq('setMuted(true) writes "1"', store.dodo_audio_muted, '1');
  eq('isMuted() true after mute', DJ.audio.isMuted(), true);
  DJ.audio.setMuted(false);
  eq('setMuted(false) writes "0"', store.dodo_audio_muted, '0');
  eq('isMuted() false after unmute', DJ.audio.isMuted(), false);

  // muted state must be read from localStorage on init
  const seeded = loadDodoJuice({ dodo_audio_muted: '1' });
  eq('fresh instance reads muted=1 on init', seeded.DJ.audio.isMuted(), true);
  const seeded0 = loadDodoJuice({ dodo_audio_muted: '0' });
  eq('fresh instance reads muted=0 on init', seeded0.DJ.audio.isMuted(), false);
}

/* ====================================================================== */
console.log('\n[3] highscore migration');
{
  // (a) max legacy value migrates; all legacy keys removed
  const { DJ, store } = loadDodoJuice({ legacy_a: '4200', legacy_b: '100' });
  const hs = DJ.highscore('demo', ['legacy_a', 'legacy_b']);
  eq('migrated max legacy -> dodo_demo_highscore', store.dodo_demo_highscore, '4200');
  ok('legacy_a removed', !('legacy_a' in store));
  ok('legacy_b removed', !('legacy_b' in store));
  eq('hs.get() returns migrated value', hs.get(), 4200);
  eq('hs.best mirrors get()', hs.best, 4200);
  eq('hs.set(5000) raises best', hs.set(5000), 5000);
  eq('ls updated to 5000', store.dodo_demo_highscore, '5000');
  eq('hs.set(10) does not downgrade', hs.set(10), 5000);

  // (b) existing highscore higher than legacy is preserved, legacy still cleaned
  const b = loadDodoJuice({ dodo_keep_highscore: '9000', old_key: '500' });
  const hs2 = b.DJ.highscore('keep', ['old_key']);
  eq('existing higher score preserved', b.store.dodo_keep_highscore, '9000');
  ok('legacy old_key removed even when lower', !('old_key' in b.store));
  eq('hs2.get() == 9000', hs2.get(), 9000);

  // (c) no legacy keys -> no migration, starts at 0
  const c = loadDodoJuice();
  const hs3 = c.DJ.highscore('fresh', []);
  eq('fresh slug starts at 0', hs3.get(), 0);
  eq('fresh slug best 0', hs3.best, 0);
}

/* ====================================================================== */
console.log('\n[4] misc invariants');
{
  const { DJ } = loadDodoJuice();
  eq('reducedMotion bool (matchMedia matches:false)', DJ.reducedMotion, false);
  ok('_attempted counters present', DJ._attempted && typeof DJ._attempted.emit === 'number');
  // decorative APIs must not throw without a document
  ok('shake() no-throws w/o element', (function () { try { DJ.shake(null, 5, 100); return true; } catch (e) { return false; } })());
  ok('emit() no-throws w/o overlay', (function () { try { DJ.particles.emit('burst', 10, 10); return true; } catch (e) { return false; } })());
  eq('emit increments _attempted.emit', DJ._attempted.emit >= 1, true);
  ok('haptics guarded (no vibrate)', (function () { try { DJ.haptics.tap(); return true; } catch (e) { return false; } })());
}

/* ---- summary ----------------------------------------------------------- */
console.log('\n' + '-'.repeat(52));
if (failures.length === 0) {
  console.log('ALL PASS — ' + passed + ' assertions');
  process.exit(0);
} else {
  console.log(passed + ' passed, ' + failures.length + ' FAILED:');
  for (const f of failures) console.log('   - ' + f);
  process.exit(1);
}
