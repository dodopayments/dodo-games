# Ledger Blocks Dodo

A Tetris-style falling-block puzzle on a 10×20 board. Settle transaction blocks into the ledger, clear rows to settle batches, and trigger a full-screen "BATCH SETTLED!" celebration.

Part of [Dodo Games](https://games.dodopayments.com) · slug `ledger-blocks-dodo`.

## Controls

- **Desktop:** `←` / `→` move · `↓` soft drop · `↑` or `X` rotate · `Space` hard drop · `C` / `Shift` hold.
- **Mobile:** on-screen buttons (move, rotate, hold, soft/hard drop), plus swipe to move, tap to rotate, fast swipe down to hard-drop.

## Features

- Standard 7-piece tetromino set reskinned as payment types (Wire, Subscription, Card, Crypto, Refund, Invoice, ACH).
- Hold-piece slot and a Next-piece preview queue.
- Line-clear scoring that escalates for multi-line clears (up to an 800-point 4-line "batch").
- Full-screen "Batch Settled!" celebration on clears; danger-zone overlay near the top.
- Level progression that speeds up the drop every 10 lines, with wall-kick rotation.
- Line-clear choreography, per-cell particle bursts and screen shake via shared `DodoJuice`; synthesized audio with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_ledger-blocks-dodo_highscore` (legacy fallback `dodo_ledger_blocks_highscore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
