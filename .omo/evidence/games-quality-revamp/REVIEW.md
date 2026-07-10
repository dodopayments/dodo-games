# Dodo Games — Quality Revamp: Video Review Index

> Evidence binaries (videos/screenshots/lighthouse JSON) live locally under this directory and are gitignored; only this index is tracked.

Human-reviewable proof of the quality revamp. Every revamped game has a **desktop** gameplay
recording and a **mobile** (390×844, touch-driven) recording, plus a Lighthouse (mobile
emulation) report. The home page has a walkthrough video and a final-thumbnails screenshot.

- **Verification date:** 2026-07-09 · **Branch:** `revamp/quality-pass`
- **Authoritative suite (against `dist/`):** `npx playwright test --project=desktop` → **137 passed, 19 skipped** (skips = 13 opt-in Lighthouse specs run separately + 5 DPI-on-DOM-games + 1 non-strict thumbnail budget).
- **Home strict gate:** `STRICT_THUMBS=1 … tests/home` → **13 passed**.
- **Lighthouse (enforced, `RUN_LIGHTHOUSE=1`):** 13 game specs → **13 passed** (Perf ≥ 90, SEO ≥ 95). Home Perf/SEO ≥ 90/95 enforced under STRICT_THUMBS.
- All links below are **relative to this file** (`.omo/evidence/games-quality-revamp/`).

> Note: `flappy-dodo` is the untouched reference benchmark and is intentionally excluded from the
> revamp harness, so it has no gameplay evidence here.

## Summary

| Game | Spec | LH Perf / SEO | Desktop | Mobile |
|------|:----:|:-------------:|:-------:|:------:|
| Dodo Pong · **pilot** | ✅ PASS | 91 / 100 | [desktop](dodo-pong/gameplay-desktop.webm) | [mobile](dodo-pong/gameplay-mobile.webm) |
| Dodo Dash | ✅ PASS | 99 / 100 | [desktop](dodo-dash/gameplay-desktop.webm) | [mobile](dodo-dash/gameplay-mobile.webm) |
| Merchant Hero | ✅ PASS | 100 / 100 | [desktop](merchant-hero-dodo/gameplay-desktop.webm) | [mobile](merchant-hero-dodo/gameplay-mobile.webm) |
| Firewall Breaker | ✅ PASS | 92 / 100 | [desktop](firewall-breaker-dodo/gameplay-desktop.webm) | [mobile](firewall-breaker-dodo/gameplay-mobile.webm) |
| Gateway Defender (DDoS) | ✅ PASS | 98 / 100 | [desktop](ddos-defense-dodo/gameplay-desktop.webm) | [mobile](ddos-defense-dodo/gameplay-mobile.webm) |
| Payment Invaders | ✅ PASS | 100 / 100 | [desktop](payment-invaders-dodo/gameplay-desktop.webm) | [mobile](payment-invaders-dodo/gameplay-mobile.webm) |
| Ledger Blocks | ✅ PASS | 100 / 100 | [desktop](ledger-blocks-dodo/gameplay-desktop.webm) | [mobile](ledger-blocks-dodo/gameplay-mobile.webm) |
| Revenue 2048 | ✅ PASS | 100 / 100 | [desktop](revenue-2048-dodo/gameplay-desktop.webm) | [mobile](revenue-2048-dodo/gameplay-mobile.webm) |
| Token Match | ✅ PASS | 100 / 100 | [desktop](token-match-dodo/gameplay-desktop.webm) | [mobile](token-match-dodo/gameplay-mobile.webm) |
| API Wordle | ✅ PASS | 98 / 100 | [desktop](api-wordle-dodo/gameplay-desktop.webm) | [mobile](api-wordle-dodo/gameplay-mobile.webm) |
| Fraud Whacker | ✅ PASS | 100 / 100 | [desktop](fraud-whacker-dodo/gameplay-desktop.webm) | [mobile](fraud-whacker-dodo/gameplay-mobile.webm) |
| Transaction Snake | ✅ PASS | 99 / 100 | [desktop](snake-game-dodo/gameplay-desktop.webm) | [mobile](snake-game-dodo/gameplay-mobile.webm) |
| Checkout Rush | ✅ PASS | 100 / 100 | [desktop](checkout-rush-dodo/gameplay-desktop.webm) | [mobile](checkout-rush-dodo/gameplay-mobile.webm) |
| **Home page** | ✅ PASS | 100 / 100 | [walkthrough](home/walkthrough.webm) | [thumbs-final.png](home/thumbs-final.png) |

---

## Dodo Pong — *pilot*

