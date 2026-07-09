# API Wordle Dodo

A Wordle-style word game for payments people. Guess the 5-letter fintech term in 6 tries, with live on-screen keyboard feedback and a definition revealed after each round.

Part of [Dodo Games](https://games.dodopayments.com) · slug `api-wordle-dodo`.

## Controls

- **Desktop:** type on your keyboard — letters, `Enter` to submit, `Backspace` to delete.
- **Mobile:** tap the on-screen virtual keyboard.

## Features

- Two modes: Daily (deterministic word-of-the-day, no server) and Free Play.
- Hard Mode toggle — revealed hints must be reused in later guesses.
- 150+ term fintech dictionary, each with a one-line definition shown post-game.
- CSS-driven staggered tile-flip reveal animation (no fragile setTimeout chains).
- Streak, max-streak, games-played and win-% stats, plus a Share Results button.
- Synthesized key/reveal/win-lose audio, particles via shared `DodoJuice` with a persistent mute toggle; `prefers-reduced-motion` respected.

## Details

- **High score** persisted under `dodo_api-wordle-dodo_highscore` (stores your max streak).
- **Shared substrate:** `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`.
- Open `index.html` directly, or run `npm run build` from the repo root.

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
