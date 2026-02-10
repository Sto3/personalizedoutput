/**
 * Redi Landing Page
 * ==================
 * Serves the landing page for redialways.com/redi
 */

import { Router, Request, Response } from 'express';

const router = Router();

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redi — Ready for Anything</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #00d4aa, #0088cc);
      border-radius: 20px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      font-weight: 700;
      color: white;
    }
    h1 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #00d4aa, #0088cc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      font-size: 20px;
      color: #888;
      margin-bottom: 32px;
    }
    .description {
      font-size: 16px;
      line-height: 1.6;
      color: #aaa;
      margin-bottom: 40px;
    }
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 40px;
    }
    .feature {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
    }
    .feature-title {
      font-size: 14px;
      font-weight: 600;
      color: #00d4aa;
      margin-bottom: 4px;
    }
    .feature-desc {
      font-size: 12px;
      color: #888;
    }
    .cta {
      display: inline-block;
      background: linear-gradient(135deg, #00d4aa, #0088cc);
      color: white;
      padding: 16px 48px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 16px;
      transition: transform 0.2s;
    }
    .cta:hover { transform: scale(1.05); }
    .waitlist {
      margin-top: 32px;
    }
    .waitlist-form {
      display: flex;
      gap: 8px;
      max-width: 360px;
      margin: 0 auto;
    }
    .waitlist-form input {
      flex: 1;
      padding: 12px 16px;
      border-radius: 50px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
      color: white;
      font-size: 14px;
      outline: none;
    }
    .waitlist-form input::placeholder { color: #666; }
    .waitlist-form button {
      padding: 12px 24px;
      border-radius: 50px;
      border: none;
      background: #00d4aa;
      color: #0a0a0f;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }
    .waitlist-form button:hover { background: #00e8bb; }
    .subtitle {
      font-size: 13px;
      color: #666;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">R</div>
    <h1>Redi</h1>
    <p class="tagline">Ready for Anything</p>
    <p class="description">
      Your AI companion that sees, hears, and acts. Real-time vision, voice conversations,
      phone calls on your behalf, smart home control, and a memory that grows with you.
    </p>
    <div class="features">
      <div class="feature">
        <div class="feature-title">See & Hear</div>
        <div class="feature-desc">Real-time vision and voice AI</div>
      </div>
      <div class="feature">
        <div class="feature-title">Remember</div>
        <div class="feature-desc">5-layer memory that grows</div>
      </div>
      <div class="feature">
        <div class="feature-title">Call & Text</div>
        <div class="feature-desc">Makes calls on your behalf</div>
      </div>
      <div class="feature">
        <div class="feature-title">Reach Out</div>
        <div class="feature-desc">Proactively checks in on you</div>
      </div>
    </div>
    <a href="#waitlist" class="cta">Join the Waitlist</a>
    <div class="waitlist" id="waitlist">
      <form class="waitlist-form" onsubmit="handleWaitlist(event)">
        <input type="email" placeholder="your@email.com" required id="waitlist-email" />
        <button type="submit">Join</button>
      </form>
      <p class="subtitle">Be first to know when Redi launches.</p>
      <p class="subtitle" id="waitlist-msg" style="color: #00d4aa; display: none;"></p>
    </div>
  </div>
  <script>
    function handleWaitlist(e) {
      e.preventDefault();
      var email = document.getElementById('waitlist-email').value;
      var msg = document.getElementById('waitlist-msg');
      msg.textContent = "You're on the list! We'll be in touch.";
      msg.style.display = 'block';
      document.getElementById('waitlist-email').value = '';
      // Could POST to /api/waitlist here
    }
  </script>
</body>
</html>`;

router.get('/', (req: Request, res: Response) => {
  res.type('html').send(LANDING_HTML);
});

export default router;
