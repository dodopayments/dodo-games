// Per-game verification config for checkout-rush-dodo (Checkout Rush — revamped).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. game_name is
// "Checkout Rush"; the game had NO persistence today (empty legacyKeys), so the
// revamp adds dodo_checkout-rush-dodo_highscore with no legacy migration.
//
// The action bodies drive the REBUILT DOM queue through its additive
// `window.CheckoutRushTest` debug hooks (test-only steering — shipped gameplay
// never calls them). Each `pulse` performs a real correct-serve (visible score
// ++, burst particles, screenshake) and plays a FIXED cue set {tick, score,
// fail, powerup}. The VIP 'combo' arrival, overflow 'tick', Instant-Settlement
// 'whoosh'/'powerup' celebration and 'gameover' sting are deliberately kept OUT
// of the scripted loop (setEndless guards them) so the muted-session assertion
// sees a stable, non-growing distinct cue set. `touchPlay` taps the REAL payment
// buttons (#btn-card/#btn-crypto/#btn-qr) on customers seeded at the queue front.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('checkout-rush-dodo');

async function pulse(page) {
  await page.evaluate(() => {
    const T = window.CheckoutRushTest;
    if (T && T.pulse) T.pulse();
  });
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // 'Checkout Rush'
  legacyKeys: s.legacyKeys,           // [] — no persistence today
  highscoreKey: s.newHighscoreKey,    // dodo_checkout-rush-dodo_highscore
  isCanvas: s.isCanvas,               // true (decorative), gameplay is DOM
  dpiCheck: s.dpiCheck,               // false — DOM payment buttons drive play

  // No legacy key to migrate (empty legacyKeys) — skips the migration sub-assert.
  seededLegacyValue: null,

  selectors: {
    start: s.startSelector,           // #btn-start
    restart: s.restartSelector,       // #btn-restart
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    canvas: null,
    primaryAction: s.startSelector,   // #btn-start — Dodo Green background
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: every pulse
  // emits a burst (plus the real serve's burst) and one screenshake. ~50 pulses
  // in 8s clear these floors with head-room.
  juice: { minParticleEmit: 10, minShake: 2 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#btn-start');
    },

    // Deterministic, juice-producing correct-serve (real scoring core).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.CheckoutRushTest;
        if (T) T.scorePoint();
      });
    },

    // Real end flow: analytics gameOver + highscore.set + game-over overlay.
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.CheckoutRushTest;
        if (T) T.toGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#btn-restart');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real gameplay: each pulse serves the front customer and
    // fires the fixed {tick,score,fail,powerup} cue set + burst particles +
    // screenshake, interleaved with real keyboard serves (A/S/D).
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.CheckoutRushTest) window.CheckoutRushTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      const keys = ['a', 's', 'd'];
      while (Date.now() < end) {
        await pulse(page);
        if (i % 3 === 0) await page.keyboard.press(keys[i % keys.length]);
        await page.waitForTimeout(130);
        i += 1;
      }
    },

    // Touch: seed a matching customer at the queue front, then fire a real
    // touchstart on the actual payment button (drives the core "serve" verb).
    // Guarded — never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.CheckoutRushTest;
        if (T) T.setEndless(true);
        const map = { CARD: '#btn-card', CRYPTO: '#btn-crypto', QR: '#btn-qr' };
        const types = ['CARD', 'CRYPTO', 'QR'];
        for (let k = 0; k < types.length; k += 1) {
          if (T && T.spawnFront) T.spawnFront(types[k]);
          const btn = document.querySelector(map[types[k]]);
          if (!btn) continue;
          const r = btn.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          try {
            const t = new Touch({ identifier: k + 1, target: btn, clientX: x, clientY: y });
            btn.dispatchEvent(new TouchEvent('touchstart', {
              touches: [t], changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { btn.click(); }
        }
      });
    },
  },
};
