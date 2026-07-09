// Per-game verification config for fraud-whacker-dodo (Fraud Whacker Dodo — revamped).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. The action bodies
// drive the REBUILT DOM whack-a-mole through its additive `window.FraudWhackerTest`
// debug hooks (test-only state steering — shipped gameplay never calls them) plus
// real touch taps on actual holes for the mobile session.
//
// startVia: button (#startButton). The scripted `play`/`touchPlay` sessions
// genuinely fire the juice + audio cues the harness measures: each `pulse` does a
// real fraud whack (burst particles + screenshake + score++) and plays the FIXED
// cue set {tick, hit, score, fail}. The frenzy 'whoosh' siren and 'gameover' sting
// are deliberately kept OUT of the scripted loop (testEndless guards them) so the
// muted-session assertion sees a stable, non-growing distinct cue set.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('fraud-whacker-dodo');

export default {
  slug: s.slug,
  gameName: s.gameName,               // 'Fraud Whacker Dodo'
  legacyKeys: s.legacyKeys,           // ['dodo_fraud_whacker_highscore']
  highscoreKey: s.newHighscoreKey,    // dodo_fraud-whacker-dodo_highscore
  isCanvas: s.isCanvas,               // false (DOM game)
  dpiCheck: s.dpiCheck,               // false

  // Numeric legacy value → proves one-time migration into the slug key.
  seededLegacyValue: 42,

  selectors: {
    start: s.startSelector,           // #startButton
    restart: '#restartButton',
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    canvas: null,
    primaryAction: s.startSelector,   // #startButton — Dodo Green background
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: every pulse
  // emits a whack burst + a sparkle pad and fires one screenshake. ~40 pulses in
  // 8s clear these floors with head-room.
  juice: { minParticleEmit: 12, minShake: 4 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startButton');
    },

    // Deterministic, juice-producing whack on a real fraud target.
    scorePoint: async (page) => {
      await page.evaluate(() => { if (window.FraudWhackerTest) window.FraudWhackerTest.scorePoint(); });
    },

    // Real end flow: analytics gameOver + highscore.set + game-over overlay.
    toGameOver: async (page) => {
      await page.evaluate(() => { if (window.FraudWhackerTest) window.FraudWhackerTest.toGameOver(); });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real gameplay: real whacks + the fixed cue set {tick,hit,
    // score,fail} via FraudWhackerTest.pulse, interleaved with real key whacks.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.FraudWhackerTest) window.FraudWhackerTest.setEndless(true); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        await page.evaluate(() => { if (window.FraudWhackerTest) window.FraudWhackerTest.pulse(); });
        // occasionally whack a real hole via keyboard to exercise the input path
        if (i % 3 === 0) await page.keyboard.press(String((i % 9) + 1));
        await page.waitForTimeout(120);
        i += 1;
      }
    },

    // Touch: spawn a fraud into each hole then fire a real touchstart on that hole
    // element (drives the core "whack" verb). Guarded — never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const T = window.FraudWhackerTest;
        if (T) T.setEndless(true);
        const holes = document.querySelectorAll('.fw-hole');
        if (!holes.length) return;
        for (let k = 0; k < holes.length; k += 1) {
          const idx = T ? T.spawnFraud(k) : null;
          const hole = holes[k];
          const rect = hole.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          try {
            const t = new Touch({ identifier: k + 1, target: hole, clientX: x, clientY: y });
            hole.dispatchEvent(new TouchEvent('touchstart', {
              touches: [t], changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { /* ignore */ }
          void idx;
        }
      });
    },
  },
};
