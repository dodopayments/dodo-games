# Gateway Defender Dodo

A wave-based tap-defense arcade game. Our MoR just got DDoS'ed — protect the Dodo server core from escalating waves of bots, bank credits on overkill streaks, and reinforce your defenses at the upgrade station between every wave.

Part of [Dodo Games](https://games.dodopayments.com) · slug `ddos-defense-dodo`.

## How to Play

- **Tap / click** incoming bots to pop them before they reach the server core.
- Chain pops without a core breach to build an **overkill combo** — a higher multiplier means more credits per pop.
- Clear every bot in a wave to reach the **Upgrade Station**, then deploy your defenses and start the next wave.
- The gateway fails when core integrity hits 0%.

## Threats

| Bot | Behaviour |
|-----|-----------|
| **Bot** (red) | Standard packet — one tap. |
| **Flooder** (orange) | Fast, small, one tap. |
| **Botnet** (purple) | Armored — needs multiple taps. |
| **Micro** (pink) | Weaves in swarms. |
| **Boss Botnet** | Every 5th wave — huge HP and **splits into smaller bots** when destroyed. |

## Upgrades (Upgrade Station)

- **Firewall Turret** — auto-targets and fires at the nearest bot (range + fire-rate scale with level).
- **Rate Limiter** — slows every incoming bot.
- **Honeypot Decoy** — lures nearby bots to a decoy node that traps them for free credits.
- **CDN Shield** — absorbs the next N hits to the core (recharges a little each wave).
- **Reboot Core** — instantly restores +30% integrity.

Every wave forces a real choice: heal the core, or invest in automation and lose combo credit?

## Features

- **Wave structure** with named threats, intro cards, and a boss every 5th wave.
- **Server-rack core** that visibly degrades (dying LEDs, cracks, sparks) as integrity drops.
- **Overkill economy** — visible combo badge with escalating credit multipliers.
- **Full game-feel juice** via the shared `DodoJuice` toolkit: enemy-death bursts, click ripples, floating credit text, screen shake on core hits, purchase confetti.
- **Synthesized audio** (no audio files) with threat-intensity pitch that climbs with the wave number, plus a persistent mute toggle shared across all Dodo games.
- **DPI-aware, responsive canvas** and **touch-first** targets — fully playable on mobile.
- **High score** persisted under `dodo_ddos-defense-dodo_highscore` (one-time migration from the legacy `dodo_highscore` key).
- `prefers-reduced-motion` respected (particles/shake disabled, gameplay unaffected).

## Controls

- **Pop a bot:** tap / click it.
- **Buy upgrades:** tap a card at the Upgrade Station between waves.
- **Next wave:** the "Deploy Defenses" button.
- **Mute:** the speaker toggle (top-right).

## Structure

- `index.html` — game page (SEO meta, JSON-LD `VideoGame`, Open Graph/Twitter, shared favicons).
- `assets/script.js` — game engine (waves, enemies, shop, combo economy, juice + audio wiring).
- `assets/style.css` — game-specific styles built on the shared `../assets/dodo-arcade.css` design tokens.
- `assets/images/dodo-logo.png` — Dodo mark.

Shared substrate loaded from the site root: `../assets/dodo-arcade.css` (design tokens + UI components) and `../assets/dodo-juice.js` (audio synth, particles, shake, haptics, highscore).

## Running Locally

Open `index.html` in a browser — no build step required. For the production build, run `npm run build` from the repository root (minifies + copies into `dist/`).

## License

GPLv3 — see the root [LICENSE](../LICENSE). Part of Dodo Games.
