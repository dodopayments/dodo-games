# 8 New Dodo Games

## TL;DR

> **Quick Summary**: Build 8 new browser arcade games for the Dodo Games collection, expanding from 7 to 15 total games. Each is a self-contained HTML/CSS/JS canvas game, payment/fintech themed, following existing codebase conventions.
>
> **Deliverables**:
> - 8 new game directories, each with `index.html`, `assets/script.js`, `assets/style.css`, `assets/images/`
> - Updated landing page (`index.html`) with 8 new game cards
> - Updated `sitemap.xml` with 8 new entries
> - Updated `README.md` game table
> - Card images for each game in `assets/images/`
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 (template game) → Tasks 2-8 (parallel games) → Task 9 (landing page + sitemap) → Task 10 (build + QA)

---

## Context

### Original Request
User wants to add 5+ more interesting games to the Dodo Games collection. After reviewing proposed concepts spanning untapped genres (puzzle, word, strategy, multiplayer), user chose to build all 8 proposed games.

### Interview Summary
**Key Discussions**:
- Reviewed all 7 existing games and their genres (Flappy Bird, Tower Defense, Space Invaders, Snake, Matching/Reaction, Endless Runner, Space Shooter)
- Proposed 8 new game concepts covering untapped genres
- User chose ALL 8 instead of narrowing to 5
- No test infrastructure exists — QA via Playwright browser verification

**Research Findings**:
- Two conflicting file structure patterns exist (5/7 use `assets/` subdirectory — this is the majority pattern to follow)
- Some games use Tailwind CDN (2/7) — new games should use custom CSS only for consistency
- localStorage keys and saveGame() names are inconsistent across existing games
- Only 1 of 7 existing games has a "Back to Arcade" navigation link
- Game complexity ranges from 259 to 1275 lines of JS
- Build system auto-detects directories with index.html — no build.js changes needed

### Metis Review
**Identified Gaps** (addressed):
- Directory slug naming convention needed → standardized with `-dodo` suffix
- Dodo Pong scope ambiguity (2P vs AI) → AI-only for simplicity
- API Wordle "shareable grid" scope → clipboard emoji text only, no server state
- Mobile input handling critical for Minesweeper (no right-click), Tetris (rotation), Wordle (keyboard) → each game has specific mobile UX solutions
- Card image production process → generate screenshots after each game is built
- Template validation strategy → build Fraud Whacker first as template validator, then parallel-build remaining 7

---

## Work Objectives

### Core Objective
Build 8 new self-contained HTML/CSS/JS browser arcade games, integrate them into the landing page, sitemap, and README, and verify everything builds and runs correctly.

### Concrete Deliverables
- 8 game directories: `fraud-whacker-dodo/`, `revenue-2048-dodo/`, `token-match-dodo/`, `dodo-pong/`, `fraud-sweeper-dodo/`, `firewall-breaker-dodo/`, `api-wordle-dodo/`, `ledger-blocks-dodo/`
- 8 card images in `assets/images/`
- Updated root `index.html` with 8 new game cards (before Discord card)
- Updated `sitemap.xml` with 8 new URL entries
- Updated `README.md` game table

### Definition of Done
- [ ] All 8 games load in browser without console errors
- [ ] All 8 games have complete game loop: start screen → gameplay → game over → restart
- [ ] All 8 games work with both keyboard AND touch input
- [ ] All 8 game cards appear on landing page with working links
- [ ] `npm run build` succeeds and all 15 games appear in `dist/`
- [ ] `sitemap.xml` has 16 total `<url>` entries (root + 15 games)

### Must Have
- Every game uses Pattern A file structure: `{slug}/index.html`, `{slug}/assets/script.js`, `{slug}/assets/style.css`
- Every game has full SEO: meta tags, OG tags, Twitter cards, VideoGame structured data
- Every game includes `../assets/analytics.js` and integrates `DodoAnalytics` (with `typeof` guard)
- Every game includes shared favicons from `../assets/`
- Every game has a `← Back to Arcade` link
- Every game uses namespaced localStorage: `dodo_{slug}_highscore`
- Every game handles both keyboard and touch input for all game mechanics
- Landing page Discord "Got a Crazy Idea?" card stays LAST in the grid
- New card images use `loading="lazy"` attribute

### Must NOT Have (Guardrails)
- ❌ NO external libraries, CDNs, or frameworks (pure vanilla HTML/CSS/JS + Canvas)
- ❌ NO Tailwind CDN (even though 2 existing games use it)
- ❌ NO daily word rotation or server-side state for API Wordle (random per play)
- ❌ NO online/networked multiplayer for Dodo Pong (local AI opponent only)
- ❌ NO modification to existing game directories
- ❌ NO modification to `build.js`, `assets/analytics.js`, or CI/CD config
- ❌ NO game exceeding ~800 lines of JavaScript
- ❌ NO more than 3 power-up types per game
- ❌ NO console.log statements left in production code
- ❌ NO excessive comments, over-abstraction, or AI slop patterns

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (no test framework in project)
- **Framework**: N/A
- **QA Strategy**: Agent-Executed QA via Playwright browser verification + bash command verification

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Each Game**: Use Playwright (`dev-browser` skill) — Load page, verify canvas, play through game loop, check mobile responsiveness, check console errors
- **Landing Page**: Use Playwright — Verify all 15 cards render, images load, links work, Discord card is last
- **Build**: Use Bash — Run `npm run build`, verify all 15 game dirs exist in `dist/`
- **Sitemap/SEO**: Use Bash (grep) — Verify all required meta tags, URL entries, structured data

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.

