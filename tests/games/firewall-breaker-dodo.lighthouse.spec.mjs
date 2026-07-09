// Opt-in Lighthouse spec for firewall-breaker-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/firewall-breaker-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './firewall-breaker-dodo.config.mjs';

defineLighthouseSpec(config);
