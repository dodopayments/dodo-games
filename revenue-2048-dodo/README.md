# Revenue 2048

A 2048-style sliding-tile puzzle on a 4×4 grid. Slide and merge revenue tiles from $1 all the way to $1B unicorn status.

Part of [Dodo Games](https://games.dodopayments.com) · slug `revenue-2048-dodo`.

## Controls

- **Desktop:** arrow keys (`←` `→` `↑` `↓`) to slide the board.
- **Mobile:** swipe up / down / left / right.

## Features

- FLIP-based slide animation for smooth tile movement.
- Merge-chain combo bonus — multiple merges in one move stack a bigger reward.
- One-per-run "Refund" undo button.
- Milestone celebrations at $1K, $1M, and $1B (UNICORN) with confetti-style quips.
- Post-$1B endless mode ("Keep Scaling").
- Synthesized audio with pitch scaling per tile tier, screen shake on game over, and particles via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_revenue-2048-dodo_highscore` (legacy fallback `dodo_revenue_2048_highscore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
