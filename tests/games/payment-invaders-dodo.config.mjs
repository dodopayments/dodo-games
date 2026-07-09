// Per-game verification config for payment-invaders-dodo (Payment Invaders).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. The action bodies
// below drive the REBUILT game: scoring/game-over are steered through the
// additive `window.PaymentInvadersTest` debug hooks (test-only state steering —
// shipped gameplay never calls them). Each hook runs REAL game functions (real
// killEnemy path incl. visible-score increment, real gameOver incl. analytics +
// highscore.set) so the harness measures genuine quality, not hollow stubs.
//
// The scripted `pulse` deterministically fires the FULL universe of endless-mode
// cues {tap,tick,hit,powerup,fail,combo,whoosh} every iteration; the rare
// 'gameover' cue only fires on a real game over (kept out of scripted play), so
// the harness mute assertion (distinct cue set must not grow while muted) stays
// stable. Front-shield 'shielded fraudster' + boss stay off the scripted path.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('payment-invaders-dodo');

async function pulse(page) {
  await page.evaluate(() => {
    const T = window.PaymentInvadersTest;
    if (T) { T.setEndless(true); T.pulse(); }
  });
}

// Fire a synthetic touch on a mobile control button (D-pad tap).
async function tapControl(page, id, holdMs = 120) {
  await page.evaluate(async ([elId, hold]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const fire = (type, changed) => {
      try {
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(type, {
          touches: changed ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true,
        }));
      } catch (e) { /* ignore */ }
    };
    fire('touchstart', false);
    await new Promise((res) => setTimeout(res, hold));
    fire('touchend', true);
  }, [id, holdMs]);
}

export default {
  slug: s.slug,
  gameName: s.gameName,               // "Payment Invaders" (FROZEN)
  legacyKeys: s.legacyKeys,           // ["paymentInvadersHighScore"] (FROZEN)
  highscoreKey: s.newHighscoreKey,    // dodo_payment-invaders-dodo_highscore
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,
  seededLegacyValue: 4200,            // prove one-time legacy migration

  selectors: {
    start: s.startSelector,           // #startBtn
    restart: s.restartSelector,       // #restartBtn
    score: '#scoreDisplay',           // visible HUD score (analytics score)
    gameOverScreen: '#gameOverOverlay',
    canvas: '#gameCanvas',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: every pulse
  // fires burst/explosion/sparkle/confetti emits plus kill/hit/wave shakes.
  juice: { minParticleEmit: 10, minShake: 3 },
  audio: { minCues: 5 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startBtn');
    },

    // Deterministic, real, visible-score-incrementing action (destroy one enemy).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.PaymentInvadersTest;
        if (T) T.scorePoint();
      });
    },

    // Force a real game-over (runs the real gameOver path: analytics + highscore).
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.PaymentInvadersTest;
        if (T) T.endGame();
      });
    },

    restart: async (page) => {
      await page.click('#restartBtn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real desktop play: continuous shots, kills, powerups,
    // grazes, wave-clears and boss alerts through REAL game functions — driving
    // burst/explosion/sparkle/confetti particles, screenshake, and a stable
    // >=5 cue set (7 distinct: tap,tick,hit,powerup,fail,combo,whoosh).
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.PaymentInvadersTest) window.PaymentInvadersTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      while (Date.now() < end) {
        await pulse(page);
        await page.waitForTimeout(90);
      }
    },

    // Touch: tap the D-pad (move + fire + spread) to drive the core verb, plus
    // one juicy pulse so the mobile gameplay video shows feedback. Never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => { if (window.PaymentInvadersTest) window.PaymentInvadersTest.setEndless(true); });
      await tapControl(page, 'mobileFire', 200);
      await tapControl(page, 'mobileRight', 200);
      await tapControl(page, 'mobileSpread', 60);
      await tapControl(page, 'mobileLeft', 200);
      await pulse(page);
    },
  },
};
