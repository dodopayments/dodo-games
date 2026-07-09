// Shared filesystem paths for the Dodo Games verification harness.
// Kept in one place so the Playwright config, the game-suite, and the
// Lighthouse helper all agree on where evidence lands.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repo root (tests/harness/ -> tests/ -> repo). */
export const REPO_ROOT = path.resolve(here, '..', '..');

/** Root of the evidence tree for this plan task. */
export const EVIDENCE_ROOT = path.join(
  REPO_ROOT,
  '.omo',
  'evidence',
  'games-quality-revamp',
);

/** Per-game evidence directory (created on demand). */
export function evidenceDir(slug) {
  return path.join(EVIDENCE_ROOT, slug);
}

/** Base URL the games are served from (see playwright.config.mjs webServer). */
export const BASE_URL = process.env.DODO_BASE_URL || 'http://localhost:4173';

/** Port the static `serve dist` server listens on. */
export const SERVE_PORT = Number(process.env.DODO_SERVE_PORT || 4173);
