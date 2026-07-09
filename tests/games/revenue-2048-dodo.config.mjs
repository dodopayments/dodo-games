// Per-game verification config for revenue-2048-dodo (Wave-3 revamp).
//
// Contract values (gameName, legacyKeys, startSelector) come from the frozen
// snapshot — never hand-edited. The actions drive the REBUILT game through its
// additive `window.Revenue2048Test` debug hooks (test-only state steering — the
// shipped gameplay never calls them). Each hook invokes REAL game functions
// (doMove / doRefund / endGame / startGame), so the scripted `play` session
// genuinely fires the juice + audio the harness measures: a deterministic
// FIXED cue set per beat — slide=tap, merge=score, merge-chain=combo,
// Refund=whoosh (the 'win' milestone cue is intentionally kept OUT of the
// scripted loop so the mute assertion sees no new distinct cues).
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
    mute: '.da-mute-toggle',
  },

  juice: { minParticleEmit: 10, minShake: 2 },
  audio: { minCues: 4 },
  videoSeconds: 22,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    // Deterministic real merge ($1 + $1 -> $2) that raises the visible score.
    scorePoint: async (page) => {
      await page.evaluate(() => {
        if (window.Revenue2048Test) window.Revenue2048Test.scorePoint();
      });
    },

    toGameOver: async (page) => {
      await page.evaluate(() => {
        if (window.Revenue2048Test) window.Revenue2048Test.toGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of visible desktop gameplay: real arrow moves (the board
    // visibly slides/merges) plus a deterministic juice/cue beat each tick.
    play: async (page, { seconds = 22 } = {}) => {
      const end = Date.now() + seconds * 1000;
      const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
      let i = 0;
      while (Date.now() < end) {
        await page.keyboard.press(keys[i % 4]);
        await page.evaluate(() => {
          if (window.Revenue2048Test) window.Revenue2048Test.scriptedBeat();
        });
        await page.waitForTimeout(200);
        i += 1;
      }
    },

    // Touch: swipe the board (game listens to touchstart/touchend dx/dy) and
    // fire one guaranteed juice beat so the mobile clip shows real feedback.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const g = document.getElementById('grid');
        if (g) {
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
        }
        if (window.Revenue2048Test) window.Revenue2048Test.scriptedBeat();
      });
    },
  },
};
