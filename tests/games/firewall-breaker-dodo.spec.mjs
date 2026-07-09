// Verification spec for firewall-breaker-dodo (revamped Breakout).
//
// Runs the full § Verification Strategy assertion set (smoke, mobile parity,
// audio, juice, persistence, analytics, SEO/brand, no-Tailwind, DPI, videos)
// via the shared parameterized harness against the game's frozen contract +
// real `window.FirewallBreakerTest` hooks (tests/games/firewall-breaker-dodo.config.mjs).
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './firewall-breaker-dodo.config.mjs';

defineGameSuite(config);
