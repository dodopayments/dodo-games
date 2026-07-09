// Verification spec for dodo-pong (Wave-0 proof game).
//
// Run against the CURRENT, un-revamped game the audio (#3) and juice (#4)
// assertions MUST FAIL — the game has no DodoJuice, so the spies record zero
// cues and zero particle/shake firings. That failure is the desired proof that
// the harness measures real quality and cannot be gamed by "builds + loads".
import { defineGameSuite } from '../harness/game-suite.mjs';
import config from './dodo-pong.config.mjs';

defineGameSuite(config);
