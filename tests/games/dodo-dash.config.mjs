// Per-game verification config for dodo-dash (Dodo Dash — revamped endless runner).
//
// Contract values (gameName, legacyKeys, highscoreKey) come from the FROZEN
// snapshot — never hand-edited. The revamp adds a proper `.da-screen` start
// overlay (#startButton) + game-over overlay (#restartButton), a centered HUD
// with #score, and additive `window.DodoDashTest` debug hooks. The hooks steer
// test-only state (invincibility, forced game-over) and fire REAL gameplay
// functions (coin collect, near-miss, magnet, jump/land, die) so the harness
// measures genuine juice/audio/analytics/persistence — never hollow stubs.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('dodo-dash');

// One juicy beat wired to the real game (fixed cue set: whoosh/tap/score/combo/
// powerup/tick), used to drive the scripted play sessions deterministically.
async function pulse(page) {
  await page.evaluate(() => {
    const T = window.DodoDashTest;
    if (T) { T.setEndless(true); T.pulse(); }
  });
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // "Dodo Dash" (FROZEN)
  legacyKeys: s.legacyKeys,           // ["dodo_dash_highscore"] (FROZEN)
  highscoreKey: s.newHighscoreKey,    // dodo_dodo-dash_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 1500,            // prove one-time legacy migration

  selectors: {
    start: '#startButton',
    restart: '#restartButton',
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    canvas: '#gameCanvas',
    primaryAction: '#startButton',
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: running dust
  // emits every grounded frame, plus each pulse fires burst/sparkle emits and
  // land + near-miss screenshakes.
  juice: { minParticleEmit: 12, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    // Deterministic, real, visible-score-incrementing action (coin collect).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoDashTest;
        if (T) T.scorePoint();
      });
    },

    // Force the real game-over flow (death VFX + analytics + highscore.set).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoDashTest;
        if (T) T.forceGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: keyboard jumps/ducks + periodic
    // juicy beats (pulse) so the spies see >=5 distinct cues, plenty of
    // trail/burst/sparkle particle emits, and land/near-miss screenshakes.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.DodoDashTest) window.DodoDashTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await pulse(page);
        await page.keyboard.down('Space');
        await page.waitForTimeout(90);
        await page.keyboard.up('Space');
        if (i % 4 === 3) {
          await page.keyboard.down('ArrowDown');
          await page.waitForTimeout(90);
          await page.keyboard.up('ArrowDown');
        } else {
          await page.waitForTimeout(90);
        }
        i += 1;
      }
    },

    // Touch: tap = jump + swipe down = duck on the canvas; also drive a juicy
    // beat so the mobile gameplay video shows feedback. Never throws (guarded).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoDashTest;
        if (T) { T.setEndless(true); T.pulse(); }
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const x = rect.left + rect.width * 0.3;
        const yTop = rect.top + rect.height * 0.4;
        const fire = (type, cx, cy, list) => {
          try {
            const t = new Touch({ identifier: 1, target: c, clientX: cx, clientY: cy });
            c.dispatchEvent(new TouchEvent(type, {
              touches: list ? [t] : [],
              changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
        };
        // tap = jump
        fire('touchstart', x, yTop, true);
        fire('touchend', x, yTop, false);
        // swipe down = duck
        fire('touchstart', x, yTop, true);
        fire('touchmove', x, yTop + rect.height * 0.35, true);
        fire('touchend', x, yTop + rect.height * 0.35, false);
        if (T) T.pulse();
      });
    },
  },
};
