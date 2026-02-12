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
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import API routers
import santaApiDeep from './api/santaApiDeep';
import plannerApi from './api/plannerApi';
import thoughtChatApi from './api/thoughtChatApi';
import referralApi from './api/referralApi';
import checkoutApi from './api/checkoutApi';
import refundApi from './api/refundApi';
import { renderRefundPage } from './pages/refund';
import supportReplyApi from './api/supportReplyApi';
import homeworkApi from './api/homeworkApi';
import analyticsApi from './api/analyticsApi';
import rediApi from './api/rediApi';
import rediWebRTCApi from './api/rediWebRTCApi';
import usageApi from './api/usageApi';
// V1/V2 archived - V3, V5, V6, V7, V8 active
import { initRediV3 } from './websocket/rediV3Server';
import { initRediV5 } from './websocket/rediV5Server';
import { initRediV6, closeRediV6 } from './websocket/rediV6Server';
import { initRediV7, closeRediV7 } from './websocket/rediV7Server';
import { initRediV8, closeRediV8 } from './websocket/rediV8Server';
import { initV9WebSocket } from './websocket/rediV9Server';
// Redi services
import memoryService from './memory/memoryService';
import tieredMemory from './memory/tieredMemory';
import outreachService from './outreach/outreachService';
import callScheduler from './outreach/callScheduler';
import numberManager from './outreach/numberManager';
import { initCallHandler } from './outreach/callHandler';
import callingService from './calling/callingService';
import meetingService from './meetings/meetingService';
import reflectSession from './sessions/reflectSession';
import sessionTypes from './sessions/sessionTypes';
import reportGenerator from './reports/reportGenerator';
import webSearch from './integrations/webSearch';
import weatherService from './integrations/weatherService';
import translationService from './integrations/translationService';
import productService from './integrations/productService';
import gmailService from './integrations/email/gmailService';
import outlookService from './integrations/email/outlookService';
import yelpService from './integrations/booking/yelpService';
import transportService from './integrations/deeplinks/transportService';
import shoppingService from './integrations/deeplinks/shoppingService';
import paypalService from './integrations/payments/paypalService';
import paymentDeeplinks from './integrations/payments/paymentDeeplinks';
import spotifyService from './integrations/music/spotifyService';
import smartThingsService from './integrations/smarthome/smartThingsService';
import proactiveEngine from './intelligence/proactiveEngine';
import usageTracker from './billing/usageTracker';
import authService from './auth/authService';
import landingPage from './api/landingPage';
import meetingBotRoutes from './meetings/meetingBotRoutes';
import { getAvailableVoices } from './providers/elevenlabsTTS';
import { createOrganization, generateInviteCode, joinWithInviteCode, getOrgContext } from './organizations/orgService';
// Screen sharing WebSocket server
import { initScreenShare } from './websocket/screenShareServer';
// Import Homework Rescue pages
import {
  renderHomeworkRescuePage,
  renderHomeworkRescueStartPage,
  renderOrderStatusPage,
  renderSuccessPage as renderHomeworkSuccessPage,
  renderRemakePage
} from './pages/homeworkRescue';
import {
  renderTermsOfUsePage as renderHomeworkTermsPage,
  renderPrivacyPolicyPage as renderHomeworkPrivacyPage,
  renderRefundPolicyPage as renderHomeworkRefundPage,
  renderChildSafetyPolicyPage
} from './pages/homeworkPolicies';

// Import token store for order-based access control
import { validateToken, createOrReuseToken } from './lib/thoughtEngine/santa/tokenStore';

// Import email alerts
import { alertTrafficSpike, sendTestAlert, isAlertConfigured, sendDailySummary, scheduleDailyDigest, alertNewPurchase } from './lib/alerts/emailAlerts';

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
import { renderSantaFormPage } from './pages/santaForm';
import { renderVisionBoardFormPage } from './pages/visionBoardForm';
import { renderRediLandingPage } from './pages/rediLanding';

// Import Supabase services
import { isSupabaseConfigured, isSupabaseServiceConfigured } from './lib/supabase/client';
import { signUp, signIn, signOut, getSession, resetPassword, getProfile, getReferralStats } from './lib/supabase/userService';
import { getPublishedPosts, getPostBySlug } from './lib/supabase/blogService';
import { addToEmailList } from './lib/supabase/emailListService';
import { trackPageView, getAnalyticsSummary } from './lib/supabase/analyticsService';

