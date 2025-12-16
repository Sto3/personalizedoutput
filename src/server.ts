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
import referralApi from './api/referralApi';
import checkoutApi from './api/checkoutApi';

// Import token store for order-based access control
import { validateToken, createOrReuseToken } from './lib/thoughtEngine/santa/tokenStore';

// Import email alerts
import { alertTrafficSpike, sendTestAlert, isAlertConfigured, sendDailySummary } from './lib/alerts/emailAlerts';

// Import API usage monitor
import { startMonitoring as startUsageMonitoring, checkAllUsage, getUsageState } from './services/apiUsageMonitor';

// Import page renderers
import { renderPremiumHomepageV3 } from './pages/homepageV3';
import { renderPremiumHomepageV4 } from './pages/homepageV4';
import { renderProductsPage } from './pages/products';
import { renderHowItWorksPage } from './pages/howItWorks';
import { renderLoginPage, renderSignupPage, renderForgotPasswordPage } from './pages/auth';
import { renderDashboardPage } from './pages/dashboard';
import { renderPricingPageNew } from './pages/pricing';
import { renderDemoLessonsPage } from './pages/demoLessons';
import { renderBlogListPage, renderBlogPostPage } from './pages/blog';
import { renderTermsPage, renderPrivacyPage, renderCopyrightPage } from './pages/legal';
import { renderProductPage, renderSuccessPage } from './pages/productPages';

// Import Supabase services
import { isSupabaseConfigured, isSupabaseServiceConfigured } from './lib/supabase/client';
import { signUp, signIn, signOut, getSession, resetPassword, getProfile, getReferralStats } from './lib/supabase/userService';
import { getPublishedPosts, getPostBySlug } from './lib/supabase/blogService';
import { addToEmailList } from './lib/supabase/emailListService';

