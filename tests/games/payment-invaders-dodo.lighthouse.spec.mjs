// Opt-in Lighthouse spec for payment-invaders-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/payment-invaders-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './payment-invaders-dodo.config.mjs';

defineLighthouseSpec(config);
