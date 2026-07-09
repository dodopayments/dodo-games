// Per-game verification config for firewall-breaker-dodo (revamped Breakout).
//
// Contract values (gameName, legacyKeys, highscoreKey) come from the FROZEN
// snapshot — never hand-edited. The revamp rebuilds the UI on the `.da-*`
// substrate (#startButton start / #restartButton restart / #score HUD /
// #gameOverScreen overlay) and adds additive `window.FirewallBreakerTest` debug
// hooks. The hooks steer test-only state (endless/invincible, forced game-over)
// and fire the REAL gameplay functions (brick destruction, power-up pickup,
// life-lost + level-clear beats) so the harness measures genuine juice/audio/
// analytics/persistence — never hollow stubs.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('firewall-breaker-dodo');

// One juicy beat wired to the real game (cue set: hit/combo/tap/powerup/fail/
// tick, plus win on level clears), used to drive scripted play deterministically.
async function pulse(page) {
  await page.evaluate(() => {
    const T = window.FirewallBreakerTest;
    if (T) { T.setEndless(true); T.pulse(); }
  });
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // "Firewall Breaker Dodo" (FROZEN)
  legacyKeys: s.legacyKeys,           // ["dodo_firewall_breaker_highscore"] (FROZEN)
  highscoreKey: s.newHighscoreKey,    // dodo_firewall-breaker-dodo_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 12,              // prove one-time legacy migration

  selectors: {
    start: '#startButton',
    restart: '#restartButton',
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    canvas: '#gameCanvas',
    primaryAction: '#startButton',
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: the ball trail
  // emits every frame, plus each pulse fires burst/explosion/sparkle emits and
  // brick-break + life-lost + level-clear screenshakes.
  juice: { minParticleEmit: 12, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    // Deterministic, real, visible-score-incrementing action (break one brick).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.FirewallBreakerTest;
        if (T) T.breakBrick();
      });
    },

    // Force the real game-over flow (death VFX + analytics + highscore.set).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.FirewallBreakerTest;
        if (T) T.forceGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: keyboard paddle motion + periodic
    // juicy beats (pulse) so the spies see >=5 distinct cues, plenty of
    // trail/burst/explosion/sparkle particle emits, and brick-break/life-lost
    // screenshakes. Endless mode keeps the run alive for the full duration.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.FirewallBreakerTest) window.FirewallBreakerTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await pulse(page);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(95);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(95);
        await page.keyboard.up('ArrowLeft');
        i += 1;
      }
    },

    // Touch: drag the paddle along the lower half of the canvas; also drive a
    // juicy beat so the mobile gameplay video shows feedback. Never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.FirewallBreakerTest;
        if (T) { T.setEndless(true); T.pulse(); }
        const c = document.getElementById('gameCanvas');
        if (!c) return;
        const rect = c.getBoundingClientRect();
        const y = rect.top + rect.height * 0.9;
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
        if (T) T.pulse();
      });
    },
  },
};
