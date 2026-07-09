// Verification spec for snake-game-dodo (Transaction Snake, Wave-4 revamp).
//
// Runs the full § Verification Strategy assertion set (smoke, mobile parity,
// audio, juice, persistence, analytics, SEO/brand, no-Tailwind, DPI, videos)
// against the rebuilt game via the shared harness + frozen config.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './snake-game-dodo.config.mjs';

defineGameSuite(config);