```
Wave 1 (Template Validator — build first, verify pattern):
└── Task 1: Fraud Whacker Dodo (simplest game, validates entire pattern) [deep]

Wave 2 (After Wave 1 — all 7 remaining games in MAX PARALLEL):
├── Task 2: Revenue 2048 Dodo (depends: 1 — follow template) [deep]
├── Task 3: Token Match Dodo (depends: 1) [deep]
├── Task 4: Dodo Pong (depends: 1) [deep]
├── Task 5: Fraud Sweeper Dodo (depends: 1) [deep]
├── Task 6: Firewall Breaker Dodo (depends: 1) [deep]
├── Task 7: API Wordle Dodo (depends: 1) [deep]
└── Task 8: Ledger Blocks Dodo (depends: 1) [deep]

Wave 3 (After Wave 2 — integration):
├── Task 9: Landing page, sitemap, README updates (depends: 1-8) [unspecified-high]
└── Task 10: Card images for all 8 games (depends: 1-8) [visual-engineering]

Wave 4 (After Wave 3 — verification):
└── Task 11: Build verification + full QA sweep (depends: 9, 10) [deep]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA via Playwright (unspecified-high + dev-browser skill)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Tasks 2-8 (parallel) → Task 9 + 10 (parallel) → Task 11 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2-8 | 1 |
| 2 | 1 | 9, 10 | 2 |
| 3 | 1 | 9, 10 | 2 |
| 4 | 1 | 9, 10 | 2 |
| 5 | 1 | 9, 10 | 2 |
| 6 | 1 | 9, 10 | 2 |
| 7 | 1 | 9, 10 | 2 |
| 8 | 1 | 9, 10 | 2 |
| 9 | 1-8 | 11 | 3 |
| 10 | 1-8 | 11 | 3 |
| 11 | 9, 10 | F1-F4 | 4 |
| F1 | 11 | — | FINAL |
| F2 | 11 | — | FINAL |
| F3 | 11 | — | FINAL |
| F4 | 11 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **1 agent** — T1 → `deep`
- **Wave 2**: **7 agents** — T2-T8 → `deep`
- **Wave 3**: **2 agents** — T9 → `unspecified-high`, T10 → `visual-engineering`
- **Wave 4**: **1 agent** — T11 → `deep`
- **FINAL**: **4 agents** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `dev-browser`, F4 → `deep`

---

## TODOs

- [ ] 1. Fraud Whacker Dodo (Template Validator Game)

  **What to do**:
  - Create directory `fraud-whacker-dodo/` with Pattern A structure: `index.html`, `assets/script.js`, `assets/style.css`, `assets/images/`
  - Build a Whack-a-Mole style game where fraudulent transactions pop up from "holes" (styled as payment terminal slots) and the player must tap/click them before they process
  - Game mechanics:
    - 3x3 grid of payment terminal slots
    - Fraudulent transactions ("Stolen Card", "Fake Identity", "Chargeback Scam", "Bot Attack") pop up randomly with varied durations (start at 1.5s, decrease to 0.5s as difficulty increases)
    - Player taps/clicks to "block" the fraud before it processes
    - Score: +10 per fraud blocked, -20 per fraud that processes through
    - Combo multiplier: 3+ consecutive blocks = x2, 5+ = x3, 10+ = x5
    - Game ends when 5 fraudulent transactions process through (lives system)
    - Progressive difficulty: fraud appears faster and for shorter durations over time
  - Visual style: Dark theme matching Dodo brand (--primary: #C1FF00, --bg-dark: #050505), each fraud type has distinct color/icon
  - HTML boilerplate: Copy SEO pattern from `flappy-dodo/index.html:1-56` (meta tags, OG, Twitter, VideoGame structured data, analytics, favicons)
  - Include `<a href="/" class="back-btn">← Back to Arcade</a>` link
  - Integrate `DodoAnalytics.gameStart()`, `DodoAnalytics.gameOver(score)`, `DodoAnalytics.newHighScore(score)` with `typeof DodoAnalytics !== 'undefined'` guard
  - localStorage key: `dodo_fraud_whacker_highscore`
  - Touch input: `touchstart` on each slot for tap-to-whack (prevent default to avoid double-fire with click)
  - Keyboard input: Number keys 1-9 mapped to grid positions (as alternative input)
  - Complete game loop: Start screen (title + instructions + "START" button) → Gameplay → Game Over (score + best score + "PLAY AGAIN" button)
  - **This is the TEMPLATE VALIDATOR** — all subsequent games will follow the exact patterns established here

  **Must NOT do**:
  - No external libraries or CDNs
  - No more than 3 fraud types simultaneously on screen
  - No exceeding ~600 lines of JS (this is the simplest game)
  - No console.log in production

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: First game sets the template pattern — needs thorough implementation that all 7 subsequent games will copy. Getting this wrong cascades.
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Needed to verify game loads, plays through, and works on mobile viewport via Playwright
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — game uses canvas rendering, not complex DOM/CSS layouts

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 — must complete first)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8 (all subsequent games follow this template)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `flappy-dodo/index.html:1-56` — Complete HTML boilerplate with SEO meta tags, OG tags, Twitter cards, VideoGame structured data, analytics script inclusion, favicon links. Copy this structure exactly.
  - `flappy-dodo/index.html:58-84` — Game UI structure pattern: canvas element + UI overlay divs for start screen and game over screen with buttons
  - `flappy-dodo/assets/script.js:1-100` — Game initialization pattern: CONFIG object at top, canvas setup, game state variables, asset loading, game loop with requestAnimationFrame
  - `flappy-dodo/assets/style.css` — Dodo brand CSS variables and dark theme styling

  **API/Type References** (contracts to implement against):
  - `assets/analytics.js` — DodoAnalytics API: `DodoAnalytics.gameStart(gameName)`, `DodoAnalytics.gameOver(gameName, score)`, `DodoAnalytics.newHighScore(gameName, score)` — always guard with `typeof DodoAnalytics !== 'undefined'`

  **External References**:
  - Whack-a-Mole game mechanics: https://en.wikipedia.org/wiki/Whac-A-Mole — Random popup timing, hit detection, progressive speed increase

  **WHY Each Reference Matters**:
  - flappy-dodo/index.html is the most complete SEO boilerplate — copy it to avoid missing any meta tags
  - flappy-dodo/assets/script.js shows the canonical game loop pattern — CONFIG object + state management + requestAnimationFrame
  - analytics.js integration is mandatory but the API must be guarded — existing games show this pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Game loads and start screen displays
    Tool: Playwright (dev-browser skill)
    Preconditions: fraud-whacker-dodo/index.html exists
    Steps:
      1. Navigate to file:///{project-root}/fraud-whacker-dodo/index.html
      2. Wait for page load (timeout: 5s)
      3. Check browser console for errors
      4. Look for start screen with game title and start button
      5. Screenshot the start screen
    Expected Result: Page loads with zero console errors, start screen visible with "FRAUD WHACKER" title and start button
    Failure Indicators: Console errors, blank page, missing start screen elements
    Evidence: .sisyphus/evidence/task-1-start-screen.png

  Scenario: Complete game loop (start → play → game over → restart)
    Tool: Playwright (dev-browser skill)
    Preconditions: Game start screen is visible
    Steps:
      1. Click the start button
      2. Wait 500ms for game to initialize
      3. Verify 3x3 grid of slots is visible
      4. Wait for a fraud popup to appear (timeout: 3s)
      5. Click the fraud popup
      6. Verify score increases (score display shows > 0)
      7. Wait for game over (let 5 frauds process through without clicking — timeout: 60s)
      8. Verify game over screen shows with final score and play again button
      9. Click "Play Again" button
      10. Verify start screen or gameplay resets
    Expected Result: Full game loop completes — start, play, game over with score, restart works
    Failure Indicators: Game freezes, no game over triggered, restart doesn't work, score doesn't display
    Evidence: .sisyphus/evidence/task-1-game-loop.png

  Scenario: Touch input works (mobile simulation)
    Tool: Playwright (dev-browser skill)
    Preconditions: Game is in play state
    Steps:
      1. Set viewport to 375x667 (iPhone SE)
      2. Navigate to game and start
      3. Wait for fraud popup
      4. Use touchstart event on the popup element
      5. Verify score increases
    Expected Result: Touch input successfully registers and blocks fraud
    Failure Indicators: Touch events not handled, score doesn't change on touch
    Evidence: .sisyphus/evidence/task-1-touch-input.png

  Scenario: SEO and infrastructure verification
    Tool: Bash (grep)
    Preconditions: fraud-whacker-dodo/ directory exists
    Steps:
      1. grep 'og:image' fraud-whacker-dodo/index.html
      2. grep 'VideoGame' fraud-whacker-dodo/index.html
      3. grep 'analytics.js' fraud-whacker-dodo/index.html
      4. grep 'favicon.ico' fraud-whacker-dodo/index.html
      5. grep 'DodoAnalytics' fraud-whacker-dodo/assets/script.js
      6. grep 'localStorage' fraud-whacker-dodo/assets/script.js
      7. grep 'touchstart' fraud-whacker-dodo/assets/script.js
      8. grep 'Back to Arcade' fraud-whacker-dodo/index.html
    Expected Result: All 8 greps return matches (exit code 0)
    Failure Indicators: Any grep returns no match (exit code 1)
    Evidence: .sisyphus/evidence/task-1-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add fraud whacker dodo game`
  - Files: `fraud-whacker-dodo/*`

