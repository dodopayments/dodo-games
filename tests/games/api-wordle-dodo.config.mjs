// Per-game verification config STUB for api-wordle-dodo (API Wordle Dodo).
//
// Contract values (gameName, legacyKeys, startSelector) come from the FROZEN
// snapshot (tests/games/_snapshots.json) — do NOT hand-edit them. Game-specific
// action bodies and juice thresholds are PLACEHOLDERS to be filled by the
// api-wordle-dodo revamp task (Wave 2/3/4). This file is import-safe now; its spec must
// not be run until the placeholders below are implemented.
//
// startVia: auto
// snapshot note: No start button — the guess board is interactive immediately on load. 'gameStart' fires on first interaction/load. legacyKey is a JSON stats object (dodo_wordle_stats: {games,wins}), not a numeric highscore — migration must preserve the object.
import { getSnapshot } from './_snapshot.mjs';

const s = getSnapshot('api-wordle-dodo');

export default {
  slug: s.slug,
  gameName: s.gameName,
  legacyKeys: s.legacyKeys,
  highscoreKey: s.newHighscoreKey,
  isCanvas: s.isCanvas,
  dpiCheck: s.dpiCheck,

  // TODO(revamp): set to a numeric legacy value to prove one-time migration.
  // null skips the migration sub-assertion. legacy key: dodo_wordle_stats
  seededLegacyValue: null,

  selectors: {
    start: s.startSelector,        // null (see startVia above)
    restart: s.restartSelector,    // #newGameBtn
    score: null,                   // TODO(revamp): selector whose text is the numeric score
    gameOverScreen: null,          // TODO(revamp): game-over overlay selector
    canvas: null,
    primaryAction: s.startSelector,
  },

  // TODO(revamp): tune to the redesign's real juice budget (>=N firings on key events).
  juice: { minParticleEmit: null, minShake: null },
  audio: { minCues: 4 },
  videoSeconds: 22,

  // TODO(revamp): implement every action. The harness throws a helpful error for
  // any placeholder action if the spec is run before it is filled in.
  actions: {
    // start: async () => {},  // game auto-starts on load (board interactive immediately)
    // scorePoint: async (page) => { /* perform one scoring action; visible score must increase */ },
    // toGameOver: async (page) => { /* force/reach game over */ },
    // restart: async (page) => { /* return to a playable state */ },
    // play: async (page, { seconds }) => { /* drive >= seconds of real gameplay */ },
    // touchPlay: async (page) => { /* synthetic touch swipes/taps that drive the core verb */ },
  },

  _placeholder: true,
};
