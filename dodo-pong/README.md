# Dodo Pong

A vertical Pong-style arcade duel — you (the Merchant) versus the AI Processor, first to 11 points. This was the **pilot** for the Dodo Games quality revamp: it set the pattern (shared juice, DPI canvas, AI tiers, power-ups) the other games follow.

Part of [Dodo Games](https://games.dodopayments.com) · slug `dodo-pong`.

## Controls

- **Desktop:** `←` / `→` or `A` / `D` to move the paddle · `P` / `Esc` to pause (mouse drag also works).
- **Mobile:** drag on the lower half of the court to move your paddle.

## Features

- Three AI difficulties — Starter, Growth, Enterprise — with distinct reaction, accuracy, speed, and prediction tuning.
- Rally-combo meter that scales ball speed as a rally continues.
- Three payment power-ups: Batch Settlement (multi-ball), Limit Increase (wider paddle), Smart Routing (curve shot).
- DPI-aware canvas with dynamic resize; pause/resume flow.
- Synthesized audio, particles, screen shake, floating score-quips and loss haptics via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_dodo-pong_highscore` (legacy fallback `dodo_pong_highscore`); best rally under `dodo_dodo-pong_bestrally`.
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
