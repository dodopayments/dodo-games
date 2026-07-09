// Opt-in Lighthouse spec for checkout-rush-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/checkout-rush-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './checkout-rush-dodo.config.mjs';

defineLighthouseSpec(config);
