# Dodo Games Quality Revamp

## TL;DR

> **Quick Summary**: Full-quality revamp of all 13 games (everything except `flappy-dodo`) plus a complete home page redesign. Each game gets a gameplay redesign (mechanics/progression/difficulty where shallow), full audiovisual juice, audio, mobile touch parity, and brand polish — benchmarked against `flappy-dodo` and enforced by an agent-executed Playwright + Lighthouse verification harness. A shared vanilla substrate (`assets/dodo-arcade.css` + `assets/dodo-juice.js`) is built first so all 13 games get consistent quality without duplicated code.
>
> **Deliverables**:
> - `assets/dodo-arcade.css` (design tokens + shared UI components) and `assets/dodo-juice.js` (audio synth, particles, screenshake, haptics, reduced-motion) — vanilla, no build change
> - 13 revamped game directories (gameplay + juice + audio + mobile + visuals)
> - Fully redesigned home page `index.html` (external CSS/JS, search/filter, optimized WebP thumbnails, Boss Mode + resume-last-played preserved)
> - Reusable Playwright verification harness (`tests/harness/`) + per-game spec files, evidence in `.omo/evidence/games-quality-revamp/`
> - Gameplay videos per game (desktop + mobile touch sessions, Playwright-recorded) + a video review index (`REVIEW.md`) for user review
> - Re-shot optimized thumbnails (<100KB WebP) + optimized OG image
> - License reconciliation (`package.json` ISC → GPL-3.0), Tailwind CDN removal (3 games), structure standardization (2 games)
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 7 waves
> **Critical Path**: Wave 0 (substrate + harness) → Wave 1 (pilot: dodo-pong, GATE) → Waves 2–4 (12 games in archetype batches) → Wave 5 (home page) → Wave 6 (thumbnails + global sweep + merge)

---

## Context

### Original Request
User: "current games (excluding flappy dodo) in this project are very basic and not very high quality — so create a thorough plan to revamp each of the game and make it utmost quality — and redesign the home page interface too."

### User Decisions (interview, 2026-07-09)
1. **Revamp depth**: FULL gameplay redesign license — redesign mechanics, add progression/difficulty curves for maximum fun. Not limited to enhance-in-place.
2. **Shared substrate**: YES — `assets/dodo-arcade.css` + `assets/dodo-juice.js` loaded via plain `<link>`/`<script>` tags.
3. **Rollout**: Feature branch + Cloudflare preview deploys. Merge to `main` only after verification gates pass. (CI auto-deploys `main` to production — `.github/workflows/deploy.yml` triggers on push to `main` only, so the feature branch is safe.)
4. **Home page**: Full visual redesign. MUST preserve Boss Mode easter egg, resume-last-played, and dark Dodo branding.

### Critical Context (verified in-repo)
- **This is Round 2 of an AI build.** The 8 "Batch B" games came from `.omo/plans/8-new-dodo-games.md` (commit `01b2aae`). That pass's definition of done was "builds + loads + screenshot" — which produced exactly the quality the user is now complaining about. **This plan's definition of done is a passing test suite measuring player-felt quality signals. "Builds/loads/LOC/screenshot" are FORBIDDEN as done-criteria.**
- **Quality bar**: `flappy-dodo/` (766 LOC) — sprites, particle/weather systems, 5 synthesized sound cues, close-call detection, personality quips. "Utmost quality" = player-felt quality (game feel/juice, audio, mobile parity, visual polish, mechanical depth), NOT code architecture.
- **Stack constraint**: vanilla HTML/CSS/JS only. `build.js` is minify-and-copy (terser + clean-css). No bundler, no framework, no TypeScript, no runtime CDN. Cloudflare Pages build = `npm run build`.
- **Analytics contract**: `DodoAnalytics.{gameStart,gameOver,newHighScore,shareScore,bossMode,powerUp,waveComplete}` (`assets/analytics.js`), 44 call-sites, GA4 `G-GW1LSM5MKF`. Event names and `game_name` values MUST stay byte-stable. Add events, never rename. Keep `typeof DodoAnalytics !== 'undefined'` guards.
- **SEO**: live indexed site (games.dodopayments.com). URL slugs, JSON-LD `VideoGame` schema, OG/Twitter meta, `sitemap.xml`, `robots.txt` must be preserved or upgraded — never removed.
- **License conflict**: `package.json` says ISC; `LICENSE` + README say GPLv3. Reconcile to GPL-3.0. All new audio/art must be synthesized or CC0 (no GPL-incompatible asset packs).
- **Known bugs to fix**: `snake-game-dodo` never persists high score to localStorage; `checkout-rush-dodo` has zero persistence; `dodo-dash` canvas hardcoded 800×300 (not responsive) and keyboard-only; `merchant-hero-dodo` keyboard-only; `payment-invaders-dodo` canvas not DPI-aware; 9/13 games have no audio; `dodo-pong`/`firewall-breaker`/`ledger-blocks` have zero CSS animation.
- **Home page weight crisis**: thumbnails total ~8MB (`payment-invaders-dodo.png` 2.5MB, `dodo-games.png` OG 2.1MB, `merchant-hero-dodo.png` 994KB, `flappy-dodo.png` 791KB, `snake-game-dodo.png` 738KB). Batch-B thumbnails are already 44–80KB — that fix pattern must be back-applied to all.
- **Structure conventions**: Pattern A (`{slug}/assets/script.js` + `{slug}/assets/style.css`) is the majority. `dodo-dash/` and `merchant-hero-dodo/` keep JS/CSS at game root — standardize them to Pattern A (URLs of the HTML pages do not change; only internal asset references).

