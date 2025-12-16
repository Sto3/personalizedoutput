/**
 * Authentication Pages
 *
 * Login, Signup, and Password Reset pages.
 */

export function renderLoginPage(error?: string, returnUrl?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --coral: #E85A6B;
          --coral-light: #F08B96;
          --purple: #7C3AED;
          --purple-light: #A78BFA;
          --navy: #1a1a2e;
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, var(--purple) 0%, #5B21B6 50%, var(--navy) 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .container {
          width: 100%;
          max-width: 420px;
          padding: 20px;
        }
        .card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo {
          text-align: center;
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .tagline {
          text-align: center;
          color: rgba(255,255,255,0.7);
          margin-bottom: 36px;
          font-size: 0.875rem;
        }
        h1 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          text-align: center;
          margin-bottom: 28px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.85);
        }
        input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          color: #fff;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        input:focus {
          outline: none;
          border-color: var(--coral);
          box-shadow: 0 0 0 3px rgba(232, 90, 107, 0.2);
        }
        input::placeholder {
          color: rgba(255,255,255,0.4);
        }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-primary {
          background: var(--coral);
          color: #fff;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
        }
        .btn-primary:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }
        .error {
          background: rgba(232, 90, 107, 0.2);
          border: 1px solid var(--coral);
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
        }
        .links {
          text-align: center;
          margin-top: 24px;
        }
        .links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .links a:hover {
          color: #fff;
        }
        .divider {
          color: rgba(255,255,255,0.3);
          margin: 0 12px;
        }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 24px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .back-link:hover { color: #fff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">Personalized Output</div>
          <div class="tagline">Create deeply personal gifts & planners</div>

          <h1>Welcome Back</h1>

          ${error ? `<div class="error">${error}</div>` : ''}

          <form action="/api/auth/login" method="POST">
            ${returnUrl ? `<input type="hidden" name="returnUrl" value="${returnUrl}">` : ''}

            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="you@example.com" required>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn btn-primary">Sign In</button>
          </form>

          <div class="links">
            <a href="/signup">Create account</a>
            <span class="divider">|</span>
            <a href="/forgot-password">Forgot password?</a>
          </div>
        </div>

        <a href="/" class="back-link">← Back to home</a>
      </div>
    </body>
    </html>
  `;
}

export function renderSignupPage(error?: string, referralCode?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Create Account - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --coral: #E85A6B;
          --coral-light: #F08B96;
          --purple: #7C3AED;
          --purple-light: #A78BFA;
          --navy: #1a1a2e;
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, var(--purple) 0%, #5B21B6 50%, var(--navy) 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          padding: 40px 0;
        }
        .container {
          width: 100%;
          max-width: 420px;
          padding: 20px;
        }
        .card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo {
          text-align: center;
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .tagline {
          text-align: center;
          color: rgba(255,255,255,0.7);
          margin-bottom: 36px;
          font-size: 0.875rem;
        }
        h1 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          text-align: center;
          margin-bottom: 28px;
        }
        .referral-badge {
          background: linear-gradient(135deg, var(--coral), var(--coral-light));
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 24px;
          font-size: 0.875rem;
          box-shadow: 0 4px 15px rgba(232, 90, 107, 0.3);
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.85);
        }
        input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          color: #fff;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        input:focus {
          outline: none;
          border-color: var(--coral);
          box-shadow: 0 0 0 3px rgba(232, 90, 107, 0.2);
        }
        input::placeholder {
          color: rgba(255,255,255,0.4);
        }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-primary {
          background: var(--coral);
          color: #fff;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
        }
        .btn-primary:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }
        .error {
          background: rgba(232, 90, 107, 0.2);
          border: 1px solid var(--coral);
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
        }
        .links {
          text-align: center;
          margin-top: 24px;
        }
        .links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .links a:hover {
          color: #fff;
        }
        .terms {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          text-align: center;
          margin-top: 16px;
        }
        .terms a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
        }
        .terms a:hover {
          text-decoration: underline;
        }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 24px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .back-link:hover { color: #fff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">Personalized Output</div>
          <div class="tagline">Create deeply personal gifts & planners</div>

          <h1>Create Your Account</h1>

          ${referralCode ? `
            <div class="referral-badge">
              You were referred by a friend! You'll both get rewards.
            </div>
          ` : ''}

          ${error ? `<div class="error">${error}</div>` : ''}

          <form action="/api/auth/signup" method="POST">
            ${referralCode ? `<input type="hidden" name="referralCode" value="${referralCode}">` : ''}

            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" placeholder="Jane Doe" required>
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="you@example.com" required>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="At least 8 characters" minlength="8" required>
            </div>

            <button type="submit" class="btn btn-primary">Create Account</button>

            <p class="terms">
              By creating an account, you agree to our
              <a href="/terms">Terms of Service</a> and
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </form>

          <div class="links">
            <a href="/login">Already have an account? Sign in</a>
          </div>
        </div>

        <a href="/" class="back-link">← Back to home</a>
      </div>
    </body>
    </html>
  `;
}

export function renderForgotPasswordPage(error?: string, success?: boolean): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --coral: #E85A6B;
          --coral-light: #F08B96;
          --purple: #7C3AED;
          --purple-light: #A78BFA;
          --navy: #1a1a2e;
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, var(--purple) 0%, #5B21B6 50%, var(--navy) 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .container {
          width: 100%;
          max-width: 420px;
          padding: 20px;
        }
        .card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo {
          text-align: center;
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .tagline {
          text-align: center;
          color: rgba(255,255,255,0.7);
          margin-bottom: 36px;
          font-size: 0.875rem;
        }
        h1 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.75rem;
          font-weight: 500;
          text-align: center;
          margin-bottom: 12px;
        }
        .subtitle {
          text-align: center;
          color: rgba(255,255,255,0.7);
          margin-bottom: 28px;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.85);
        }
        input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          color: #fff;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        input:focus {
          outline: none;
          border-color: var(--coral);
          box-shadow: 0 0 0 3px rgba(232, 90, 107, 0.2);
        }
        input::placeholder {
          color: rgba(255,255,255,0.4);
        }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          background: var(--coral);
          color: #fff;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
        }
        .btn:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }
        .error {
          background: rgba(232, 90, 107, 0.2);
          border: 1px solid var(--coral);
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          text-align: center;
        }
        .success {
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid #4ade80;
          padding: 24px;
          border-radius: 16px;
          text-align: center;
        }
        .success h3 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.25rem;
          font-weight: 500;
          margin-bottom: 10px;
          color: #4ade80;
        }
        .success p {
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
        }
        .links {
          text-align: center;
          margin-top: 24px;
        }
        .links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .links a:hover { color: #fff; }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 24px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .back-link:hover { color: #fff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">Personalized Output</div>
          <div class="tagline">Create deeply personal gifts & planners</div>

          ${success ? `
            <div class="success">
              <h3>Check your email</h3>
              <p>We've sent you a link to reset your password.</p>
            </div>
          ` : `
            <h1>Reset Password</h1>
            <p class="subtitle">Enter your email and we'll send you a reset link.</p>

            ${error ? `<div class="error">${error}</div>` : ''}

            <form action="/api/auth/forgot-password" method="POST">
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@example.com" required>
              </div>

              <button type="submit" class="btn">Send Reset Link</button>
            </form>
          `}

          <div class="links">
            <a href="/login">← Back to login</a>
          </div>
        </div>

        <a href="/" class="back-link">← Back to home</a>
      </div>
    </body>
    </html>
  `;
}
