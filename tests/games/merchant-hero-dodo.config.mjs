// Per-game verification config for merchant-hero-dodo (Merchant Hero) — Wave-2 revamp.
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. The actions drive
// the REBUILT game: scoring / game-over / juice are steered through the game's
// additive `window.MerchantHeroTest` debug hooks (test-only steering — the
// shipped gameplay never calls them; every hook invokes REAL game functions:
// real kills via destroyEnemy, real game-over via gameOver() incl. analytics +
// DodoJuice highscore.set, real upgrades via applyUpgrade, real waveComplete
// analytics). The scripted play/touchPlay sessions genuinely fire the juice +
// audio cues the harness measures (per-frame engine trail + explosions on
// kills => >=10 particle emits; kills/damage/shield/boss => screenshake; and
// >=5 distinct cues: tap/score/fail/whoosh/powerup/combo).
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('merchant-hero-dodo');

// Serialized in-page helper: exercise one round of the MerchantHeroTest hooks so
// each cycle fires the full cue roster + particles + shakes deterministically.
async function pulse(page, i) {
  await page.evaluate((n) => {
    const T = window.MerchantHeroTest;
    if (!T) return;
    T.setEndless(true);
    T.shoot();
    if (n % 2 === 0) T.scorePoint();       // real kill: explosion + shake + 'score'
    if (n % 3 === 0) T.damage();            // real damage: shake + flash + 'fail'
    if (n % 2 === 1) T.shield();            // real shield: 'whoosh' + sparkle
    if (n % 4 === 0) T.pickUpgrade('firerate'); // real upgrade: 'powerup'
    if (n % 5 === 0) T.waveClearPulse();    // real wave-clear: 'combo' + waveComplete
  }, i);
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // "Merchant Hero" (FROZEN)
  legacyKeys: s.legacyKeys,           // ["dodoHighscore"] (FROZEN)
  highscoreKey: s.newHighscoreKey,    // dodo_merchant-hero-dodo_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 4200,            // prove one-time legacy migration

  selectors: {
    start: s.startSelector,           // #start-btn (FROZEN)
    restart: '#restart-btn',
    score: '#score-display',          // "$1,234" -> 1234 via harness readScore
    gameOverScreen: '#game-over-screen',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds — genuinely produced by the scripted session (per-frame
  // engine trail emits + explosion bursts on kills; kills/damage/shield shake).
  juice: { minParticleEmit: 10, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#start-btn');
    },

    // Deterministic, juice-producing player kill via the real destroy path.
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.MerchantHeroTest;
        if (T) T.scorePoint();
      });
    },

    // Force a real game-over (analytics gameOver + newHighScore + highscore.set).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.MerchantHeroTest;
        if (T) T.endGame();
      });
    },

    restart: async (page) => {
      await page.click('#restart-btn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop gameplay: ship motion + shots + kills +
    // shield + upgrades + wave-clears so the juice/audio spies see per-frame
    // trail + explosion particles, screenshake, and >=5 distinct cues.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => {
        const T = window.MerchantHeroTest;
        if (T) { T.setEndless(true); T.setAutoFire(true); }
      });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await pulse(page, i);
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(90);
        await page.keyboard.up('ArrowUp');
        await page.keyboard.down('ArrowDown');
        await page.waitForTimeout(90);
        await page.keyboard.up('ArrowDown');
        i += 1;
      }
    },

    // Touch: drag the ship across the canvas + tap the shield / auto-fire
    // controls, and drive a little juice so the mobile clip shows feedback.
    // Never throws (guarded).
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.MerchantHeroTest;
        if (T) { T.setEndless(true); T.shoot(); T.scorePoint(); }
        const c = document.getElementById('gameCanvas');
        if (c) {
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
          fire('touchstart', rect.left + rect.width * 0.25, rect.top + rect.height * 0.5);
          for (let k = 0; k < 20; k += 1) {
            fire('touchmove', rect.left + rect.width * (0.18 + 0.28 * (k % 2)), rect.top + rect.height * (0.25 + 0.5 * ((k >> 1) % 2)));
          }
          fire('touchend', rect.left + rect.width * 0.3, rect.top + rect.height * 0.4);
        }
        const sb = document.getElementById('shieldBtn');
        const fb = document.getElementById('fireBtn');
        try { if (sb) sb.click(); } catch (e) { /* ignore */ }
        try { if (fb) fb.click(); } catch (e) { /* ignore */ }
        if (T) { T.shield(); T.pickUpgrade('spread'); }
      });
    },
  },
};
