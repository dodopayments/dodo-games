// Per-game verification config for revenue-2048-dodo.
//
// Contract values pulled from the frozen snapshot. Fully-implemented actions
// (second Wave-0 proof game). Test-only state steering references the game's
// classic-script globals (`score`, `endGame`, `updateHud`) by bare name.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('revenue-2048-dodo');

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys,
  highscoreKey: s.newHighscoreKey,
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 512,

  selectors: {
    start: s.startSelector, // #startButton
    restart: s.restartSelector, // #restartButton
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    primaryAction: s.startSelector,
  },

  juice: { minParticleEmit: 4, minShake: null },
  audio: { minCues: 4 },
  videoSeconds: 22,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    scorePoint: async (page) => {
      await page.evaluate(() => {
        try {
          // eslint-disable-next-line no-undef
          score = (typeof score === 'number' ? score : 0) + 4;
          // eslint-disable-next-line no-undef
          if (typeof updateHud === 'function') updateHud();
        } catch (e) { /* ignore */ }
      });
    },

    toGameOver: async (page) => {
      await page.evaluate(() => {
        try {
          // eslint-disable-next-line no-undef
          if (typeof endGame === 'function') endGame();
        } catch (e) { /* ignore */ }
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    // >= `seconds` of visible desktop gameplay (arrow-key moves + periodic score).
    play: async (page, { seconds = 22 } = {}) => {
      const end = Date.now() + seconds * 1000;
      const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
      let i = 0;
      while (Date.now() < end) {
        await page.keyboard.press(keys[i % 4]);
        await page.waitForTimeout(220);
        if (i % 5 === 0) {
          await page.evaluate(() => {
            try {
              // eslint-disable-next-line no-undef
              score = (typeof score === 'number' ? score : 0) + 4;
              // eslint-disable-next-line no-undef
              if (typeof updateHud === 'function') updateHud();
            } catch (e) { /* ignore */ }
          });
        }
        i += 1;
      }
    },

    // Touch: swipe the board (game listens to touchstart/touchend dx/dy).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const g = document.getElementById('grid');
        if (!g) return;
        const r = g.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const ts = (x, y) => {
          const t = new Touch({ identifier: 1, target: g, clientX: x, clientY: y });
          g.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true }));
        };
        const te = (x, y) => {
          const t = new Touch({ identifier: 1, target: g, clientX: x, clientY: y });
          g.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true }));
        };
        const swipe = (dx, dy) => { ts(cx, cy); te(cx + dx, cy + dy); };
        swipe(90, 0); swipe(0, 90); swipe(-90, 0); swipe(0, -90);
      });
    },
  },
};
