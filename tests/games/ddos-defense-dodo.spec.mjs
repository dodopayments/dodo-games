// Verification spec for ddos-defense-dodo (Gateway Defender Dodo).
//
// Runs the full § Verification Strategy assertion set (1–8, 10, 11) against the
// revamped wave-defense game via the shared parameterized harness.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './ddos-defense-dodo.config.mjs';

defineGameSuite(config);
