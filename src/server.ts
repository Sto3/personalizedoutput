/**
 * Express Server
 *
 * Main entry point for the EtsyInnovations API server.
 * Mounts all API routes and serves static files.
 *
 * Production-ready for Render.com deployment.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Import API routers
import santaApiDeep from './api/santaApiDeep';
import plannerApi from './api/plannerApi';
import thoughtChatApi from './api/thoughtChatApi';

// Import token store for order-based access control
import { validateToken, createOrReuseToken } from './lib/thoughtEngine/santa/tokenStore';

// Import email alerts
import { alertTrafficSpike, sendTestAlert, isAlertConfigured, sendDailySummary } from './lib/alerts/emailAlerts';

// Import page renderers
import { renderPremiumHomepageV3 } from './pages/homepageV3';
import { renderLoginPage, renderSignupPage, renderForgotPasswordPage } from './pages/auth';
import { renderDashboardPage, renderPricingPage } from './pages/dashboard';
import { renderBlogListPage, renderBlogPostPage } from './pages/blog';
import { renderTermsPage, renderPrivacyPage, renderCopyrightPage } from './pages/legal';

// Import Supabase services
import { isSupabaseConfigured, isSupabaseServiceConfigured } from './lib/supabase/client';
import { signUp, signIn, signOut, getSession, resetPassword, getProfile, getReferralStats } from './lib/supabase/userService';
import { getPublishedPosts, getPostBySlug } from './lib/supabase/blogService';
import { addToEmailList } from './lib/supabase/emailListService';

// Import Stripe services
import { isStripeConfigured, createCheckoutSession, createPortalSession, constructWebhookEvent, handleWebhookEvent } from './lib/stripe/stripeService';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================
// SIMPLE ANALYTICS TRACKING (in-memory, persisted to file)
// ============================================================

interface AnalyticsData {
  startTime: string;
  pageViews: Record<string, number>;
  apiCalls: Record<string, number>;
  generations: Record<string, number>;
  hourlyTraffic: Record<string, number>;
  lastUpdated: string;
}

const ANALYTICS_PATH = path.join(process.cwd(), 'data', 'analytics.json');

// Load or initialize analytics
let analytics: AnalyticsData = {
  startTime: new Date().toISOString(),
  pageViews: {},
  apiCalls: {},
  generations: {},
  hourlyTraffic: {},
  lastUpdated: new Date().toISOString()
};

try {
  if (fs.existsSync(ANALYTICS_PATH)) {
    analytics = JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf-8'));
  }
} catch (e) {
  console.log('[Analytics] Starting fresh analytics');
}

// Traffic spike threshold
const TRAFFIC_SPIKE_THRESHOLD = 100;

// Track a page view or API call
function trackEvent(type: 'page' | 'api' | 'generation', name: string) {
  const hourKey = new Date().toISOString().slice(0, 13); // "2024-12-11T14"

  if (type === 'page') {
    analytics.pageViews[name] = (analytics.pageViews[name] || 0) + 1;
  } else if (type === 'api') {
    analytics.apiCalls[name] = (analytics.apiCalls[name] || 0) + 1;
  } else if (type === 'generation') {
    analytics.generations[name] = (analytics.generations[name] || 0) + 1;
  }

  analytics.hourlyTraffic[hourKey] = (analytics.hourlyTraffic[hourKey] || 0) + 1;
  analytics.lastUpdated = new Date().toISOString();

  // Check for traffic spike and alert
  const currentHourTraffic = analytics.hourlyTraffic[hourKey];
  if (currentHourTraffic === TRAFFIC_SPIKE_THRESHOLD) {
    // Alert when we hit exactly 100 (only once per hour)
    alertTrafficSpike(currentHourTraffic, hourKey).catch(err => {
      console.error('[Alerts] Failed to send traffic spike alert:', err);
    });
  }

  // Save every 10 events (not every request to avoid I/O overhead)
  const totalEvents = Object.values(analytics.pageViews).reduce((a, b) => a + b, 0);
  if (totalEvents % 10 === 0) {
    fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(analytics, null, 2));
  }
}

// Export for use in API routes
export { trackEvent };

// ============================================================
// ENSURE OUTPUT DIRECTORIES EXIST
// ============================================================

const outputDirs = [
  path.join(process.cwd(), 'outputs'),
  path.join(process.cwd(), 'outputs', 'santa'),
  path.join(process.cwd(), 'outputs', 'santa', 'previews'),
  path.join(process.cwd(), 'outputs', 'planners'),
  path.join(process.cwd(), 'data'),
  path.join(process.cwd(), 'data', 'sessions')
];

const EMAIL_LIST_PATH = path.join(process.cwd(), 'data', 'email_list.csv');

outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Server] Created directory: ${dir}`);
  }
});

// Initialize email list CSV with headers if it doesn't exist
if (!fs.existsSync(EMAIL_LIST_PATH)) {
  fs.writeFileSync(EMAIL_LIST_PATH, 'timestamp,name,email,source\n');
  console.log(`[Server] Created email list: ${EMAIL_LIST_PATH}`);
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logging in production
if (isProduction) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// Static file serving
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));
app.use('/dev', express.static(path.join(process.cwd(), 'dev')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/listing-images', express.static(path.join(process.cwd(), 'public', 'listing-images')));
app.use('/digital-downloads', express.static(path.join(process.cwd(), 'public', 'digital-downloads')));
app.use('/demos', express.static(path.join(process.cwd(), 'public', 'demos')));

// PWA files - serve manifest.json and sw.js from public folder
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

// ============================================================
// PRODUCTION ROUTES - Clean URLs for Etsy buyers
// ============================================================

// Santa Message form (with token-based access control)
app.get('/santa', (req, res) => {
  const token = req.query.token as string | undefined;

  // If token provided, validate it
  if (token) {
    const validation = validateToken(token);

    if (validation.valid) {
      // Valid token - show the Santa form
      trackEvent('page', 'santa');
      return res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-santa.html'));
    }

    // Invalid token - show appropriate error
    const reason = (validation as { valid: false; reason: string }).reason;
    let errorMessage = '';
    let errorDetail = '';

    switch (reason) {
      case 'expired':
        errorMessage = 'This session link has expired.';
        errorDetail = 'Session links are valid for 72 hours. Please contact support if you need help.';
        break;
      case 'redeemed':
        errorMessage = 'This order has already been used to generate a Santa message.';
        errorDetail = 'Each purchase includes one personalized Santa message. If you\'d like another message, please purchase a new listing.';
        break;
      case 'not_found':
      default:
        errorMessage = 'Invalid session link.';
        errorDetail = 'Please use the link from your purchase or enter your order details below.';
        break;
    }

    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Error - personalizedoutput</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lora', Georgia, serif;
      background: linear-gradient(135deg, #fdfbf9 0%, #f5f0eb 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #2c3e50;
    }
    .container {
      max-width: 500px;
      width: 100%;
      text-align: center;
      background: #fff;
      padding: 50px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .icon { font-size: 3rem; margin-bottom: 20px; }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.6rem;
      color: #c41e3a;
      margin-bottom: 16px;
    }
    p {
      font-size: 1rem;
      color: #5a6c7d;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background: #1a4d2e;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover { background: #15412a; }
    .support {
      margin-top: 25px;
      font-size: 0.9rem;
      color: #9aa5b1;
    }
    .support a { color: #1a4d2e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${reason === 'redeemed' ? '🎁' : '⏰'}</div>
    <h1>${errorMessage}</h1>
    <p>${errorDetail}</p>
    <a href="/santa" class="btn">Enter Order Details</a>
    <p class="support">Need help? <a href="mailto:support@personalizedoutput.com">Contact support</a></p>
  </div>
</body>
</html>
    `);
  }

  // No token - show the order ID capture form
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Start Your Santa Message - personalizedoutput</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lora', Georgia, serif;
      background: linear-gradient(135deg, #fdfbf9 0%, #f5f0eb 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #2c3e50;
    }
    .container {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .santa-icon { font-size: 4rem; margin-bottom: 20px; }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2rem;
      color: #c41e3a;
      margin-bottom: 16px;
    }
    .description {
      font-size: 1.05rem;
      color: #5a6c7d;
      margin-bottom: 35px;
      line-height: 1.6;
    }
    form {
      background: #fff;
      padding: 35px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      text-align: left;
    }
    label {
      display: block;
      font-size: 0.9rem;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 14px 16px;
      font-size: 1rem;
      font-family: 'Lora', Georgia, serif;
      border: 2px solid #e8e0d8;
      border-radius: 8px;
      margin-bottom: 20px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #c41e3a;
    }
    button {
      width: 100%;
      padding: 16px;
      background: #c41e3a;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-family: 'Lora', Georgia, serif;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #a31830; }
    .help-text {
      margin-top: 20px;
      font-size: 0.85rem;
      color: #9aa5b1;
      text-align: center;
    }
    .error-message {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.95rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="santa-icon">🎅</div>
    <h1>Start Your Personalized Santa Message</h1>
    <p class="description">To begin creating your personalized Santa message, please enter your Etsy Order ID and email. This helps us securely connect your purchase to your session.</p>

    <form id="claimForm" action="/api/santa/claim" method="POST">
      <div id="errorMessage" class="error-message"></div>

      <label for="orderId">Etsy Order ID *</label>
      <input type="text" id="orderId" name="orderId" placeholder="e.g., 1234567890" required>

      <label for="email">Email Address *</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required>

      <input type="hidden" name="productId" value="santa_message">

      <button type="submit">Continue to Santa Message</button>

      <p class="help-text">You can find your Order ID in your Etsy purchase confirmation email.</p>
    </form>
  </div>

  <script>
    const form = document.getElementById('claimForm');
    const errorDiv = document.getElementById('errorMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';

      const formData = new FormData(form);
      const data = {
        orderId: formData.get('orderId'),
        email: formData.get('email'),
        productId: formData.get('productId')
      };

      try {
        const response = await fetch('/api/santa/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.ok && result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          errorDiv.textContent = result.error || 'Something went wrong. Please try again.';
          errorDiv.style.display = 'block';
        }
      } catch (err) {
        errorDiv.textContent = 'Unable to connect. Please check your internet and try again.';
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>
  `);
});

// Santa Samples page (for Etsy listings - audio previews)
app.get('/santa-samples', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dev', 'santa-samples.html'));
});

// Holiday Reset form
app.get('/holiday-reset', (req, res) => {
  trackEvent('page', 'holiday-reset');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-holiday.html'));
});

// New Year Reset form
app.get('/new-year-reset', (req, res) => {
  trackEvent('page', 'new-year-reset');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-newyear.html'));
});

// Vision Board form
app.get('/vision-board', (req, res) => {
  trackEvent('page', 'vision-board');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-visionboard.html'));
});

// Generic Clarity Planner form
app.get('/planner', (req, res) => {
  trackEvent('page', 'planner');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-planner.html'));
});

// Custom Flash Cards form
app.get('/flash-cards', (req, res) => {
  trackEvent('page', 'flash-cards');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-flashcards.html'));
});

// Redirect /demos to /demo-lessons
app.get('/demos', (req, res) => {
  res.redirect(301, '/demo-lessons');
});

// Demo Lessons showcase page - shows sample personalized AUDIO lessons (40-second intros)
app.get('/demo-lessons', (req, res) => {
  trackEvent('page', 'demo-lessons');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listen to Demo Lessons | Thought Organizer - Personalized Output</title>
  <meta name="description" content="Listen to 40-second audio previews of personalized lessons. Hear how we transform what you LOVE into what you NEED to learn.">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #e94560, #ff6b6b, #ffc93c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      text-align: center;
      color: #a8edea;
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }
    .preview-badge {
      text-align: center;
      margin-bottom: 2rem;
    }
    .preview-badge span {
      background: rgba(233, 69, 96, 0.3);
      border: 1px solid #e94560;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      color: #ffc93c;
    }
    .tagline {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 1rem;
      margin-bottom: 3rem;
      font-style: italic;
    }
    .demos-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .demo-card {
      background: rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid rgba(255,255,255,0.15);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .demo-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 30px rgba(0,0,0,0.3);
      background: rgba(255,255,255,0.1);
    }
    .demo-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .demo-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .demo-icon.kid { background: linear-gradient(135deg, #4facfe, #00f2fe); }
    .demo-icon.creative { background: linear-gradient(135deg, #a855f7, #ec4899); }
    .demo-icon.adult { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .demo-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #ffc93c;
    }
    .demo-subtitle {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.6);
    }
    .demo-description {
      color: rgba(255,255,255,0.8);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    .audio-player {
      width: 100%;
      margin-bottom: 1rem;
    }
    .audio-player audio {
      width: 100%;
      height: 50px;
    }
    .demo-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .tag {
      background: rgba(255,255,255,0.12);
      padding: 0.25rem 0.75rem;
      border-radius: 15px;
      font-size: 0.8rem;
      color: #a8edea;
    }
    .full-lesson-note {
      text-align: center;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: rgba(255,199,60,0.1);
      border-radius: 8px;
      font-size: 0.85rem;
      color: #ffc93c;
    }
    .cta-section {
      text-align: center;
      margin-top: 3rem;
      padding: 2rem;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(90deg, #e94560, #ff6b6b);
      color: white;
      padding: 1rem 2.5rem;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.1rem;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: scale(1.05); }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 2rem;
      color: #a8edea;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      h1 { font-size: 1.8rem; }
      .demo-header { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Listen to Demo Lessons</h1>
    <p class="subtitle">40-Second Audio Previews - Personalized by AI</p>
    <div class="preview-badge"><span>PREVIEW INTROS - Full 10-minute lessons available</span></div>
    <p class="tagline">Hear how we transform what you LOVE into what you NEED to learn</p>

    <div class="demos-list">
      <div class="demo-card">
        <div class="demo-header">
          <div class="demo-icon kid">🦖</div>
          <div>
            <h3 class="demo-title">Joe's Preview: Dinosaurs → Fractions</h3>
            <p class="demo-subtitle">6 years old • Math</p>
          </div>
        </div>
        <p class="demo-description">
          Joe loves dinosaurs! Listen to how we introduce fractions using T-Rex pizza and Brontosaurus cake -
          concepts that immediately click because they connect to what he already loves.
        </p>
        <div class="audio-player">
          <audio controls preload="metadata">
            <source src="/demos/joe-dinosaurs-fractions.mp3" type="audio/mpeg">
            Your browser doesn't support audio playback.
          </audio>
        </div>
        <div class="demo-tags">
          <span class="tag">Kid-Friendly</span>
          <span class="tag">Fractions</span>
          <span class="tag">Warm Male Voice</span>
        </div>
        <div class="full-lesson-note">This is a 40-second preview. Full 10-minute lesson ready instantly!</div>
      </div>

      <div class="demo-card">
        <div class="demo-header">
          <div class="demo-icon creative">🎨</div>
          <div>
            <h3 class="demo-title">Maya's Preview: Art → Solar System</h3>
            <p class="demo-subtitle">10 years old • Science</p>
          </div>
        </div>
        <p class="demo-description">
          Maya is passionate about art! Hear how we teach her the solar system as a canvas masterpiece -
          with colors, textures, and composition she already understands.
        </p>
        <div class="audio-player">
          <audio controls preload="metadata">
            <source src="/demos/maya-art-solar-system.mp3" type="audio/mpeg">
            Your browser doesn't support audio playback.
          </audio>
        </div>
        <div class="demo-tags">
          <span class="tag">Creative Learner</span>
          <span class="tag">Astronomy</span>
          <span class="tag">Warm Female Voice</span>
        </div>
        <div class="full-lesson-note">This is a 40-second preview. Full 10-minute lesson ready instantly!</div>
      </div>

      <div class="demo-card">
        <div class="demo-header">
          <div class="demo-icon adult">🥐</div>
          <div>
            <h3 class="demo-title">Sarah's Preview: Bakery → Mortgage</h3>
            <p class="demo-subtitle">Adult • Finance</p>
          </div>
        </div>
        <p class="demo-description">
          Sarah runs a bakery and wants to understand her mortgage. Listen to how we explain principal and interest
          using dough batches and energy bills - concepts she already masters daily.
        </p>
        <div class="audio-player">
          <audio controls preload="metadata">
            <source src="/demos/sarah-bakery-mortgage.mp3" type="audio/mpeg">
            Your browser doesn't support audio playback.
          </audio>
        </div>
        <div class="demo-tags">
          <span class="tag">Adult Learning</span>
          <span class="tag">Financial Literacy</span>
          <span class="tag">Professional Voice</span>
        </div>
        <div class="full-lesson-note">This is a 40-second preview. Full 10-minute lesson ready instantly!</div>
      </div>
    </div>

    <div class="cta-section">
      <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.9); font-size: 1.1rem;">
        <strong>Be Specific = Magic Output</strong>
      </p>
      <p style="margin-bottom: 1.5rem; color: rgba(255,255,255,0.7);">
        Tell us exactly what someone loves and what they need to learn. The more specific you are, the more magical the lesson!
      </p>
      <a href="/flash-cards" class="cta-button">Create Your Personalized Lesson</a>
    </div>

    <a href="/" class="back-link">&larr; Back to Home</a>
  </div>
</body>
</html>`;
  res.send(html);
});

// ============================================================
// API ROUTES
// ============================================================

// Santa Order Claim endpoint (before router to ensure it's hit first)
app.post('/api/santa/claim', (req, res) => {
  const { orderId, email, productId } = req.body;

  // Validate inputs
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Order ID is required'
    });
  }

  if (orderId.trim().length < 3 || orderId.trim().length > 50) {
    return res.status(400).json({
      ok: false,
      error: 'Please enter a valid Order ID'
    });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      ok: false,
      error: 'Please enter a valid email address'
    });
  }

  // Default to santa_message if not provided
  const product = productId || 'santa_message';

  // Create or reuse token
  const result = createOrReuseToken(orderId.trim(), product, email.trim());

  if (result.success) {
    const token = (result as { success: true; token: string }).token;
    console.log(`[Claim] Token issued for order ${orderId}: ${token.substring(0, 8)}...`);
    return res.json({
      ok: true,
      redirectUrl: `/santa?token=${token}`
    });
  } else {
    const failedResult = result as { success: false; error: string; alreadyRedeemed: boolean };
    console.log(`[Claim] Rejected for order ${orderId}: ${failedResult.error}`);
    return res.status(400).json({
      ok: false,
      error: failedResult.error,
      alreadyRedeemed: failedResult.alreadyRedeemed
    });
  }
});

// Santa Message API
app.use('/api/santa', santaApiDeep);

// Planner API (Holiday Reset, New Year Reset)
app.use('/api/planner', plannerApi);

// Thought Chat API (Chat-based experience for all products)
app.use('/api/thought-chat', thoughtChatApi);

// ============================================================
// STRIPE WEBHOOK (must be before body parser for raw body)
// ============================================================

// Stripe webhook needs raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  const event = constructWebhookEvent(req.body, signature);

  if (!event) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ============================================================
// AUTH ROUTES
// ============================================================

// Login page
app.get('/login', (req, res) => {
  trackEvent('page', 'login');
  const error = req.query.error as string | undefined;
  const redirectTo = req.query.redirect as string | undefined;
  res.send(renderLoginPage(error, redirectTo));
});

// Signup page (new auth-based signup, different from email list signup)
app.get('/auth/signup', (req, res) => {
  trackEvent('page', 'auth-signup');
  const error = req.query.error as string | undefined;
  const referralCode = req.query.ref as string | undefined;
  res.send(renderSignupPage(error, referralCode));
});

// Forgot password page
app.get('/forgot-password', (req, res) => {
  trackEvent('page', 'forgot-password');
  const success = req.query.success === '1';
  const error = req.query.error as string | undefined;
  res.send(renderForgotPasswordPage(error, success));
});

// Auth API: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, redirect } = req.body;

  if (!email || !password) {
    return res.redirect(`/login?error=${encodeURIComponent('Email and password are required')}`);
  }

  const result = await signIn(email, password);

  if (result.user) {
    // Set session cookie (simplified - in production use proper session management)
    res.cookie('session', result.session?.access_token, { httpOnly: true, secure: isProduction });
    return res.redirect(redirect || '/dashboard');
  } else {
    return res.redirect(`/login?error=${encodeURIComponent(result.error || 'Login failed')}`);
  }
});

// Auth API: Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName, referralCode } = req.body;

  if (!email || !password) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Email and password are required')}`);
  }

  if (password.length < 8) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Password must be at least 8 characters')}`);
  }

  const result = await signUp(email, password, fullName, referralCode);

  if (result.user) {
    // Redirect to login with success message
    return res.redirect('/login?success=1');
  } else {
    return res.redirect(`/auth/signup?error=${encodeURIComponent(result.error || 'Signup failed')}`);
  }
});

// Auth API: Password reset request
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`);
  }

  await resetPassword(email);
  // Always show success to prevent email enumeration
  return res.redirect('/forgot-password?success=1');
});

// Auth API: Logout
app.get('/logout', async (req, res) => {
  await signOut();
  res.clearCookie('session');
  res.redirect('/');
});

// ============================================================
// DASHBOARD ROUTES (require auth)
// ============================================================

app.get('/dashboard', async (req, res) => {
  trackEvent('page', 'dashboard');

  // For now, show a placeholder dashboard
  // In production, validate session cookie and get user
  const sessionToken = req.cookies?.session;

  if (!sessionToken) {
    return res.redirect('/login?redirect=/dashboard');
  }

  // Get user session (simplified - in production verify token)
  const session = await getSession();

  if (!session) {
    return res.redirect('/login?redirect=/dashboard');
  }

  const profile = await getProfile(session.user.id);
  const referralStats = await getReferralStats(session.user.id);

  if (!profile) {
    return res.redirect('/login?redirect=/dashboard&error=profile_not_found');
  }

  res.send(renderDashboardPage({
    profile,
    referralStats
  }));
});

// Pricing page
app.get('/pricing', (req, res) => {
  trackEvent('page', 'pricing');
  res.send(renderPricingPage());
});

// ============================================================
// STRIPE CHECKOUT ROUTES
// ============================================================

app.post('/api/stripe/checkout', async (req, res) => {
  const { tier } = req.body;
  const sessionToken = req.cookies?.session;

  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await getSession();
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const siteUrl = process.env.SITE_URL || 'https://personalizedoutput.com';
  const result = await createCheckoutSession(
    session.user.id,
    session.user.email || '',
    tier,
    `${siteUrl}/dashboard?checkout=success`,
    `${siteUrl}/pricing?checkout=cancelled`
  );

  if (result.url) {
    res.json({ url: result.url });
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.get('/api/stripe/portal', async (req, res) => {
  const sessionToken = req.cookies?.session;

  if (!sessionToken) {
    return res.redirect('/login?redirect=/dashboard');
  }

  const session = await getSession();
  if (!session) {
    return res.redirect('/login?redirect=/dashboard');
  }

  const siteUrl = process.env.SITE_URL || 'https://personalizedoutput.com';
  const result = await createPortalSession(session.user.id, `${siteUrl}/dashboard`);

  if (result.url) {
    res.redirect(result.url);
  } else {
    res.redirect('/dashboard?error=portal_failed');
  }
});

// ============================================================
// BLOG ROUTES
// ============================================================

app.get('/blog', async (req, res) => {
  trackEvent('page', 'blog');
  const posts = await getPublishedPosts();
  res.send(renderBlogListPage(posts));
});

app.get('/blog/:slug', async (req, res) => {
  const post = await getPostBySlug(req.params.slug);

  if (!post) {
    return res.status(404).send('Post not found');
  }

  trackEvent('page', `blog-${req.params.slug}`);
  res.send(renderBlogPostPage(post));
});

// ============================================================
// LEGAL PAGES
// ============================================================

app.get('/terms', (req, res) => {
  trackEvent('page', 'terms');
  res.send(renderTermsPage());
});

app.get('/privacy', (req, res) => {
  trackEvent('page', 'privacy');
  res.send(renderPrivacyPage());
});

app.get('/copyright', (req, res) => {
  trackEvent('page', 'copyright');
  res.send(renderCopyrightPage());
});

// ============================================================
// HEALTH CHECK (Simple format for Render health checks)
// ============================================================

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Admin stats endpoint (password-protected)
// Access: https://personalizedoutput.com/admin/stats?key=YOUR_SECRET
app.get('/admin/stats', (req, res) => {
  const adminKey = req.query.key;
  const expectedKey = process.env.ADMIN_KEY || 'po-admin-2024'; // Set ADMIN_KEY in Render env vars

  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Calculate summary stats
  const totalPageViews = Object.values(analytics.pageViews).reduce((a, b) => a + b, 0);
  const totalApiCalls = Object.values(analytics.apiCalls).reduce((a, b) => a + b, 0);
  const totalGenerations = Object.values(analytics.generations).reduce((a, b) => a + b, 0);

  // Get last 24 hours of traffic
  const now = new Date();
  const last24Hours: Record<string, number> = {};
  for (let i = 0; i < 24; i++) {
    const hourKey = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString().slice(0, 13);
    last24Hours[hourKey] = analytics.hourlyTraffic[hourKey] || 0;
  }

  // Check if traffic is spiking (more than 100 requests in last hour)
  const lastHourKey = now.toISOString().slice(0, 13);
  const lastHourTraffic = analytics.hourlyTraffic[lastHourKey] || 0;
  const isSpike = lastHourTraffic > 100;

  res.json({
    status: isSpike ? '🚨 HIGH TRAFFIC' : '✅ Normal',
    summary: {
      totalPageViews,
      totalApiCalls,
      totalGenerations,
      lastHourTraffic,
      upSince: analytics.startTime
    },
    pageViews: analytics.pageViews,
    apiCalls: analytics.apiCalls,
    generations: analytics.generations,
    last24Hours,
    lastUpdated: analytics.lastUpdated,
    alertThreshold: '100 requests/hour triggers spike warning',
    emailAlerts: isAlertConfigured() ? '✅ Configured' : '❌ Not configured (set RESEND_API_KEY and ALERT_EMAIL)'
  });
});

// Test email alert endpoint
app.get('/admin/test-alert', async (req, res) => {
  const adminKey = req.query.key;
  const expectedKey = process.env.ADMIN_KEY || 'po-admin-2024';

  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!isAlertConfigured()) {
    return res.json({
      success: false,
      message: 'Email alerts not configured. Set RESEND_API_KEY and ALERT_EMAIL in Render environment variables.',
      instructions: {
        step1: 'Sign up at resend.com',
        step2: 'Get your API key from the dashboard',
        step3: 'In Render dashboard, go to Environment and add:',
        variables: {
          RESEND_API_KEY: 'your-resend-api-key',
          ALERT_EMAIL: 'your-personal-email@example.com',
          FROM_EMAIL: 'alerts@yourdomain.com (optional, requires verified domain)'
        }
      }
    });
  }

  const sent = await sendTestAlert();
  res.json({
    success: sent,
    message: sent ? 'Test email sent! Check your inbox.' : 'Failed to send test email. Check logs.'
  });
});

// ============================================================
// BRANDED HOMEPAGE (Premium V3)
// ============================================================

app.get('/', (req, res) => {
  res.send(renderPremiumHomepageV3());
});

// ============================================================
// EMAIL SIGNUP
// ============================================================

// Signup page
app.get('/signup', (req, res) => {
  const success = req.query.success === '1';

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join the VIP List - personalizedoutput</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Lora', Georgia, serif;
      background: linear-gradient(135deg, #fdfbf9 0%, #f5f0eb 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #2c3e50;
    }
    .container {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 30px;
      color: #1a4d2e;
      text-decoration: none;
      font-size: 0.95rem;
    }
    .back-link:hover { text-decoration: underline; }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.2rem;
      font-weight: 700;
      color: #1a4d2e;
      margin-bottom: 16px;
    }
    .description {
      font-size: 1.05rem;
      color: #5a6c7d;
      margin-bottom: 35px;
      line-height: 1.6;
    }
    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-weight: 500;
    }
    form {
      background: #fff;
      padding: 35px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      text-align: left;
    }
    label {
      display: block;
      font-size: 0.9rem;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 14px 16px;
      font-size: 1rem;
      font-family: 'Lora', Georgia, serif;
      border: 2px solid #e8e0d8;
      border-radius: 8px;
      margin-bottom: 20px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #1a4d2e;
    }
    button {
      width: 100%;
      padding: 16px;
      background: #1a4d2e;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-family: 'Lora', Georgia, serif;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #15412a;
    }
    .privacy {
      margin-top: 20px;
      font-size: 0.85rem;
      color: #9aa5b1;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">&larr; Back to home</a>

    <h1>Join the personalizedoutput VIP list</h1>
    <p class="description">Get early access to new personalized experiences, occasional free gifts, and seasonal specials. No spam, ever.</p>

    ${success ? '<div class="success-message">Thanks, you\'re in! We\'ll be in touch with something special soon.</div>' : ''}

    <form action="/api/signup" method="POST">
      <label for="name">Name (optional)</label>
      <input type="text" id="name" name="name" placeholder="Your first name">

      <label for="email">Email *</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required>

      <button type="submit">Join the List</button>

      <p class="privacy">We respect your inbox. Unsubscribe anytime.</p>
    </form>
  </div>
</body>
</html>
  `);
});

// Signup API endpoint
app.post('/api/signup', (req, res) => {
  const { name, email } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).send('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).send('Please enter a valid email address');
  }

  // Sanitize inputs for CSV (escape quotes, remove newlines)
  const sanitize = (str: string) => {
    if (!str) return '';
    return str.replace(/"/g, '""').replace(/[\r\n]/g, ' ').trim();
  };

  const timestamp = new Date().toISOString();
  const sanitizedName = sanitize(name || '');
  const sanitizedEmail = sanitize(email);
  const source = 'signup_page';

  // Append to CSV
  const csvLine = `"${timestamp}","${sanitizedName}","${sanitizedEmail}","${source}"\n`;

  try {
    fs.appendFileSync(EMAIL_LIST_PATH, csvLine);
    console.log(`[Signup] New email: ${sanitizedEmail}`);

    // Redirect back to signup with success message
    res.redirect('/signup?success=1');
  } catch (error) {
    console.error('[Signup] Error saving email:', error);
    res.status(500).send('Something went wrong. Please try again.');
  }
});

// Detailed status endpoint (for debugging)
app.get('/status', (req, res) => {
  res.json({
    name: 'EtsyInnovations API',
    version: '2.0.0',
    description: 'Deep Personalization Product Engine',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    products: {
      santa: '/santa',
      holidayReset: '/holiday-reset',
      newYearReset: '/new-year-reset'
    },
    apis: {
      santa: '/api/santa',
      planner: '/api/planner',
      thoughtChat: '/api/thought-chat'
    }
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   EtsyInnovations API Server                                  ║
║   Deep Personalization Product Engine                         ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                               ║
║   Product Pages (for Etsy buyers):                            ║
║   • Santa Message:    http://localhost:${PORT}/santa              ║
║   • Holiday Reset:    http://localhost:${PORT}/holiday-reset      ║
║   • New Year Reset:   http://localhost:${PORT}/new-year-reset     ║
║                                                               ║
║   API Endpoints:                                              ║
║   • Santa API:      /api/santa                                ║
║   • Planner API:    /api/planner                              ║
║   • Thought Chat:   /api/thought-chat                         ║
║                                                               ║
║   Static Files:                                               ║
║   • Audio outputs:  /outputs/*                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
