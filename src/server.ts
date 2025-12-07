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

// Load environment variables
dotenv.config();

// Import API routers
import santaApiDeep from './api/santaApiDeep';
import plannerApi from './api/plannerApi';
import thoughtChatApi from './api/thoughtChatApi';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

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

// ============================================================
// PRODUCTION ROUTES - Clean URLs for Etsy buyers
// ============================================================

// Santa Message form
app.get('/santa', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-santa.html'));
});

// Holiday Reset form
app.get('/holiday-reset', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-holiday.html'));
});

// New Year Reset form
app.get('/new-year-reset', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dev', 'thought-form-newyear.html'));
});

// ============================================================
// API ROUTES
// ============================================================

// Santa Message API
app.use('/api/santa', santaApiDeep);

// Planner API (Holiday Reset, New Year Reset)
app.use('/api/planner', plannerApi);

// Thought Chat API (Chat-based experience for all products)
app.use('/api/thought-chat', thoughtChatApi);

// ============================================================
// HEALTH CHECK (Simple format for Render health checks)
// ============================================================

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ============================================================
// BRANDED HOMEPAGE
// ============================================================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>personalizedoutput - Deeply Personalized Digital Experiences</title>
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
      padding: 40px 20px;
      color: #2c3e50;
    }
    .container {
      max-width: 700px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.8rem;
      font-weight: 700;
      color: #1a4d2e;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .tagline {
      font-size: 1.2rem;
      color: #5a6c7d;
      margin-bottom: 50px;
      line-height: 1.6;
    }
    .products {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 60px;
    }
    .product-btn {
      display: block;
      padding: 22px 30px;
      background: #fff;
      border: 2px solid #e8e0d8;
      border-radius: 12px;
      text-decoration: none;
      color: #2c3e50;
      font-size: 1.15rem;
      font-weight: 500;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .product-btn:hover {
      border-color: #1a4d2e;
      background: #1a4d2e;
      color: #fff;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(26,77,46,0.15);
    }
    .product-btn.santa {
      border-color: #c41e3a;
    }
    .product-btn.santa:hover {
      background: #c41e3a;
      border-color: #c41e3a;
    }
    .coming-soon {
      background: #fff;
      border-radius: 12px;
      padding: 30px;
      border: 1px dashed #d0c8c0;
    }
    .coming-soon h3 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.1rem;
      color: #1a4d2e;
      margin-bottom: 10px;
    }
    .coming-soon p {
      font-size: 0.95rem;
      color: #7a8a9a;
      margin-bottom: 15px;
    }
    .coming-soon a {
      color: #1a4d2e;
      font-weight: 500;
    }
    .footer {
      margin-top: auto;
      padding-top: 40px;
      font-size: 0.85rem;
      color: #9aa5b1;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>personalizedoutput</h1>
    <p class="tagline">Deeply personalized digital experiences — Santa messages, holiday resets, and New Year clarity sessions.</p>

    <div class="products">
      <a href="/santa" class="product-btn santa">Personalized Santa Message</a>
      <a href="/holiday-reset" class="product-btn">Holiday Relationship Reset Planner</a>
      <a href="/new-year-reset" class="product-btn">New Year Reset Planner</a>
    </div>

    <div class="coming-soon">
      <h3>Coming Soon</h3>
      <p>Join our email list for special launches and seasonal personalized experiences.</p>
      <a href="/signup">Sign up for early access &rarr;</a>
    </div>
  </div>

  <div class="footer">
    &copy; ${new Date().getFullYear()} personalizedoutput
  </div>
</body>
</html>
  `);
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
