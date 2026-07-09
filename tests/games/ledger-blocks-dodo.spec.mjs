// Verification spec for ledger-blocks-dodo (Wave-3 revamp).
// Runs the full § Verification Strategy assertion set (1-8, 10, 11) from the
// per-game config against the rebuilt, DodoJuice-wired canvas tetris.
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './ledger-blocks-dodo.config.mjs';

defineGameSuite(config);
