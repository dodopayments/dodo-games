// Verification spec for payment-invaders-dodo (Wave-2 revamp — Payment Invaders).
//
// Runs the full § Verification Strategy assertion set (smoke, mobile parity,
// audio, juice, persistence, analytics continuity, SEO/brand, no-Tailwind-CDN,
// DPI, gameplay videos) against the revamped game via its frozen config.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './payment-invaders-dodo.config.mjs';

defineGameSuite(config);
