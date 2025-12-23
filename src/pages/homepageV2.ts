/**
 * Premium Homepage V2
 *
 * Modern, vibrant design with bronze/red accents.
 * Professional subscription-focused layout.
 */

export function renderPremiumHomepage(): string {
  const products = [
    {
      id: 'santa',
      name: 'Personalized Santa Message',
      icon: '🎅',
      description: 'A magical voice message from Santa that mentions your child\'s specific achievements and moments from the year.',
      href: '/santa',
      tag: 'Most Popular',
    },
    {
      id: 'vision-board',
      name: 'Custom Vision Board',
      icon: '🎯',
      description: 'A beautiful, personalized vision board that visualizes YOUR specific dreams and goals.',
      href: '/vision-board',
      tag: null,
    },
    {
      id: 'holiday-reset',
      name: 'Holiday Relationship Reset',
      icon: '🎄',
      description: 'Navigate challenging family dynamics with a personalized game plan for the holidays.',
      href: '/holiday-reset',
      tag: null,
    },
    {
      id: 'new-year-reset',
      name: 'New Year Reflection Planner',
      icon: '✨',
      description: 'Honor your year, discover patterns, and set intentions (not resolutions) for the year ahead.',
      href: '/new-year-reset',
      tag: null,
    },
    {
      id: 'clarity-planner',
      name: 'Guided Clarity Planner',
      icon: '💡',
      description: 'Gain clarity on any life situation through guided reflection and personalized insights.',
      href: '/clarity-planner',
      tag: 'New',
    },
    {
      id: 'flash-cards',
      name: 'Custom Flash Cards',
      icon: '📚',
      description: 'Learning cards built around YOUR child\'s interests, struggles, and learning style.',
      href: '/flash-cards',
      tag: 'New',
    },
  ];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Personalized Output | Deeply Personal Gifts & Planners</title>
      <meta name="description" content="Create deeply personalized gifts, planners, and learning materials that make people say 'wow, this really knows me.' Santa messages, vision boards, life planners, and more.">
      <meta name="keywords" content="personalized gifts, santa message, vision board, holiday planner, new year planner, custom flash cards">
      <link rel="canonical" href="https://personalizedoutput.com">
      <meta property="og:title" content="Personalized Output | Deeply Personal Gifts & Planners">
      <meta property="og:description" content="Create personalized outputs that feel impossibly personal. Santa messages, vision boards, planners, and more.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://personalizedoutput.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bronze: #cd7f32;
          --bronze-dark: #8b4513;
          --red-accent: #e94560;
          --red-light: #ff6b6b;
          --dark-bg: #0a0a0f;
          --dark-surface: #12121a;
          --dark-card: #1a1a25;
          --text-primary: #ffffff;
          --text-secondary: rgba(255,255,255,0.7);
          --text-muted: rgba(255,255,255,0.5);
        }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--dark-bg);
          color: var(--text-primary);
          line-height: 1.6;
        }
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 16px 24px;
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: 32px;
          align-items: center;
        }
        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .nav-link:hover { color: var(--text-primary); }
        .nav-cta {
          padding: 10px 20px;
          background: linear-gradient(135deg, var(--bronze), var(--bronze-dark));
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
        }

        /* Hero */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          padding: 120px 24px 80px;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 80%;
          height: 150%;
          background: radial-gradient(ellipse, rgba(233, 69, 96, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 60%;
          height: 100%;
          background: radial-gradient(ellipse, rgba(205, 127, 50, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hero-content h1 {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
        }
        .hero-content h1 span {
          background: linear-gradient(135deg, var(--red-accent), var(--red-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-content p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 32px;
          max-width: 500px;
        }
        .hero-buttons {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 1rem;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--red-accent), var(--red-light));
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
        }
        .hero-visual {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .hero-card {
          background: var(--dark-card);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.2s;
        }
        .hero-card:hover { transform: translateY(-4px); }
        .hero-card.tall { grid-row: span 2; }
        .hero-card-icon { font-size: 2rem; margin-bottom: 12px; }
        .hero-card-title { font-weight: 600; margin-bottom: 8px; }
        .hero-card-desc { font-size: 0.875rem; color: var(--text-muted); }

        /* Stats */
        .stats {
          padding: 60px 24px;
          background: var(--dark-surface);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .stats-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
          text-align: center;
        }
        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--bronze), var(--red-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 8px;
        }

        /* Products */
        .products {
          padding: 100px 24px;
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .section-header p {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }
        .products-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .product-card {
          background: var(--dark-card);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          display: block;
          position: relative;
        }
        .product-card:hover {
          transform: translateY(-8px);
          border-color: var(--red-accent);
          box-shadow: 0 12px 40px rgba(233, 69, 96, 0.15);
        }
        .product-tag {
          position: absolute;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, var(--red-accent), var(--red-light));
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .product-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }
        .product-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .product-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.7;
        }
        .product-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 20px;
          color: var(--red-accent);
          font-weight: 500;
          font-size: 0.875rem;
        }

        /* How It Works */
        .how-it-works {
          padding: 100px 24px;
          background: var(--dark-surface);
        }
        .steps {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .step {
          text-align: center;
        }
        .step-number {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--bronze), var(--bronze-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 auto 24px;
        }
        .step h3 {
          font-size: 1.25rem;
          margin-bottom: 12px;
        }
        .step p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        /* Pricing */
        .pricing {
          padding: 100px 24px;
        }
        .pricing-grid {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .pricing-card {
          background: var(--dark-card);
          border-radius: 20px;
          padding: 40px;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
        }
        .pricing-card.featured {
          border-color: var(--red-accent);
          transform: scale(1.05);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--red-accent), var(--red-light));
          padding: 6px 20px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .pricing-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .pricing-price {
          font-size: 3rem;
          font-weight: 800;
        }
        .pricing-price span {
          font-size: 1rem;
          font-weight: 400;
          color: var(--text-muted);
        }
        .pricing-outputs {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .pricing-features {
          list-style: none;
          margin-bottom: 32px;
        }
        .pricing-features li {
          padding: 8px 0;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pricing-features li::before {
          content: '✓';
          color: #4ade80;
        }
        .pricing-btn {
          width: 100%;
          padding: 16px;
          border-radius: 10px;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          display: block;
        }
        .pricing-btn.primary {
          background: linear-gradient(135deg, var(--red-accent), var(--red-light));
          color: white;
        }
        .pricing-btn.secondary {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        /* Footer */
        .footer {
          padding: 60px 24px;
          background: var(--dark-surface);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 60px;
        }
        .footer-brand p {
          color: var(--text-muted);
          margin-top: 16px;
          max-width: 300px;
        }
        .footer-section h4 {
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 20px;
          color: var(--text-muted);
        }
        .footer-links {
          list-style: none;
        }
        .footer-links li { margin-bottom: 12px; }
        .footer-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
        }
        .footer-links a:hover { color: var(--text-primary); }
        .footer-bottom {
          max-width: 1200px;
          margin: 40px auto 0;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        @media (max-width: 1024px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero-visual { display: none; }
          .products-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-grid { grid-template-columns: 1fr; }
          .pricing-card.featured { transform: none; }
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hero-content h1 { font-size: 2.5rem; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); }
          .products-grid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr 1fr; }
        }
      </style>
    </head>
    <body>
      <nav class="nav">
        <div class="nav-inner">
          <a href="/" class="logo">Personalized Output</a>
          <div class="nav-links">
            <a href="#products" class="nav-link">Products</a>
            <a href="/blog" class="nav-link">Blog</a>
            <a href="/pricing" class="nav-link">Pricing</a>
            <a href="/login" class="nav-link">Login</a>
            <a href="/auth/signup" class="nav-cta">Sign Up</a>
          </div>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content">
            <h1>Create Gifts That <span>Really Know</span> Your People</h1>
            <p>Deeply personalized Santa messages, vision boards, planners, and learning materials that make people emotional. Not generic. Impossibly personal.</p>
            <div class="hero-buttons">
              <a href="#products" class="btn btn-primary">Explore Products</a>
              <a href="/pricing" class="btn btn-secondary">View Pricing</a>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-card">
              <div class="hero-card-icon">🎅</div>
              <div class="hero-card-title">Santa Message</div>
              <div class="hero-card-desc">Voice message that mentions your child's exact achievements</div>
            </div>
            <div class="hero-card tall">
              <div class="hero-card-icon">🎯</div>
              <div class="hero-card-title">Vision Board</div>
              <div class="hero-card-desc">Beautiful visualizations of YOUR specific dreams and goals</div>
            </div>
            <div class="hero-card">
              <div class="hero-card-icon">📚</div>
              <div class="hero-card-title">Flash Cards</div>
              <div class="hero-card-desc">Learning built around your child's interests</div>
            </div>
          </div>
        </div>
      </section>

      <section class="stats">
        <div class="stats-inner">
          <div>
            <div class="stat-value">6</div>
            <div class="stat-label">Product Types</div>
          </div>
          <div>
            <div class="stat-value">~20min</div>
            <div class="stat-label">Immersive Sessions</div>
          </div>
          <div>
            <div class="stat-value">Deep</div>
            <div class="stat-label">Personalization</div>
          </div>
          <div>
            <div class="stat-value">$25</div>
            <div class="stat-label">Starting Price</div>
          </div>
        </div>
      </section>

      <section class="products" id="products">
        <div class="section-header">
          <h2>Our Products</h2>
          <p>Each product uses our deep personalization process to create outputs that feel impossibly personal.</p>
        </div>
        <div class="products-grid">
          ${products.map(p => `
            <a href="${p.href}" class="product-card">
              ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
              <div class="product-icon">${p.icon}</div>
              <h3 class="product-name">${p.name}</h3>
              <p class="product-desc">${p.description}</p>
              <span class="product-link">Create yours →</span>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="how-it-works">
        <div class="section-header">
          <h2>How It Works</h2>
          <p>Our deep personalization process creates outputs that feel like magic.</p>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Answer Questions</h3>
            <p>Spend ~20 minutes answering questions about specific moments, stories, and details.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>AI Creates Magic</h3>
            <p>Our AI weaves your specific details into a beautifully personalized output.</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>Share the Moment</h3>
            <p>Download and share. Watch their face when they realize it's about THEM.</p>
          </div>
        </div>
      </section>

      <section class="pricing" id="pricing">
        <div class="section-header">
          <h2>Simple Pricing</h2>
          <p>Subscribe monthly or buy individual outputs on Etsy.</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-name">Starter</div>
            <div class="pricing-price">$25<span>/month</span></div>
            <div class="pricing-outputs">2 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types included</li>
              <li>PDF & audio downloads</li>
              <li>Email support</li>
              <li>30-day money-back guarantee</li>
            </ul>
            <a href="/api/stripe/checkout?tier=starter" class="pricing-btn secondary">Get Started</a>
          </div>
          <div class="pricing-card featured">
            <span class="pricing-badge">Best Value</span>
            <div class="pricing-name">Regular</div>
            <div class="pricing-price">$39<span>/month</span></div>
            <div class="pricing-outputs">4 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types included</li>
              <li>PDF & audio downloads</li>
              <li>Priority support</li>
              <li>Perfect for monthly gifting</li>
            </ul>
            <a href="/api/stripe/checkout?tier=regular" class="pricing-btn primary">Get Started</a>
          </div>
          <div class="pricing-card">
            <div class="pricing-name">Power User</div>
            <div class="pricing-price">$59<span>/month</span></div>
            <div class="pricing-outputs">8 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types included</li>
              <li>PDF & audio downloads</li>
              <li>Priority support</li>
              <li>Commercial use rights</li>
            </ul>
            <a href="/api/stripe/checkout?tier=power" class="pricing-btn secondary">Get Started</a>
          </div>
        </div>
      </section>

      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <a href="/" class="logo">Personalized Output</a>
            <p>Create deeply personalized gifts, planners, and learning materials that make people say "wow."</p>
          </div>
          <div class="footer-section">
            <h4>Products</h4>
            <ul class="footer-links">
              <li><a href="/santa">Santa Message</a></li>
              <li><a href="/vision-board">Vision Board</a></li>
              <li><a href="/holiday-reset">Holiday Reset</a></li>
              <li><a href="/new-year-reset">New Year Reset</a></li>
              <li><a href="/clarity-planner">Clarity Planner</a></li>
              <li><a href="/flash-cards">Flash Cards</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Company</h4>
            <ul class="footer-links">
              <li><a href="/blog">Blog</a></li>
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="mailto:hello@personalizedoutput.com">Contact</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Legal</h4>
            <ul class="footer-links">
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/copyright">Copyright & IP</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div>© ${new Date().getFullYear()} Personalized Output. All rights reserved.</div>
          <div>hello@personalizedoutput.com</div>
        </div>
      </footer>
    </body>
    </html>
  `;
}
