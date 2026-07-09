// Verification spec for dodo-dash (Wave-2 revamp — endless runner).
// Runs the full § Verification Strategy assertion set (1–8, 10, 11) from the
// per-game config against the rebuilt game.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './dodo-dash.config.mjs';

defineGameSuite(config);
