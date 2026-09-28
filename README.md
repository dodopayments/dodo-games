# Dodo Games

<p align="left">
  <a href="https://discord.gg/bYqAp4ayYh">
    <img src="https://img.shields.io/discord/1305511580854779984?label=Join%20Discord&logo=discord" alt="Join Discord" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="License: GPLv3" />
  </a>
</p>

Dodo Games is an engaging collection of playful, custom-built arcade games created by and for the Dodo Payments community. Procrastinate responsibly while building your empire of high scores!

🎮 **Play now:** [games.dodopayments.com](https://games.dodopayments.com)

## Games

| Game | Description |
|------|-------------|
| **[Flappy Dodo](https://games.dodopayments.com/flappy-dodo)** | Navigate the volatile market. Avoid the red pipes of churn. Keep your MRR flying high. |
| **[Gateway Defender](https://games.dodopayments.com/ddos-defense-dodo)** | Survive escalating waves of DDoS bots — tap to pop botnets, bank overkill combos, and spend credits on firewalls, honeypots and CDN shields. |
| **[Payment Invaders](https://games.dodopayments.com/payment-invaders-dodo)** | Blast waves of chargebacks, fraudsters and downtime bugs with 2FA lasers, KYC spread shots and PCI shields. Shoot them down! |
| **[Transaction Snake](https://games.dodopayments.com/snake-game-dodo)** | Slither your payment chain through the grid with smooth movement — eat apples, grab golden bonuses, dodge fraud voids, shield up with PCI. |
| **[Checkout Rush](https://games.dodopayments.com/checkout-rush-dodo)** | Clear the checkout queue before it overflows — match payment types, serve VIPs, chain combos for Instant Settlement, unlock UPI. |
| **[Dodo Dash](https://games.dodopayments.com/dodo-dash)** | Sprint through a day/night desert — jump chargeback boulders, duck flying invoices, grab coins and magnets, and chase milestone runs. |
| **[Merchant Hero](https://games.dodopayments.com/merchant-hero-dodo)** | Pilot the Payment Galaxy through named enemy waves and telegraphed mini-bosses — pick payment-infra upgrades between rounds. |
| **[Fraud Whacker Dodo](https://games.dodopayments.com/fraud-whacker-dodo)** | Whack fraud bots and chargebacks, spare the legit payments, and chain golden-fraud combos into frenzy mode. |
| **[Revenue 2048 Dodo](https://games.dodopayments.com/revenue-2048-dodo)** | Slide and merge revenue tiles from $1 to $1B — chain multi-merge combos, undo with a Refund, then go endless. |
| **[Token Match Dodo](https://games.dodopayments.com/token-match-dodo)** | Flip cards to pair payment tokens across three ledger sizes — chain combos, race the clock, spend your one Peek. |
| **[Dodo Pong](https://games.dodopayments.com/dodo-pong)** | Rally payments past the AI processor to 11 — build combo speed, grab power-ups, and pick your difficulty tier. |
| **[Firewall Breaker Dodo](https://games.dodopayments.com/firewall-breaker-dodo)** | Smash 9 handcrafted firewall layers — trigger explosive bricks, grab PCI Shield and 2FA Ball, and earn 3 stars per level. |
| **[API Wordle Dodo](https://games.dodopayments.com/api-wordle-dodo)** | Guess the 5-letter payment term in 6 tries — daily & free-play modes, hard mode, streaks, and 150+ fintech terms. |
| **[Ledger Blocks Dodo](https://games.dodopayments.com/ledger-blocks-dodo)** | Drop transaction blocks into the ledger — hold pieces, project ghost drops, and clear rows to settle batches. |
| **[Currency Blitz Dodo](https://games.dodopayments.com/currency-blitz-dodo)** | Convert currencies against the clock — stack speed bonuses, freeze the timer, and ride streak multipliers. |

## Local Development

### Running a Game Locally

Navigate to any game directory and open `index.html` in a web browser:

```bash
cd flappy-dodo
open index.html  # macOS
# or just open the file in your browser
```

### Building for Production

Run the build script from the root directory to build all games:

```bash
npm install
npm run build
```

This will:
- Minify all CSS and JavaScript files
- Copy all assets to the `dist` folder
- Include SEO files (sitemap.xml, robots.txt)
- Prepare everything for Cloudflare Pages deployment

## Deploying to Cloudflare Pages

### Prerequisites

1. A Cloudflare account
2. Wrangler CLI installed (optional, for local preview):
   ```bash
   npm install -g wrangler
   ```

### Deployment Steps

#### Option 1: Deploy via Cloudflare Dashboard (Recommended)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Dashboard:**
   - Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

3. **Connect your repository:**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Cloudflare to access your repository
   - Select the `dodo-games` repository

4. **Configure build settings:**
   - **Project name:** `dodo-games` (or your preferred name)
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty or set to root)

5. **Configure custom domain:**
   - After deployment, go to **Custom domains**
   - Add `games.dodopayments.com`
   - Follow DNS configuration instructions

6. **Deploy:**
   - Click **Save and Deploy**
   - Cloudflare will automatically build and deploy your site

#### Option 2: Deploy via Wrangler CLI

1. **Install Wrangler (if not already installed):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Deploy:**
   ```bash
   wrangler pages deploy dist --project-name=dodo-games
   ```

### Setting Up Custom Domain

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Enter `games.dodopayments.com`
5. Add the CNAME record to your DNS:
   - **Type:** CNAME
   - **Name:** `games`
   - **Target:** Your Cloudflare Pages domain (e.g., `dodo-games.pages.dev`)
   - **Proxy status:** Proxied (orange cloud)

### URL Structure

After deployment, games will be accessible at:
- Landing page: `https://games.dodopayments.com/`
- Flappy Dodo: `https://games.dodopayments.com/flappy-dodo`
- Gateway Defender: `https://games.dodopayments.com/ddos-defense-dodo`
- Payment Invaders: `https://games.dodopayments.com/payment-invaders-dodo`
- Transaction Snake: `https://games.dodopayments.com/snake-game-dodo`
- Checkout Rush: `https://games.dodopayments.com/checkout-rush-dodo`
- Dodo Dash: `https://games.dodopayments.com/dodo-dash`
- Merchant Hero: `https://games.dodopayments.com/merchant-hero-dodo`

### Adding New Games

1. Create a new folder in the root directory (e.g., `my-new-game/`)
2. Add your game files (`index.html`, `script.js`, `style.css`, `assets/`, etc.)
3. Update the root `index.html` to include a link to your new game
4. Update `sitemap.xml` to include the new game URL
5. Run `npm run build` to include it in the build
6. Deploy to Cloudflare Pages

The build script automatically detects any directory with an `index.html` file and includes it in the build.

## Project Structure

```
dodo-games/
├── index.html              # Landing page listing all games
├── package.json            # NPM configuration
├── build.js                # Build script for all games
├── robots.txt              # Search engine crawler rules
├── sitemap.xml             # Sitemap for SEO indexing
├── assets/                 # Shared assets (favicons, images)
│   ├── images/
│   ├── favicon.ico
│   └── analytics.js
├── flappy-dodo/            # Flappy Bird-style game
├── ddos-defense-dodo/      # Tower defense game
├── payment-invaders-dodo/  # Space Invaders-style shooter
├── snake-game-dodo/        # Classic snake game
├── checkout-rush-dodo/     # Fast-paced matching game
├── dodo-dash/              # Endless runner game
├── merchant-hero-dodo/     # Space shooter game
├── currency-blitz-dodo/    # Timed FX conversion race
└── dist/                   # Built output (generated)
```

## SEO

The project includes SEO optimizations:
- **Meta tags:** Description, keywords, Open Graph, Twitter Cards on all pages
- **Structured data:** JSON-LD VideoGame schema for each game
- **Sitemap:** `sitemap.xml` for search engine indexing
- **Robots.txt:** Allows all crawlers

After deployment, submit the sitemap to:
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

## Development Tips

- Each game should be self-contained in its own directory
- Use relative paths for assets (e.g., `assets/image.svg`)
- The build script automatically minifies CSS and JS files
- Test locally before deploying
- All games include shared favicons and analytics from the `assets/` folder

## Contributing

Got a crazy game idea? We'd love to hear it! Join our [Discord](https://discord.gg/bYqAp4ayYh) to contribute or submit ideas.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the GPLv3 License - see the [LICENSE](LICENSE) file for details.
