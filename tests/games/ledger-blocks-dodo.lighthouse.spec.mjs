// Opt-in Lighthouse spec for ledger-blocks-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/ledger-blocks-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './ledger-blocks-dodo.config.mjs';

defineLighthouseSpec(config);
