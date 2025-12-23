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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #1a0a1a 0%, #2d1a2d 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .container { width: 100%; max-width: 400px; padding: 20px; }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 40px;
        }
        h1 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          text-align: center;
        }
        .subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 0.875rem;
          text-align: center;
          margin-bottom: 32px;
        }
        .form-group { margin-bottom: 20px; }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.8);
        }
        input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: #fff;
          font-size: 1rem;
        }
        input:focus {
          outline: none;
          border-color: #7C3AED;
        }
        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: #7C3AED;
          color: #fff;
        }
        .btn:hover { background: #6D28D9; }
        .error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #EF4444;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
        }
        .admin-badge {
          display: inline-block;
          background: rgba(124, 58, 237, 0.2);
          color: #A78BFA;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div style="text-align: center;">
            <span class="admin-badge">ADMIN ACCESS</span>
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #1a0a1a 0%, #2d1a2d 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .container { width: 100%; max-width: 400px; padding: 20px; }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 40px;
        }
        h1 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          text-align: center;
        }
        .subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 0.875rem;
          text-align: center;
          margin-bottom: 32px;
        }
        .form-group { margin-bottom: 20px; }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.8);
        }
        input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          color: #fff;
          font-size: 1rem;
        }
        input:focus {
          outline: none;
          border-color: #7C3AED;
        }
        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: #7C3AED;
          color: #fff;
        }
        .btn:hover { background: #6D28D9; }
        .error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #EF4444;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
        }
        .setup-badge {
          display: inline-block;
          background: rgba(34, 197, 94, 0.2);
          color: #4ADE80;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .info-box {
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.8);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div style="text-align: center;">
            <span class="setup-badge">FIRST-TIME SETUP</span>
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0f0f0f;
          min-height: 100vh;
          color: #fff;
        }
        .header {
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .logo span { color: #7C3AED; }
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .user-email {
          color: rgba(255,255,255,0.6);
          font-size: 0.875rem;
        }
        .logout-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
        }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.3); }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }
        h1 {
          font-size: 1.75rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: rgba(255,255,255,0.6);
          margin-bottom: 32px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 24px;
        }
        .card h3 {
          font-size: 1rem;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card p {
          color: rgba(255,255,255,0.6);
          font-size: 0.875rem;
          margin-bottom: 16px;
        }
        .card-link {
          display: inline-block;
          background: #7C3AED;
          color: #fff;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .card-link:hover { background: #6D28D9; }
        .coming-soon {
          display: inline-block;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Personalized<span>Output</span> Admin</div>
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