The Wave 1 pilot that calibrated the whole revamp. Full rebuild: rally-combo meter (ball speed
scales with the rally), three payment power-ups (Batch Settlement multi-ball, Limit Increase wider
paddle, Smart Routing curve shot), three AI difficulty tiers, DPI-aware canvas, synthesized audio,
touch-drag paddle, and full DodoJuice feedback.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 91 / SEO 100 ([lighthouse.json](dodo-pong/lighthouse.json))
- Desktop: [dodo-pong/gameplay-desktop.webm](dodo-pong/gameplay-desktop.webm) · Mobile: [dodo-pong/gameplay-mobile.webm](dodo-pong/gameplay-mobile.webm)

## Dodo Dash

Endless runner done right: 3-layer parallax desert with a distance-driven day/night cycle,
obstacle variety (cacti, chargeback boulders, duckable flying invoices), coins + magnet power-up,
near-miss bonuses, 500m milestone celebrations, a per-run double-jump unlock at 1000m, and
tap/hold/swipe touch controls on a responsive canvas.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 99 / SEO 100 ([lighthouse.json](dodo-dash/lighthouse.json))
- Desktop: [dodo-dash/gameplay-desktop.webm](dodo-dash/gameplay-desktop.webm) · Mobile: [dodo-dash/gameplay-mobile.webm](dodo-dash/gameplay-mobile.webm)

## Merchant Hero

Side-scrolling shooter restructured into named enemy waves with distinct attack patterns,
telegraphed mini-bosses every 5th wave, intermission upgrade picks (fire rate / spread / shield),
no-damage combo scoring, KYC shield resource, nebula parallax, and touch drag + on-screen
shield/auto-fire controls.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](merchant-hero-dodo/lighthouse.json))
- Desktop: [merchant-hero-dodo/gameplay-desktop.webm](merchant-hero-dodo/gameplay-desktop.webm) · Mobile: [merchant-hero-dodo/gameplay-mobile.webm](merchant-hero-dodo/gameplay-mobile.webm)

## Firewall Breaker

Breakout expanded to 9 handcrafted firewall levels with escalating brick types (shielded,
explosive chain-reactors, moving rows), a paddle-independent combo meter, three power-ups (PCI
Shield, 2FA Ball, Rate Limiter), a 3-star-per-level rating system, ball trail and combo-scaled
screen shake.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 92 / SEO 100 ([lighthouse.json](firewall-breaker-dodo/lighthouse.json))
- Desktop: [firewall-breaker-dodo/gameplay-desktop.webm](firewall-breaker-dodo/gameplay-desktop.webm) · Mobile: [firewall-breaker-dodo/gameplay-mobile.webm](firewall-breaker-dodo/gameplay-mobile.webm)

## Gateway Defender (DDoS Defense)

Wave-based tap defense: 5 bot archetypes plus a boss botnet every 5th wave that splits on death, a
between-wave upgrade station (firewall turret, rate limiter, honeypot decoy, CDN shield, reboot
core), an overkill combo economy, and a server-rack core that visibly degrades as integrity drops.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 98 / SEO 100 ([lighthouse.json](ddos-defense-dodo/lighthouse.json))
- Desktop: [ddos-defense-dodo/gameplay-desktop.webm](ddos-defense-dodo/gameplay-desktop.webm) · Mobile: [ddos-defense-dodo/gameplay-mobile.webm](ddos-defense-dodo/gameplay-mobile.webm)

## Payment Invaders

Polish pass on the deepest game: **Tailwind CDN removed** (ported to `dodo-arcade.css`), DPI-aware
internal resolution (crisp on retina), unified with DodoJuice (duplicated juice deleted),
thumb-zone D-pad at ≥44px targets, and rebalanced boss waves.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](payment-invaders-dodo/lighthouse.json))
- Desktop: [payment-invaders-dodo/gameplay-desktop.webm](payment-invaders-dodo/gameplay-desktop.webm) · Mobile: [payment-invaders-dodo/gameplay-mobile.webm](payment-invaders-dodo/gameplay-mobile.webm)

## Ledger Blocks

Tetris presentation overhaul: hold-piece slot, ghost-piece projection, next-piece queue, line-clear
choreography with per-cell bursts, a full-screen "BATCH SETTLED!" celebration, level-based speed and
palette shifts, a danger-zone overlay, and swipe/tap touch controls with on-screen button fallback.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](ledger-blocks-dodo/lighthouse.json))
- Desktop: [ledger-blocks-dodo/gameplay-desktop.webm](ledger-blocks-dodo/gameplay-desktop.webm) · Mobile: [ledger-blocks-dodo/gameplay-mobile.webm](ledger-blocks-dodo/gameplay-mobile.webm)