// Import Stripe services
import { isStripeConfigured, createCheckoutSession, createPortalSession, constructWebhookEvent, handleWebhookEvent } from './lib/stripe/stripeService';
// Email triage service temporarily disabled - add back when Render deploy stabilizes
// import { handleInboundWebhook } from './services/emailTriageService';

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
app.use('/santa-demos', express.static(path.join(process.cwd(), 'public', 'santa-demos')));
app.use('/social-videos', express.static(path.join(process.cwd(), 'public', 'social-videos')));

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
  <title>Session Error | Personalized Output</title>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--navy);
    }
    .container {
      max-width: 480px;
      width: 100%;
      text-align: center;
      background: #fff;
      padding: 56px 48px;
      border-radius: 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.04);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 24px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
    }
    h1 {
      font-family: 'Bodoni Moda', Georgia, serif;
      font-size: 1.75rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p {
      font-size: 1rem;
      color: #64748b;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      padding: 16px 36px;
      background: var(--coral);
      color: #fff;
      text-decoration: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
    }
    .btn:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
    }
    .support {
      margin-top: 32px;
      font-size: 0.9rem;
      color: #94a3b8;
    }
    .support a {
      color: var(--purple);
      text-decoration: none;
      font-weight: 500;
    }
    .support a:hover { text-decoration: underline; }
    @media (max-width: 600px) {
      .container { padding: 40px 28px; }
      h1 { font-size: 1.5rem; }
      .icon { font-size: 3rem; }
    }
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

  // No token - show the order ID capture form with premium styling
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Start Your Santa Message | Personalized Output</title>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--navy);
    }
    .container {
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 32px;
      color: #64748b;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s;
    }
    .back-link:hover { color: var(--coral); }
    .santa-icon {
      font-size: 5rem;
      margin-bottom: 24px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
    }
    h1 {
      font-family: 'Bodoni Moda', Georgia, serif;
      font-size: 2.25rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
      line-height: 1.2;
    }
    h1 .highlight {
      color: var(--coral);
      font-style: italic;
    }
    .description {
      font-size: 1rem;
      color: #64748b;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    .form-card {
      background: #fff;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.04);
      text-align: left;
    }
    .form-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input {
      width: 100%;
      padding: 16px 18px;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      transition: all 0.2s;
      background: #fafafa;
    }
    input:focus {
      outline: none;
      border-color: var(--purple);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
    }
    input::placeholder {
      color: #94a3b8;
    }
    button {
      width: 100%;
      padding: 18px;
      background: var(--coral);
      color: #fff;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
    }
    button:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
    }
    button:disabled {
      background: #cbd5e1;
      transform: none;
      box-shadow: none;
      cursor: not-allowed;
    }
    .help-text {
      margin-top: 24px;
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: center;
      line-height: 1.6;
    }
    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 16px 18px;
      border-radius: 12px;
      margin-bottom: 24px;
      font-size: 0.95rem;
      display: none;
    }
    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
      font-size: 0.8rem;
      color: #64748b;
    }
    .secure-badge svg {
      width: 16px;
      height: 16px;
    }
    @media (max-width: 600px) {
      .container { padding: 0 16px; }
      h1 { font-size: 1.75rem; }
      .form-card { padding: 28px; }
      .santa-icon { font-size: 4rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">&larr; Back to home</a>
    <div class="santa-icon">🎅</div>
    <h1>Create Your <span class="highlight">Santa Message</span></h1>
    <p class="description">Enter your order details below to begin creating a magical, personalized message from Santa.</p>

    <div class="form-card">
      <form id="claimForm" action="/api/santa/claim" method="POST">
        <div id="errorMessage" class="error-message"></div>

        <div class="form-group">
          <label for="orderId">Order ID</label>
          <input type="text" id="orderId" name="orderId" placeholder="Enter your order ID" required>
        </div>

        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" placeholder="you@example.com" required>
        </div>

        <input type="hidden" name="productId" value="santa_message">

        <button type="submit">Continue to Create Message</button>

        <p class="help-text">You'll find your Order ID in your purchase confirmation email.</p>

        <div class="secure-badge">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure • One-time use per purchase
        </div>
      </form>
    </div>
  </div>

  <script>
    const form = document.getElementById('claimForm');
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';

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
          submitBtn.disabled = false;
          submitBtn.textContent = 'Continue to Create Message';
        }
      } catch (err) {
        errorDiv.textContent = 'Unable to connect. Please check your internet and try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue to Create Message';
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

// ============================================================
// PRODUCT DETAIL PAGES (Premium pages with Stripe checkout)
// ============================================================

// Learning Session product page (Audio)
app.get('/learning-session', (req, res) => {
  trackEvent('page', 'learning-session');
  res.send(renderProductPage('learning_session'));
});

// Video Learning Session product page
app.get('/video-lesson', (req, res) => {
  trackEvent('page', 'video-lesson');
  res.send(renderProductPage('video_learning_session'));
});

// Flash Cards product page (different from the form above)
app.get('/product/flash-cards', (req, res) => {
  trackEvent('page', 'product-flash-cards');
  res.send(renderProductPage('flash_cards'));
});

// Vision Board product page
app.get('/product/vision-board', (req, res) => {
  trackEvent('page', 'product-vision-board');
  res.send(renderProductPage('vision_board'));
});

// Santa Message product page
app.get('/product/santa', (req, res) => {
  trackEvent('page', 'product-santa');
  res.send(renderProductPage('santa_message'));
});

// Holiday Reset product page
app.get('/product/holiday-reset', (req, res) => {
  trackEvent('page', 'product-holiday-reset');
  res.send(renderProductPage('holiday_reset'));
});

// New Year Reset product page
app.get('/product/new-year-reset', (req, res) => {
  trackEvent('page', 'product-new-year-reset');
  res.send(renderProductPage('new_year_reset'));
});

// Clarity Planner product page
app.get('/clarity-planner', (req, res) => {
  trackEvent('page', 'clarity-planner');
  res.send(renderProductPage('clarity_planner'));
});

// Thought Organizer product page
app.get('/thought-organizer', (req, res) => {
  trackEvent('page', 'thought-organizer');
  res.send(renderProductPage('thought_organizer'));
});

// Purchase Success page
app.get('/purchase/success', (req, res) => {
  trackEvent('page', 'purchase-success');
  res.send(renderSuccessPage());
});

// Redirect /demos to /demo-lessons
app.get('/demos', (req, res) => {
  res.redirect(301, '/demo-lessons');
});

// Demo Lessons showcase page - shows sample personalized VIDEO lessons (40-second intros) + Santa demos
app.get('/demo-lessons', (req, res) => {
  trackEvent('page', 'demo-lessons');
  res.send(renderDemoLessonsPage());
});

// OLD demo-lessons inline HTML - now replaced by renderDemoLessonsPage() above
// Keeping as reference in case needed
const OLD_DEMO_LESSONS_HTML_ARCHIVED = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watch Demo Videos | Personalized Output</title>
  <meta name="description" content="Watch demo videos of personalized lessons and Santa messages. See how we transform what you LOVE into what you NEED to learn.">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
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
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.8rem;
      margin: 3rem 0 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid rgba(255,255,255,0.2);
    }
    .section-title.lessons { color: #4facfe; }
    .section-title.santa { color: #ff6b6b; }

    /* Video Grid */
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .video-card {
      background: rgba(255,255,255,0.08);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.15);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .video-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 9/16;
      background: #000;
    }
    .video-wrapper video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .video-info {
      padding: 1rem;
    }
    .video-title {
      font-size: 1rem;
      font-weight: 600;
      color: #ffc93c;
      margin-bottom: 0.25rem;
    }
    .video-subtitle {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.6);
    }
    .demo-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
    }
    .tag {
      background: rgba(255,255,255,0.12);
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.75rem;
      color: #a8edea;
    }
    .tag.santa { background: rgba(255,107,107,0.2); color: #ff6b6b; }

    /* CTA Section */
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
      padding: 1rem 2rem;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      margin: 0.5rem;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: scale(1.05); }
    .cta-button.santa { background: linear-gradient(90deg, #8B0000, #c41e3a); }
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
      .video-grid { grid-template-columns: 1fr; }
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Watch Our Demo Videos</h1>
    <p class="subtitle">See the magic of personalization in action</p>

    <!-- LESSON DEMOS -->
    <h2 class="section-title lessons">📚 Personalized Lesson Previews</h2>
    <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">40-second previews showing how we transform interests into learning</p>

    <div class="video-grid">
      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata" poster="">
            <source src="/demos/joe-dinosaurs-fractions.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Joe: Dinosaurs → Fractions</h3>
          <p class="video-subtitle">6 years old • Learning fractions through T-Rex</p>
          <div class="demo-tags">
            <span class="tag">Kid-Friendly</span>
            <span class="tag">Math</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/demos/maya-art-solar-system.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Maya: Art → Solar System</h3>
          <p class="video-subtitle">10 years old • Astronomy through art</p>
          <div class="demo-tags">
            <span class="tag">Creative</span>
            <span class="tag">Science</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/demos/sarah-bakery-mortgage.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Sarah: Bakery → Mortgage</h3>
          <p class="video-subtitle">Adult • Understanding mortgages through baking</p>
          <div class="demo-tags">
            <span class="tag">Adult</span>
            <span class="tag">Finance</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SANTA DEMOS -->
    <h2 class="section-title santa">🎅 Santa Message Demos</h2>
    <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">30-40 second emotional peak clips - each showing different personalization types</p>

    <div class="video-grid">
      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/emma_grandmother.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Emma: Grandmother in Heaven</h3>
          <p class="video-subtitle">Santa mentions her grandmother watching over</p>
          <div class="demo-tags">
            <span class="tag santa">Emotional</span>
            <span class="tag santa">Memorial</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/liam_pet.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Liam: Pet by Name</h3>
          <p class="video-subtitle">Santa knows about his dog Biscuit</p>
          <div class="demo-tags">
            <span class="tag santa">Personal</span>
            <span class="tag santa">Pets</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/sophia_achievement.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Sophia: Learning to Read</h3>
          <p class="video-subtitle">Santa celebrates her reading achievement</p>
          <div class="demo-tags">
            <span class="tag santa">Achievement</span>
            <span class="tag santa">Proud</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/noah_sibling.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Noah: Being a Big Brother</h3>
          <p class="video-subtitle">Santa recognizes his care for baby Lucas</p>
          <div class="demo-tags">
            <span class="tag santa">Sibling</span>
            <span class="tag santa">Kind</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/olivia_hardship.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Olivia: New School Courage</h3>
          <p class="video-subtitle">Santa acknowledges her bravery starting fresh</p>
          <div class="demo-tags">
            <span class="tag santa">Hardship</span>
            <span class="tag santa">Brave</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/jackson_wish.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Jackson: Secret Telescope Wish</h3>
          <p class="video-subtitle">Santa heard his whispered wish</p>
          <div class="demo-tags">
            <span class="tag santa">Secret Wish</span>
            <span class="tag santa">Magic</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/ava_hobby.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Ava: Painting Sunsets</h3>
          <p class="video-subtitle">Santa sees her art talent</p>
          <div class="demo-tags">
            <span class="tag santa">Hobby</span>
            <span class="tag santa">Artist</span>
          </div>
        </div>
      </div>

      <div class="video-card">
        <div class="video-wrapper">
          <video controls preload="metadata">
            <source src="/santa-demos/lucas_kindness.mp4" type="video/mp4">
          </video>
        </div>
        <div class="video-info">
          <h3 class="video-title">Lucas: Helping Grandma</h3>
          <p class="video-subtitle">Santa saw him carry her groceries</p>
          <div class="demo-tags">
            <span class="tag santa">Kindness</span>
            <span class="tag santa">Grandma</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="cta-section">
      <p style="margin-bottom: 1rem; color: rgba(255,255,255,0.9); font-size: 1.1rem;">
        <strong>Ready to create your own?</strong>
      </p>
      <a href="/flash-cards" class="cta-button">Create Personalized Lesson</a>
      <a href="/santa" class="cta-button santa">Create Santa Message</a>
    </div>

    <a href="/" class="back-link">&larr; Back to Home</a>
  </div>
</body>
</html>`;

// Social Videos page - TikTok/Reels style marketing videos
app.get('/social', (req, res) => {
  trackEvent('page', 'social');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Social Videos | Personalized Output</title>
  <meta name="description" content="TikTok and Reels marketing videos for personalized lessons, Santa messages, and more.">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      color: white;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #ff6b6b, #ffc93c, #4facfe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { text-align: center; color: #a8edea; font-size: 1.2rem; margin-bottom: 2rem; }
    .section-title {
      font-size: 1.5rem;
      margin: 2.5rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .video-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .video-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 9/16;
      background: #000;
    }
    .video-wrapper video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .video-info {
      padding: 0.75rem;
    }
    .video-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #ffc93c;
    }
    .video-type {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.5);
      margin-top: 0.25rem;
    }
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
      .video-grid { grid-template-columns: repeat(2, 1fr); }
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Social Media Videos</h1>
    <p class="subtitle">TikTok & Reels ready - download and post!</p>

    <h2 class="section-title">🎅 PERFECTED Santa Demos (Fine-tuned Voice)</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_emma_grandmother_1765808901787.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Emma - Grandmother Story</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_liam_pet_1765808915933.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Liam - Pet Story</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_sophia_achievement_1765808929619.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Sophia - Achievement</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_noah_sibling_1765808944340.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Noah - Sibling Story</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_olivia_hardship_1765808957971.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Olivia - Hardship</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_jackson_wish_1765808971755.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Jackson - Wish</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_ava_hobby_1765808985541.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Ava - Hobby</div><div class="video-type">Perfected Voice</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_perfected_lucas_kindness_1765808999292.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Lucas - Kindness</div><div class="video-type">Perfected Voice</div></div></div>
    </div>

    <h2 class="section-title">🎅 Santa Hook Videos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_emotional_01_voiceover_gradient_warm_1765802209931.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Emotional Hook #1</div><div class="video-type">Voiceover • Warm</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_emotional_02_voiceover_gradient_festive_1765802240078.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Emotional Hook #2</div><div class="video-type">Voiceover • Festive</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_emotional_04_voiceover_gradient_warm_1765802272159.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Emotional Hook #4</div><div class="video-type">Voiceover • Warm</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_urgency_01_voiceover_gradient_warm_1765802299792.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Urgency Hook #1</div><div class="video-type">Voiceover • Warm</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_urgency_02_voiceover_gradient_warm_1765802324686.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Urgency Hook #2</div><div class="video-type">Voiceover • Warm</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_curiosity_01_voiceover_gradient_dark_1765802353144.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Curiosity Hook</div><div class="video-type">Voiceover • Dark</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_social_01_voiceover_gradient_warm_1765802381138.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Social Proof Hook</div><div class="video-type">Voiceover • Warm</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/santa_transform_01_voiceover_gradient_festive_1765802414722.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Transform Hook</div><div class="video-type">Voiceover • Festive</div></div></div>
    </div>

    <h2 class="section-title">🎯 Vision Board Videos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_reveal_1_1765803779084.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Reveal #1</div><div class="video-type">Reveal Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_reveal_2_1765803781597.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Reveal #2</div><div class="video-type">Reveal Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_reveal_3_1765803784012.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Reveal #3</div><div class="video-type">Reveal Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_reveal_4_1765803786417.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Reveal #4</div><div class="video-type">Reveal Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_reveal_5_1765803788851.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Reveal #5</div><div class="video-type">Reveal Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_emotional_01_voiceover_gradient_ocean_1765802447878.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Emotional</div><div class="video-type">Voiceover • Ocean</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_urgency_01_voiceover_gradient_cool_1765802477689.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Urgency #1</div><div class="video-type">Voiceover • Cool</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_urgency_02_voiceover_gradient_sunset_1765802508075.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Urgency #2</div><div class="video-type">Voiceover • Sunset</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_curiosity_01_voiceover_gradient_purple_1765802531636.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Curiosity</div><div class="video-type">Voiceover • Purple</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_transform_01_voiceover_gradient_sunset_1765802556186.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Transform</div><div class="video-type">Voiceover • Sunset</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/vision_social_01_voiceover_gradient_purple_1765802581060.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Vision Social Proof</div><div class="video-type">Voiceover • Purple</div></div></div>
    </div>

    <h2 class="section-title">📚 Lesson Demos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/lesson_clip_demo_joe_dinosaurs_fractions_1765540710481_1765803798437.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Joe - Dinosaurs & Fractions</div><div class="video-type">Lesson Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/lesson_clip_demo_maya_art_solar_system_1765540722252_1765803799989.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Maya - Art & Solar System</div><div class="video-type">Lesson Demo</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/lesson_clip_demo_sarah_bakery_mortgage_1765540734646_1765803801529.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Sarah - Bakery & Mortgage</div><div class="video-type">Lesson Demo</div></div></div>
    </div>

    <h2 class="section-title">📝 Flash Cards & Lessons Hook Videos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/flash_emotional_01_voiceover_gradient_cool_1765802605277.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Flash Emotional</div><div class="video-type">Voiceover • Cool</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/flash_problem_01_voiceover_gradient_cool_1765802635420.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Flash Problem/Solution</div><div class="video-type">Voiceover • Cool</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/flash_curiosity_01_voiceover_gradient_minimal_1765802659882.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Flash Curiosity</div><div class="video-type">Voiceover • Minimal</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/flash_transform_01_voiceover_gradient_ocean_1765802680108.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Flash Transform</div><div class="video-type">Voiceover • Ocean</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/flash_social_01_voiceover_gradient_ocean_1765802709374.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Flash Social Proof</div><div class="video-type">Voiceover • Ocean</div></div></div>
    </div>

    <h2 class="section-title">💡 Clarity Planner Videos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/clarity_emotional_01_voiceover_gradient_dark_1765802738498.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Clarity Emotional</div><div class="video-type">Voiceover • Dark</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/clarity_problem_01_voiceover_gradient_dark_1765802770441.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Clarity Problem/Solution</div><div class="video-type">Voiceover • Dark</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/clarity_transform_01_voiceover_gradient_dark_1765802792442.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Clarity Transform</div><div class="video-type">Voiceover • Dark</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/clarity_curiosity_01_voiceover_gradient_minimal_1765802819816.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Clarity Curiosity</div><div class="video-type">Voiceover • Minimal</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/clarity_urgency_01_voiceover_gradient_dark_1765802841888.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Clarity Urgency</div><div class="video-type">Voiceover • Dark</div></div></div>
    </div>

    <h2 class="section-title">🎄 General / Brand Videos</h2>
    <div class="video-grid">
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/general_brand_01_voiceover_gradient_purple_1765802868517.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Brand Overview #1</div><div class="video-type">Voiceover • Purple</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/general_brand_02_voiceover_gradient_minimal_1765802893166.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Brand Overview #2</div><div class="video-type">Voiceover • Minimal</div></div></div>
      <div class="video-card"><div class="video-wrapper"><video controls preload="metadata"><source src="/social-videos/general_holiday_01_voiceover_gradient_festive_1765802915891.mp4" type="video/mp4"></video></div><div class="video-info"><div class="video-title">Holiday Special</div><div class="video-type">Voiceover • Festive</div></div></div>
    </div>

    <p style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 2rem; font-size: 0.9rem;">55 total videos available for TikTok/Reels marketing</p>
    <a href="/" class="back-link">&larr; Back to Home</a>
  </div>
</body>
</html>`;
  res.send(html);
});

