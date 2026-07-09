// Opt-in Lighthouse spec for merchant-hero-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/merchant-hero-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './merchant-hero-dodo.config.mjs';

defineLighthouseSpec(config);