### Metis Review (addressed)
- "Quality" misread as code quality → rubric defines player-felt quality; frameworks/TS/test-runner migration forbidden.
- Prior pass's weak done-signals → verification harness is the definition of done (§ Verification Strategy).
- Auto-deploy risk → feature branch `revamp/quality-pass`; merge gate per wave.
- Juice must be genre-adapted, not flappy-cloned → per-game specs below define genre-appropriate juice.
- Scope explosion (13 bottomless pits) → per-dimension rubric ceiling (target 4/5, not infinite), pilot gate calibrates effort.
- GPLv3 asset contamination → synthesized WebAudio only (zero external audio files; also zero page-weight cost).
- DOM games must stay DOM (no canvas conversion for api-wordle, fraud-whacker, token-match, revenue-2048).

---

## Work Objectives

### Core Objective
Make every game feel like a polished, complete arcade game a player would voluntarily replay — and make the home page a fast, branded arcade portal — with every claim of quality proven by an agent-executed test.

### Definition of Done
- [ ] All 13 games pass the full per-game verification suite (§ Verification Strategy) with evidence in `.omo/evidence/games-quality-revamp/`
- [ ] Every game scores ≥4/5 on all 5 rubric dimensions (§ Quality Rubric), self-assessed with evidence, spot-checked at the pilot gate
- [ ] Home page passes its verification suite (search/filter, <100KB lazy thumbnails, LCP <2.5s mobile, Boss Mode + resume work)
- [ ] `npm run build` succeeds; all 14 games + home page present in `dist/`
- [ ] Zero requests to `cdn.tailwindcss.com` anywhere in the site
- [ ] Lighthouse (mobile): Performance ≥90, SEO ≥95 on home page + all 13 game pages
- [ ] All existing GA4 events fire with unchanged `game_name` values
- [ ] Feature branch merged to `main` only after the full suite passes

### Must Have
- Shared substrate loaded by every game: `../assets/dodo-arcade.css` + `../assets/dodo-juice.js`
- Every game: synthesized audio (≥4 distinct cues) + persistent mute toggle (`localStorage: dodo_audio_muted`, shared across all games)
- Every game: full touch/mobile parity at 390×844 and 360×640 (no horizontal scroll, playable with touch only)
- Every game: `prefers-reduced-motion` respected (particles/shake disabled, gameplay unaffected)
- Every game: high score persisted under `dodo_{slug}_highscore`, with one-time migration from any legacy key
- Every game: `← Back to Arcade` link, JSON-LD `VideoGame` schema, OG tags, shared favicons, `DodoAnalytics` wiring preserved
- Every canvas game: `devicePixelRatio`-aware rendering (crisp on retina)
- Pattern A structure everywhere (`assets/script.js`, `assets/style.css`)

### Must NOT Have (Guardrails)
- ❌ NO frameworks, bundlers, TypeScript, or test-runners in shipped code (Playwright + sharp live in `devDependencies` only and never ship)
- ❌ NO runtime CDNs — REMOVE Tailwind CDN from `snake-game-dodo`, `checkout-rush-dodo`, `payment-invaders-dodo`
- ❌ NO URL slug changes; NO `game_name` or `DodoAnalytics` event renames
- ❌ NO external audio files or third-party asset packs (WebAudio synthesis only)
- ❌ NO converting DOM games to canvas (api-wordle, fraud-whacker, token-match, revenue-2048 stay DOM)
- ❌ NO modification to `assets/analytics.js` event signatures (additive helpers OK)
- ❌ NO changes to `.github/workflows/deploy.yml` triggers
- ❌ NO merge to `main` before the wave's verification gate passes
- ❌ NO done-claims based on "builds/loads/screenshot/LOC" — a game is done when its test spec passes
- ❌ NO console.log left in production code; no dead code from redesigns left behind

---

## Quality Rubric (per game, target ≥4/5 on every dimension)

