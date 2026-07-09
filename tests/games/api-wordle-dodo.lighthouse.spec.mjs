// Opt-in Lighthouse spec for api-wordle-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/api-wordle-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './api-wordle-dodo.config.mjs';

defineLighthouseSpec(config);
