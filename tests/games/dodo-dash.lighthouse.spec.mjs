// Opt-in Lighthouse spec for dodo-dash (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/dodo-dash.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './dodo-dash.config.mjs';

defineLighthouseSpec(config);