---

- [ ] 2. Revenue 2048 Dodo

  **What to do**:
  - Create directory `revenue-2048-dodo/` with Pattern A structure
  - Build a 2048-style sliding puzzle game themed around growing revenue
  - Game mechanics:
    - 4x4 grid of revenue tiles
    - Tiles show dollar amounts: $1 → $2 → $4 → $8 → $16 → $32 → $64 → $128 → $256 → $512 → $1K → $2K → $4K → $8K → $16K → $32K → $64K → $128K → $256K → $512K → $1M → (win: Unicorn $1B!)
    - Swipe (mobile) or Arrow keys (desktop) to slide all tiles in a direction
    - Matching tiles merge and double in value
    - New $1 tile appears after each move
    - Game over when no moves available
    - Win condition: reach the $1B "Unicorn" tile (optional continue playing after win)
    - Score: sum of all merged values
  - Payment theming: tiles colored in Dodo brand gradient (green → gold → purple as values increase). Tile labels use revenue terms ($1 → $1K → $1M → $1B)
  - Visual style: Dark theme, smooth tile slide animations (CSS transitions on transform), tile merge pop animation
  - Mobile: Swipe detection with 30px minimum threshold to avoid accidental triggers. `touch-action: none` scoped to game container div only (NOT body — would break page scroll)
  - Copy HTML boilerplate from Task 1 (fraud-whacker-dodo), updating game-specific meta tags
  - Include Back to Arcade link, DodoAnalytics integration, localStorage key: `dodo_revenue_2048_highscore`

  **Must NOT do**:
  - No undo feature
  - No tile animations exceeding 150ms
  - No external dependencies
  - `touch-action: none` must NOT be on body element

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 2048 has non-trivial tile merging logic (merge order, preventing double-merges in a single move) that requires careful implementation
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify swipe detection works on mobile viewport, tile animations render, game plays through
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Could help with tile animations, but CSS transitions are simple enough without it

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5, 6, 7, 8)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1 (template pattern)

  **References**:

  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate template (copy and update meta tags for this game)
  - `fraud-whacker-dodo/assets/script.js` — Game loop pattern, analytics integration pattern, localStorage pattern, touch handling pattern
  - `fraud-whacker-dodo/assets/style.css` — CSS variables and dark theme base

  **External References**:
  - 2048 game algorithm: The core merge logic requires processing tiles row-by-row in the direction of movement, merging equal adjacent tiles (each tile can only merge once per move), and shifting tiles to fill gaps
  - Original 2048 by Gabriele Cirulli: https://play2048.co/ — Reference for UX feel and tile animation speed

  **WHY Each Reference Matters**:
  - fraud-whacker-dodo (Task 1) is THE template — copy its HTML structure, analytics integration, localStorage pattern, and touch handling exactly
  - 2048 merge algorithm is the trickiest part — tiles must be processed in correct order and each tile can only merge once per move to avoid chain-merges

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Game loads and tiles slide correctly
    Tool: Playwright (dev-browser skill)
    Preconditions: revenue-2048-dodo/index.html exists
    Steps:
      1. Navigate to file:///{project-root}/revenue-2048-dodo/index.html
      2. Click start button
      3. Verify 4x4 grid is visible with 2 initial tiles
      4. Press ArrowRight key
      5. Wait 200ms for animation
      6. Verify tiles have moved (grid state changed)
      7. Verify a new tile appeared
      8. Screenshot the game state
    Expected Result: Tiles slide right, merge if matching, new tile spawns
    Failure Indicators: Tiles don't move, no new tile appears, grid doesn't update
    Evidence: .sisyphus/evidence/task-2-tile-slide.png

  Scenario: Swipe detection on mobile viewport
    Tool: Playwright (dev-browser skill)
    Preconditions: Game is in play state
    Steps:
      1. Set viewport to 375x667
      2. Navigate and start game
      3. Perform swipe gesture (touchstart at 200,400 → touchend at 350,400 — right swipe)
      4. Verify tiles moved right
    Expected Result: Swipe detected and tiles slide in swipe direction
    Failure Indicators: Swipe not detected, page scrolls instead of tiles moving
    Evidence: .sisyphus/evidence/task-2-swipe.png

  Scenario: SEO and infrastructure check
    Tool: Bash (grep)
    Preconditions: revenue-2048-dodo/ directory exists
    Steps:
      1. Verify all 8 required patterns (same as Task 1 SEO check but for revenue-2048-dodo)
    Expected Result: All greps return matches
    Evidence: .sisyphus/evidence/task-2-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add revenue 2048 dodo game`
  - Files: `revenue-2048-dodo/*`

- [ ] 3. Token Match Dodo

  **What to do**:
  - Create directory `token-match-dodo/` with Pattern A structure
  - Build a memory card matching game themed around payment tokens
  - Game mechanics:
    - 4x4 grid (8 pairs = 16 cards) for default difficulty
    - Cards show payment token icons face-down: Visa, Mastercard, Amex, Bitcoin, Ethereum, PayPal, Apple Pay, Google Pay
    - Tap/click to flip a card (max 2 face-up at once)
    - If 2 flipped cards match → they stay face-up with a "matched" glow effect, score +100
    - If 2 flipped cards don't match → flip back after 800ms
    - Timer counts UP from 0 (speed run — lower time = better)
    - Move counter tracks total flips
    - Game ends when all 8 pairs found
    - Score formula: base_score - (time_seconds * 2) - (total_flips * 5), minimum 0
    - Best score saved to localStorage
  - Visual style: Cards with payment brand colors on face, Dodo green (#C1FF00) card backs, satisfying flip animation (CSS 3D transform: rotateY)
  - Mobile: Cards sized to fit 4x4 grid in 375px viewport. Touch targets ≥ 44px. `touchstart` on each card.
  - Copy HTML boilerplate from Task 1, localStorage key: `dodo_token_match_highscore`

  **Must NOT do**:
  - No difficulty selector (keep it simple — always 4x4)
  - No hint system
  - No flip animation exceeding 300ms

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Card flip logic with 3D CSS transforms + matching state management needs careful implementation
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify card flips work, matching logic correct, mobile touch targets adequate

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5, 6, 7, 8)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate template
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage patterns

  **External References**:
  - CSS 3D card flip: `transform: rotateY(180deg)` with `backface-visibility: hidden` on front/back faces
  - Memory game algorithm: Fisher-Yates shuffle for card randomization, state machine for flip logic (IDLE → ONE_FLIPPED → TWO_FLIPPED → CHECK_MATCH → IDLE)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Cards flip and matching works
    Tool: Playwright (dev-browser skill)
    Preconditions: token-match-dodo/index.html exists
    Steps:
      1. Navigate to game and click start
      2. Verify 16 face-down cards in 4x4 grid
      3. Click first card — verify it flips to show token icon
      4. Click second card — verify it flips
      5. If match: verify both stay face-up with glow effect
      6. If no match: wait 800ms, verify both flip back face-down
      7. Screenshot the game state
    Expected Result: Card flip animation works, matching logic correct
    Evidence: .sisyphus/evidence/task-3-card-match.png

  Scenario: Game completion and score
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Complete the game by matching all 8 pairs (click cards systematically)
      2. Verify game over screen shows with time, moves, and score
      3. Verify "Play Again" button works
    Expected Result: Game over triggers when all pairs matched, score calculated correctly
    Evidence: .sisyphus/evidence/task-3-completion.png

  Scenario: SEO and infrastructure check
    Tool: Bash (grep)
    Steps: Same 8 grep checks as Task 1 but for token-match-dodo/
    Evidence: .sisyphus/evidence/task-3-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add token match dodo game`
  - Files: `token-match-dodo/*`

---

- [ ] 4. Dodo Pong

  **What to do**:
  - Create directory `dodo-pong/` with Pattern A structure
  - Build a Pong game themed as a payment bouncing between merchant and payment processor
  - Game mechanics:
    - Vertical orientation (player paddle at bottom, AI paddle at top)
    - Ball = payment icon (small circle with $ symbol)
    - Player paddle = "Merchant" (green, Dodo brand color)
    - AI paddle = "Processor" (white/gray)
    - Ball bounces off top/bottom paddles and side walls
    - Score: +1 point when AI misses, -1 when player misses
    - AI difficulty: paddle tracks ball with slight delay (predictive tracking with ~70% accuracy, increases over time)
    - Ball speed increases by 5% each time it hits a paddle
    - Game over at 11 points (first to 11 wins, must win by 2)
    - Between rallies, show payment-themed messages: "Transaction Approved!", "Processing...", "Payment Declined!"
  - Visual style: Clean dark theme, neon glow effects on paddles and ball, retro score display
  - Mobile: Touch-drag on bottom 40% of screen controls player paddle X position. `touchmove` with `preventDefault()` to avoid scrolling.
  - Keyboard: Left/Right arrow keys or A/D keys move paddle
  - Copy HTML boilerplate from Task 1, localStorage key: `dodo_pong_highscore`

  **Must NOT do**:
  - No local 2-player mode (AI only for simplicity)
  - No network multiplayer
  - No AI difficulty selector

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Pong physics (ball angle calculation, collision detection with paddles, AI behavior) needs precise implementation
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify ball physics, paddle controls, AI opponent behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate template
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage patterns
  - `flappy-dodo/assets/script.js` — Canvas rendering and game physics patterns (collision detection, velocity)

  **External References**:
  - Pong ball physics: angle of reflection = angle of incidence. When ball hits paddle, reflect vertically. Add paddle velocity influence on ball angle for dynamic gameplay.
  - AI paddle: Simple predictive tracking — move toward ball's projected X position at paddle's Y, with a speed cap (80% of ball speed) to make it beatable

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Ball bounces and scoring works
    Tool: Playwright (dev-browser skill)
    Preconditions: dodo-pong/index.html exists
    Steps:
      1. Navigate and start game
      2. Wait for ball to launch
      3. Verify ball bounces off side walls
      4. Move player paddle (press ArrowRight) to hit ball
      5. Verify ball bounces off player paddle
      6. Wait for a point to be scored (either player or AI)
      7. Verify score display updates
    Expected Result: Ball physics work correctly, scoring increments
    Evidence: .sisyphus/evidence/task-4-pong-gameplay.png

  Scenario: Mobile paddle control
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Set viewport to 375x667
      2. Start game
      3. Perform touchmove gesture in bottom 40% of screen
      4. Verify player paddle follows touch X position
    Expected Result: Paddle moves smoothly with touch drag
    Evidence: .sisyphus/evidence/task-4-mobile-paddle.png

  Scenario: SEO check
    Tool: Bash (grep)
    Steps: Same 8 grep checks for dodo-pong/
    Evidence: .sisyphus/evidence/task-4-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add dodo pong game`
  - Files: `dodo-pong/*`

---

- [ ] 5. Fraud Sweeper Dodo

  **What to do**:
  - Create directory `fraud-sweeper-dodo/` with Pattern A structure
  - Build a Minesweeper clone themed as finding fraudulent transactions in a grid
  - Game mechanics:
    - 9x9 grid, 10 fraudulent transactions ("mines")
    - Click/tap a cell to reveal it:
      - If fraud → game over ("Fraud Processed! Your account is compromised!")
      - If safe → shows number of adjacent fraudulent cells (0-8)
      - If 0 adjacent → auto-reveal all connected 0-cells (flood fill)
    - Flag mode (toggle button): tap to place/remove a 🚩 flag on suspected fraud cells
    - Mobile UX: Prominent "FLAG MODE" toggle button above grid (replaces right-click). When active, tapping a cell flags it instead of revealing
    - Desktop: Left-click reveals, right-click flags (contextmenu event with preventDefault)
    - Win condition: all non-fraud cells revealed
    - Timer starts on first click, score = time to complete
    - Cell theming: numbers show payment-related colors (1=blue, 2=green, 3=red matching payment status colors), fraud cells show 🚨 icon
  - First click is ALWAYS safe (if first click lands on fraud, move the fraud to another cell)
  - Visual style: Grid cells with subtle borders, revealed cells slightly lighter background, flagged cells with 🚩 overlay
  - Mobile: Grid cells must be ≥ 36px to be tappable. Scale grid to fit viewport width.
  - Copy HTML boilerplate from Task 1, localStorage key: `dodo_fraud_sweeper_best_time`

  **Must NOT do**:
  - No difficulty selector (always 9x9 with 10 frauds)
  - No chord (simultaneous reveal adjacent) mechanic
  - No long-press-to-flag (use explicit toggle button instead — more accessible and discoverable)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Minesweeper has non-trivial algorithms (flood fill for zero-cell auto-reveal, first-click safety) and requires careful mobile UX for flag mode
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify grid renders, flood fill works, flag mode toggle works on mobile

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate template
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage, touch handling patterns

  **External References**:
  - Minesweeper algorithms: Flood fill (BFS/DFS) for auto-revealing zero-cells. First-click safety: if first click is a mine, swap mine to a random safe cell and recalculate adjacency numbers.
  - Grid sizing for mobile: CSS `grid-template-columns: repeat(9, 1fr)` with `max-width: min(100vw - 2rem, 400px)` to contain grid on mobile

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Grid renders and cells reveal correctly
    Tool: Playwright (dev-browser skill)
    Preconditions: fraud-sweeper-dodo/index.html exists
    Steps:
      1. Navigate and start game
      2. Verify 9x9 grid of unrevealed cells
      3. Click a cell
      4. Verify cell reveals a number or triggers flood fill (adjacent cells auto-reveal)
      5. Screenshot the revealed state
    Expected Result: Grid renders, first click is safe, cells reveal with correct numbers
    Evidence: .sisyphus/evidence/task-5-grid-reveal.png

  Scenario: Flag mode toggle on mobile
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Set viewport to 375x667
      2. Start game
      3. Find and tap "FLAG MODE" toggle button
      4. Tap a cell — verify flag icon appears on it
      5. Tap flag mode again to disable
      6. Tap a different cell — verify it reveals normally
    Expected Result: Flag mode toggles correctly, flagged cells show flag icon
    Evidence: .sisyphus/evidence/task-5-flag-mode.png

  Scenario: Game over on fraud click
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Start game, reveal safe cells until a fraud is found
      2. Click a fraud cell (or complete enough safe cells to trigger game over scenario)
      3. Verify game over screen shows with all frauds revealed
      4. Verify restart button works
    Expected Result: Hitting fraud triggers game over, all frauds revealed, restart works
    Evidence: .sisyphus/evidence/task-5-game-over.png

  Scenario: SEO check
    Tool: Bash (grep)
    Steps: Same 8 grep checks for fraud-sweeper-dodo/
    Evidence: .sisyphus/evidence/task-5-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add fraud sweeper dodo game`
  - Files: `fraud-sweeper-dodo/*`

- [ ] 6. Firewall Breaker Dodo

  **What to do**:
  - Create directory `firewall-breaker-dodo/` with Pattern A structure
  - Build a Breakout/Arkanoid style game themed as breaking through layers of fraud firewalls
  - Game mechanics:
    - Player paddle at bottom ("Security Scanner"), ball bounces to destroy blocks at top
    - Blocks arranged in rows representing firewall layers, each with different colors/hit points:
      - Row 1 (top): "Critical Fraud" — red, 3 hits
      - Row 2: "Suspicious Activity" — orange, 2 hits
      - Row 3: "Anomaly Detected" — yellow, 1 hit
      - Row 4 (bottom): "Low Risk" — green, 1 hit
    - Ball bounces off walls, paddle, and blocks. If ball falls below paddle, lose a life (3 lives)
    - Power-ups drop from destroyed blocks (max 3 types):
      - "PCI Shield" (green) — widens paddle for 10s
      - "2FA Ball" (blue) — spawns an extra ball for 15s
      - "Rate Limiter" (yellow) — slows ball for 8s
    - Score: +10 per green block, +20 per yellow, +30 per orange, +50 per red
    - Level complete when all blocks destroyed; next level adds more rows and increases ball speed
    - Game over when all lives lost
  - Visual style: Dark background, neon-glowing blocks, bright ball trail effect, paddle with glow
  - Mobile: Touch-drag controls paddle X position. `touchmove` on game area.
  - Keyboard: Left/Right arrows or mouse move paddle
  - Copy HTML boilerplate from Task 1, localStorage key: `dodo_firewall_breaker_highscore`

  **Must NOT do**:
  - No more than 3 power-up types
  - No more than 3 levels (keep scope manageable)
  - No external dependencies

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Ball physics (angle reflection off paddle position, multi-hit blocks, power-up management) requires careful implementation
  - **Skills**: [`dev-browser`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage
  - `flappy-dodo/assets/script.js` — Canvas physics patterns

  **External References**:
  - Breakout ball physics: ball angle changes based on WHERE it hits the paddle (center = straight up, edges = sharp angle). Use `atan2` for angle calculation.

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Ball bounces and blocks break
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Navigate and start game
      2. Verify blocks grid is visible at top
      3. Wait for ball to hit a block (timeout: 10s)
      4. Verify block disappears or changes color (multi-hit)
      5. Verify score increases
    Expected Result: Ball bounces correctly, blocks break, score updates
    Evidence: .sisyphus/evidence/task-6-breakout.png

  Scenario: Mobile paddle control
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Set viewport to 375x667
      2. Perform touchmove gesture to move paddle
      3. Verify paddle follows touch position
    Expected Result: Paddle moves with touch on mobile
    Evidence: .sisyphus/evidence/task-6-mobile.png

  Scenario: SEO check
    Tool: Bash (grep)
    Steps: Same 8 grep checks for firewall-breaker-dodo/
    Evidence: .sisyphus/evidence/task-6-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add firewall breaker dodo game`
  - Files: `firewall-breaker-dodo/*`

---

- [ ] 7. API Wordle Dodo

  **What to do**:
  - Create directory `api-wordle-dodo/` with Pattern A structure
  - Build a Wordle-style word guessing game using payment/API terminology
  - Game mechanics:
    - Guess a 5-letter payment/API term in 6 attempts
    - On-screen virtual keyboard (MANDATORY — mobile has no physical keyboard for this)
      - 3 rows: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + ENTER + DELETE
      - Keys change color based on usage: green (correct position), yellow (wrong position), gray (not in word)
    - 5-tile guess row shows letters as typed, with current position highlighted
    - On submit (ENTER): each tile animates to reveal color:
      - Green (#C1FF00): correct letter, correct position
      - Yellow (#FFD700): correct letter, wrong position
      - Gray (#555): letter not in word
    - Word list: 50-100 curated 5-letter payment/API terms. Examples:
      - DEBIT, TOKEN, FRAUD, VAULT, SWIFT, BLOCK, CHAIN, BUYER, MONEY, PRICE
      - LEDGE, BATCH, VOIDE, FUNDS, QUOTA, YIELD, STAKE, ASSET, BONDS, TRADE
      - AUDIT, CLERK, DRAFT, FLOAT, GROSS, INDEX, LIMIT, MERGE, ORDER, PAYER
    - Random word selected per play (NOT daily rotation)
    - After win/loss, show shareable emoji grid (copy to clipboard):
      - "API Wordle Dodo 3/6" followed by colored emoji squares representing guesses
      - Use `navigator.clipboard.writeText()` with a "Share Results" button
  - Visual style: Dark theme, tiles with flip animation on reveal, keyboard with rounded keys
  - Mobile: Virtual keyboard is the primary input. Physical keyboard also works on desktop.
  - Desktop: Physical keyboard typing works alongside on-screen keyboard
  - Copy HTML boilerplate from Task 1, localStorage keys: `dodo_wordle_stats` (JSON: games_played, wins, streak, guess_distribution)

  **Must NOT do**:
  - No daily word rotation (random per play)
  - No server-side state or API calls
  - No dictionary validation (accept any 5-letter input — simplifies scope)
  - No hard mode
  - No statistics/streak tracking beyond current session

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Virtual keyboard implementation + letter-state tracking across keyboard and guess grid + shareable results formatting is complex
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify virtual keyboard works on mobile, letter colors update correctly, clipboard sharing works

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage

  **External References**:
  - Wordle letter-state algorithm: After each guess, mark letters as GREEN (exact position match), YELLOW (in word but wrong position), GRAY (not in word). Handle duplicate letters: if word has one 'E' and guess has two 'E's, only the correctly positioned one is green, the other is gray (not yellow).
  - `navigator.clipboard.writeText()` for share functionality — needs user gesture (button click) to work on mobile Safari

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Virtual keyboard and letter input
    Tool: Playwright (dev-browser skill)
    Preconditions: api-wordle-dodo/index.html exists
    Steps:
      1. Navigate and verify 5-tile row and virtual keyboard visible
      2. Click 5 letter keys on virtual keyboard (e.g., D-E-B-I-T)
      3. Verify all 5 tiles show the typed letters
      4. Click ENTER on virtual keyboard
      5. Verify tiles animate and change colors (green/yellow/gray)
      6. Verify keyboard keys update their colors
    Expected Result: Virtual keyboard input works, tiles reveal with correct colors
    Evidence: .sisyphus/evidence/task-7-wordle-input.png

  Scenario: Win condition and share
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Play through to win (may need to know the answer word)
      2. Verify win message displays
      3. Click "Share Results" button
      4. Verify clipboard contains emoji grid text
    Expected Result: Win triggers properly, share copies emoji grid to clipboard
    Evidence: .sisyphus/evidence/task-7-wordle-win.png

  Scenario: Mobile virtual keyboard usability
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Set viewport to 375x667
      2. Verify keyboard fits on screen without scrolling
      3. Tap letter keys and verify they register
    Expected Result: Virtual keyboard fully visible and functional on mobile
    Evidence: .sisyphus/evidence/task-7-mobile-keyboard.png

  Scenario: SEO check
    Tool: Bash (grep)
    Steps: Same 8 grep checks for api-wordle-dodo/
    Evidence: .sisyphus/evidence/task-7-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add api wordle dodo game`
  - Files: `api-wordle-dodo/*`

---

- [ ] 8. Ledger Blocks Dodo

  **What to do**:
  - Create directory `ledger-blocks-dodo/` with Pattern A structure
  - Build a Tetris-style falling block game themed as fitting transactions into a ledger
  - Game mechanics:
    - 10-wide, 20-tall grid (standard Tetris proportions)
    - 7 standard tetromino shapes (I, O, T, S, Z, J, L) themed as transaction types:
      - I-piece = "Wire Transfer" (cyan)
      - O-piece = "Subscription" (yellow)
      - T-piece = "Card Payment" (purple)
      - S-piece = "Crypto" (green/Dodo brand)
      - Z-piece = "Refund" (red)
      - J-piece = "Invoice" (blue)
      - L-piece = "ACH" (orange)
    - Pieces fall from top. Player rotates and positions before they land.
    - Complete row = "Batch Settled" (row clears with flash animation, score +100)
    - Multi-row clears: 2 rows = +300, 3 rows = +500, 4 rows ("Tetris") = +800
    - Gravity increases every 10 cleared rows
    - Game over when pieces stack to top
    - Next piece preview shown in sidebar
    - Score and level display
  - Mobile controls (MANDATORY — on-screen buttons below canvas):
    - Left arrow (←), Right arrow (→), Rotate (↻), Soft Drop (↓), Hard Drop (↡)
    - Buttons must be large enough for comfortable thumb tapping (≥ 48px)
  - Desktop: Arrow keys (left, right, down = soft drop), Up = rotate, Space = hard drop
  - Visual style: Dark grid with subtle gridlines, glowing active piece, settled pieces with slight transparency. "Batch Settled" text flashes when rows clear.
  - Copy HTML boilerplate from Task 1, localStorage key: `dodo_ledger_blocks_highscore`

  **Must NOT do**:
  - No hold piece feature
  - No wall kicks (keep rotation simple — if rotated piece overlaps wall/blocks, don't rotate)
  - No T-spin detection
  - No ghost piece (shadow showing where piece will land)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Tetris has complex piece rotation logic, collision detection, row clearing, and requires precise mobile controls. Most complex game in the set.
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Verify piece movement, rotation, row clearing, mobile button controls

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `fraud-whacker-dodo/index.html` — HTML boilerplate
  - `fraud-whacker-dodo/assets/script.js` — Game loop, analytics, localStorage

  **External References**:
  - Tetris rotation: Store each piece as a 2D array of cells. Rotate by transposing + reversing rows (clockwise). Check bounds/overlap after rotation — if invalid, reject rotation.
  - Tetris gravity: Use a tick-based system. Every N frames, piece moves down one row. N decreases as level increases.
  - Standard Tetris grid: 10 wide, 20 tall (visible) + 2 hidden rows above for piece spawning

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Pieces fall and can be controlled
    Tool: Playwright (dev-browser skill)
    Preconditions: ledger-blocks-dodo/index.html exists
    Steps:
      1. Navigate and start game
      2. Verify a piece appears at top of grid
      3. Press ArrowLeft — verify piece moves left
      4. Press ArrowRight — verify piece moves right
      5. Press ArrowUp — verify piece rotates
      6. Wait for piece to land (or press Space for hard drop)
      7. Verify piece locks in place and new piece spawns
    Expected Result: Pieces fall, respond to controls, lock on landing
    Evidence: .sisyphus/evidence/task-8-tetris-controls.png

  Scenario: Row clearing works
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Play until a complete row is formed
      2. Verify row clears with animation
      3. Verify score increases
      4. Verify blocks above the cleared row drop down
    Expected Result: Complete rows clear, score updates, blocks above settle
    Evidence: .sisyphus/evidence/task-8-row-clear.png

  Scenario: Mobile on-screen buttons
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Set viewport to 375x667
      2. Verify on-screen control buttons visible below game grid
      3. Tap left button — verify piece moves left
      4. Tap rotate button — verify piece rotates
    Expected Result: Mobile buttons work and are large enough to tap comfortably
    Evidence: .sisyphus/evidence/task-8-mobile-buttons.png

  Scenario: SEO check
    Tool: Bash (grep)
    Steps: Same 8 grep checks for ledger-blocks-dodo/
    Evidence: .sisyphus/evidence/task-8-seo-check.txt
  ```

  **Commit**: YES
  - Message: `feat(games): add ledger blocks dodo game`
  - Files: `ledger-blocks-dodo/*`

---

- [ ] 9. Landing Page, Sitemap, and README Updates

  **What to do**:
  - Update root `index.html`:
    - Add 8 new game cards to the `.games-grid` div, BEFORE the Discord "Got a Crazy Idea?" card (which must remain LAST)
    - Each card follows the exact pattern of existing cards (see `index.html:614-623` for Flappy Dodo card template):
      ```html
      <a href="/{slug}" class="game-card" onclick="saveGame('{slug}')">
          <span class="tag-new">New</span>
          <span class="tag-last-played" data-game="{slug}">RESUME?</span>
          <img src="assets/images/{slug}.png" alt="{Game Name}" class="game-card-image" loading="lazy">
          <div>
              <h2>{Game Name}</h2>
              <p>{Game description}</p>
          </div>
          <span class="play-btn">Play Now &rarr;</span>
      </a>
      ```
    - All 8 new cards get `<span class="tag-new">New</span>` tag
    - All 8 new card images use `loading="lazy"` attribute
    - Update `<meta name="description">` to mention new games
  - Game card descriptions:
    - Fraud Whacker: "Block fraudulent transactions before they process! Tap fast, build combos, protect the gateway."
    - Revenue 2048: "Slide and merge revenue tiles. Grow from $1 to $1B unicorn status!"
    - Token Match: "Flip cards to find matching payment tokens. Race the clock, minimize your moves."
    - Dodo Pong: "Bounce payments between merchant and processor. Beat the AI to 11 points!"
    - Fraud Sweeper: "Find the hidden fraudulent transactions. Flag the fraud, reveal the safe ones."
    - Firewall Breaker: "Break through layers of fraud firewalls. Power up with PCI Shield and 2FA Ball!"
    - API Wordle: "Guess the 5-letter payment term in 6 tries. Share your results!"
    - Ledger Blocks: "Fit transaction blocks into the ledger. Clear rows to settle batches!"
  - Update `sitemap.xml`:
    - Add 8 new `<url>` entries following existing format (trailing slash, `<changefreq>monthly</changefreq>`, `<priority>0.8</priority>`)
    - Set `<lastmod>` to current date (YYYY-MM-DD format)
  - Update `README.md`:
    - Add 8 new rows to the Games table following existing format
    - Update project structure section to list all 15 game directories

  **Must NOT do**:
  - Do not modify any existing game card HTML (only add new ones)
  - Do not change the order of existing game cards
  - Discord card MUST remain the last card in the grid

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTML/XML editing across 3 files with precise insertion points. Not creative work, but needs careful placement.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 10)
  - **Parallel Group**: Wave 3 (with Task 10)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1-8 (all games must exist before integration)

  **References**:
  **Pattern References**:
  - `index.html:614-623` — Flappy Dodo game card HTML structure (copy this pattern for all 8 new cards)
  - `index.html:691-698` — Discord "Got a Crazy Idea?" card (new cards must go BEFORE this)
  - `sitemap.xml:9-14` — Existing URL entry format (follow exactly for new entries)
  - `README.md` Games table — follow existing row format

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: All 16 cards render on landing page
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Open root index.html in browser
      2. Count all elements with class .game-card
      3. Verify count = 16 (7 existing + 8 new + 1 Discord)
      4. Verify Discord card is the last .game-card element
      5. Verify all 8 new cards have "New" tag visible
      6. Verify all card images load (no broken image icons)
      7. Click each new card link and verify it navigates to correct game directory
    Expected Result: 16 cards visible, Discord last, all new cards have "New" tag, all links work
    Evidence: .sisyphus/evidence/task-9-landing-page.png

  Scenario: Sitemap has all 16 entries
    Tool: Bash (grep)
    Steps:
      1. grep -c '<url>' sitemap.xml — expect 16
      2. For each slug: grep '{slug}' sitemap.xml — expect match
    Expected Result: 16 URL entries, all 8 new game slugs present
    Evidence: .sisyphus/evidence/task-9-sitemap-check.txt

  Scenario: README game table updated
    Tool: Bash (grep)
    Steps:
      1. grep -c '\*\*\[' README.md — count game links (expect 15)
    Expected Result: 15 game entries in README table
    Evidence: .sisyphus/evidence/task-9-readme-check.txt
  ```

  **Commit**: YES
  - Message: `feat: update landing page, sitemap, and readme with 8 new games`
  - Files: `index.html`, `sitemap.xml`, `README.md`

---

- [ ] 10. Card Images for All 8 Games

  **What to do**:
  - Create card images for each of the 8 new games to be placed in `assets/images/`
  - For each game, generate a representative card image:
    - Open each game in Playwright browser
    - Navigate through the game to get a visually interesting game state (not just start screen)
    - Take a screenshot at ~2000x1040px resolution (matching existing card aspect ratio)
    - Save as PNG to `assets/images/{slug}.png`
  - If games aren't visually mature enough for screenshots, create placeholder card images:
    - Use canvas or a simple HTML template to generate a branded card with:
      - Game title text
      - Dodo brand colors (green #C1FF00 on dark #050505)
      - Simple game-representative icon/emoji
    - Screenshot the template at correct dimensions
  - Verify each image is reasonably sized (< 500KB per image)

  **Must NOT do**:
  - Do not use images from external sources
  - Do not exceed 1MB per card image

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires taking screenshots, composing visual assets, and ensuring consistent branding across all 8 images
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Open each game, navigate to interesting state, take screenshots

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 9)
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1-8

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: All 8 card images exist
    Tool: Bash (ls)
    Steps:
      1. ls assets/images/fraud-whacker-dodo.png assets/images/revenue-2048-dodo.png assets/images/token-match-dodo.png assets/images/dodo-pong.png assets/images/fraud-sweeper-dodo.png assets/images/firewall-breaker-dodo.png assets/images/api-wordle-dodo.png assets/images/ledger-blocks-dodo.png
    Expected Result: All 8 files exist
    Evidence: .sisyphus/evidence/task-10-images-exist.txt

  Scenario: Images are reasonable size
    Tool: Bash
    Steps:
      1. For each image: check file size < 1MB
    Expected Result: All images under 1MB
    Evidence: .sisyphus/evidence/task-10-image-sizes.txt
  ```

  **Commit**: YES (grouped with Task 9)
  - Message: `feat: add card images for 8 new games`
  - Files: `assets/images/*.png`

---

- [ ] 11. Build Verification and Full QA Sweep

  **What to do**:
  - Run `npm run build` and verify:
    - Exit code 0
    - Output includes "Build completed successfully"
    - All 15 game directories exist in `dist/` with their assets
  - Run full verification commands from Success Criteria section
  - Verify no existing games were broken:
    - Open each of the 7 original games in browser and verify they still load
  - Run `ast_grep_search` to verify consistency across all 8 new games:
    - All have `DodoAnalytics` integration
    - All have `localStorage` usage
    - All have touch event handlers
    - No `console.log` statements in production code
  - Open landing page and verify:
    - All 16 cards render (15 games + 1 Discord)
    - No broken images
    - All links navigate correctly
    - Discord card is last in grid

  **Must NOT do**:
  - Do not modify any files in this task (verification only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Comprehensive verification across all 15 games, build system, landing page, and sitemap. Needs thorough systematic checking.
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Open games in browser for verification, check console errors, verify rendering

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 4 — depends on everything)
  - **Parallel Group**: Wave 4 (solo)
  - **Blocks**: Final Verification Wave
  - **Blocked By**: Tasks 9, 10

  **Acceptance Criteria**:
  **QA Scenarios (MANDATORY):**
  ```
  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. npm run build
      2. Verify exit code 0
      3. Verify all 15 game dirs in dist/
    Expected Result: Build passes, all games in dist/
    Evidence: .sisyphus/evidence/task-11-build.txt

  Scenario: All new games load without errors
    Tool: Playwright (dev-browser skill)
    Steps:
      1. For each of 8 new game slugs: open dist/{slug}/index.html
      2. Check console for errors
      3. Verify start screen renders
    Expected Result: All 8 games load cleanly
    Evidence: .sisyphus/evidence/task-11-game-load-check.txt

  Scenario: Existing games not broken
    Tool: Playwright (dev-browser skill)
    Steps:
      1. Open each of 7 existing games from dist/
      2. Verify they still load without errors
    Expected Result: All 7 original games unaffected
    Evidence: .sisyphus/evidence/task-11-existing-games.txt

  Scenario: Cross-game consistency
    Tool: Bash (grep/ast_grep)
    Steps:
      1. Verify all 8 new games have DodoAnalytics integration
      2. Verify all 8 have localStorage usage
      3. Verify all 8 have touch handlers
      4. Verify zero console.log in any new script.js
    Expected Result: All consistency checks pass
    Evidence: .sisyphus/evidence/task-11-consistency.txt
  ```

  **Commit**: NO (verification only)
---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep for patterns). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build`. Review all 8 new `script.js` files for: `console.log` in production, empty catches, commented-out code, unused variables, excessive comments, over-abstraction, generic variable names (data/result/item/temp). Check each game is under ~800 lines. Verify consistent coding style across all 8 games.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | Line Counts [list] | VERDICT`

- [ ] F3. **Real Manual QA via Playwright** — `unspecified-high` (+ `dev-browser` skill)
  Start from clean state. For EACH of 15 games: open in browser, verify no console errors, verify start screen loads, play through one game loop to game over, verify restart works, verify "Back to Arcade" link exists (new games). Test landing page: all 15 cards visible, all images load, all links work, Discord card is last. Test mobile viewport (375px wide). Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Games [N/N pass] | Landing Page [PASS/FAIL] | Mobile [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files created. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Verify no existing game directories were modified. Flag unaccounted file changes.
  Output: `Tasks [N/N compliant] | Existing Games [CLEAN/modified] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(games): add fraud whacker dodo game` — `fraud-whacker-dodo/*`
- **Wave 2**: One commit per game:
  - `feat(games): add revenue 2048 dodo game` — `revenue-2048-dodo/*`
  - `feat(games): add token match dodo game` — `token-match-dodo/*`
  - `feat(games): add dodo pong game` — `dodo-pong/*`
  - `feat(games): add fraud sweeper dodo game` — `fraud-sweeper-dodo/*`
  - `feat(games): add firewall breaker dodo game` — `firewall-breaker-dodo/*`
  - `feat(games): add api wordle dodo game` — `api-wordle-dodo/*`
  - `feat(games): add ledger blocks dodo game` — `ledger-blocks-dodo/*`
- **Wave 3**: `feat: update landing page, sitemap, and readme with 8 new games` — `index.html`, `sitemap.xml`, `README.md`, `assets/images/*`
- **Wave 4**: No commit (verification only)

---

## Success Criteria

### Verification Commands
```bash
# All 8 game dirs exist with correct structure
for slug in fraud-whacker-dodo revenue-2048-dodo token-match-dodo dodo-pong fraud-sweeper-dodo firewall-breaker-dodo api-wordle-dodo ledger-blocks-dodo; do
  ls $slug/index.html $slug/assets/script.js $slug/assets/style.css
done
# Expected: all files listed without errors

# Build succeeds
npm run build
# Expected: exit 0, "Build completed successfully"

# All games in dist
for slug in fraud-whacker-dodo revenue-2048-dodo token-match-dodo dodo-pong fraud-sweeper-dodo firewall-breaker-dodo api-wordle-dodo ledger-blocks-dodo; do
  ls dist/$slug/index.html
done
# Expected: all files exist

# Sitemap has 16 entries
grep -c '<url>' sitemap.xml
# Expected: 16

# All new games have touch handlers
for slug in fraud-whacker-dodo revenue-2048-dodo token-match-dodo dodo-pong fraud-sweeper-dodo firewall-breaker-dodo api-wordle-dodo ledger-blocks-dodo; do
  echo "$slug: $(grep -c 'touchstart\|touchmove\|touchend' $slug/assets/script.js) touch handlers"
done
# Expected: each game has >= 1 touch handler

# All new games have analytics
for slug in fraud-whacker-dodo revenue-2048-dodo token-match-dodo dodo-pong fraud-sweeper-dodo firewall-breaker-dodo api-wordle-dodo ledger-blocks-dodo; do
  echo "$slug: $(grep -c 'DodoAnalytics' $slug/assets/script.js) analytics calls"
done
# Expected: each game has >= 1 analytics call
```

### Final Checklist
- [ ] All 8 new game directories exist with Pattern A structure
- [ ] All 8 games have complete SEO (meta, OG, Twitter, structured data)
- [ ] All 8 games have working game loops (start → play → game over → restart)
- [ ] All 8 games handle keyboard + touch input
- [ ] All 8 games have "Back to Arcade" link
- [ ] All 8 games integrate DodoAnalytics with typeof guard
- [ ] All 8 games use namespaced localStorage keys
- [ ] Landing page shows all 15 game cards + Discord card (16 total)
- [ ] Discord card remains last in grid
- [ ] `sitemap.xml` has 16 `<url>` entries
- [ ] `README.md` game table has 15 games
- [ ] `npm run build` succeeds
- [ ] No existing game directories were modified
- [ ] No external dependencies or CDNs added