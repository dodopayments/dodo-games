// Loads the frozen per-game snapshot (captured from CURRENT game code before any
// revamp edit). Per-game config files import getSnapshot(slug) so the byte-stable
// contract values (game_name, legacyKeys, start selector) live in exactly one place.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(here, '_snapshots.json');

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

export function getSnapshot(slug) {
  const entry = snapshot.games[slug];
  if (!entry) {
    throw new Error(
      `No snapshot for "${slug}" in tests/games/_snapshots.json (known: ${Object.keys(snapshot.games).join(', ')})`,
    );
  }
  return entry;
}

export function allSlugs() {
  return Object.keys(snapshot.games);
}

export default snapshot;
