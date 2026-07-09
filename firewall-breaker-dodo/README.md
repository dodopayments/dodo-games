# Firewall Breaker Dodo

A Breakout / Arkanoid-style brick-breaker. Smash through 9 handcrafted layers of fraud firewalls, chain combos, trigger explosive bricks, grab power-ups, and earn up to 3 stars per level.

Part of [Dodo Games](https://games.dodopayments.com) · slug `firewall-breaker-dodo`.

## Controls

- **Desktop:** `←` / `→` or `A` / `D`, or move the mouse, to steer the paddle · `P` / `Esc` to pause.
- **Mobile:** drag on the lower half of the court to move the paddle.

## Features

- 9 handcrafted firewall levels with escalating brick types (Low Risk → Critical Fraud, plus Shielded and Explosive).
- Explosive bricks chain-react; shielded bricks need their shield broken first; later levels add moving brick rows.
- Three power-ups: PCI Shield (wider paddle), 2FA Ball (extra ball), Rate Limiter (slows the ball).
- Combo multiplier for consecutive breaks without touching the paddle.
- 3-star per-level rating (up to 27 stars) and a lives/"Shields" system.
- Ball trail, brick-break particles and combo-scaled screen shake via shared `DodoJuice`; synthesized audio with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_firewall-breaker-dodo_highscore` (legacy fallback `dodo_firewall_breaker_highscore`); stars under `dodo_firewall-breaker-dodo_stars`.
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
