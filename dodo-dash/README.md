# Dodo Dash

An endless side-scrolling runner. Run, jump, and dash through a living desert — duck flying invoices, hop chargeback boulders, grab coins, chase milestones, and set your high score.

Part of [Dodo Games](https://games.dodopayments.com) · slug `dodo-dash`.

## Controls

- **Desktop:** `Space` or `↑` to jump (hold for a higher jump) · `↓` to duck.
- **Mobile:** tap to jump (hold for higher) · swipe down to duck.

## Features

- Parallax desert background with a day/night cycle tied to distance.
- Obstacle variety — cacti and chargeback boulders to jump, flying invoices to duck under.
- Collectible coins plus a magnet power-up; risk lanes cluster coins near hazards.
- Near-miss bonus scoring with quips; 500m milestone celebrations.
- Double-jump unlocks at 1000m within a run; speed ramps as you go.
- DPI-aware responsive canvas; running-dust and death-tumble effects; synthesized audio, particles, screen shake and floating text via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_dodo-dash_highscore` (migrated from legacy `dodo_dash_highscore`); best distance stored under `dodo_dodo-dash_bestdistance`.
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
