// Opt-in Lighthouse spec for snake-game-dodo (assertion #9). Skips unless RUN_LIGHTHOUSE=1.
//   RUN_LIGHTHOUSE=1 npx playwright test tests/games/snake-game-dodo.lighthouse.spec.mjs
import { defineLighthouseSpec } from '../harness/lighthouse.mjs';
import config from './snake-game-dodo.config.mjs';

defineLighthouseSpec(config);
