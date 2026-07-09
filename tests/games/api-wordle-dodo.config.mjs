// Per-game verification config for api-wordle-dodo (API Wordle Dodo — revamped).
//
// Contract values (gameName, legacyKeys, restartSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — never hand-edited. The action bodies
// drive the REBUILT game through its additive `window.ApiWordleTest` debug hooks
// (test-only state steering — shipped gameplay never calls them).
//
// startVia: auto — there is no start button. The game auto-starts in Daily mode
// on load; the deterministic test "start" instead forces a fresh, replayable
// round with a KNOWN answer (AUDIT) via ApiWordleTest.start so scripted guesses
// are deterministic. A persistent header toggle (Daily | Free Play) + a Hard
// Mode toggle live in the top bar; the visible numeric HUD element is the
// current-streak value (#statStreak), which readScore reads.
//
// Persistence contract: the numeric high-score key `dodo_api-wordle-dodo_highscore`
// mirrors the player's MAX STREAK (written on boot + every finished game via
// DodoJuice.highscore(slug, [])). The legacy stats object `dodo_wordle_stats`
// stays the canonical stats store and is migrated losslessly into an extended
// shape ({games,wins,currentStreak,maxStreak,guessDist,lastDailyDay,lastDailyWon}).
// `seededLegacyValue` is therefore a JSON stats object (not a bare number): on
// first load the migration reads its maxStreak (3) and writes the numeric mirror.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('api-wordle-dodo');

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys,          // ['dodo_wordle_stats']
  highscoreKey: s.newHighscoreKey,   // dodo_api-wordle-dodo_highscore
  isCanvas: s.isCanvas,              // false (DOM game)
  dpiCheck: s.dpiCheck,              // false

  // Seeded legacy stats object → migration must surface maxStreak into the
  // numeric high-score mirror (proves one-time, lossless migration).
  seededLegacyValue: '{"games":9,"wins":6,"currentStreak":3,"maxStreak":3}',

  selectors: {
    start: null,                     // no start button (auto-start on load)
    restart: s.restartSelector,      // #newGameBtn
    score: '#statStreak',            // visible numeric HUD: current streak
    gameOverScreen: '#resultOverlay', // result/definition overlay
    canvas: null,
    primaryAction: '#modeDaily',     // active mode toggle — Dodo Green background
    mute: '.da-mute-toggle',
  },

  // Juice thresholds genuinely produced by the scripted session: each valid
  // reveal emits a burst per present/correct tile; each invalid word shakes the
  // row. Conservative floors leave head-room for reveal-animation skips.
  juice: { minParticleEmit: 8, minShake: 3 },
  audio: { minCues: 4 },
  videoSeconds: 24,

  actions: {
    // Deterministic start: force a replayable Daily round with a KNOWN answer.
    start: async (page) => {
      await page.evaluate(() => { if (window.ApiWordleTest) window.ApiWordleTest.start('AUDIT'); });
    },

    // Submit the exact answer → real win path (streak + HUD increment).
    scorePoint: async (page) => {
      await page.evaluate(() => { if (window.ApiWordleTest) window.ApiWordleTest.scorePoint(); });
    },

    // Real end flow: reveal + stats + analytics + definition overlay.
    toGameOver: async (page) => {
      await page.evaluate(() => { if (window.ApiWordleTest) window.ApiWordleTest.toGameOver(); });
    },

    // Restart returns to a playable board.
    restart: async (page) => {
      await page.click('#newGameBtn');
    },

    toggleMute: async (page) => {
      await page.click('.da-mute-toggle');
    },

    // >= `seconds` of real gameplay firing the fixed cue set {tap,tick,score,fail}.
    // Valid non-answer guesses reveal tiles (tick + score + fail + burst
    // particles); invalid words fail+shake; the round auto-resets before the
    // final row so win/gameover never fire inside the loop.
    play: async (page, { seconds = 24 } = {}) => {
      await page.evaluate(() => { if (window.ApiWordleTest) window.ApiWordleTest.beginScriptedPlay(); });
      const end = Date.now() + seconds * 1000;
      let i = 0;
      while (Date.now() < end) {
        // Let any in-flight tile reveal finish so the next step is not skipped
        // (guard must exceed the reveal safety-net so `revealing` always clears).
        let guard = 0;
        while (guard < 16 && await page.evaluate(() => !!(window.ApiWordleTest && window.ApiWordleTest.isBusy()))) {
          await page.waitForTimeout(90);
          guard += 1;
        }
        await page.evaluate((n) => { if (window.ApiWordleTest) window.ApiWordleTest.scriptedStep(n); }, i);
        await page.waitForTimeout(160);
        i += 1;
      }
    },

    // Touch: tap on-screen keyboard keys via synthetic touch events. Guarded;
    // never throws.
    touchPlay: async (page) => {
      await page.evaluate(() => { if (window.ApiWordleTest) window.ApiWordleTest.touchScript(); });
    },
  },
};
