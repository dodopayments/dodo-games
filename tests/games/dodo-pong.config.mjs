// Per-game verification config for dodo-pong.
//
// Contract values (gameName, legacyKeys, startSelector) are pulled from the
// frozen snapshot — DO NOT hand-edit them here. Game-specific actions ARE fully
// implemented for this game because it is one of the two Wave-0 proof games the
// harness is run against.
//
// NOTE: the `evaluate` actions reference the game's top-level `let`/`function`
// bindings by bare name (e.g. `playerScore`, `endGame`, `updateHud`). These are
// classic-script globals in the page's main world, so this is test-only state
// steering — it never modifies the shipped game code.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('dodo-pong');

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys,
  highscoreKey: s.newHighscoreKey,
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 7,

  selectors: {
    start: s.startSelector, // #startButton
    restart: s.restartSelector, // #restartButton
    score: '#playerScore',
    gameOverScreen: '#gameOverScreen',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
  },

  // Juice thresholds — the revamp task must satisfy these; against the CURRENT
  // (juice-less) game these WILL fail, which is the proof the harness works.
  juice: { minParticleEmit: 6, minShake: 3 },
  audio: { minCues: 4 },
  videoSeconds: 22,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    // Deterministic scoring: nudge the classic-script global score + refresh HUD.
    scorePoint: async (page) => {
      await page.evaluate(() => {
        try {
          // eslint-disable-next-line no-undef
          playerScore = (typeof playerScore === 'number' ? playerScore : 0) + 1;
          // eslint-disable-next-line no-undef
          if (typeof updateHud === 'function') updateHud();
        } catch (e) { /* ignore */ }
      });
    },

    toGameOver: async (page) => {
      await page.evaluate(() => {
        try {
          // eslint-disable-next-line no-undef
          playerScore = 11;
          // eslint-disable-next-line no-undef
          aiScore = 0;
          // eslint-disable-next-line no-undef
          if (typeof endGame === 'function') endGame('player');
        } catch (e) { /* ignore */ }
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    // >= `seconds` of visible desktop gameplay (paddle motion + periodic scoring).
    play: async (page, { seconds = 22 } = {}) => {
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(110);
        await page.keyboard.up('ArrowLeft');
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(110);
        await page.keyboard.up('ArrowRight');
        if (i % 4 === 0) {
          await page.evaluate(() => {
            try {
              // eslint-disable-next-line no-undef
              playerScore = (typeof playerScore === 'number' ? playerScore : 0) + 1;
              // eslint-disable-next-line no-undef
              if (typeof updateHud === 'function') updateHud();
            } catch (e) { /* ignore */ }
          });
        }
        i += 1;
      }
    },

    // Touch: drive the paddle via synthetic touchmove on the lower (player) half.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const y = rect.top + rect.height * 0.85;
        const fire = (x) => {
          try {
            const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
            c.dispatchEvent(new TouchEvent('touchmove', {
              touches: [t], changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
        };
        for (let k = 0; k < 24; k += 1) {
          fire(rect.left + rect.width * (0.2 + 0.6 * (k % 2)));
        }
      });
    },
  },
};
