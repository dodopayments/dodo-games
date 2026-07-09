// Verification spec for token-match-dodo (Wave-3 DOM memory game).
//
// Drives the full § Verification Strategy assertion set (smoke, mobile parity,
// audio, juice, persistence, analytics, SEO/brand, no-Tailwind, videos) through
// the game's real scoring/win paths and its additive window.TokenMatchTest hooks.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './token-match-dodo.config.mjs';

defineGameSuite(config);
