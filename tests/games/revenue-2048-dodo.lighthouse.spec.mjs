// Opt-in Lighthouse spec for revenue-2048-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/revenue-2048-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './revenue-2048-dodo.config.mjs';

defineLighthouseSpec(config);
