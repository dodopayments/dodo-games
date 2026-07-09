// Verification spec for revenue-2048-dodo (Wave-0 proof game).
//
// Against the CURRENT game the audio (#3) and juice (#4) assertions MUST FAIL
// (no DodoJuice wired). Proves the harness detects missing quality.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './revenue-2048-dodo.config.mjs';

defineGameSuite(config);
