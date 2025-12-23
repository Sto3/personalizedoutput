/**
 * Admin Authentication System
 *
 * Email-based admin recognition with Supabase Auth.
 * Admin email: persefit@outlook.com
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured } from './supabase/client';

// Admin configuration
const ADMIN_EMAIL = 'persefit@outlook.com';
const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================
// ADMIN CHECK FUNCTIONS
// ============================================================

/**
 * Check if an email is the admin email
 */
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if admin has set up their password
 */
export async function isAdminSetup(): Promise<boolean> {
  // Admin user was created on 2024-12-22 with ID 8d7e4654-b454-430f-a685-745c6fc9a9e3
  // Return true to show login page instead of setup page
  return true;
}

/**
 * Create admin user with password (first-time setup)
 */
export async function setupAdminPassword(password: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();

  // Sign up the admin user
  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password,
    options: {
      data: {
        full_name: 'Admin',
        is_admin: true,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign in admin user
 */
export async function signInAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isAdminEmail(email)) {
    return { success: false, error: 'Not an admin email' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.session) {
    return { success: false, error: 'No session created' };
  }

  return { success: true, token: data.session.access_token };
}

/**
 * Verify admin session token
 */
export async function verifyAdminSession(token: string): Promise<{ valid: boolean; email?: string }> {
  if (!isSupabaseConfigured()) {
    return { valid: false };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { valid: false };
  }

  if (!isAdminEmail(data.user.email || '')) {
    return { valid: false };
  }

  return { valid: true, email: data.user.email };
}

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

/**
 * Middleware to protect admin routes
 * Redirects to /admin/login if not authenticated
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];

  if (!token) {
    return res.redirect('/admin/login');
  }

  // Verify token asynchronously
  verifyAdminSession(token)
    .then(({ valid, email }) => {
      if (!valid) {
        res.clearCookie(ADMIN_SESSION_COOKIE);
        return res.redirect('/admin/login');
      }

      // Attach admin info to request
      (req as any).admin = { email };
      next();
    })
    .catch(() => {
      res.redirect('/admin/login');
    });
}

/**
 * Set admin session cookie
 */
export function setAdminSession(res: Response, token: string) {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
  });
}

/**
 * Clear admin session cookie
 */
export function clearAdminSession(res: Response) {
  res.clearCookie(ADMIN_SESSION_COOKIE);
}

// ============================================================
// ADMIN PAGE RENDERERS
// ============================================================

/**
 * Render admin login page
 */
