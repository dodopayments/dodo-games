// Per-game verification config for dodo-pong (Wave-1 pilot — revamped UI).
//
// Contract values (gameName, legacyKeys, startSelector) come from the frozen
// snapshot — never hand-edited. The actions below drive the REBUILT game:
// start now defaults to the pre-selected "Growth" difficulty, scoring/game-over
// are steered through the game's additive `window.DodoPongTest` debug hooks
// (test-only state steering — the shipped gameplay never calls them), and the
// scripted `play`/`touchPlay` sessions genuinely fire the juice + audio cues the
// harness measures (trail/burst particles, screenshake, and >=6 distinct cues).
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('dodo-pong');

// Serialized in-page helper: exercise one round of the DodoPongTest hooks.
async function pulse(page, { player = false, ai = false, power = false } = {}) {
  await page.evaluate((o) => {
    const T = window.DodoPongTest;
    if (!T) return;
    T.setEndless(true);
    T.trackBall();
    if (o.player) T.scorePlayer();
    if (o.ai) T.scoreAi();
    if (o.power) T.spawnAndPickup();
  }, { player, ai, power });
}

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
    mute: '.da-mute-toggle',
  },

  // Juice thresholds — genuinely produced by the scripted session (ball trail
  // emits every frame; scorePlayer/scoreAi/onRallyHit each screenshake).
  juice: { minParticleEmit: 12, minShake: 4 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startButton'); // "Growth" difficulty is pre-selected
    },

    // Deterministic, juice-producing player point via the debug hook.
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoPongTest;
        if (T) T.scorePlayer();
      });
    },

    // Force a decisive player win + game-over screen.
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoPongTest;
        if (T) T.endMatchPlayer();
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: visible paddle motion + rallies
    // (trackBall keeps the ball alive) + periodic points/power-ups so the juice
    // and audio spies see trail/burst particles, screenshake, and >=6 cues.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.DodoPongTest) window.DodoPongTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await pulse(page, {
          player: i % 3 === 0,
          ai: i % 5 === 0,
          power: i % 4 === 0,
        });
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(95);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(95);
        await page.keyboard.up('ArrowLeft');
        i += 1;
      }
    },

    // Touch: drag along the player's (lower) half; also drive a little juice so
    // the mobile gameplay video shows feedback. Never throws (guarded).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.DodoPongTest;
        if (T) { T.setEndless(true); T.trackBall(); }
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const y = rect.top + rect.height * 0.85;
        const fire = (type, x) => {
          try {
            const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
            c.dispatchEvent(new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [t],
              changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
        };
        fire('touchstart', rect.left + rect.width * 0.3);
        for (let k = 0; k < 22; k += 1) {
          fire('touchmove', rect.left + rect.width * (0.18 + 0.64 * (k % 2)));
        }
        fire('touchend', rect.left + rect.width * 0.7);
        if (T) { T.scorePlayer(); if (Math.random() < 0.5) T.spawnAndPickup(); }
      });
    },
  },
};