## Revenue 2048

Deepened 2048: a one-per-run "Refund" undo, merge-chain combo bonuses, milestone celebrations at
$1K / $1M / $1B (UNICORN), FLIP-based slide animation, a post-$1B endless mode, and pitch-scaled
merge audio.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](revenue-2048-dodo/lighthouse.json))
- Desktop: [revenue-2048-dodo/gameplay-desktop.webm](revenue-2048-dodo/gameplay-desktop.webm) · Mobile: [revenue-2048-dodo/gameplay-mobile.webm](revenue-2048-dodo/gameplay-mobile.webm)

## Token Match

The shallowest game got the biggest redesign: three difficulties (4×3 / 4×4 / 6×4) with
per-difficulty bests, a combo-streak multiplier, a one-time "Peek" power, original flat SVG token
art (built via DOMParser — no innerHTML, no trademarks), and a 3D flip with stagger-deal intro.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](token-match-dodo/lighthouse.json))
- Desktop: [token-match-dodo/gameplay-desktop.webm](token-match-dodo/gameplay-desktop.webm) · Mobile: [token-match-dodo/gameplay-mobile.webm](token-match-dodo/gameplay-mobile.webm)

## API Wordle

Wordle expanded: date-seeded Daily mode + Free Play, a Hard Mode toggle, a 150+ term fintech
dictionary with post-game definitions, CSS-driven staggered flip reveals (fragile setTimeout chains
removed), streak/win-% stats, and a Share Results button.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 98 / SEO 100 ([lighthouse.json](api-wordle-dodo/lighthouse.json))
- Desktop: [api-wordle-dodo/gameplay-desktop.webm](api-wordle-dodo/gameplay-desktop.webm) · Mobile: [api-wordle-dodo/gameplay-mobile.webm](api-wordle-dodo/gameplay-mobile.webm)

## Fraud Whacker

Whack-a-mole rebuilt: four target types (fraud, golden fraud, chargeback decoy, and don't-whack
legit payments), a combo multiplier with visual tiers, a frenzy swarm every 25 whacks, a lives
system, mobile haptics, and a single rAF scheduler that kills setTimeout drift.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](fraud-whacker-dodo/lighthouse.json))
- Desktop: [fraud-whacker-dodo/gameplay-desktop.webm](fraud-whacker-dodo/gameplay-desktop.webm) · Mobile: [fraud-whacker-dodo/gameplay-mobile.webm](fraud-whacker-dodo/gameplay-mobile.webm)

## Transaction Snake

Snake modernized with smooth interpolated movement: level progression (speed tiers every 10
apples), timed golden-apple events, moving fraud voids, and a PCI-shield invincibility power-up.
Also fixes the **broken high-score persistence** and **removes the Tailwind CDN**.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 99 / SEO 100 ([lighthouse.json](snake-game-dodo/lighthouse.json))
- Desktop: [snake-game-dodo/gameplay-desktop.webm](snake-game-dodo/gameplay-desktop.webm) · Mobile: [snake-game-dodo/gameplay-mobile.webm](snake-game-dodo/gameplay-mobile.webm)

## Checkout Rush

Fast reaction game with patience bars, VIP customers (3×), a 10-combo "Instant Settlement" clear, a
30-second UPI rail unlock, and escalating rush stages. Adds **high-score + best-combo persistence**
(previously zero) and **removes the Tailwind CDN**.

- **Spec:** ✅ PASS · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](checkout-rush-dodo/lighthouse.json))
- Desktop: [checkout-rush-dodo/gameplay-desktop.webm](checkout-rush-dodo/gameplay-desktop.webm) · Mobile: [checkout-rush-dodo/gameplay-mobile.webm](checkout-rush-dodo/gameplay-mobile.webm)

## Home Page

Full redesign with externalized CSS/JS: live search + genre filter chips, manifest-driven card
grid, lazy-loaded WebP thumbnails (<100KB, explicit width/height → zero CLS), a rAF ambient
background (paused when hidden, off under reduced motion), and the preserved Boss Mode easter egg +
resume-last-played badge.

- **Spec:** ✅ PASS (incl. `STRICT_THUMBS=1` gate) · **Lighthouse:** Perf 100 / SEO 100 ([lighthouse.json](home/lighthouse.json))
- Walkthrough: [home/walkthrough.webm](home/walkthrough.webm) · Final thumbnails: [home/thumbs-final.png](home/thumbs-final.png)
