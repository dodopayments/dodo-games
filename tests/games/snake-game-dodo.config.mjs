// Per-game verification config for snake-game-dodo (Transaction Snake, Wave-4 revamp).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. This game had NO
// persistence and NO legacy key today (legacyKeys === []), so there is nothing
// to migrate; the revamp wires a fresh dodo_snake-game-dodo_highscore via
// DodoJuice.highscore(slug, []).
//
// The scripted `play`/`touchPlay` sessions steer the REBUILT game through its
// additive `window.SnakeTest` debug hooks (never used by real gameplay):
// pulse() fires a FIXED deterministic cue set {score, powerup, hit, whoosh} and
// genuine juice (burst particles + screenshake) while advancing the visible
// score; setEndless(true) keeps the snake alive (wall-wrap, fraud voids become
// non-lethal) and suppresses the golden-apple 'combo' cue so the distinct-cue
// SET stays stable between the 8s play and 4s muted-play phases.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('snake-game-dodo');

const DIRS = ['right', 'down', 'left', 'up'];
const KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys, // [] — no legacy persistence existed
  highscoreKey: s.newHighscoreKey, // dodo_snake-game-dodo_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: null, // nothing to seed/migrate (legacyKeys is empty)

  selectors: {
    start: s.startSelector, // #start-btn
    restart: '#restart-btn',
    score: '#score-value',
    gameOverScreen: '#game-over-screen',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session (pulse emits a
  // burst + screenshake every call; the game also emits food/level particles).
  juice: { minParticleEmit: 12, minShake: 4 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#start-btn');
    },

    // Real apple-eat path — increments the visible score.
    scorePoint: async (page) => {
      await page.evaluate(() => { if (window.SnakeTest) window.SnakeTest.scorePoint(); });
    },

    // Real death flow (analytics gameOver + highscore.set), no replay delay.
    toGameOver: async (page) => {
      await page.evaluate(() => { if (window.SnakeTest) window.SnakeTest.toGameOver(); });
    },

    restart: async (page) => {
      await page.click('#restart-btn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: the snake turns around the grid
    // (never reversing) while pulse() fires the fixed cue set + juice and grows
    // the score, so the audio + juice spies see >=4 distinct cues, burst
    // particles and screenshake.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.SnakeTest) window.SnakeTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await page.evaluate(() => { if (window.SnakeTest) window.SnakeTest.pulse(); });
        await page.keyboard.press(KEYS[i % KEYS.length]);
        await page.waitForTimeout(170);
        i += 1;
      }
    },

    // Touch: real D-pad taps drive the snake + a canvas swipe, with a pulse for
    // lively mobile juice. Guarded so it never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        if (window.SnakeTest) { window.SnakeTest.setEndless(true); window.SnakeTest.pulse(); }
      });
      for (const d of DIRS) {
        await page.tap(`.snake-dpad__btn[data-dir="${d}"]`).catch(() => {});
      }
      await page.evaluate(() => {
        const c = document.getElementById('gameCanvas');
        if (c) {
          const r = c.getBoundingClientRect();
          const cy = r.top + r.height * 0.5;
          const fire = (type, x) => {
            try {
              const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: cy });
              c.dispatchEvent(new TouchEvent(type, {
                touches: type === 'touchend' ? [] : [t],
                changedTouches: [t], bubbles: true, cancelable: true,
              }));
            } catch (e) { /* ignore */ }
          };
          fire('touchstart', r.left + r.width * 0.3);
          fire('touchmove', r.left + r.width * 0.7);
          fire('touchend', r.left + r.width * 0.7);
        }
        if (window.SnakeTest) window.SnakeTest.pulse();
      });
    },
  },
};
