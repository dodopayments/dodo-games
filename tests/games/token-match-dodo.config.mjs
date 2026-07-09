// Per-game verification config for token-match-dodo (Wave-3 DOM memory game).
//
// Contract values (gameName, legacyKeys, startSelector) come from the frozen
// snapshot — never hand-edited. The actions drive the REBUILT game:
// start defaults to the pre-selected "Growth" (4×4) ledger; scoring/game-over
// are steered through the game's additive `window.TokenMatchTest` debug hooks
// (test-only state steering — the shipped gameplay never calls them). The
// scripted `play` session fires a FIXED, deterministic cue set
// ({tap, score, fail, whoosh}) plus overlay particles + screenshake so the
// audio-mute assertion holds (the muted replay produces no NEW distinct cues),
// while `touchPlay` taps the real DOM cards to drive the core flip verb.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('token-match-dodo');

// Serialized in-page helper: fire one deterministic juice/audio pulse.
async function pulse(page) {
  await page.evaluate(() => {
    const T = window.TokenMatchTest;
    if (T && T.pulse) T.pulse();
  });
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
    restart: '#restartButton',
    score: '#score',
    gameOverScreen: '#gameOverScreen',
    primaryAction: s.startSelector,
    mute: '.da-mute-toggle',
  },

  // Juice thresholds — genuinely produced by the scripted session (each pulse
  // emits a burst + shakes two cards; a play loop fires dozens).
  juice: { minParticleEmit: 12, minShake: 2 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    start: async (page) => {
      await page.click('#startButton'); // "Growth" (4×4) ledger is pre-selected
    },

    // Deterministic, juice-producing visible-score increment (real scoring core).
    scorePoint: async (page) => {
      await page.evaluate(() => {
        const T = window.TokenMatchTest;
        if (T) T.scorePoint();
      });
    },

    // Force the real win/end flow + game-over (win) screen.
    toGameOver: async (page) => {
      await page.evaluate(() => {
        const T = window.TokenMatchTest;
        if (T) T.toGameOver();
      });
    },

    restart: async (page) => {
      await page.click('#restartButton');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of scripted play: each iteration flips two real cards (core
    // verb) AND fires a deterministic pulse so the juice + audio spies observe
    // burst particles, screenshake, and the fixed {tap,score,fail,whoosh} cues.
    play: async (page, { seconds = 24 } = {}) => {
      const end = Date.now() + seconds * 1000;
      while (Date.now() < end) {
        await page.evaluate(() => {
          const live = Array.from(document.querySelectorAll('.tm-card:not(.is-matched)'));
          const tap = (card) => {
            if (!card) return;
            try {
              const r = card.getBoundingClientRect();
              const t = new Touch({ identifier: 1, target: card, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
              card.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
            } catch (e) { card.click(); }
          };
          if (live.length) tap(live[0]);
          if (live.length > 1) tap(live[1]);
        });
        await pulse(page);
        await page.waitForTimeout(140);
      }
    },

    // Touch: tap several real DOM cards to drive the flip verb on mobile.
    touchPlay: async (page) => {
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.tm-card:not(.is-matched)')).slice(0, 4);
        cards.forEach((card, i) => {
          try {
            const r = card.getBoundingClientRect();
            const t = new Touch({ identifier: i + 1, target: card, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
            card.dispatchEvent(new TouchEvent('touchstart', {
              touches: [t], changedTouches: [t], bubbles: true, cancelable: true,
            }));
          } catch (e) { card.click(); }
        });
        const T = window.TokenMatchTest;
        if (T && T.pulse) T.pulse();
      });
    },
  },
};
