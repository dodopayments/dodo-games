# Fraud Whacker Dodo

An arcade whack-a-mole on a 9-hole grid. Whack fraud bots and chargebacks before they clear, spare the legit transactions, and chase golden-fraud combos into frenzy mode.

Part of [Dodo Games](https://games.dodopayments.com) · slug `fraud-whacker-dodo`.

## Controls

- **Desktop:** click a hole, or press number keys `1`–`9`.
- **Mobile:** tap a hole directly (with haptics on supported devices).

## Features

- Four target types: Fraud bot (whack), Golden fraud (2×, faster), Chargeback decoy (whack fast), and Legit payment (do NOT whack — penalty).
- Combo multiplier that scales with your streak (up to 4×).
- Frenzy swarm mode every 25 whacks — a 5s all-fraud rush with a screen tint.
- Difficulty ramp over ~75s (spawn interval and target lifetime both shrink).
- Lives system (3) — missing fraud/chargebacks or hitting a legit costs a life.
- Single rAF scheduler drives all spawn/despawn timing (no setTimeout drift); synthesized audio, splash/particles, screen shake and floating text via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_fraud-whacker-dodo_highscore` (migrated from legacy `dodo_fraud_whacker_highscore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
