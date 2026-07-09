/*!
 * Dodo Games — canonical game manifest.
 * Single source of truth for the home-page card grid, featured spotlight,
 * genre filters and JSON-LD (cross-checked against sitemap.xml + README in Wave 6).
 *
 * Each entry: { slug, title, hook, genre, released }
 *   slug     — URL path segment (games.dodopayments.com/{slug}); never change.
 *   title    — display name on the card.
 *   hook     — one-line pitch (<= ~90 chars).
 *   genre    — one of: Action | Puzzle | Arcade | Word.
 *   released — ISO date (approx. from git history); drives the data-driven NEW badge.
 *
 * Exposed as a plain global (no build/mangle surprises) so home.js can read it.
 */
(function (global) {
  'use strict';

  global.DODO_GAMES = [
    {
      slug: 'flappy-dodo',
      title: 'Flappy Dodo',
      hook: 'Navigate the volatile market. Avoid the red pipes of churn.',
      genre: 'Arcade',
      released: '2025-11-25',
    },
    {
      slug: 'ddos-defense-dodo',
      title: 'Gateway Defender',
      hook: 'Protect the Dodo from DDoS bots with firewall and rate-limiter tech.',
      genre: 'Action',
      released: '2025-11-26',
    },
    {
      slug: 'payment-invaders-dodo',
      title: 'Payment Invaders',
      hook: 'Defend your gateway from chargebacks and fraudsters. Shoot them down!',
      genre: 'Action',
      released: '2025-11-26',
    },
    {
      slug: 'snake-game-dodo',
      title: 'Transaction Snake',
      hook: 'Guide your payment chain through the grid. Dodge the fraud voids.',
      genre: 'Arcade',
      released: '2025-11-26',
    },
    {
      slug: 'checkout-rush-dodo',
      title: 'Checkout Rush',
      hook: 'Process payments before the queue overflows. Match types, build combos.',
      genre: 'Arcade',
      released: '2025-11-26',
    },
    {
      slug: 'dodo-dash',
      title: 'Dodo Dash',
      hook: 'Run, Dodo, run! Jump the obstacles and dash through the desert.',
      genre: 'Arcade',
      released: '2025-11-28',
    },
    {
      slug: 'merchant-hero-dodo',
      title: 'Merchant Hero',
      hook: 'Trade fair. Fly fast. Dodge fraud across the Payment Galaxy.',
      genre: 'Action',
      released: '2025-11-30',
    },
    {
      slug: 'fraud-whacker-dodo',
      title: 'Fraud Whacker',
      hook: 'Block fraudulent transactions before they process. Tap fast!',
      genre: 'Arcade',
      released: '2026-02-22',
    },
    {
      slug: 'revenue-2048-dodo',
      title: 'Revenue 2048',
      hook: 'Slide and merge revenue tiles from $1 to $1B unicorn status.',
      genre: 'Puzzle',
      released: '2026-02-22',
    },
    {
      slug: 'token-match-dodo',
      title: 'Token Match',
      hook: 'Flip cards to match payment tokens. Race the clock, cut your moves.',
      genre: 'Puzzle',
      released: '2026-02-22',
    },
    {
      slug: 'dodo-pong',
      title: 'Dodo Pong',
      hook: 'Bounce payments between merchant and processor. Beat the AI to 11!',
      genre: 'Arcade',
      released: '2026-02-22',
    },
    {
      slug: 'firewall-breaker-dodo',
      title: 'Firewall Breaker',
      hook: 'Break through layers of fraud firewalls. Power up and smash!',
      genre: 'Arcade',
      released: '2026-02-22',
    },
    {
      slug: 'api-wordle-dodo',
      title: 'API Wordle',
      hook: 'Guess the 5-letter payment term in six tries. Share your streak.',
      genre: 'Word',
      released: '2026-02-22',
    },
    {
      slug: 'ledger-blocks-dodo',
      title: 'Ledger Blocks',
      hook: 'Fit transaction blocks into the ledger. Clear rows to settle batches!',
      genre: 'Puzzle',
      released: '2026-02-22',
    },
  ];
})(window);