| Dimension | 0–1 (today's baseline for most) | 4 (target) | 5 (flappy-dodo tier) |
|---|---|---|---|
| **Game feel / juice** | Static; no feedback on actions | Every player action + game event has visual feedback (particles, flash, shake, tween, floating text); 60fps on mobile | + signature moments (close-call detection, slow-mo, combo celebrations) |
| **Audio** | Silent | ≥4 distinct synthesized cues (action, success, fail, game-over) + mute toggle | + ambient layer or dynamic pitch scaling with intensity |
| **Mobile parity** | Broken or keyboard-only | Fully playable touch-only at 360×640; responsive canvas; touch targets ≥44px | + haptics (`navigator.vibrate` guarded), swipe polish |
| **Visual / brand polish** | Default shapes, inconsistent colors | Dodo tokens applied; polished start/game-over/HUD via shared components; coherent art direction | + personality (quips, mascot animation, themed flourishes) |
| **Mechanical depth** | One-note loop, no progression | Difficulty curve + ≥1 meaningful new mechanic (progression, power-ups, or mode) that changes decisions | + emergent scoring depth (combos, risk/reward choices) |

Scoring is evidenced by the per-game Playwright spec (juice/audio/mobile/persistence asserts) + a short self-assessment table in the game's task report. The pilot gate (Wave 1) calibrates what "4" means concretely before the batches run.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION.** All verification is agent-executed. Criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Harness (built in Wave 0)
`tests/harness/` (dev-only, excluded from build output via `build.js` ignore list addition — verify `dist/` does not contain `tests/`):
- `tests/harness/game-suite.mjs` — parameterized Playwright suite; per-game config in `tests/games/{slug}.config.mjs`
- Run: `npx playwright test` (Playwright installed as devDependency; `npx playwright install chromium`)
- Server under test: `npx wrangler pages dev dist` (after `npm run build`) or a static server against repo root for fast iteration; final gate ALWAYS runs against `dist/`
- Evidence output: `.omo/evidence/games-quality-revamp/{slug}/` — screenshots (desktop + 2 mobile viewports), console log capture, Lighthouse JSON, **gameplay video**
- **Gameplay video recording (MANDATORY per game)**: the harness runs its scripted play session in a Playwright context with `recordVideo` enabled and saves `gameplay-desktop.webm` (≥20s of actual gameplay: start → several scoring actions → juice moments → game over → restart) and `gameplay-mobile.webm` (390×844 touch-driven session) into the game's evidence directory. Videos are the human-reviewable proof of felt quality and MUST be listed (with paths) in every game task's completion report and in the final review summary.

### Per-game assertion set (every game must pass ALL)
1. **Smoke**: page loads with zero console errors; clicking Start (selector from config) begins gameplay; a scripted scoring action increments the visible score; game-over screen appears; restart returns to playable state.
2. **Mobile parity**: at 390×844 and 360×640 — `document.documentElement.scrollWidth <= viewport width` (no horizontal scroll); canvas/board bounding box fits viewport; scripted touch/tap/swipe events drive the core verb of the game (config declares the touch script).
3. **Audio wired**: `DodoJuice.audio` initialized (or an `AudioContext` exists) AND a spy records ≥4 distinct cue invocations during a scripted play session; toggling mute sets `localStorage.dodo_audio_muted` and silences cues.
4. **Juice measured**: spies on `DodoJuice.particles.emit` / `DodoJuice.shake` (or equivalent registered hooks) record ≥N firings on key events (N declared per game in config); `prefers-reduced-motion: reduce` emulation → zero particle/shake calls while gameplay still functions.
5. **Persistence**: play, achieve score > 0, reload → high score restored from `dodo_{slug}_highscore`; a seeded legacy key (from config) migrates on first load.
6. **Analytics continuity**: spy on `window.DodoAnalytics` — `gameStart` and `gameOver` fire with `game_name` exactly equal to the config's frozen value (copied from current code BEFORE any edits).
7. **SEO/brand**: URL slug unchanged; JSON-LD parses and `@type === "VideoGame"`; `og:title`/`og:image` present; `← Back to Arcade` link resolves to `/`; computed background/accent colors match Dodo tokens (`#C1FF00` present on primary action).
8. **No Tailwind CDN**: network capture asserts zero requests to `cdn.tailwindcss.com` (asserted for all games, mandatory for the 3 former offenders).
9. **Performance**: Lighthouse (mobile emulation) Performance ≥90, SEO ≥95; page transfer ≤1.5MB.
10. **DPI** (canvas games only): `canvas.width >= canvas.clientWidth * devicePixelRatio` under `deviceScaleFactor: 2` emulation.
11. **Gameplay videos**: `gameplay-desktop.webm` (≥20s real play) and `gameplay-mobile.webm` (touch-driven) exist in the evidence dir, are >0 bytes, and are referenced in the task report.

### Home page assertion set
- Zero console errors; all 14 game cards + Discord card render; every card link resolves (200 against `dist/` server).
- Search/filter input filters cards live; genre filter chips work.
- Every thumbnail `loading="lazy"`, file size <100KB, format WebP (with PNG fallback only if needed).
- LCP <2.5s (Lighthouse mobile), Performance ≥90, SEO ≥95, Accessibility ≥90, zero CLS from images (explicit width/height).
- Boss Mode: click toggles the fake-spreadsheet overlay; double-click exits; `DodoAnalytics.bossMode` fires.
- Resume-last-played: seed `localStorage.dodo_last_played = 'dodo-pong'` → badge appears on that card.
- OG image referenced exists and is <300KB.

### Global regression (Wave 6 gate, run against `dist/`)
- Full suite (13 games + home) green in one run.
- `sitemap.xml` parses; contains root + 14 game URLs; slugs unchanged.
- `grep -r "cdn.tailwindcss.com"` over `dist/` returns nothing; `grep -r "console.log"` over shipped game scripts returns nothing (allowlist: analytics.js unchanged).
- `package.json` license field = `GPL-3.0`.

---

## Wave 0 — Foundation (serial; nothing else starts before this completes)

### Task 0.1: Branch + guard rails
- Create branch `revamp/quality-pass` from `main`. All work happens here.
- Verify `.github/workflows/deploy.yml` only triggers on `main` push (read the file; if it also triggers on other branches, STOP and report — do not edit CI).
- Add `tests/` and `scripts/` to `build.js` ignore globs so dev tooling never ships. Verify: run `npm run build`, assert `dist/tests` does not exist.

### Task 0.2: `assets/dodo-arcade.css` — design tokens + shared UI components
Vanilla CSS, no preprocessor. Contents:
- `:root` tokens: `--dodo-green: #C1FF00`, `--dodo-bg: #050505`, surface/hover/danger/warn/success scales, font stack, radii, shadows, glow effects, z-index scale.
- Components (class-based, BEM-ish): `.da-screen` (start/game-over/pause overlay), `.da-btn` / `.da-btn--primary`, `.da-hud`, `.da-score`, `.da-modal`, `.da-toast`, `.da-mute-toggle`, `.da-back-link`, `.da-combo-badge`.
- Keyframes: `da-pop`, `da-shake`, `da-flash`, `da-float-up`, `da-pulse`, `da-slide-in`.
- `@media (prefers-reduced-motion: reduce)` disables all decorative keyframes.
- Mobile-first; touch targets ≥44px.
Verify: a standalone fixture page (`tests/fixtures/substrate.html`) renders all components; Playwright screenshot; axe-core (via Playwright) reports no critical a11y violations on the fixture.

### Task 0.3: `assets/dodo-juice.js` — game-feel toolkit (vanilla, single IIFE exposing `window.DodoJuice`)
Modules:
- `DodoJuice.audio`: WebAudio synthesizer — named cue presets (`tap`, `score`, `combo`, `powerup`, `hit`, `fail`, `gameover`, `win`, `tick`, `whoosh`) built from oscillators/noise/envelopes (model on flappy-dodo's synth). Global mute persisted to `dodo_audio_muted`; lazy `AudioContext` creation on first user gesture (autoplay policy).
- `DodoJuice.particles`: canvas-based particle emitter usable in canvas games (draw into the game's own ctx) AND DOM games (auto-created overlay canvas). Presets: `burst`, `confetti`, `trail`, `sparkle`, `explosion`.
- `DodoJuice.shake(el|canvas, intensity, ms)`, `DodoJuice.flash(el, color)`, `DodoJuice.floatText(x, y, text, opts)`.
- `DodoJuice.haptics.tap()/success()/fail()` → `navigator.vibrate` guarded.
- `DodoJuice.reducedMotion` (bool, from matchMedia). Games call `DodoJuice.particles.emit` / `DodoJuice.shake` unconditionally; the library gates internally — under reduced motion it renders nothing and only increments a `DodoJuice._attempted` counter. Harness contract: under normal motion, spy on real emissions (assertion #4 counts them); under emulated `prefers-reduced-motion: reduce`, assert zero real emissions while `_attempted > 0` proves gameplay still drives the hooks.
- `DodoJuice.highscore(slug, legacyKeys[])`: get/set under `dodo_{slug}_highscore` with one-time legacy migration.
- `DodoJuice.muteButton(containerEl)`: injects the standard mute toggle.
Size budget: ≤20KB minified. No dependencies.
Verify: `tests/fixtures/juice.html` exercises every API; Playwright asserts cues fire, particles render (pixel sampling on overlay canvas), mute persists, reduced-motion no-ops, highscore migration works.

### Task 0.4: Verification harness
Build `tests/harness/game-suite.mjs` + `tests/games/*.config.mjs` implementing § Verification Strategy. Before ANY game is edited, snapshot per game: current `game_name` values, legacy localStorage keys, start-button selectors → frozen into config files. Add `devDependencies`: `@playwright/test`, `sharp`, `serve` (or use wrangler). Add npm scripts: `test:games`, `test:home`, `test:all`.
Verify: run the smoke assertion subset against 2 CURRENT games (`dodo-pong`, `revenue-2048-dodo`) — suite executes and produces evidence artifacts (current games will FAIL quality asserts; that's expected — harness must correctly report the failures, proving it can't be gamed).

### Task 0.5: Housekeeping
- `package.json`: `"license": "GPL-3.0"`.
- Standardize `dodo-dash/` and `merchant-hero-dodo/` to Pattern A (`assets/script.js`, `assets/style.css`); update their `index.html` references. Slugs/URLs unchanged.
- Verify: both games still load with zero console errors via harness smoke.

---

## Wave 1 — Pilot: `dodo-pong` (serial; GATE before all batches)

**Why pong**: smallest canvas game (299 LOC), currently zero audio + zero animation + no DPI awareness — worst-to-best delta proves the substrate and calibrates rubric level 4.

### Redesign spec
- **Mechanics**: best-of-11 kept, but add: (a) rally meter — ball speed + score multiplier grow per consecutive paddle hit; (b) 3 power-ups spawning mid-court, activated by hitting the ball through them (`Multi-ball`, `Paddle Extend`, `Curve Shot` — themed as `Batch Settlement`, `Limit Increase`, `Smart Routing`); (c) 3 selectable AI difficulties (Starter/Growth/Enterprise) with distinct reaction/accuracy parameters; (d) match point dramatization (slow-mo last rally via timescale).
- **Juice**: ball trail (particles), paddle hit flash + shake scaled by rally meter, score pop animation, serve countdown, win/lose confetti/burst, floating status quips (keep "Transaction Approved/Declined" flavor).
- **Audio**: paddle hit (pitch scales with rally), wall bounce, score, power-up, match win/lose. Mute toggle.
- **Mobile**: drag anywhere on player half to move paddle; buttons ≥44px; responsive DPI-aware canvas (fit viewport, preserve aspect).
- **Visuals**: rebuild start/game-over/HUD on `.da-*` components; center-court Dodo branding; CRT-scanline-free clean dark aesthetic with Dodo Green accents.

### GATE (blocking)
1. Full per-game assertion set passes; evidence saved (including desktop + mobile gameplay videos).
2. Rubric self-assessment ≥4 on all 5 dimensions with pointers to evidence.
3. Report a before/after summary **with gameplay video paths surfaced for user review**. This calibrated result is the canonical quality bar; batch tasks must match it. If any substrate API proved awkward, fix `dodo-juice.js`/`dodo-arcade.css` NOW (only moment library breaking-changes are allowed).

---

## Wave 2 — Canvas action batch (parallel: 5 games)

Each task: rebuild rendering/input/juice layers on the substrate; redesign per spec; keep `game_name` + slug + analytics; pass full assertion set. All canvas games become DPI-aware and responsive.

### Task 2.1: `dodo-dash` (259 LOC → endless runner done right)
- **Fix**: responsive canvas (fill width, min-height strategy), touch controls (tap = jump, hold = higher jump, swipe down = duck), audio (jump, land, coin, hit, milestone).
- **Redesign**: parallax desert background (3 layers) + day/night cycle tied to distance; obstacle variety (cacti heights, flying invoices to duck under, rolling chargeback boulders); collectible coins with magnet power-up; speed ramp with visible milestone celebrations every 500m; near-miss detection (flappy-style close-call bonus); running dust particles, death tumble animation.
- **Depth**: double-jump unlock at 1000m per run (temporary, resets), risk lane: coins cluster near obstacles.

### Task 2.2: `merchant-hero-dodo` (546 LOC side-scroller shooter)
- **Fix**: touch controls (drag to move, auto-fire toggle, shield button), audio suite, DPI-aware.
- **Redesign**: wave structure with named waves + intermission upgrade picks (choose 1 of 3: fire rate, spread shot, shield capacity — themed as payment infra upgrades); enemy attack patterns (sine, dive, formation); mini-boss every 5 waves with telegraphed attacks; damage feedback (hit flash, shield shatter effect); scrolling nebula parallax.
- **Depth**: combo multiplier for no-damage waves; score-driven `waveComplete` analytics kept.

### Task 2.3: `firewall-breaker-dodo` (452 LOC breakout)
- **Fix**: audio suite; CSS/juice polish (zero today).
- **Redesign**: 9 handcrafted levels (3 existing → 9 with layout variety: moving bricks, shielded bricks needing double-hit, explosive bricks chaining); brick destruction particles + screen shake scaled by combo; ball trail; paddle english (hit position affects angle — verify/tune existing); power-up drop animations; level intro cards; lives shown as shield icons.
- **Depth**: brick-break combo meter (consecutive breaks without paddle touch = bonus), per-level star rating persisted.

### Task 2.4: `ddos-defense-dodo` (518 LOC defense clicker)
- **Redesign**: wave-based structure with escalating bot types (basic, fast, tank, swarm, boss botnet every 5th) + between-wave shop phase (existing upgrades rebalanced + 2 new: honeypot decoy, CDN shield); core HP visualization (server rack that visibly degrades); enemy death particles, click ripples, upgrade purchase celebrations; threat-level music-esque audio intensity (cue pitch/rate scales with wave).
- **Depth**: overkill economy — pop streaks grant credit multipliers; strategic choice between healing and upgrading.

### Task 2.5: `payment-invaders-dodo` (1275 LOC, most complete — polish pass)
- **Fix**: REMOVE Tailwind CDN (replace utility classes with `dodo-arcade.css` + minimal custom CSS); DPI-aware internal resolution (currently 800×600 CSS-scaled = soft on retina); achievement popup transitions.
- **Redesign (lighter touch — already deep)**: rebalance boss waves; add 1 new enemy behavior (shielded fraudster requiring flank shots); unify its bespoke juice with `DodoJuice` (keep what's good, delete duplicated code); ensure mobile D-pad meets 44px targets and thumb-zone layout.

---

## Wave 3 — DOM/grid puzzle batch (parallel: 5 games; ALL stay DOM)

### Task 3.1: `ledger-blocks-dodo` (434 LOC tetris — solid logic, weakest presentation)
- **Redesign**: hold-piece slot, ghost-piece projection, next-3 queue (currently 1); soft/hard drop distinction with drop-trail effect; line-clear choreography (flash → collapse with per-cell particle burst; tetris-clear = full screen shake + "BATCH SETTLED!" celebration); level system (speed + palette shift every 10 lines); danger state (stack near top = red pulse + audio tick).
- **Audio**: rotate, move, lock, line clear (scaling by lines), tetris fanfare, level up, game over.
- **Mobile**: rework touch — swipe left/right = move, tap = rotate, swipe down = soft drop, long-swipe down = hard drop; on-screen buttons remain as fallback.

### Task 3.2: `revenue-2048-dodo` (351 LOC — decent, deepen + polish)
- **Redesign**: undo (1 per game, themed "Refund"); milestone celebrations at $1K/$1M/$1B (confetti + quip); merge chain detection (multi-merge in one move = combo bonus + bigger juice); smooth 120ms slide animations verified frame-accurate; post-$1B endless mode prompt.
- **Audio**: slide, merge (pitch scales with tile value), milestone, game over.

### Task 3.3: `token-match-dodo` (227 LOC memory — shallowest game, biggest redesign)
- **Redesign**: 3 difficulty levels (4×3, 4×4, 6×4) with per-difficulty best scores; combo streak system (consecutive matches without a miss = multiplier + escalating juice); "peek" power-up (once per game, 1s reveal, score penalty); match celebration particles on the matched pair; card art upgrade — consistent SVG token designs (payment brands redrawn as original flat icons to avoid trademark art, themed labels kept); 3D flip polish with stagger-deal intro animation.
- **Audio**: flip, match (pitch up per combo), miss, win fanfare, peek.

### Task 3.4: `api-wordle-dodo` (271 LOC wordle)
- **Redesign**: daily mode (date-seeded deterministic word — no server) + free-play mode; streak tracking (daily mode: current/max streak in stats); hard mode toggle (revealed hints must be used); word list expansion to ≥150 payment/fintech terms with definitions shown post-game ("Today's term: LEDGER — ..."); reveal animation moved to CSS animation events (kill fragile setTimeout chains); keyboard press feedback; win celebrations tiered by guess count.
- **Audio**: key tap, reveal tick, absent/present/correct cues, win/lose.
- **Persistence**: stats object under `dodo_api-wordle-dodo_highscore` namespace-compatible key + `dodo_wordle_stats` (migrate existing stats key from config snapshot).

### Task 3.5: `fraud-whacker-dodo` (247 LOC whack-a-mole — flattest visuals)
- **Redesign**: replace bare buttons with animated hole+popup sprites (CSS transforms — pop-up/slam-down animations); target variety: fraud (whack), legit transaction (DON'T whack — penalty), golden fraud (2x points, faster), decoy chargeback (explodes if missed too long → lose life); frenzy mode every 25 whacks (5s all-fraud swarm); combo meter with visual tiers; hammer cursor / tap splash effect; haptics on mobile.
- **Audio**: pop-up, whack, golden whack, wrong-whack buzzer, frenzy siren, game over.
- **Engineering**: keep DOM but drive spawn/despawn off a single rAF-based scheduler (kills setTimeout drift).

---

## Wave 4 — Grid/reaction batch (parallel: 2 games; both drop Tailwind CDN)

### Task 4.1: `snake-game-dodo` (508 LOC)
- **Fix**: BROKEN high-score persistence (no `localStorage.setItem` — wire through `DodoJuice.highscore`); remove Tailwind CDN (port used utilities to custom CSS, keep cyberpunk grid/scanline aesthetic).
- **Redesign**: level progression (every 10 apples = speed tier + new fraud-block pattern); golden apple event (timed, 5x points, spawns countdown ring); moving fraud blocks at higher levels; smooth interpolated snake movement (lerp between grid cells — modern snake feel); death replay flash showing collision point; PCI-shield power-up juice upgrade (invincibility aura particles).
- **Audio**: eat (pitch scales with chain), power-up, shield break, golden apple, death, level up.

### Task 4.2: `checkout-rush-dodo` (464 LOC)
- **Fix**: ZERO persistence → add high score + best combo under standard keys; remove Tailwind CDN.
- **Redesign**: endless mode with escalating spawn rate + 4th payment type (UPI) unlocking at 30s; VIP customers (gold, 3x points, shorter patience); wrong-tap penalty rework (patience drain vs instant fail — tune for fairness); "Instant Settlement" power-up earns via 10-combo instead of random; customer emotion states (patience bar + facial state changes); desk/queue art polish on substrate components.
- **Audio**: correct tap (combo pitch laddering), wrong tap, VIP arrival, power-up, overflow warning tick, game over.

---

## Wave 5 — Home page redesign (starts after Wave 1 gate; can run parallel with Waves 2–4; final thumbnail swap happens in Wave 6)

### Task 5.1: Rebuild `index.html` + `assets/home.css` + `assets/home.js`
Full redesign, externalized assets (so `build.js` minifies them):
- **Layout**: hero with animated Dodo mascot + tagline; sticky top bar (logo, search input, mute-all toggle); featured game spotlight (rotates: highest-scored or newest); responsive card grid with genre filter chips (Action / Puzzle / Arcade / Word) + live search; footer (Discord CTA, GitHub, license).
- **Cards**: WebP thumbnail (`loading="lazy"`, explicit `width`/`height` — zero CLS), title, one-line hook, genre tag, personal-best badge (reads `dodo_{slug}_highscore`), play count via localStorage. Dynamic "NEW" badge (data-driven from a `games.js` manifest with release dates — kill hardcoded Hot/New).
- **Preserved features**: Boss Mode easter egg (fake spreadsheet overlay + `DodoAnalytics.bossMode`), resume-last-played badge (`dodo_last_played`), dark theme + Dodo Green identity.
- **Background**: replace `setInterval` matrix rain with a lightweight rAF-driven ambient effect (drifting currency glyph particles, paused when `document.hidden`, disabled under reduced motion).
- **Data**: `assets/games-manifest.js` — single array of `{slug, title, hook, genre, released}` driving card render; sitemap/README stay hand-maintained but MUST be cross-checked against the manifest in Wave 6.
- **SEO**: preserve/upgrade all meta, OG, Twitter tags, JSON-LD (upgrade to `ItemList` of `VideoGame` entries); canonical URL kept.
Verify: home assertion set (§ Verification Strategy) minus final thumbnails (placeholder-tolerant until Wave 6).

---

## Wave 6 — Thumbnails, global sweep, merge (serial; after ALL prior waves)

### Task 6.1: Thumbnail + OG image regeneration
- `scripts/shoot-thumbnails.mjs` (devDependency-only: Playwright + sharp): for each of 14 games, load the revamped game, capture a representative gameplay frame at 1200×630, export card WebP (≤100KB, 600×315) into `assets/images/{slug}.webp`; regenerate `dodo-games` OG composite (≤300KB).
- Replace card references in the manifest; keep old PNGs for any external OG references of game pages OR regenerate those too (each game page's `og:image` must point at an existing ≤300KB file).
Verify: all card images <100KB (scripted stat check); home Lighthouse re-run passes; no 404s for any `og:image`.

### Task 6.2: Global regression + docs
- Run full suite (`test:all`) against `dist/` (fresh `npm run build`). All green.
- Compile a **video review index**: `.omo/evidence/games-quality-revamp/REVIEW.md` linking every game's `gameplay-desktop.webm` + `gameplay-mobile.webm` (plus home page walkthrough video) — the deliverable handed to the user for review.
- Global greps (Tailwind CDN, console.log) per § Verification Strategy.
- Update `README.md` game table descriptions to match redesigns; update `sitemap.xml` `lastmod` dates; add a short `README.md` per game directory (what it is, controls, features) — 13 files.
- Cross-check: manifest slugs == sitemap URLs == README table == card links.

### Task 6.3: Merge gate
- Push branch; confirm Cloudflare preview deployment renders home + 3 spot-checked games correctly (Playwright against the preview URL).
- Open PR `revamp/quality-pass` → `main` with the evidence summary. Merge ONLY after suite is green on the branch. (Merging auto-deploys to production.)
- Post-merge: Playwright smoke against production home page URL + 2 games; verify GA4 events still fire (`gtag` network beacon capture).

---

## Execution Strategy

- **Waves**: 0 → 1 (GATE) → {2, 3, 4, 5 in parallel} → 6.
- Within waves 2–4, one agent per game, run in parallel; each receives: this plan section, the substrate API docs (fixture files), the pilot game as reference implementation, and its frozen config snapshot.
- Every game task's completion claim = its Playwright spec passing locally + evidence files written. The orchestrator re-runs the spec before accepting (trust but verify).
- **3-failure rule**: any task failing its spec 3 consecutive times stops, reverts to last green state, and escalates with the failure evidence.
- Substrate API is FROZEN after the Wave 1 gate (additive changes only) so parallel batches never break each other.
- No task modifies another game's directory; shared-file edits (`assets/*`, root `index.html`, manifest) are owned exclusively by Wave 0/5/6 tasks to prevent merge conflicts between parallel agents.

---

## TODOs

- [x] 1. [Wave 0 / Task 0.1] Create branch `revamp/quality-pass`; add `tests/` + `scripts/` to build.js ignore; verify dist/ excludes them
- [x] 2. [Wave 0 / Task 0.2] Build `assets/dodo-arcade.css` (tokens + components + fixture page, a11y-verified)
- [x] 3. [Wave 0 / Task 0.3] Build `assets/dodo-juice.js` (audio synth, particles, shake, haptics, reduced-motion, highscore migration + fixture spec)
- [x] 4. [Wave 0 / Task 0.4] Build Playwright verification harness + frozen per-game snapshots + package.json updates (devDeps, test scripts, license GPL-3.0)
- [x] 5. [Wave 0 / Task 0.5] Standardize `dodo-dash/` + `merchant-hero-dodo/` to Pattern A structure
- [x] 6. [Wave 1 / Task 1.0] PILOT — full revamp of `dodo-pong` + GATE (full assertion set + rubric ≥4/5 + gameplay videos)
- [ ] 7. [Wave 2 / Task 2.1] Revamp `dodo-dash`
- [ ] 8. [Wave 2 / Task 2.2] Revamp `merchant-hero-dodo`
- [ ] 9. [Wave 2 / Task 2.3] Revamp `firewall-breaker-dodo`
- [ ] 10. [Wave 2 / Task 2.4] Revamp `ddos-defense-dodo`
- [ ] 11. [Wave 2 / Task 2.5] Revamp `payment-invaders-dodo` (incl. Tailwind CDN removal)
- [ ] 12. [Wave 3 / Task 3.1] Revamp `ledger-blocks-dodo`
- [ ] 13. [Wave 3 / Task 3.2] Revamp `revenue-2048-dodo`
- [ ] 14. [Wave 3 / Task 3.3] Revamp `token-match-dodo`
- [ ] 15. [Wave 3 / Task 3.4] Revamp `api-wordle-dodo`
- [ ] 16. [Wave 3 / Task 3.5] Revamp `fraud-whacker-dodo`
- [ ] 17. [Wave 4 / Task 4.1] Revamp `snake-game-dodo` (incl. persistence fix + Tailwind CDN removal)
- [ ] 18. [Wave 4 / Task 4.2] Revamp `checkout-rush-dodo` (incl. persistence + Tailwind CDN removal)
- [ ] 19. [Wave 5 / Task 5.1] Home page full redesign (manifest, search/filter, external CSS/JS, easter eggs preserved)

## Final Verification Wave

- [ ] F1. Regenerate all thumbnails + OG images (WebP, <100KB cards / <300KB OG)
- [ ] F2. Global regression suite green against dist/ + docs updates + video review index (`REVIEW.md`)
- [ ] F3. Cloudflare preview verification + open PR to `main` (merge requires explicit user approval — production deploy)

## Task Summary

| # | Task | Wave | Parallel | Blocking gate |
|---|---|---|---|---|
| 0.1 | Branch + build ignore rails | 0 | – | – |
| 0.2 | dodo-arcade.css | 0 | – | fixture a11y+render |
| 0.3 | dodo-juice.js | 0 | – | fixture API spec |
| 0.4 | Verification harness + frozen snapshots | 0 | – | harness proves it can fail |
| 0.5 | License + structure standardization | 0 | – | smoke |
| 1.0 | PILOT: dodo-pong full revamp | 1 | – | **FULL GATE + rubric calibration** |
| 2.1–2.5 | dodo-dash, merchant-hero, firewall-breaker, ddos-defense, payment-invaders | 2 | ✅ | per-game spec |
| 3.1–3.5 | ledger-blocks, revenue-2048, token-match, api-wordle, fraud-whacker | 3 | ✅ | per-game spec |
| 4.1–4.2 | snake, checkout-rush | 4 | ✅ | per-game spec |
| 5.1 | Home page redesign | 5 | ✅ (with 2–4) | home spec |
| 6.1 | Thumbnails + OG | 6 | – | size+Lighthouse |
| 6.2 | Global regression + docs | 6 | – | full suite green |
| 6.3 | Preview verify + PR + merge + prod smoke | 6 | – | production smoke |
