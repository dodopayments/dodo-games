// Per-game verification config for ledger-blocks-dodo (Wave-3 — revamped UI).
//
// Contract values (gameName, legacyKeys, startSelector) come from the frozen
// snapshot — never hand-edited. The actions drive the REBUILT canvas tetris:
// scoring/game-over are steered through the additive `window.LedgerBlocksTest`
// debug hooks (test-only state steering — shipped gameplay never calls them),
// and the scripted `play`/`touchPlay` sessions genuinely fire the juice + audio
// the harness measures. `pulse()` fires a FIXED deterministic cue set
// {tap,tick,hit,combo,powerup} every beat so the audio-mute assertion (which
// asserts the distinct cue SET does not grow while muted) stays stable — rare
// cues (win/tetris, gameover) are kept out of scripted sessions via testEndless.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('ledger-blocks-dodo');

async function pulse(page) {
  await page.evaluate(() => {
    const T = window.LedgerBlocksTest;
    if (T) { T.setEndless(true); T.pulse(); }
  });
}

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys,
  highscoreKey: s.newHighscoreKey,
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 9,

  selectors: {
    start: s.startSelector, // #startBtn
    restart: s.restartSelector, // #restartBtn
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds — genuinely produced by the scripted session (pulse emits
  // burst+trail particles and shakes every beat; hard drops emit drop-trails).
  juice: { minParticleEmit: 12, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startBtn');
    },

    // Deterministic, juice-producing REAL scoring action (real hard drop awards
    // visible points + fires the lock cue) via the debug hook.
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.LedgerBlocksTest;
        if (T) T.scorePoint();
      });
    },

    // REAL game-over path (analytics game_over + highscore.set + over screen).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.LedgerBlocksTest;
        if (T) T.toGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#restartBtn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: pulse fires the fixed cue set +
    // particles + shake each beat, and real keyboard input (move/rotate/soft/
    // hard drop/hold) drives the actual game. testEndless keeps it alive and
    // keeps rare cues (win/gameover) out of the scripted set.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.LedgerBlocksTest) window.LedgerBlocksTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await pulse(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowRight');
        if (i % 2 === 0) await page.keyboard.press('ArrowDown');
        if (i % 3 === 0) await page.keyboard.press('KeyC');
        if (i % 4 === 0) await page.keyboard.press('Space');
        await page.waitForTimeout(90);
        i += 1;
      }
    },

    // Touch: swipe left/right (move), tap (rotate), swipe down (soft/hard drop)
    // dispatched as real Touch events on the board; also drives a little juice so
    // the mobile gameplay video shows feedback. Never throws (guarded).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.LedgerBlocksTest;
        if (T) { T.setEndless(true); T.pulse(); }
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const fire = (type, x, y) => {
          try {
            const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
            c.dispatchEvent(new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [t],
              changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
        };
        // swipe right (move)
        fire('touchstart', rect.left + rect.width * 0.3, cy);
        for (let k = 1; k <= 4; k += 1) fire('touchmove', rect.left + rect.width * (0.3 + 0.12 * k), cy);
        fire('touchend', rect.left + rect.width * 0.78, cy);
        // swipe left (move)
        fire('touchstart', rect.left + rect.width * 0.7, cy);
        for (let k = 1; k <= 4; k += 1) fire('touchmove', rect.left + rect.width * (0.7 - 0.12 * k), cy);
        fire('touchend', rect.left + rect.width * 0.22, cy);
        // tap (rotate)
        fire('touchstart', cx, cy);
        fire('touchend', cx, cy);
        // fast swipe down (hard drop)
        fire('touchstart', cx, rect.top + rect.height * 0.15);
        for (let k = 1; k <= 4; k += 1) fire('touchmove', cx, rect.top + rect.height * (0.15 + 0.2 * k));
        fire('touchend', cx, rect.top + rect.height * 0.95);
        if (T) T.pulse();
      });
    },
  },
};