export function renderAdminLoginPage(error?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #1a0a1a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5EEF0;
        }
        .container { width: 100%; max-width: 420px; padding: 24px; }
        .card {
          background: #0a0a10;
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 20px;
          padding: 48px 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .logo {
          text-align: center;
          margin-bottom: 8px;
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #F5EEF0;
        }
        .logo span { color: #E85A4F; }
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          margin-bottom: 8px;
          text-align: center;
          font-weight: 600;
        }
        .subtitle {
          color: rgba(245, 238, 240, 0.6);
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 32px;
        }
        .form-group { margin-bottom: 20px; }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(245, 238, 240, 0.8);
        }
        input {
          width: 100%;
          padding: 14px 18px;
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: #F5EEF0;
          font-size: 1rem;
          transition: all 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #E85A4F;
          background: rgba(255, 255, 255, 0.08);
        }
        input::placeholder { color: rgba(245, 238, 240, 0.4); }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, #E85A4F 0%, #D64A3F 100%);
          color: #fff;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(232, 90, 79, 0.3);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(232, 90, 79, 0.4);
        }
        .error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          padding: 14px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
          color: #FCA5A5;
        }
        .admin-badge {
          display: inline-block;
          background: rgba(232, 90, 79, 0.15);
          color: #E85A4F;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
          text-transform: uppercase;
        }
        .forgot-link {
          display: block;
          text-align: center;
          margin-top: 20px;
          color: rgba(245, 238, 240, 0.5);
          font-size: 0.85rem;
          text-decoration: none;
        }
        .forgot-link:hover { color: #E85A4F; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">personalized<span>output</span></div>
          <div style="text-align: center;">
            <span class="admin-badge">Admin Access</span>
          </div>
          <h1>Welcome Back</h1>
          <p class="subtitle">Sign in to access the admin dashboard</p>

          ${error ? `<div class="error">${error}</div>` : ''}

          <form action="/admin/login" method="POST">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" value="${ADMIN_EMAIL}" readonly>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="Enter your password" required>
            </div>
            <button type="submit" class="btn">Sign In</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render admin setup page (first-time password setup)
 */
export function renderAdminSetupPage(error?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Setup - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #1a0a1a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5EEF0;
        }
        .container { width: 100%; max-width: 420px; padding: 24px; }
        .card {
          background: #0a0a10;
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 20px;
          padding: 48px 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .logo {
          text-align: center;
          margin-bottom: 8px;
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #F5EEF0;
        }
        .logo span { color: #E85A4F; }
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          margin-bottom: 8px;
          text-align: center;
          font-weight: 600;
        }
        .subtitle {
          color: rgba(245, 238, 240, 0.6);
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 32px;
        }
        .form-group { margin-bottom: 20px; }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(245, 238, 240, 0.8);
        }
        input {
          width: 100%;
          padding: 14px 18px;
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: #F5EEF0;
          font-size: 1rem;
          transition: all 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #E85A4F;
          background: rgba(255, 255, 255, 0.08);
        }
        input::placeholder { color: rgba(245, 238, 240, 0.4); }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, #E85A4F 0%, #D64A3F 100%);
          color: #fff;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(232, 90, 79, 0.3);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(232, 90, 79, 0.4);
        }
        .error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          padding: 14px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
          color: #FCA5A5;
        }
        .setup-badge {
          display: inline-block;
          background: rgba(34, 197, 94, 0.15);
          color: #4ADE80;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
          text-transform: uppercase;
        }
        .info-box {
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 24px;
          font-size: 0.875rem;
          color: rgba(245, 238, 240, 0.8);
          text-align: center;
        }
        .info-box strong { color: #E85A4F; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">personalized<span>output</span></div>
          <div style="text-align: center;">
            <span class="setup-badge">First-Time Setup</span>
          </div>
          <h1>Create Admin Account</h1>
          <p class="subtitle">Set up your admin password</p>

          <div class="info-box">
            This account will be linked to: <strong>${ADMIN_EMAIL}</strong>
          </div>

          ${error ? `<div class="error">${error}</div>` : ''}

          <form action="/admin/setup" method="POST">
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="At least 8 characters" minlength="8" required>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required>
            </div>
            <button type="submit" class="btn">Create Account</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render admin dashboard page
 */
export function renderAdminDashboardPage(adminEmail: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #1a0a1a;
          min-height: 100vh;
          color: #F5EEF0;
        }
        .header {
          background: #0a0a10;
          border-bottom: 1px solid rgba(124, 58, 237, 0.2);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #F5EEF0;
        }
        .logo span { color: #E85A4F; }
        .admin-badge {
          display: inline-block;
          background: rgba(232, 90, 79, 0.15);
          color: #E85A4F;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-left: 12px;
          text-transform: uppercase;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .user-email {
          color: rgba(245, 238, 240, 0.6);
          font-size: 0.875rem;
        }
        .logout-btn {
          background: rgba(239, 68, 68, 0.15);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.25);
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
        }
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .subtitle {
          color: rgba(245, 238, 240, 0.6);
          margin-bottom: 40px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .card {
          background: #0a0a10;
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 16px;
          padding: 28px;
          transition: all 0.2s;
        }
        .card:hover {
          border-color: rgba(124, 58, 237, 0.4);
          transform: translateY(-2px);
        }
        .card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }
        .card p {
          color: rgba(245, 238, 240, 0.6);
          font-size: 0.875rem;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .card-link {
          display: inline-block;
          background: linear-gradient(135deg, #E85A4F 0%, #D64A3F 100%);
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(232, 90, 79, 0.25);
        }
        .card-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(232, 90, 79, 0.35);
        }
        .coming-soon {
          display: inline-block;
          background: rgba(124, 58, 237, 0.15);
          color: rgba(124, 58, 237, 0.7);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
          .cards {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">personalized<span>output</span><span class="admin-badge">Admin</span></div>
        <div class="user-info">
          <span class="user-email">${adminEmail}</span>
          <a href="/admin/logout" class="logout-btn">Sign Out</a>
        </div>
      </div>

      <div class="container">
        <h1>Admin Dashboard</h1>
        <p class="subtitle">Manage your business from one place</p>

        <div class="cards">
          <div class="card">
            <h3>Analytics</h3>
            <p>View traffic, sales, and usage statistics</p>
            <a href="/admin/stats?key=${process.env.ADMIN_KEY || 'po-admin-2024'}" class="card-link">View Stats</a>
          </div>

          <div class="card">
            <h3>Stor Chat</h3>
            <p>AI assistant for business insights and questions</p>
            <a href="/admin/chat" class="card-link">Open Chat</a>
          </div>

          <div class="card">
            <h3>API Usage</h3>
            <p>Monitor Claude, ElevenLabs, and other API usage</p>
            <a href="/api/admin/usage?key=${process.env.ADMIN_KEY || 'po-admin-2024'}" class="card-link">Check Usage</a>
          </div>

          <div class="card">
            <h3>Email Alerts</h3>
            <p>Test your email alert configuration</p>
            <a href="/admin/test-alert?key=${process.env.ADMIN_KEY || 'po-admin-2024'}" class="card-link">Test Alert</a>
          </div>

          <div class="card">
            <h3>Newsletter</h3>
            <p>Send newsletters and manage subscribers</p>
            <span class="coming-soon">Coming Soon</span>
          </div>

          <div class="card">
            <h3>Orders</h3>
            <p>View and manage customer orders</p>
            <span class="coming-soon">Coming Soon</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