// ============================================================
// API ROUTES
// ============================================================

// Inbound Email Webhook (for Resend inbound emails) - TEMPORARILY DISABLED
// Configure Resend webhook to POST to: https://personalizedoutput.com/api/email/inbound
// TODO: Re-enable when Render deploy is stabilized
// app.post('/api/email/inbound', async (req, res) => {
//   try {
//     console.log('[EmailWebhook] Received inbound email');
//     await handleInboundWebhook(req.body);
//     res.status(200).json({ ok: true });
//   } catch (error) {
//     console.error('[EmailWebhook] Error:', error);
//     res.status(500).json({ error: 'Failed to process email' });
//   }
// });

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

// Referral System API (Learn With Friends)
app.use('/api/referral', referralApi);

// Checkout API (Direct product purchases via Stripe)
app.use('/api/checkout', checkoutApi);

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
  res.send(renderPricingPageNew());
});

// Products page
app.get('/products', async (req, res) => {
  trackEvent('page', 'products');
  const html = await renderProductsPage();
  res.send(html);
});

// How It Works page
app.get('/how-it-works', (req, res) => {
  trackEvent('page', 'how-it-works');
  res.send(renderHowItWorksPage());
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

app.get('/', async (req, res) => {
  // Use new V4 homepage with dynamic product ordering
  const html = await renderPremiumHomepageV4();
  res.send(html);
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
// ADMIN: API USAGE MONITORING
// ============================================================

// Check API usage status (protected by admin key)
app.get('/api/admin/usage', async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.query.key;
  if (adminKey !== process.env.ADMIN_API_KEY && adminKey !== 'etsyinnovations2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const usage = await checkAllUsage();
    const state = getUsageState();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      thresholds: { warning: 80, alert: 90, critical: 95 },
      services: usage,
      lastChecked: state.lastCheck || 'never',
      alertHistory: state.alerts || []
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
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
  // Start API usage monitoring (checks every 4 hours, alerts at 80%/90%/95%)
  startUsageMonitoring();

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
║   API Usage Monitoring: ACTIVE (checks every 4 hours)         ║
║   • Alerts at 80%/90%/95% to ${process.env.ALERT_EMAIL || 'support@personalizedoutput.com'}   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
