// Opt-in Lighthouse spec for dodo-pong (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/dodo-pong.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './dodo-pong.config.mjs';

defineLighthouseSpec(config);
