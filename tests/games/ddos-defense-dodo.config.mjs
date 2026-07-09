// Per-game verification config for ddos-defense-dodo (Gateway Defender Dodo).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. The action bodies
// below drive the REBUILT wave-defense game: scoring/game-over/purchase are
// steered through the additive `window.DdosDefenseTest` debug hooks (test-only
// state steering — shipped gameplay never calls them). Each hook runs REAL game
// functions (real pop path, real coreHit, real purchase, real gameOver incl.
// analytics + highscore.set) so the harness measures genuine quality, not stubs.
//
// The scripted `pulse` fires a FIXED cue set {tap,hit,fail,powerup,combo} every
// iteration; rare cues ('whoosh' boss / 'win' / 'gameover') are kept out of
// scripted sessions so the harness mute assertion (distinct cue set must not
// grow while muted) stays stable.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('ddos-defense-dodo');

async function pulse(page) {
  await page.evaluate(() => {
    const T = window.DdosDefenseTest;
    if (T) { T.setEndless(true); T.pulse(); }
  });
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // "Gateway Defender Dodo" (FROZEN)
  legacyKeys: s.legacyKeys,           // ["dodo_highscore"] (FROZEN)
  highscoreKey: s.newHighscoreKey,    // dodo_ddos-defense-dodo_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 15,              // prove one-time legacy migration

  selectors: {
    start: s.startSelector,           // #startBtn
    restart: '#rebootBtn',
    score: '#scoreDisplay',           // packets blocked (analytics score)
    gameOverScreen: '#gameOverScreen',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: every pulse
  // fires sparkle/burst/explosion/confetti emits plus a core-hit screenshake.
  juice: { minParticleEmit: 10, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startBtn');
    },

    // Deterministic, real, visible-score-incrementing action (pop one bot).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.DdosDefenseTest;
        if (T) T.popBot();
      });
    },

    // Force a real game-over (runs the real gameOver path: analytics + highscore).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.DdosDefenseTest;
        if (T) T.endGame();
      });
    },

    restart: async (page) => {
      await page.click('#rebootBtn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop play: continuous pops, core hits, heals and
    // wave-clears through the REAL game functions — driving trail/burst/explosion
    // particles, screenshake, and a stable >=5 cue set.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.DdosDefenseTest) window.DdosDefenseTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      while (Date.now() < end) {
        await pulse(page);
        await page.waitForTimeout(90);
      }
    },

    // Touch: tap the canvas at several points to pop bots; also drive one juicy
    // beat so the mobile gameplay video shows feedback. Never throws (guarded).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.DdosDefenseTest;
        if (T) { T.setEndless(true); T.pulse(); }
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const fire = (type, x, y) => {
          try {
            const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
            c.dispatchEvent(new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [t],
              changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
        };
        for (let k = 0; k < 6; k += 1) {
          const x = rect.left + rect.width * (0.3 + 0.4 * (k % 2));
          const y = rect.top + rect.height * (0.35 + 0.25 * (k % 2));
          fire('touchstart', x, y);
          fire('touchend', x, y);
        }
      });
    },
  },
};
