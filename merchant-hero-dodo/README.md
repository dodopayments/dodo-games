# Merchant Hero

A side-scrolling space shooter with wave-based progression. Trade fair, fly fast, dodge fraud — pilot through the Payment Galaxy, clear named enemy waves, pick payment-infra upgrades, and battle telegraphed mini-bosses.

Part of [Dodo Games](https://games.dodopayments.com) · slug `merchant-hero-dodo`.

## Controls

- **Desktop:** `WASD` / arrow keys to move · `Space` fire · `Shift` KYC Shield · `P` pause (mouse drag also moves).
- **Mobile:** drag on the canvas to move · on-screen SHIELD button · AUTO-FIRE toggle.

## Features

- Named enemy waves with intro cards and distinct attack patterns.
- Mini-boss every 5th wave with a telegraphed attack and an HP bar.
- Intermission upgrade picks: Instant Settlement (fire rate), Multi-Currency (spread shot), PCI Vault (bigger/longer shield).
- No-damage wave combo scoring; KYC Shield resource and Integrity meter.
- Nebula/starfield parallax and kill-quip flavor text.
- DPI-aware canvas; synthesized audio, particles, screen shake and floating text via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_merchant-hero-dodo_highscore` (migrated from legacy `dodoHighscore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
