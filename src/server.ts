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

outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Server] Created directory: ${dir}`);
  }
});

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Root route (Simple for production)
app.get('/', (req, res) => {
  res.send('personalizedoutput server running');
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
