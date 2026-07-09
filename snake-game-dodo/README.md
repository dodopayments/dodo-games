# Transaction Snake

A modern take on classic Snake with smooth interpolated movement. Guide your payment chain through the grid, eat payment apples, dodge fraud voids, and power up with PCI shields.

Part of [Dodo Games](https://games.dodopayments.com) · slug `snake-game-dodo`.

## Controls

- **Desktop:** Arrow keys or `WASD` to steer · `P` to pause.
- **Mobile:** swipe on the board, or use the on-screen D-pad (up/left/right/down).

## Features

- Level progression — level up every 10 apples; speed ramps from 145ms down to 62ms per step.
- Golden apple events (5× points, timed spawn with a countdown, then cooldown).
- Moving fraud-void obstacles to dodge at higher levels.
- PCI Shield power-up granting ~6s invincibility with a blink warning near expiry.
- Combo/chain badge, plus rotating security-tip flavor text on the death screen.
- DPI-aware canvas; no Tailwind CDN (ported to custom CSS); synthesized audio, particles, screen shake and floating text via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_snake-game-dodo_highscore` (this fixes a bug where the game previously never saved high scores).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
