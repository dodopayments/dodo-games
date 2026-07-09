// Verification spec for api-wordle-dodo (API Wordle Dodo — revamped).
//
// Runs the full § Verification Strategy assertion set (smoke, mobile parity,
// audio, juice, persistence, analytics continuity, SEO/brand, no-Tailwind,
// gameplay videos) via the shared game-suite against the config's real
// window.ApiWordleTest debug hooks.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './api-wordle-dodo.config.mjs';

defineGameSuite(config);
