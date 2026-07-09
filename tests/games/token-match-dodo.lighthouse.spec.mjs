// Opt-in Lighthouse spec for token-match-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/token-match-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './token-match-dodo.config.mjs';

defineLighthouseSpec(config);
