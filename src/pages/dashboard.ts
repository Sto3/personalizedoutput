/**
 * User Dashboard Page
 *
 * Shows subscription status, usage, referrals, and order history.
 */

import { Profile, SUBSCRIPTION_TIERS, TierName } from '../lib/supabase/client';
import { getReferralStats } from '../lib/supabase/userService';

interface DashboardData {
  profile: Profile;
  referralStats: {
    totalReferrals: number;
    qualifiedReferrals: number;
    rewardsEarned: number;
    referralCode: string;
  };
}

export function renderDashboardPage(data: DashboardData | null, error?: string): string {
  const baseStyles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        min-height: 100vh;
        color: #fff;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
      }
      .logo {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fff;
        text-decoration: none;
      }
      .nav-links {
        display: flex;
        gap: 20px;
      }
      .nav-link {
        color: rgba(255,255,255,0.8);
        text-decoration: none;
        transition: color 0.2s;
      }
      .nav-link:hover { color: #fff; }
      .welcome {
        font-size: 2rem;
        margin-bottom: 10px;
      }
      .subtitle {
        color: rgba(255,255,255,0.7);
        margin-bottom: 40px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 40px;
      }
      .card {
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 24px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .card-title {
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255,255,255,0.6);
        margin-bottom: 8px;
      }
      .card-value {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .card-detail {
        color: rgba(255,255,255,0.7);
        font-size: 0.875rem;
      }
      .progress-bar {
        height: 8px;
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 12px;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #e94560, #ff6b6b);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      .subscription-card {
        background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
        grid-column: span 2;
      }
      .tier-badge {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(255,255,255,0.2);
        border-radius: 20px;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 16px;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
        cursor: pointer;
        border: none;
        font-size: 1rem;
      }
      .btn-primary {
        background: linear-gradient(135deg, #e94560, #ff6b6b);
        color: #fff;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
      }
      .btn-secondary {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .btn-secondary:hover {
        background: rgba(255,255,255,0.2);
      }
      .referral-section {
        margin-top: 40px;
      }
      .referral-code {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0,0,0,0.2);
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }
      .referral-code code {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #ff6b6b;
      }
      .copy-btn {
        padding: 8px 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
      }
      .copy-btn:hover {
        background: rgba(255,255,255,0.2);
      }
      .referral-link {
        word-break: break-all;
        color: rgba(255,255,255,0.6);
        font-size: 0.875rem;
        margin-top: 8px;
      }
      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .product-card {
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: transform 0.2s;
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .product-card:hover {
        transform: translateY(-4px);
        background: rgba(255,255,255,0.1);
      }
      .product-icon {
        font-size: 2rem;
        margin-bottom: 12px;
      }
      .product-name {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .product-desc {
        font-size: 0.75rem;
        color: rgba(255,255,255,0.6);
      }
      .error-card {
        background: rgba(233, 69, 96, 0.2);
        border: 1px solid #e94560;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
      }
      .login-prompt {
        text-align: center;
        padding: 60px 20px;
      }
      .login-prompt h2 {
        font-size: 2rem;
        margin-bottom: 16px;
      }
      .login-prompt p {
        color: rgba(255,255,255,0.7);
        margin-bottom: 24px;
      }
      @media (max-width: 768px) {
        .subscription-card { grid-column: span 1; }
        .header { flex-direction: column; gap: 16px; }
      }
    </style>
  `;

  // Not logged in state
  if (!data) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Personalized Output</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/" class="logo">Personalized Output</a>
            <div class="nav-links">
              <a href="/login" class="nav-link">Login</a>
              <a href="/auth/signup" class="nav-link">Sign Up</a>
            </div>
          </div>
          <div class="login-prompt">
            ${error ? `<div class="error-card" style="margin-bottom: 24px;">${error}</div>` : ''}
            <h2>Welcome to Your Dashboard</h2>
            <p>Sign in to view your subscription, track usage, and create personalized outputs.</p>
            <a href="/login" class="btn btn-primary" style="margin-right: 12px;">Login</a>
            <a href="/auth/signup" class="btn btn-secondary">Create Account</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  const { profile, referralStats } = data;
  const tier = profile.subscription_tier as TierName;
  const tierConfig = SUBSCRIPTION_TIERS[tier] || { name: 'Free', outputs: 0, price: 0 };
  const usagePercent = tierConfig.outputs > 0
    ? Math.min(100, (profile.monthly_outputs_used / tierConfig.outputs) * 100)
    : 0;

  const products = [
    { icon: '🎅', name: 'Santa Message', href: '/santa', desc: 'Personalized audio' },
    { icon: '🎯', name: 'Vision Board', href: '/vision-board', desc: 'Goal visualization' },
    { icon: '🎄', name: 'Holiday Reset', href: '/holiday-reset', desc: 'Relationship planner' },
    { icon: '✨', name: 'New Year Reset', href: '/new-year-reset', desc: 'Reflection planner' },
    { icon: '💡', name: 'Clarity Planner', href: '/clarity-planner', desc: 'Life direction guide' },
    { icon: '📚', name: 'Flash Cards', href: '/flash-cards', desc: 'Learning for kids' },
  ];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="/" class="logo">Personalized Output</a>
          <div class="nav-links">
            <a href="/dashboard" class="nav-link">Dashboard</a>
            <a href="/api/auth/logout" class="nav-link">Logout</a>
          </div>
        </div>

        <h1 class="welcome">Welcome back${profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!</h1>
        <p class="subtitle">Manage your subscription and create personalized outputs</p>

        <div class="grid">
          <!-- Subscription Card -->
          <div class="card subscription-card">
            <span class="tier-badge">${tierConfig.name} Plan</span>
            <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Your Subscription</h3>
            ${profile.subscription_status === 'active' ? `
              <p style="margin-bottom: 16px;">
                <strong>${tierConfig.outputs}</strong> outputs per month at <strong>$${tierConfig.price}</strong>/month
              </p>
              <a href="/api/stripe/portal" class="btn btn-secondary">Manage Subscription</a>
            ` : `
              <p style="margin-bottom: 16px;">
                Upgrade to start creating personalized outputs for yourself and your loved ones.
              </p>
              <a href="/pricing" class="btn btn-primary">View Plans</a>
            `}
          </div>

          <!-- Usage Card -->
          <div class="card">
            <p class="card-title">Monthly Usage</p>
            <p class="card-value">${profile.monthly_outputs_used} / ${tierConfig.outputs || '∞'}</p>
            <p class="card-detail">
              ${profile.monthly_outputs_used < (tierConfig.outputs || 0)
                ? `${tierConfig.outputs - profile.monthly_outputs_used} outputs remaining`
                : profile.subscription_status === 'active'
                  ? 'Usage limit reached'
                  : 'Subscribe to start creating'}
            </p>
            ${tierConfig.outputs > 0 ? `
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${usagePercent}%"></div>
              </div>
            ` : ''}
          </div>

          <!-- Referrals Card -->
          <div class="card">
            <p class="card-title">Referrals</p>
            <p class="card-value">${referralStats.qualifiedReferrals} / 3</p>
            <p class="card-detail">
              ${3 - referralStats.qualifiedReferrals > 0
                ? `${3 - referralStats.qualifiedReferrals} more for a free month!`
                : 'Free month earned!'}
            </p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(referralStats.qualifiedReferrals % 3) / 3 * 100}%"></div>
            </div>
          </div>

          <!-- Free Months Earned -->
          <div class="card">
            <p class="card-title">Rewards Earned</p>
            <p class="card-value">${referralStats.rewardsEarned}</p>
            <p class="card-detail">Free months from referrals</p>
          </div>
        </div>

        <!-- Referral Section -->
        <div class="referral-section">
          <div class="card">
            <h3 style="margin-bottom: 8px;">Share & Earn Free Months</h3>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 16px;">
              Refer 3 friends who subscribe and get 1 month free! No limit on rewards.
            </p>
            <div class="referral-code">
              <span>Your code:</span>
              <code id="referralCode">${referralStats.referralCode}</code>
              <button class="copy-btn" onclick="copyCode()">Copy</button>
            </div>
            <p class="referral-link">
              Share link: https://personalizedoutput.com/auth/signup?ref=${referralStats.referralCode}
            </p>
          </div>
        </div>

        <!-- Products Section -->
        <div style="margin-top: 40px;">
          <h3 style="margin-bottom: 8px;">Create Something Special</h3>
          <p style="color: rgba(255,255,255,0.7);">
            ${profile.subscription_status === 'active'
              ? 'Choose a product below to create your next personalized output.'
              : 'Subscribe to unlock all products below.'}
          </p>
          <div class="products-grid">
            ${products.map(p => `
              <a href="${p.href}" class="product-card">
                <div class="product-icon">${p.icon}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
              </a>
            `).join('')}
          </div>
        </div>
      </div>

      <script>
        function copyCode() {
          const code = document.getElementById('referralCode').textContent;
          navigator.clipboard.writeText(code).then(() => {
            const btn = document.querySelector('.copy-btn');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
          });
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Render the pricing page
 */
export function renderPricingPage(currentTier?: TierName): string {
  const tiers = [
    {
      key: 'starter',
      name: 'Starter',
      price: 25,
      outputs: 2,
      features: [
        '2 personalized outputs per month',
        'All product types included',
        'PDF & audio downloads',
        'Email support',
      ],
      cta: 'Start Creating',
      popular: false,
    },
    {
      key: 'regular',
      name: 'Regular',
      price: 39,
      outputs: 4,
      features: [
        '4 personalized outputs per month',
        'All product types included',
        'PDF & audio downloads',
        'Priority support',
        'Perfect for monthly gifting',
      ],
      cta: 'Best Value',
      popular: true,
    },
    {
      key: 'power',
      name: 'Power User',
      price: 59,
      outputs: 8,
      features: [
        '8 personalized outputs per month',
        'All product types included',
        'PDF & audio downloads',
        'Priority support',
        'Great for families & teachers',
        'Commercial use rights',
      ],
      cta: 'Go Power',
      popular: false,
    },
  ];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pricing - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          min-height: 100vh;
          color: #fff;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 60px 20px; }
        .header {
          text-align: center;
          margin-bottom: 60px;
        }
        .header h1 {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .header p {
          color: rgba(255,255,255,0.7);
          font-size: 1.125rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 60px;
        }
        .pricing-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          transition: transform 0.2s;
        }
        .pricing-card:hover {
          transform: translateY(-8px);
        }
        .pricing-card.popular {
          border-color: #e94560;
          background: rgba(233, 69, 96, 0.1);
        }
        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          padding: 6px 20px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .tier-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .tier-price {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .tier-price span {
          font-size: 1rem;
          font-weight: 400;
          color: rgba(255,255,255,0.6);
        }
        .tier-outputs {
          color: rgba(255,255,255,0.7);
          margin-bottom: 24px;
        }
        .tier-features {
          list-style: none;
          margin-bottom: 32px;
        }
        .tier-features li {
          padding: 8px 0;
          color: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tier-features li::before {
          content: '✓';
          color: #4ade80;
          font-weight: bold;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 16px;
          border-radius: 10px;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: #fff;
        }
        .btn-primary:hover {
          box-shadow: 0 4px 16px rgba(233, 69, 96, 0.4);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.2);
        }
        .current-plan {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
          cursor: default;
        }
        .guarantee {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
        }
        .guarantee h3 { margin-bottom: 12px; }
        .guarantee p { color: rgba(255,255,255,0.7); }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 40px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
        }
        .back-link:hover { color: #fff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Choose Your Plan</h1>
          <p>Create deeply personalized gifts, planners, and learning materials for the people you love.</p>
        </div>

        <div class="pricing-grid">
          ${tiers.map(tier => `
            <div class="pricing-card ${tier.popular ? 'popular' : ''}">
              ${tier.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
              <div class="tier-name">${tier.name}</div>
              <div class="tier-price">$${tier.price}<span>/month</span></div>
              <div class="tier-outputs">${tier.outputs} personalized outputs</div>
              <ul class="tier-features">
                ${tier.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
              ${currentTier === tier.key
                ? `<div class="btn current-plan">Current Plan</div>`
                : `<a href="/api/stripe/checkout?tier=${tier.key}" class="btn ${tier.popular ? 'btn-primary' : 'btn-secondary'}">${tier.cta}</a>`
              }
            </div>
          `).join('')}
        </div>

        <div class="guarantee">
          <h3>30-Day Money-Back Guarantee</h3>
          <p>Try any plan risk-free. If you're not completely satisfied, we'll refund your first month.</p>
        </div>

        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
      </div>
    </body>
    </html>
  `;
}
