# Render.com Deployment Guide

This guide walks you through deploying the Personalized Output server to Render.com.

## Quick Start

### 1. Connect Your GitHub Repository

1. Log in to [Render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub account if not already connected
4. Select the `EtsyInnovations` repository
5. Render will auto-detect the `render.yaml` and configure the service

### 2. Confirm Build Settings

Render should auto-detect these from `render.yaml`:

| Setting | Value |
|---------|-------|
| **Name** | `personalizedoutput` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

If not auto-detected, enter them manually.

### 3. Add Environment Variables

In the Render dashboard, go to **Environment** and add these secrets:

| Key | Description | Required |
|-----|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes (auto-set) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | Yes |
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key for TTS | Yes |
| `ELEVENLABS_SANTA_VOICE_ID` | The voice ID for Santa messages | Yes |

**Important:** Never commit actual API keys to the repository. Enter them only in Render's dashboard.

### 4. Deploy

Click **Create Web Service**. Render will:
1. Clone your repository
2. Run `npm install && npm run build`
3. Start the server with `npm start`
4. Assign a public URL

## Public URLs

Once deployed, your service will be available at:

```
https://personalizedoutput.onrender.com/
```

### Product Pages (for Etsy buyers)
- **Santa Message:** `https://personalizedoutput.onrender.com/santa`
- **Holiday Reset:** `https://personalizedoutput.onrender.com/holiday-reset`
- **New Year Reset:** `https://personalizedoutput.onrender.com/new-year-reset`

### API Endpoints
- **Health Check:** `https://personalizedoutput.onrender.com/health`
- **Status:** `https://personalizedoutput.onrender.com/status`
- **Santa API:** `https://personalizedoutput.onrender.com/api/santa`
- **Planner API:** `https://personalizedoutput.onrender.com/api/planner`
- **Thought Chat API:** `https://personalizedoutput.onrender.com/api/thought-chat`

### Static Files
- **Santa Audio:** `https://personalizedoutput.onrender.com/outputs/santa/`
- **Planner PDFs:** `https://personalizedoutput.onrender.com/outputs/planners/`

## Testing Your Deployment

### 1. Check Health Endpoint

```bash
curl https://personalizedoutput.onrender.com/health
```

Expected response:
```json
{"ok":true}
```

### 2. Check Root Endpoint

```bash
curl https://personalizedoutput.onrender.com/
```

Expected response:
```
personalizedoutput server running
```

### 3. Visit a Product Page

Open in browser:
```
https://personalizedoutput.onrender.com/santa
```

You should see the Santa Message form with the festive Christmas theme.

## Important Notes

### File Storage

Render's free tier uses ephemeral storage. Files in `outputs/` will persist during the service lifetime but may be cleared on redeploy. For production use, consider:
- Upgrading to a paid Render plan with persistent disks
- Using external storage (S3, Cloudinary, etc.) for generated files

For MVP/testing purposes, files persist long enough for buyers to download them.

### Cold Starts

On the free tier, the service may spin down after 15 minutes of inactivity. The first request after spin-down will take 30-60 seconds. Consider upgrading for always-on service.

### Puppeteer/PDF Rendering

The server is configured to work with Puppeteer on Render's Linux environment:
- Uses `headless: 'new'` mode
- Includes `--no-sandbox` and `--disable-setuid-sandbox` flags
- Falls back to HTML if Puppeteer fails

### Logs

View logs in the Render dashboard under **Logs** tab. The server logs:
- All requests in production mode (method, path, status, duration)
- Directory creation on startup
- API errors

## Local Testing (Before Deploying)

Test the production build locally:

```bash
# Build the project
npm run build

# Start in production mode
NODE_ENV=production npm start
```

Then test:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/
open http://localhost:3000/santa
```

## Troubleshooting

### Build Fails

1. Check Render logs for specific errors
2. Ensure all dependencies are in `package.json`
3. Run `npm run build` locally to verify it works

### Environment Variables Not Working

1. Verify variables are set in Render dashboard (not in code)
2. Check for typos in variable names
3. Redeploy after adding variables

### Forms Not Loading

1. Check that `dev/` folder is in the repository
2. Verify routes in `src/server.ts`
3. Check browser console for errors

### Audio/PDF Files Not Accessible

1. Check that `outputs/` directory exists (created automatically)
2. Verify static file serving in `src/server.ts`
3. Check file permissions in logs

## Auto-Deploy

With `autoDeploy: true` in `render.yaml`, every push to `main` will automatically redeploy the service.

To disable, set `autoDeploy: false` in `render.yaml` or toggle in Render dashboard.