// Import Stripe services
import { isStripeConfigured, createCheckoutSession, createPortalSession, constructWebhookEvent, handleWebhookEvent } from './lib/stripe/stripeService';
// Email triage service temporarily disabled - add back when Render deploy stabilizes
// import { handleInboundWebhook } from './services/emailTriageService';

// Import admin auth system
import {
  isAdminSetup,
  setupAdminPassword,
  signInAdmin,
  requireAdmin,
  setAdminSession,
  clearAdminSession,
  renderAdminLoginPage,
  renderAdminSetupPage,
  renderAdminDashboardPage,
  renderAdminErrorPage,
  renderAdminStatsPage,
  renderAdminAlertPage,
  renderAdminUsagePage,
} from './lib/adminAuth';

// Import Stor chat
import storApi from './api/storApi';
import { renderAdminChatPage } from './pages/adminChat';

// Import viral readiness layer
import {
  pageRateLimiter,
  apiRateLimiter,
  generationRateLimiter,
  trafficMonitorMiddleware,
  getSystemHealth,
  handleApiError
} from './lib/viralReadiness';

const app = express();

// Trust proxy - required for Render.com (and other reverse proxies)
// Fixes express-rate-limit X-Forwarded-For header validation
app.set('trust proxy', 1);

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
  path.join(process.cwd(), 'outputs', 'homework'),
  path.join(process.cwd(), 'outputs', 'logs'),
  path.join(process.cwd(), 'outputs', 'logs', 'emails'),
  path.join(process.cwd(), 'public', 'homework-videos'),
  path.join(process.cwd(), 'public', 'homework-pdfs'),
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

// ============================================================
// VIRAL READINESS - Rate limiting and traffic monitoring
// ============================================================

// Traffic monitoring (for all requests)
app.use(trafficMonitorMiddleware);

// Rate limiting for pages (generous)
app.use(pageRateLimiter);

// Rate limiting for API routes (more restrictive)
app.use('/api', apiRateLimiter);

// Rate limiting for generation endpoints (most restrictive)
app.use('/api/santa', generationRateLimiter);
app.use('/api/thought-chat', generationRateLimiter);
app.use('/api/planner', generationRateLimiter);
app.use('/api/homework-rescue', generationRateLimiter);

// System health endpoint
app.get('/api/health', (req, res) => {
  const health = getSystemHealth();
  res.json(health);
});

// ============================================================
// PAGE VIEW TRACKING (Privacy-friendly analytics)
// ============================================================
app.use((req, res, next) => {
  // Only track GET requests to pages (not API, assets, etc.)
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/outputs/') &&
      !req.path.includes('.') && req.path !== '/health') {
    // Track asynchronously - don't slow down the request
    trackPageView(req.path, {
      referrer: req.get('referer'),
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection?.remoteAddress,
    }).catch(() => {}); // Silently ignore errors
  }
  next();
});

