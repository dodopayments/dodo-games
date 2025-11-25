# Cloudflare Pages Deployment Checklist

## Quick Deploy Steps

### 1. Build the Project
```bash
npm run build
```

### 2. Deploy via Wrangler CLI

**Note:** For CLI deployments, you don't need `wrangler.toml`. All configuration is done via command-line flags.

```bash
npm run build
npx wrangler pages deploy dist --project-name=dodo-games
```

Or use the deploy script:
```bash
npm run deploy
```

**Authentication:** Make sure you're logged in:
```bash
npx wrangler login
```

### 3. Deploy via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Connect your Git repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty)
   - **Deploy command:** `npx wrangler pages deploy dist --project-name=dodo-games` (if required)
   - **Note:** Cloudflare Pages automatically provides the `CLOUDFLARE_API_TOKEN` environment variable, so wrangler will authenticate automatically
   - **Version command:** Leave this EMPTY (not needed for static sites)
   - **Important:** Make sure you have an API token configured in your Cloudflare Pages project settings (Settings → API tokens)
5. Click **Save and Deploy**

### 4. Set Up Custom Domain

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `games.dodopayments.com`
4. Add DNS record:
   - **Type:** CNAME
   - **Name:** `games`
   - **Target:** Your Pages domain (shown in Cloudflare)
   - **Proxy:** Enabled (orange cloud)

### 5. Verify Deployment

- Landing page: `https://games.dodopayments.com/`
- Flappy Dodo: `https://games.dodopayments.com/flappy-dodo`

## Troubleshooting

- **Authentication error [code: 10000]:** 
  - This error occurs when Cloudflare Pages tries to use Wrangler but can't authenticate
  - **Solution:** 
    1. **Check API Token:** Go to your Cloudflare Pages project → Settings → API tokens
    2. Make sure there's a valid API token configured (Cloudflare should create one automatically when you connect Git)
    3. If no token exists, you may need to regenerate it or check your project settings
    4. The deploy command should be: `npx wrangler pages deploy dist --project-name=dodo-games`
    5. Cloudflare Pages will automatically use the API token from project settings - you don't need to set it manually
- **Not deploying dist folder automatically:**
  - If you have a "Deploy command" set, Cloudflare Pages uses that command instead of auto-deploying
  - **Solution:** Use `npx wrangler pages deploy dist --project-name=dodo-games` as the deploy command
  - Make sure the API token is configured in your project settings
  - The build output directory (`dist`) setting is still important for reference, but the deploy command handles the actual deployment
- **404 errors:** Make sure build output directory is set to `dist`
- **Assets not loading:** Verify asset paths are relative (e.g., `assets/image.svg`)
- **Build fails:** Check that `npm run build` works locally first

