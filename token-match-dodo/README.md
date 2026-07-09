# Token Match

A memory / matching-pairs card game themed around payment tokens. Flip cards to pair tokens, chain combos, race the clock, and use your one Peek across three ledger sizes.

Part of [Dodo Games](https://games.dodopayments.com) · slug `token-match-dodo`.

## Controls

- **Desktop:** click a card to flip it; pick a difficulty before you start.
- **Mobile:** tap a card to flip it.

## Features

- Three ledger sizes / difficulties: Starter (4×3), Growth (4×4), Enterprise (6×4).
- Combo multiplier on chained matches (up to ×8), with a best-combo record.
- One-time "Peek" power that briefly reveals all cards for a score penalty.
- Move counter and live mm:ss timer; per-difficulty and all-time best scores.
- Original flat SVG token art built via DOMParser (no innerHTML, no trademarked logos).
- 3D flip polish with a stagger-deal intro; synthesized audio (pitch rises per combo), match particles and screen shake via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_token-match-dodo_highscore` (legacy fallback `dodo_token_match_highscore`).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