// Static file serving
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));
app.use('/dev', express.static(path.join(process.cwd(), 'dev')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/listing-images', express.static(path.join(process.cwd(), 'public', 'listing-images')));
app.use('/digital-downloads', express.static(path.join(process.cwd(), 'public', 'digital-downloads')));
app.use('/demos', express.static(path.join(process.cwd(), 'public', 'demos')));
app.use('/santa-demos', express.static(path.join(process.cwd(), 'public', 'santa-demos')));
app.use('/social-videos', express.static(path.join(process.cwd(), 'public', 'social-videos')));

// Serve CSS and JS files from public folder root (carousel.css, carousel.js, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

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
// REDI SCREEN SHARE - Web UI for desktop screen sharing
// ============================================================
app.get('/screen', (req, res) => {
  trackEvent('page', 'screen-share');
  res.sendFile(path.join(process.cwd(), 'public', 'screen', 'index.html'));
});

// ============================================================
// PRODUCTION ROUTES - Clean URLs for Etsy buyers
// ============================================================

// Redi - AI Presence App
app.get('/redi', (req, res) => {
  trackEvent('page', 'redi');
  renderRediLandingPage(req, res);
});

// Santa Message form - Direct access (Stripe checkout flow)
app.get('/santa', (req, res) => {
  trackEvent('page', 'santa');
  res.send(renderSantaFormPage());
});

// Admin test mode - bypasses payment for testing
app.get('/santa/admin-test', (req, res) => {
  // Pass admin_test flag to the form
  trackEvent('page', 'santa-admin-test');
  res.send(renderSantaFormPage('ADMIN_TEST'));
});

// Legacy token validation endpoint (for old Etsy orders)
app.get('/santa-legacy', (req, res) => {
  const token = req.query.token as string | undefined;

  // If token provided, validate it
  if (token) {
    const validation = validateToken(token);

    if (validation.valid) {
      // Valid token - show the premium Santa form
      trackEvent('page', 'santa-legacy');
      return res.send(renderSantaFormPage(token));
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

  // No token - redirect to main santa page
  trackEvent('page', 'santa-claim');
  res.redirect('/santa');
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

// Vision Board form - Premium dark theme
app.get('/vision-board', (req, res) => {
  trackEvent('page', 'vision-board');
  res.send(renderVisionBoardFormPage());
});

// Generic Clarity Planner form
app.get('/planner', (req, res) => {
  trackEvent('page', 'planner');
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-planner.html'));
});

// ============================================================
// PRODUCT DETAIL PAGES (Premium pages with Stripe checkout)
// ============================================================

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

// ============================================================
// HOMEWORK RESCUE PAGES
// ============================================================

// Landing page
app.get('/homework-rescue', (req, res) => {
  trackEvent('page', 'homework-rescue');
  res.send(renderHomeworkRescuePage());
});

// Start personalization experience
app.get('/homework-rescue/start', (req, res) => {
  trackEvent('page', 'homework-rescue-start');
  res.send(renderHomeworkRescueStartPage());
});

// Order status page
app.get('/homework-rescue/order/:orderId/status', (req, res) => {
  trackEvent('page', 'homework-rescue-status');
  res.send(renderOrderStatusPage(req.params.orderId));
});

// Success page (after checkout)
app.get('/homework-rescue/order/:orderId/success', (req, res) => {
  trackEvent('page', 'homework-rescue-success');
  res.send(renderHomeworkSuccessPage(req.params.orderId));
});

// Remake request page
app.get('/homework-rescue/order/:orderId/remake', (req, res) => {
  trackEvent('page', 'homework-rescue-remake');
  res.send(renderRemakePage(req.params.orderId));
});

// Homework Rescue policy pages
app.get('/homework-rescue/terms', (req, res) => {
  trackEvent('page', 'homework-rescue-terms');
  res.send(renderHomeworkTermsPage());
});

app.get('/homework-rescue/privacy', (req, res) => {
  trackEvent('page', 'homework-rescue-privacy');
  res.send(renderHomeworkPrivacyPage());
});

app.get('/homework-rescue/refund-policy', (req, res) => {
  trackEvent('page', 'homework-rescue-refund');
  res.send(renderHomeworkRefundPage());
});

app.get('/homework-rescue/child-safety', (req, res) => {
  trackEvent('page', 'homework-rescue-child-safety');
  res.send(renderChildSafetyPolicyPage());
});

// Static files for homework videos and PDFs
app.use('/homework-videos', express.static(path.join(process.cwd(), 'public', 'homework-videos')));
app.use('/homework-pdfs', express.static(path.join(process.cwd(), 'public', 'homework-pdfs')));

// Coming Soon page for unlaunched products
app.get('/coming-soon', (req, res) => {
  trackEvent('page', 'coming-soon');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coming Soon - Personalized Output</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(165deg, #1a0a1a 0%, #0f050f 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container { max-width: 500px; }
    .emoji { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      font-size: 1.2rem;
      color: rgba(255,255,255,0.7);
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .back-link {
      display: inline-block;
      background: rgba(255,255,255,0.1);
      color: white;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 30px;
      font-weight: 500;
      transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .back-link:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-2px);
    }
    .available {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .available h3 {
      font-size: 1rem;
      color: rgba(255,255,255,0.5);
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .product-links {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .product-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(102, 126, 234, 0.2) 100%);
      color: white;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 20px;
      font-size: 0.9rem;
      border: 1px solid rgba(124, 58, 237, 0.3);
      transition: all 0.3s ease;
    }
    .product-link:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(102, 126, 234, 0.4) 100%);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🚀</div>
    <h1>Coming Soon!</h1>
    <p>This product is launching in early 2026. We're working hard to make it perfect for you!</p>
    <a href="/" class="back-link">← Back to Home</a>

    <div class="available">
      <h3>Available Now</h3>
      <div class="product-links">
        <a href="/santa" class="product-link">🎁 Santa Message</a>
        <a href="/vision-board" class="product-link">🎯 Vision Board</a>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// Redirect /demos to /demo-lessons
app.get('/demos', (req, res) => {
  res.redirect(301, '/demo-lessons');
});

// Demo Lessons showcase page
app.get('/demo-lessons', (req, res) => {
  trackEvent('page', 'demo-lessons');
  res.send(renderDemoLessonsPage());
});

// Social Videos page
app.get('/social', (req, res) => {
  trackEvent('page', 'social');
  res.send('Social videos page - see /social-videos for assets');
});

// ============================================================
// API ROUTES
// ============================================================

// Santa Order Claim endpoint
app.post('/api/santa/claim', (req, res) => {
  const { orderId, email, productId } = req.body;

  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({ ok: false, error: 'Order ID is required' });
  }

  if (orderId.trim().length < 3 || orderId.trim().length > 50) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid Order ID' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ ok: false, error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address' });
  }

  const product = productId || 'santa_message';
  const result = createOrReuseToken(orderId.trim(), product, email.trim());

  if (result.success) {
    const token = (result as { success: true; token: string }).token;
    console.log(`[Claim] Token issued for order ${orderId}: ${token.substring(0, 8)}...`);
    return res.json({ ok: true, redirectUrl: `/santa?token=${token}` });
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

// API routers - ORDER MATTERS!
// More specific routes MUST come before less specific ones
app.use('/api/santa', santaApiDeep);
app.use('/api/planner', plannerApi);
app.use('/api/thought-chat', thoughtChatApi);
app.use('/api/referral', referralApi);
app.use('/api/checkout', checkoutApi);
app.use('/api/refund', refundApi);
app.use('/api/support', supportReplyApi);
app.use('/api/homework-rescue', homeworkApi);
app.use('/api/analytics', analyticsApi);

// REDI API routes - WebRTC MUST come BEFORE generic redi route!
app.use('/api/redi/webrtc', rediWebRTCApi);  // More specific - handles /api/redi/webrtc/*
app.use('/api/redi', rediApi);                // Less specific - handles /api/redi/*

// OpenAI Usage API - Check spending via API
app.use('/api/usage', usageApi);

// Redi service routes
app.use('/api/memory', memoryService);
app.use('/api/memory', tieredMemory);
app.use('/api/outreach', outreachService);
app.use('/api/outreach', callScheduler);
app.use('/api/phone', numberManager);
app.use('/api/calling', callingService);
app.use('/api/meetings', meetingService);
app.use('/api/sessions', reflectSession);
app.use('/api/sessions', sessionTypes);
app.use('/api/study', sessionTypes);
app.use('/api/reports', reportGenerator);
app.use('/api/search', webSearch);
app.use('/api/weather', weatherService);
app.use('/api/translate', translationService);
app.use('/api/product', productService);
app.use('/api/email/gmail', gmailService);
app.use('/api/email/outlook', outlookService);
app.use('/api/booking', yelpService);
app.use('/api/deeplinks', transportService);
app.use('/api/deeplinks', shoppingService);
app.use('/api/payments/paypal', paypalService);
app.use('/api/payments', paymentDeeplinks);
app.use('/api/music/spotify', spotifyService);
app.use('/api/smarthome/smartthings', smartThingsService);
app.use('/api/intelligence', proactiveEngine);
app.use('/api/billing', usageTracker);
app.use('/api/auth', authService);
app.use('/redi', landingPage);
app.use('/api/meetings', meetingBotRoutes);

// Voice selection API
app.get('/api/voices', (req, res) => {
  res.json({ voices: getAvailableVoices() });
});

// Twilio inbound call webhook — user calls Redi's phone number
app.post('/api/calling/inbound', async (req, res) => {
  try {
    const callerNumber = req.body.From;
    const twilioCallSid = req.body.CallSid;
    console.log(`[Inbound Call] From: ${callerNumber}, CallSid: ${twilioCallSid}`);

    // Brief message then hang up — actual session happens in-app via VoIP push
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Starting your Redi session now.</Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('[Inbound Call] Error:', error);
    res.status(500).send('Error');
  }
});

// Organization endpoints
app.post('/api/org/create', async (req, res) => {
  try {
    const orgId = await createOrganization(req.body);
    res.json({ orgId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/org/:orgId/invite', async (req, res) => {
  try {
    const code = await generateInviteCode(req.params.orgId);
    res.json({ inviteCode: code, expiresIn: '7 days' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/org/join', async (req, res) => {
  try {
    const orgId = await joinWithInviteCode(req.body.code, req.body.userId);
    res.json({ orgId, status: 'joined' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/org/:userId/context', async (req, res) => {
  try {
    const context = await getOrgContext(req.params.userId);
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STRIPE WEBHOOK
// ============================================================

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

app.get('/login', (req, res) => {
  trackEvent('page', 'login');
  const error = req.query.error as string | undefined;
  const redirectTo = req.query.redirect as string | undefined;
  const success = req.query.success === '1';
  res.send(renderLoginPage(error, redirectTo, success));
});

app.get('/refund', (req, res) => {
  trackEvent('page', 'refund');
  const orderId = req.query.order as string | undefined;
  const email = req.query.email as string | undefined;
  res.send(renderRefundPage(orderId, email));
});

app.get('/auth/signup', (req, res) => {
  trackEvent('page', 'auth-signup');
  const error = req.query.error as string | undefined;
  const referralCode = req.query.ref as string | undefined;
  res.send(renderSignupPage(error, referralCode));
});

app.get('/forgot-password', (req, res) => {
  trackEvent('page', 'forgot-password');
  const success = req.query.success === '1';
  const error = req.query.error as string | undefined;
  res.send(renderForgotPasswordPage(error, success));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, redirect } = req.body;

  if (!email || !password) {
    return res.redirect(`/login?error=${encodeURIComponent('Email and password are required')}`);
  }

  const result = await signIn(email, password);

  if (result.user) {
    res.cookie('session', result.session?.access_token, { httpOnly: true, secure: isProduction });
    return res.redirect(redirect || '/dashboard');
  } else {
    return res.redirect(`/login?error=${encodeURIComponent(result.error || 'Login failed')}`);
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName, referralCode } = req.body;

  if (!email || !password) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Please enter both email and password.')}`);
  }

  if (password.length < 8) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Password must be at least 8 characters long.')}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Please enter a valid email address.')}`);
  }

  try {
    const result = await signUp(email, password, fullName, referralCode);

    if (result.user) {
      return res.redirect('/login?success=1');
    } else {
      let userFriendlyError = result.error || 'Unable to create account. Please try again.';
      return res.redirect(`/auth/signup?error=${encodeURIComponent(userFriendlyError)}`);
    }
  } catch (err: any) {
    return res.redirect(`/auth/signup?error=${encodeURIComponent('Something went wrong. Please try again in a moment.')}`);
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`);
  }

  await resetPassword(email);
  return res.redirect('/forgot-password?success=1');
});

app.get('/logout', async (req, res) => {
  await signOut();
  res.clearCookie('session');
  res.redirect('/');
});

// ============================================================
// DASHBOARD ROUTES
// ============================================================

app.get('/dashboard', async (req, res) => {
  trackEvent('page', 'dashboard');

  const sessionToken = req.cookies?.session;

  if (!sessionToken) {
    return res.redirect('/login?redirect=/dashboard');
  }

  const session = await getSession();

  if (!session) {
    return res.redirect('/login?redirect=/dashboard');
  }

  const profile = await getProfile(session.user.id);
  const referralStats = await getReferralStats(session.user.id);

  if (!profile) {
    return res.redirect('/login?redirect=/dashboard&error=profile_not_found');
  }

  res.send(renderDashboardPage({ profile, referralStats }));
});

app.get('/pricing', (req, res) => {
  res.redirect('/');
});

app.get('/products', async (req, res) => {
  trackEvent('page', 'products');
  const html = await renderProductsPage();
  res.send(html);
});

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
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

app.get('/admin/login', async (req, res) => {
  const setup = await isAdminSetup();
  if (!setup) {
    return res.redirect('/admin/setup');
  }
  res.send(renderAdminLoginPage());
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await signInAdmin(email, password);

  if (!result.success || !result.token) {
    return res.send(renderAdminLoginPage(result.error || 'Login failed'));
  }

  setAdminSession(res, result.token);
  res.redirect('/admin');
});

app.get('/admin/setup', async (req, res) => {
  const setup = await isAdminSetup();
  if (setup) {
    return res.redirect('/admin/login');
  }
  res.send(renderAdminSetupPage());
});

app.post('/admin/setup', async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send(renderAdminSetupPage('Passwords do not match'));
  }

  if (password.length < 8) {
    return res.send(renderAdminSetupPage('Password must be at least 8 characters'));
  }

  const result = await setupAdminPassword(password);

  if (!result.success) {
    return res.send(renderAdminSetupPage(result.error || 'Setup failed'));
  }

  const loginResult = await signInAdmin('persefit@outlook.com', password);
  if (loginResult.success && loginResult.token) {
    setAdminSession(res, loginResult.token);
  }

  res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => {
  clearAdminSession(res);
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const adminEmail = (req as any).admin?.email || 'Admin';
  res.send(renderAdminDashboardPage(adminEmail));
});

app.get('/admin/chat', requireAdmin, (req, res) => {
  const adminEmail = (req as any).admin?.email || 'Admin';
  res.send(renderAdminChatPage(adminEmail));
});

app.use('/api/stor', requireAdmin, storApi);

app.get('/admin/stats', (req, res) => {
  const adminKey = req.query.key;
  const expectedKey = process.env.ADMIN_KEY || 'po-admin-2024';

  if (adminKey !== expectedKey) {
    return res.status(401).send(renderAdminErrorPage('Unauthorized', 'Invalid admin key.'));
  }

  const totalPageViews = Object.values(analytics.pageViews).reduce((a, b) => a + b, 0);
  const totalApiCalls = Object.values(analytics.apiCalls).reduce((a, b) => a + b, 0);
  const totalGenerations = Object.values(analytics.generations).reduce((a, b) => a + b, 0);

  const now = new Date();
  const last24Hours: Record<string, number> = {};
  for (let i = 0; i < 24; i++) {
    const hourKey = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString().slice(0, 13);
    last24Hours[hourKey] = analytics.hourlyTraffic[hourKey] || 0;
  }

  const lastHourKey = now.toISOString().slice(0, 13);
  const lastHourTraffic = analytics.hourlyTraffic[lastHourKey] || 0;
  const isSpike = lastHourTraffic > 100;

  res.send(renderAdminStatsPage({
    status: isSpike ? '🚨 HIGH TRAFFIC' : '✅ Normal',
    isSpike,
    totalPageViews,
    totalApiCalls,
    totalGenerations,
    lastHourTraffic,
    upSince: analytics.startTime,
    pageViews: analytics.pageViews,
    apiCalls: analytics.apiCalls,
    generations: analytics.generations,
    last24Hours,
    lastUpdated: analytics.lastUpdated,
    emailAlerts: isAlertConfigured() ? '✅ Configured' : '❌ Not configured'
  }));
});

app.get('/admin/test-alert', async (req, res) => {
  const adminKey = req.query.key;
  const expectedKey = process.env.ADMIN_KEY || 'po-admin-2024';

  if (adminKey !== expectedKey) {
    return res.status(401).send(renderAdminErrorPage('Unauthorized', 'Invalid admin key.'));
  }

  if (!isAlertConfigured()) {
    return res.send(renderAdminAlertPage({
      success: false,
      configured: false,
      message: 'Email alerts not configured',
      instructions: ['Sign up at resend.com', 'Get your API key', 'Add RESEND_API_KEY and ALERT_EMAIL to Render']
    }));
  }

  const sent = await sendTestAlert();
  res.send(renderAdminAlertPage({
    success: sent,
    configured: true,
    message: sent ? 'Test email sent!' : 'Failed to send test email.'
  }));
});

app.get('/admin/usage', async (req, res) => {
  const adminKey = req.query.key;
  const expectedKey = process.env.ADMIN_KEY || 'po-admin-2024';

  if (adminKey !== expectedKey) {
    return res.status(401).send(renderAdminErrorPage('Unauthorized', 'Invalid admin key.'));
  }

  try {
    const usage = await checkAllUsage();
    const state = getUsageState();

    const services = Object.entries(usage).map(([name, data]: [string, any]) => ({
      name,
      used: data.used || 0,
      limit: data.limit || 0,
      percentage: data.percentage || 0,
      status: data.percentage >= 90 ? 'Critical' : data.percentage >= 80 ? 'Warning' : 'OK'
    }));

    res.send(renderAdminUsagePage({ services, lastChecked: state.lastCheck || 'never' }));
  } catch (error: any) {
    res.send(renderAdminErrorPage('Error', `Failed to fetch usage data: ${error.message}`));
  }
});

app.get('/admin/analytics', requireAdmin, async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const summary = await getAnalyticsSummary(days);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics - Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .back-link { color: #666; text-decoration: none; margin-bottom: 20px; display: inline-block; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h3 { font-size: 0.9rem; color: #666; margin-bottom: 8px; }
    .card .number { font-size: 2rem; font-weight: bold; color: #333; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f8f8; font-weight: 600; color: #555; }
    .section-title { font-size: 1.2rem; color: #333; margin: 30px 0 15px; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/admin" class="back-link">&larr; Back to Admin</a>
    <h1>Analytics (Last ${days} Days)</h1>

    <div class="summary-cards">
      <div class="card">
        <h3>Total Page Views</h3>
        <div class="number">${summary.totals.views.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Unique Visitors</h3>
        <div class="number">${summary.totals.unique.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Mobile</h3>
        <div class="number">${summary.devices.mobile || 0}</div>
      </div>
      <div class="card">
        <h3>Desktop</h3>
        <div class="number">${summary.devices.desktop || 0}</div>
      </div>
    </div>

    <h2 class="section-title">Daily Breakdown</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Page Views</th><th>Unique Visitors</th></tr>
      </thead>
      <tbody>
        ${summary.daily.length > 0
          ? summary.daily.map((d: any) => `<tr><td>${d.date}</td><td>${d.total_views}</td><td>${d.unique_visitors}</td></tr>`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#999;">No data yet</td></tr>'
        }
      </tbody>
    </table>

    <h2 class="section-title">Top Pages</h2>
    <table>
      <thead>
        <tr><th>Page</th><th>Views</th><th>Unique Visitors</th></tr>
      </thead>
      <tbody>
        ${summary.topPages.length > 0
          ? summary.topPages.map((p: any) => `<tr><td>${p.path}</td><td>${p.views}</td><td>${p.unique_visitors}</td></tr>`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#999;">No data yet</td></tr>'
        }
      </tbody>
    </table>
  </div>
</body>
</html>
  `);
});

// ============================================================
// HOMEPAGE
// ============================================================

app.get('/', async (req, res) => {
  const html = await renderPremiumHomepageV4();
  res.send(html);
});

// ============================================================
// EMAIL SIGNUP
// ============================================================

app.get('/signup', (req, res) => {
  const success = req.query.success === '1';
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join the VIP List - personalizedoutput</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f5f0eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
    .container { max-width: 500px; width: 100%; text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 16px; }
    form { background: #fff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left; }
    label { display: block; font-size: 0.9rem; margin-bottom: 6px; }
    input { width: 100%; padding: 14px; font-size: 1rem; border: 2px solid #e8e0d8; border-radius: 8px; margin-bottom: 20px; }
    button { width: 100%; padding: 16px; background: #1a4d2e; color: #fff; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }
    .success { background: #d4edda; padding: 16px; border-radius: 8px; margin-bottom: 20px; color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Join the VIP List</h1>
    ${success ? '<div class="success">Thanks! You\'re in!</div>' : ''}
    <form action="/api/signup" method="POST">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" placeholder="Your name">
      <label for="email">Email *</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required>
      <button type="submit">Join</button>
    </form>
  </div>
</body>
</html>
  `);
});

app.post('/api/signup', (req, res) => {
  const { name, email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).send('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).send('Please enter a valid email address');
  }

  const sanitize = (str: string) => {
    if (!str) return '';
    return str.replace(/"/g, '""').replace(/[\r\n]/g, ' ').trim();
  };

  const timestamp = new Date().toISOString();
  const csvLine = `"${timestamp}","${sanitize(name || '')}","${sanitize(email)}","signup_page"\n`;

  try {
    fs.appendFileSync(EMAIL_LIST_PATH, csvLine);
    console.log(`[Signup] New email: ${email}`);
    res.redirect('/signup?success=1');
  } catch (error) {
    console.error('[Signup] Error saving email:', error);
    res.status(500).send('Something went wrong. Please try again.');
  }
});

app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
  }

  try {
    const result = await addToEmailList(email.trim(), 'website_signup');

    if (result.success) {
      console.log(`[Subscribe] New email: ${email}`);
      res.json({ success: true, message: 'Successfully subscribed!' });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to subscribe' });
    }
  } catch (error) {
    console.error('[Subscribe] Error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

app.get('/status', (req, res) => {
  res.json({
    name: 'Personalized Output API',
    version: '2.0.0',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ADMIN API USAGE MONITORING
// ============================================================

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
      services: usage,
      lastChecked: state.lastCheck || 'never'
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
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

const server = createServer(app);

// Initialize WebSocket servers in order
// V9 - Three-Brain (Cerebras Fast + Claude Haiku Voice + GPT-4o Deep, Deepgram STT, ElevenLabs TTS)
initV9WebSocket(server);

// Twilio call handler WebSocket (/ws/redi-call)
initCallHandler(server);

// V8 - Split pipeline (Deepgram STT → Groq Vision → Groq LLM → ElevenLabs TTS)
initRediV8(server);

// V7 - Production-grade with state machine, barge-in handling, fresh frame requests
initRediV7(server);

// V6 - Correct OpenAI API format
initRediV6(server);

// V3 - Legacy backup
initRediV3(server);

// V5 - Routes to V6/V7 based on query param
initRediV5(server);

// Screen Share - WebRTC signaling for desktop screen sharing to phone
initScreenShare(server);

server.listen(PORT, () => {
  startUsageMonitoring();

  scheduleDailyDigest(() => {
    const totalPageViews = Object.values(analytics.pageViews).reduce((a, b) => a + b, 0);
    const totalGenerations = Object.values(analytics.generations).reduce((a, b) => a + b, 0);

    let topProduct = 'None';
    let maxGen = 0;
    for (const [product, count] of Object.entries(analytics.generations)) {
      if (count > maxGen) {
        maxGen = count;
        topProduct = product;
      }
    }

    let hourlyPeak = 0;
    for (const count of Object.values(analytics.hourlyTraffic)) {
      if (count > hourlyPeak) hourlyPeak = count;
    }

    return { totalPageViews, totalGenerations, topProduct, hourlyPeak };
  });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Personalized Output - API Server                            ║
║   Deep Personalization Product Engine                         ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                               ║
║   Redi WebSocket Versions:                                    ║
║   • V8 (Split):      /ws/redi?v=8  (Deepgram→Groq→ElevenLabs) ║
║   • V7 (Production): /ws/redi?v=7  (OpenAI Realtime)          ║
║   • V6 (Stable):     /ws/redi?v=6                             ║
║   • V5 (Router):     /ws/redi?v=5                             ║
║   • V3 (Legacy):     /ws/redi?v=3                             ║
║                                                               ║
║   Redi WebRTC:       POST /api/redi/webrtc/token              ║
║   Screen Share:      /ws/screen (WebRTC signaling)            ║
║                      /screen (Web UI)                         ║
║                                                               ║
║   Usage API:         GET /api/usage/summary                   ║
║                      GET /api/usage/openai                    ║
║                                                               ║
║   API Usage Monitoring: ACTIVE (checks every 4 hours)         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
