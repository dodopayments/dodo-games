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
  - This error occurs when Cloudflare Pages detects `wrangler.toml` and tries to use Wrangler during the build
  - **Solution:** The `wrangler.toml` file has been removed from the repository as it's not needed for dashboard deployments
  - The build script (`build.js`) is a pure Node.js script that doesn't require Wrangler or authentication
  - For CLI deployments, use command-line flags instead (see "Deploy via Wrangler CLI" section)
- **404 errors:** Make sure build output directory is set to `dist`
- **Assets not loading:** Verify asset paths are relative (e.g., `assets/image.svg`)
- **Build fails:** Check that `npm run build` works locally first

