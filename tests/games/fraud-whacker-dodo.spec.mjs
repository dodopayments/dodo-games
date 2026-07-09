// Verification spec for fraud-whacker-dodo (revamped DOM whack-a-mole).
// Runs the full § Verification Strategy assertion set from the per-game config.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './fraud-whacker-dodo.config.mjs';

defineGameSuite(config);
