# Payment Invaders

A Space-Invaders-style fixed shooter. Defend your payment gateway from descending waves of chargebacks, fraudsters, and downtime bugs — shoot them down before they breach the gateway.

Part of [Dodo Games](https://games.dodopayments.com) · slug `payment-invaders-dodo`.

## Controls

- **Desktop:** `←` / `→` move · `Space` fire 2FA Laser · `Z` KYC spread shot · `X` PCI Shield.
- **Mobile:** on-screen thumb buttons — move left/right, KYC spread (✦), PCI Shield (🛡️), and fire (🔥), all ≥44px touch targets.

## Features

- Wave-based waves of chargebacks, fraudsters, downtime bugs, plus boss encounters.
- Combo multiplier with a combo timer; lives (❤️×3) and threat-kill stats.
- Shield-energy and KYC-energy resource meters powering the special shots.
- Achievement toasts and rotating security-slogan flavor text; pause overlay.
- DPI-aware responsive canvas (crisp on retina); no Tailwind CDN (ported to `dodo-arcade.css`).
- Synthesized audio, particles, screen shake and floating text via shared `DodoJuice`, with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_payment-invaders-dodo_highscore` (migrated from legacy `paymentInvadersHighScore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
