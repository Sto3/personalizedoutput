/**
 * Referral Dashboard Page
 * Shows user's referral code, stats, and rewards
 */

export interface ReferralStats {
  code: string;
  referralCount: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  pendingRewards: number;
  referrals: Array<{
    email: string;
    status: string;
    date: string;
  }>;
}

export function renderReferralDashboard(stats: ReferralStats, userName: string = 'Friend'): string {
  const progressToNextReward = stats.referralCount % 3;
  const referralsNeeded = 3 - progressToNextReward;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Referral Program - Personalized Output</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #e94560;
      --primary-dark: #d63353;
      --secondary: #1a1a2e;
      --accent: #f8b500;
      --bronze: #cd7f32;
      --success: #10b981;
      --text: #ffffff;
      --text-muted: rgba(255, 255, 255, 0.7);
      --glass: rgba(255, 255, 255, 0.1);
      --glass-border: rgba(255, 255, 255, 0.2);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .card {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(20px);
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .referral-code-box {
      background: linear-gradient(135deg, var(--primary) 0%, var(--bronze) 100%);
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .referral-code {
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: 4px;
      margin-bottom: 1rem;
    }

    .referral-link {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.9);
      word-break: break-all;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .copy-btn {
      background: white;
      color: var(--secondary);
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 25px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .copy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .copy-btn.copied {
      background: var(--success);
      color: white;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat-box {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .progress-section {
      margin-top: 1.5rem;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .progress-bar {
      height: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    .reward-banner {
      background: linear-gradient(135deg, var(--success), #059669);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      margin-top: 1.5rem;
    }

    .reward-banner h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .reward-banner p {
      opacity: 0.9;
    }

    .claim-btn {
      background: white;
      color: var(--success);
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 25px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
      transition: transform 0.2s;
    }

    .claim-btn:hover {
      transform: translateY(-2px);
    }

    .referral-list {
      list-style: none;
    }

    .referral-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--glass-border);
    }

    .referral-item:last-child {
      border-bottom: none;
    }

    .referral-email {
      color: var(--text-muted);
    }

    .referral-status {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-converted {
      background: var(--success);
    }

    .status-pending {
      background: var(--accent);
      color: var(--secondary);
    }

    .how-it-works {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .step {
      text-align: center;
    }

    .step-number {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary), var(--bronze));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      margin: 0 auto 1rem;
    }

    .step h4 {
      margin-bottom: 0.5rem;
    }

    .step p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .share-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }

    .share-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.2s, opacity 0.2s;
    }

    .share-btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }

    .share-twitter {
      background: #1da1f2;
      color: white;
    }

    .share-facebook {
      background: #1877f2;
      color: white;
    }

    .share-email {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      color: white;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
      text-decoration: none;
      margin-bottom: 2rem;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--text);
    }

    @media (max-width: 600px) {
      body {
        padding: 1rem;
      }

      .header h1 {
        font-size: 1.75rem;
      }

      .referral-code {
        font-size: 1.75rem;
      }

      .stat-number {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/dashboard" class="back-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back to Dashboard
    </a>

    <div class="header">
      <h1>Referral Program</h1>
      <p>Refer 3 friends, get 1 month FREE!</p>
    </div>

    <!-- Referral Code Card -->
    <div class="card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Your Referral Code
      </h2>
      <div class="referral-code-box">
        <div class="referral-code">${stats.code || 'LOADING...'}</div>
        <div class="referral-link" id="referralLink">
          https://personalizedoutput.com/signup?ref=${stats.code}
        </div>
        <button class="copy-btn" onclick="copyLink()">Copy Link</button>
      </div>

      <div class="share-buttons">
        <a href="https://twitter.com/intent/tweet?text=Check%20out%20Personalized%20Output%21%20Use%20my%20code%20${stats.code}%20for%20exclusive%20rewards%3A%20https%3A%2F%2Fpersonalizedoutput.com%2Fsignup%3Fref%3D${stats.code}" target="_blank" class="share-btn share-twitter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
          </svg>
          Share on X
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fpersonalizedoutput.com%2Fsignup%3Fref%3D${stats.code}" target="_blank" class="share-btn share-facebook">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
          </svg>
          Share on Facebook
        </a>
        <a href="mailto:?subject=Check%20out%20Personalized%20Output&body=I've%20been%20using%20Personalized%20Output%20and%20thought%20you'd%20love%20it!%20Use%20my%20referral%20code%20${stats.code}%20when%20you%20sign%20up%3A%20https%3A%2F%2Fpersonalizedoutput.com%2Fsignup%3Fref%3D${stats.code}" class="share-btn share-email">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </a>
      </div>
    </div>

    <!-- Stats Card -->
    <div class="card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="20" x2="12" y2="10"/>
          <line x1="18" y1="20" x2="18" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="16"/>
        </svg>
        Your Stats
      </h2>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-number">${stats.referralCount}</div>
          <div class="stat-label">Friends Referred</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${stats.rewardsEarned}</div>
          <div class="stat-label">Free Months Earned</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${stats.pendingRewards}</div>
          <div class="stat-label">Available to Claim</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-label">
          <span>Progress to next free month</span>
          <span>${progressToNextReward}/3 referrals</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(progressToNextReward / 3) * 100}%"></div>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
          ${referralsNeeded} more referral${referralsNeeded !== 1 ? 's' : ''} until your next free month!
        </p>
      </div>

      ${stats.pendingRewards > 0 ? `
      <div class="reward-banner">
        <h3>You have ${stats.pendingRewards} free month${stats.pendingRewards !== 1 ? 's' : ''} to claim!</h3>
        <p>Your next billing will be automatically skipped.</p>
        <button class="claim-btn" onclick="claimReward()">Claim Free Month</button>
      </div>
      ` : ''}
    </div>

    <!-- How it Works -->
    <div class="card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        How It Works
      </h2>
      <div class="how-it-works">
        <div class="step">
          <div class="step-number">1</div>
          <h4>Share Your Link</h4>
          <p>Send your unique referral link to friends and family</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h4>They Subscribe</h4>
          <p>When they sign up for a paid subscription, you get credit</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h4>Get Rewarded</h4>
          <p>For every 3 referrals, you earn 1 month FREE!</p>
        </div>
      </div>
    </div>

    <!-- Referral History -->
    ${stats.referrals.length > 0 ? `
    <div class="card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Referral History
      </h2>
      <ul class="referral-list">
        ${stats.referrals.map(r => `
        <li class="referral-item">
          <div>
            <div class="referral-email">${r.email}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${r.date}</div>
          </div>
          <span class="referral-status status-${r.status}">${r.status}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  <script>
    function copyLink() {
      const link = document.getElementById('referralLink').textContent;
      navigator.clipboard.writeText(link).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy Link';
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    function claimReward() {
      // API call to claim reward
      fetch('/api/referral/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Congratulations! Your free month has been applied!');
          location.reload();
        } else {
          alert('Error claiming reward: ' + data.message);
        }
      })
      .catch(err => {
        alert('Error: ' + err.message);
      });
    }
  </script>
</body>
</html>`;
}

// Export for empty state (no code yet)
export function renderReferralSignup(): string {
  return renderReferralDashboard({
    code: 'GENERATING...',
    referralCount: 0,
    rewardsEarned: 0,
    rewardsRedeemed: 0,
    pendingRewards: 0,
    referrals: []
  }, 'New User');
}
