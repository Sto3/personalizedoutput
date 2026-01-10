/**
 * Redi Landing Page
 *
 * Marketing and purchase page for the Redi AI presence app.
 */

import { Request, Response } from 'express';

export function renderRediLandingPage(req: Request, res: Response): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redi - Your Present Partner | AI That's Always With You</title>
  <meta name="description" content="Redi is an AI presence that sees what you see, hears what you hear, and speaks when it has something valuable to add. No prompting required.">

  <!-- Open Graph -->
  <meta property="og:title" content="Redi - Present. Active. Always Ready.">
  <meta property="og:description" content="The AI presence that's always with you - for studying, meetings, sports, music, and more.">
  <meta property="og:type" content="website">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
      color: #ffffff;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    header {
      padding: 40px 0;
      text-align: center;
    }

    .logo {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }

    .tagline {
      font-size: 1.4rem;
      color: #a0a0a0;
      font-weight: 300;
      letter-spacing: 2px;
    }

    /* Hero */
    .hero {
      text-align: center;
      padding: 60px 20px;
    }

    .hero h1 {
      font-size: 3rem;
      line-height: 1.2;
      margin-bottom: 20px;
    }

    .hero h1 span {
      background: linear-gradient(135deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 1.25rem;
      color: #b0b0b0;
      max-width: 700px;
      margin: 0 auto 40px;
      line-height: 1.6;
    }

    /* Features */
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      padding: 60px 0;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 30px;
      transition: transform 0.3s, border-color 0.3s;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 15px;
    }

    .feature-card h3 {
      font-size: 1.3rem;
      margin-bottom: 10px;
    }

    .feature-card p {
      color: #a0a0a0;
      line-height: 1.6;
    }

    /* How it works */
    .how-it-works {
      padding: 60px 0;
      text-align: center;
    }

    .how-it-works h2 {
      font-size: 2.5rem;
      margin-bottom: 50px;
    }

    .steps {
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
    }

    .step {
      max-width: 280px;
      text-align: center;
    }

    .step-number {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00d4ff, #7b2cbf);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0 auto 20px;
    }

    .step h4 {
      font-size: 1.2rem;
      margin-bottom: 10px;
    }

    .step p {
      color: #a0a0a0;
      font-size: 0.95rem;
    }

    /* Use Cases */
    .use-cases {
      padding: 60px 0;
    }

    .use-cases h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 50px;
    }

    .use-case-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .use-case {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 25px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .use-case-icon {
      font-size: 1.8rem;
      flex-shrink: 0;
    }

    .use-case h4 {
      font-size: 1.1rem;
      margin-bottom: 5px;
    }

    .use-case p {
      color: #a0a0a0;
      font-size: 0.9rem;
    }

    /* Pricing */
    .pricing {
      padding: 80px 0;
      text-align: center;
    }

    .pricing h2 {
      font-size: 2.5rem;
      margin-bottom: 20px;
    }

    .pricing > p {
      color: #a0a0a0;
      margin-bottom: 50px;
      font-size: 1.1rem;
    }

    .pricing-cards {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
    }

    .pricing-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 40px;
      width: 320px;
      transition: transform 0.3s, border-color 0.3s;
    }

    .pricing-card:hover {
      transform: translateY(-5px);
    }

    .pricing-card.featured {
      border-color: #00d4ff;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(123, 44, 191, 0.1));
    }

    .pricing-card h3 {
      font-size: 1.3rem;
      margin-bottom: 20px;
    }

    .price {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .price span {
      font-size: 1rem;
      font-weight: 400;
      color: #a0a0a0;
    }

    .pricing-card ul {
      list-style: none;
      margin: 30px 0;
      text-align: left;
    }

    .pricing-card li {
      padding: 10px 0;
      color: #c0c0c0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pricing-card li::before {
      content: '✓';
      color: #00d4ff;
      font-weight: bold;
    }

    .buy-button {
      display: block;
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #00d4ff, #7b2cbf);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.3s, transform 0.3s;
    }

    .buy-button:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }

    /* Sensitivity Demo */
    .sensitivity-demo {
      padding: 60px 0;
      text-align: center;
    }

    .sensitivity-demo h2 {
      font-size: 2rem;
      margin-bottom: 30px;
    }

    .slider-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 30px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      color: #a0a0a0;
    }

    .sensitivity-slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, #2d2d2d, #00d4ff, #7b2cbf);
      -webkit-appearance: none;
      appearance: none;
    }

    .sensitivity-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .slider-description {
      margin-top: 20px;
      color: #b0b0b0;
      font-size: 0.95rem;
    }

    /* iOS Badge */
    .ios-badge {
      text-align: center;
      padding: 40px 0;
    }

    .coming-soon-badge {
      display: inline-block;
      padding: 15px 30px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 30px;
      font-size: 1.1rem;
    }

    .coming-soon-badge span {
      color: #00d4ff;
    }

    /* Footer */
    footer {
      padding: 40px 0;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 60px;
    }

    footer p {
      color: #606060;
      font-size: 0.9rem;
    }

    footer a {
      color: #00d4ff;
      text-decoration: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2rem;
      }

      .logo {
        font-size: 2.5rem;
      }

      .pricing-cards {
        flex-direction: column;
        align-items: center;
      }

      .steps {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">Redi</div>
      <div class="tagline">PRESENT. ACTIVE. ALWAYS READY.</div>
    </header>

    <section class="hero">
      <h1>The AI that's <span>always with you</span></h1>
      <p>Redi sees what you see, hears what you hear, and speaks when it has something valuable to add. No prompting required. Just presence.</p>
    </section>

    <section class="features">
      <div class="feature-card">
        <div class="feature-icon">👁️</div>
        <h3>Visual Awareness</h3>
        <p>Point your phone at your work, and Redi understands the context - whether it's a whiteboard, textbook, or your golf swing.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">👂</div>
        <h3>Always Listening</h3>
        <p>Redi hears your conversation and understands when you're stuck, confused, or could use a helpful insight.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎤</div>
        <h3>Natural Voice</h3>
        <p>When Redi speaks, it sounds like a knowledgeable friend - natural, conversational, and to the point.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Instant Response</h3>
        <p>Under 2 seconds from observation to insight. Fast enough to feel like real conversation.</p>
      </div>
    </section>

    <section class="how-it-works">
      <h2>How It Works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h4>Position Your Phone</h4>
          <p>Point your camera at what you're working on. Redi needs to see what you see.</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h4>Just Do Your Thing</h4>
          <p>Study, practice, build, meet - whatever you're doing. Redi observes and listens.</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h4>Get Insights</h4>
          <p>Redi speaks up when it notices something valuable - a mistake, a shortcut, an explanation.</p>
        </div>
      </div>
    </section>

    <section class="use-cases">
      <h2>What Can You Use Redi For?</h2>
      <div class="use-case-grid">
        <div class="use-case">
          <div class="use-case-icon">📚</div>
          <div>
            <h4>Studying & Learning</h4>
            <p>Get explanations, shortcuts, and quizzes while you study</p>
          </div>
        </div>
        <div class="use-case">
          <div class="use-case-icon">💼</div>
          <div>
            <h4>Meetings & Presentations</h4>
            <p>Contextual data, fact-checking, and strategic suggestions</p>
          </div>
        </div>
        <div class="use-case">
          <div class="use-case-icon">⚽</div>
          <div>
            <h4>Sports & Movement</h4>
            <p>Real-time form feedback and technique corrections</p>
          </div>
        </div>
        <div class="use-case">
          <div class="use-case-icon">🎸</div>
          <div>
            <h4>Music & Instruments</h4>
            <p>Hand positioning, rhythm, and technique coaching</p>
          </div>
        </div>
        <div class="use-case">
          <div class="use-case-icon">🔧</div>
          <div>
            <h4>Building & Assembly</h4>
            <p>Step guidance, mistake catching, and troubleshooting</p>
          </div>
        </div>
        <div class="use-case">
          <div class="use-case-icon">👶</div>
          <div>
            <h4>Watching Over</h4>
            <p>Intelligent monitoring for babies, elders, or pets</p>
          </div>
        </div>
      </div>
    </section>

    <section class="sensitivity-demo">
      <h2>You Control How Active Redi Is</h2>
      <div class="slider-container">
        <div class="slider-labels">
          <span>🔇 Passive</span>
          <span>🎤 Active</span>
        </div>
        <input type="range" class="sensitivity-slider" min="0" max="100" value="50" id="sensitivitySlider">
        <p class="slider-description" id="sensitivityDesc">
          Balanced: Redi speaks during natural pauses when it has something helpful to add.
        </p>
      </div>
    </section>

    <section class="pricing">
      <h2>Simple Session Pricing</h2>
      <p>No subscriptions. Just pay when you need Redi.</p>
      <div class="pricing-cards">
        <div class="pricing-card">
          <h3>Quick Session</h3>
          <div class="price">$26 <span>/ 30 min</span></div>
          <ul>
            <li>Full AI presence</li>
            <li>All use case modes</li>
            <li>Voice selection</li>
            <li>Sensitivity control</li>
          </ul>
          <button class="buy-button" onclick="startCheckout(30)">Start 30 Min Session</button>
        </div>
        <div class="pricing-card featured">
          <h3>Full Session</h3>
          <div class="price">$49 <span>/ 60 min</span></div>
          <ul>
            <li>Everything in Quick</li>
            <li>Longer deep work</li>
            <li>Extended practice</li>
            <li>Best value</li>
          </ul>
          <button class="buy-button" onclick="startCheckout(60)">Start 60 Min Session</button>
        </div>
      </div>
    </section>

    <section class="ios-badge">
      <div class="coming-soon-badge">
        <span>📱</span> iOS App Coming Soon - Join the Waitlist
      </div>
    </section>

    <footer>
      <p>
        Part of <a href="/">Personalized Output</a> |
        <a href="/privacy">Privacy</a> |
        <a href="/terms">Terms</a>
      </p>
      <p style="margin-top: 10px;">© 2025 Personalized Output. All rights reserved.</p>
    </footer>
  </div>

  <script>
    // Sensitivity slider interaction
    const slider = document.getElementById('sensitivitySlider');
    const desc = document.getElementById('sensitivityDesc');

    const descriptions = {
      low: 'Passive: Redi only speaks when asked directly or spots a clear error.',
      mid: 'Balanced: Redi speaks during natural pauses when it has something helpful to add.',
      high: 'Active: Redi is more proactive with suggestions, observations, and coaching.'
    };

    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (val < 33) {
        desc.textContent = descriptions.low;
      } else if (val < 67) {
        desc.textContent = descriptions.mid;
      } else {
        desc.textContent = descriptions.high;
      }
    });

    // Checkout function
    async function startCheckout(duration) {
      try {
        const response = await fetch('/api/redi/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration,
            mode: 'studying',
            voiceGender: 'female',
            sensitivity: slider.value / 100
          })
        });

        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Unable to start checkout. Please try again.');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        alert('Unable to start checkout. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;

  res.send(html);
}
