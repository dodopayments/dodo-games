// Opt-in Lighthouse spec for ddos-defense-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/ddos-defense-dodo.lighthouse.spec.mjs --project=desktop
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './ddos-defense-dodo.config.mjs';

defineLighthouseSpec(config);
