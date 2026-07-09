// Verification spec for checkout-rush-dodo (revamped DOM payment-matching rush).
// Runs the full § Verification Strategy assertion set from the per-game config.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './checkout-rush-dodo.config.mjs';

defineGameSuite(config);
