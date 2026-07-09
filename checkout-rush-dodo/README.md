# Checkout Rush

A fast-paced payment-matching reaction game. Process customer payments before the queue overflows — match each customer's payment type, keep patience bars from draining, and chain combos for Instant Settlement.

Part of [Dodo Games](https://games.dodopayments.com) · slug `checkout-rush-dodo`.

## Controls

- **Desktop:** keys `A` / `S` / `D` / `F` match the front customer's payment type (Card / Crypto / QR / UPI).
- **Mobile:** tap the on-screen payment-method buttons.

## Features

- Endless queue (max 5) with per-customer patience bars; the run ends on overflow or lost lives.
- VIP customers worth 3× revenue.
- Combo system — a 10-combo streak triggers "Instant Settlement" and clears the queue.
- UPI payment rail unlocks 30 seconds into a run.
- Escalating rush stages (Open Hours → Lunch Rush → Rush Hour → Peak Rush → Meltdown) that shrink spawn intervals.
- No Tailwind CDN (ported to custom CSS); synthesized audio, particles, screen shake and floating text via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_checkout-rush-dodo_highscore` (this fixes a game that previously had zero persistence).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
