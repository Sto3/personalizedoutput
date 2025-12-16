/**
 * Pricing Page
 *
 * Shows subscription tiers and pricing options.
 * Matches the new homepage design with coral/purple color scheme.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';

export function renderPricingPageNew(): string {
  const pageStyles = getPricingPageStyles();
  const pageContent = `
    <main class="pricing-page">
      <!-- Hero Section -->
      <section class="pricing-hero">
        <div class="container">
          <span class="eyebrow">Simple Pricing</span>
          <h1>Pay Per Product, <span class="highlight">No Subscriptions</span></h1>
          <p class="hero-desc">
            Each product is a one-time purchase. Create something magical
            without commitment or recurring fees.
          </p>
        </div>
      </section>

      <!-- Pricing Approach -->
      <section class="approach-section">
        <div class="container">
          <div class="approach-grid">
            <div class="approach-card">
              <div class="approach-icon">💰</div>
              <h3>One-Time Purchases</h3>
              <p>Pay only for what you need. Each product is priced individually with no hidden fees or subscriptions.</p>
            </div>
            <div class="approach-card">
              <div class="approach-icon">🎁</div>
              <h3>Perfect for Gifts</h3>
              <p>Create something special for birthdays, holidays, or just because. Each creation is uniquely personal.</p>
            </div>
            <div class="approach-card">
              <div class="approach-icon">⚡</div>
              <h3>Instant Delivery</h3>
              <p>Complete your order and receive your personalized creation within minutes. No waiting.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Product Pricing Grid -->
      <section class="products-pricing">
        <div class="container">
          <div class="section-header">
            <h2>Our Products</h2>
            <p>Each price includes the complete personalized experience</p>
          </div>

          <div class="pricing-grid">
            <!-- Kids Products -->
            <div class="price-card">
              <div class="price-badge">For Kids</div>
              <div class="price-icon">🎅</div>
              <h3>Santa Message</h3>
              <p class="price-desc">Magical personalized video message from Santa</p>
              <div class="price-amount">$15</div>
              <ul class="price-features">
                <li>Personalized HD video</li>
                <li>Child's name & interests</li>
                <li>Instant delivery</li>
                <li>Unlimited downloads</li>
              </ul>
              <a href="/santa" class="btn btn-primary">Create Message</a>
            </div>

            <div class="price-card">
              <div class="price-badge">For Kids</div>
              <div class="price-icon">📚</div>
              <h3>Flash Cards</h3>
              <p class="price-desc">Custom learning cards based on interests</p>
              <div class="price-amount">$12</div>
              <ul class="price-features">
                <li>50+ personalized cards</li>
                <li>Any subject matter</li>
                <li>Print-ready PDF</li>
                <li>Digital version included</li>
              </ul>
              <a href="/flash-cards" class="btn btn-secondary">Create Cards</a>
            </div>

            <div class="price-card">
              <div class="price-badge">For Kids</div>
              <div class="price-icon">🎧</div>
              <h3>Audio Lesson</h3>
              <p class="price-desc">30-min personalized audio lesson</p>
              <div class="price-amount">$23</div>
              <ul class="price-features">
                <li>30-min custom lesson</li>
                <li>Based on their interests</li>
                <li>Professional narration</li>
                <li>Downloadable MP3</li>
              </ul>
              <a href="/learning-session" class="btn btn-secondary">Create Lesson</a>
            </div>

            <div class="price-card">
              <div class="price-badge">For Kids</div>
              <div class="price-icon">🎬</div>
              <h3>Video Lesson</h3>
              <p class="price-desc">30-min personalized video lesson</p>
              <div class="price-amount">$33</div>
              <ul class="price-features">
                <li>30-min custom video</li>
                <li>Custom animations</li>
                <li>Professional production</li>
                <li>Downloadable MP4</li>
              </ul>
              <a href="/video-lesson" class="btn btn-secondary">Create Video</a>
            </div>

            <!-- Adult Products -->
            <div class="price-card featured">
              <div class="popular-tag">Most Popular</div>
              <div class="price-badge purple">For Adults</div>
              <div class="price-icon">🎯</div>
              <h3>Vision Board</h3>
              <p class="price-desc">Custom digital vision board + guide</p>
              <div class="price-amount">$15</div>
              <ul class="price-features">
                <li>Custom-designed board</li>
                <li>Personalized imagery</li>
                <li>Goal-setting guide</li>
                <li>High-res downloads</li>
              </ul>
              <a href="/vision-board" class="btn btn-primary">Create Board</a>
            </div>

            <div class="price-card">
              <div class="price-badge purple">For Adults</div>
              <div class="price-icon">🎄</div>
              <h3>Holiday Reset</h3>
              <p class="price-desc">Guided reflection for the holiday season</p>
              <div class="price-amount">$18</div>
              <ul class="price-features">
                <li>Personalized prompts</li>
                <li>Audio guidance</li>
                <li>Holiday-themed</li>
                <li>Printable workbook</li>
              </ul>
              <a href="/holiday-reset" class="btn btn-secondary">Start Reset</a>
            </div>

            <div class="price-card">
              <div class="price-badge purple">For Adults</div>
              <div class="price-icon">✨</div>
              <h3>New Year Reset</h3>
              <p class="price-desc">Year-end reflection & goal setting</p>
              <div class="price-amount">$18</div>
              <ul class="price-features">
                <li>Year review guide</li>
                <li>2025 planning tools</li>
                <li>Custom intentions</li>
                <li>Audio companion</li>
              </ul>
              <a href="/new-year-reset" class="btn btn-secondary">Plan 2025</a>
            </div>

            <!-- Planning Products -->
            <div class="price-card">
              <div class="price-badge navy">Life Planning</div>
              <div class="price-icon">💡</div>
              <h3>Clarity Planner</h3>
              <p class="price-desc">Personal planning system built around you</p>
              <div class="price-amount">$30</div>
              <ul class="price-features">
                <li>Custom planning system</li>
                <li>Based on your goals</li>
                <li>12-month framework</li>
                <li>Digital + printable</li>
              </ul>
              <a href="/clarity-planner" class="btn btn-secondary">Get Clarity</a>
            </div>

            <div class="price-card">
              <div class="price-badge navy">Life Planning</div>
              <div class="price-icon">🧠</div>
              <h3>Thought Organizer™</h3>
              <p class="price-desc">Transform scattered thoughts into clarity</p>
              <div class="price-amount">$20</div>
              <ul class="price-features">
                <li>Custom thought system</li>
                <li>Based on how you think</li>
                <li>Ongoing framework</li>
                <li>Integration guide</li>
              </ul>
              <a href="/thought-organizer" class="btn btn-secondary">Organize Thoughts</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Guarantee Section -->
      <section class="guarantee-section">
        <div class="container">
          <div class="guarantee-card">
            <div class="guarantee-icon">🛡️</div>
            <h2>100% Satisfaction Guarantee</h2>
            <p>
              Not happy with your personalized creation? We'll give you a full refund.
              No questions asked, no hoops to jump through.
            </p>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section">
        <div class="container">
          <h2>Common Questions</h2>
          <div class="faq-grid">
            <div class="faq-item">
              <h3>How personalized are these products?</h3>
              <p>Extremely. We don't just add your name to a template. Each creation is built from scratch based on the specific details you provide about the person.</p>
            </div>
            <div class="faq-item">
              <h3>How long does delivery take?</h3>
              <p>Most products are delivered within minutes of purchase. Complex creations like learning sessions may take up to 30 minutes.</p>
            </div>
            <div class="faq-item">
              <h3>What if I'm not satisfied?</h3>
              <p>We offer a 100% satisfaction guarantee. If you're not happy with your personalized creation, we'll give you a full refund — no questions asked.</p>
            </div>
            <div class="faq-item">
              <h3>What formats do I receive?</h3>
              <p>It depends on the product. You'll typically receive high-res PDFs, downloadable audio files, and/or video files you can keep forever.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Ready to Create Something Personal?</h2>
          <p>Browse our products and start the process. It only takes a few minutes.</p>
          <a href="/products" class="btn btn-primary">View All Products</a>
        </div>
      </section>
    </main>
  `;

  return renderPageStart({
    title: 'Pricing',
    description: 'Simple one-time pricing for personalized products. No subscriptions, no hidden fees. Santa messages, vision boards, learning sessions, and more.',
    currentPage: 'pricing',
    additionalStyles: pageStyles
  }) + pageContent + renderPageEnd();
}

function getPricingPageStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .pricing-page {
      background: #fafafa;
    }

    /* Hero Section */
    .pricing-hero {
      padding: 120px 24px 80px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      text-align: center;
    }

    .pricing-hero .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--purple);
      margin-bottom: 16px;
    }

    .pricing-hero h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 20px;
    }

    .pricing-hero h1 .highlight {
      color: var(--purple);
      font-style: italic;
    }

    .pricing-hero .hero-desc {
      font-size: 1.1rem;
      color: #64748b;
      max-width: 550px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Approach Section */
    .approach-section {
      padding: 60px 24px;
      background: white;
    }

    .approach-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .approach-card {
      text-align: center;
      padding: 32px;
    }

    .approach-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .approach-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .approach-card p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    /* Products Pricing Section */
    .products-pricing {
      padding: 80px 24px;
      background: #fafafa;
    }

    .products-pricing .section-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .products-pricing .section-header h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .products-pricing .section-header p {
      color: #64748b;
      font-size: 1rem;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .price-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
      position: relative;
      transition: all 0.3s ease;
    }

    .price-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    .price-card.featured {
      border-color: var(--coral);
      box-shadow: 0 4px 24px rgba(232, 90, 107, 0.1);
    }

    .popular-tag {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: white;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 16px;
      border-radius: 20px;
    }

    .price-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px;
      border-radius: 12px;
      background: rgba(232, 90, 107, 0.1);
      color: var(--coral);
      margin-bottom: 16px;
    }

    .price-badge.purple {
      background: rgba(124, 58, 237, 0.1);
      color: var(--purple);
    }

    .price-badge.navy {
      background: rgba(26, 26, 46, 0.1);
      color: var(--navy);
    }

    .price-icon {
      font-size: 2.5rem;
      margin-bottom: 16px;
    }

    .price-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 8px;
    }

    .price-desc {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .price-amount {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 20px;
    }

    .price-features {
      list-style: none;
      margin-bottom: 24px;
    }

    .price-features li {
      padding: 8px 0;
      color: #64748b;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .price-features li::before {
      content: '✓';
      color: var(--coral);
      font-weight: bold;
    }

    .price-card .btn {
      display: block;
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .price-card .btn-primary {
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: white;
      box-shadow: 0 4px 16px rgba(232, 90, 107, 0.2);
    }

    .price-card .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(232, 90, 107, 0.3);
    }

    .price-card .btn-secondary {
      background: white;
      color: var(--navy);
      border: 2px solid #e2e8f0;
    }

    .price-card .btn-secondary:hover {
      border-color: var(--purple);
      color: var(--purple);
    }

    /* Guarantee Section */
    .guarantee-section {
      padding: 60px 24px;
      background: white;
    }

    .guarantee-card {
      max-width: 700px;
      margin: 0 auto;
      text-align: center;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(232, 90, 107, 0.05));
      padding: 48px;
      border-radius: 24px;
      border: 1px solid rgba(124, 58, 237, 0.1);
    }

    .guarantee-icon {
      font-size: 3rem;
      margin-bottom: 20px;
    }

    .guarantee-card h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.75rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
    }

    .guarantee-card p {
      color: #64748b;
      font-size: 1rem;
      line-height: 1.7;
    }

    /* FAQ Section */
    .faq-section {
      padding: 80px 24px;
      background: #fafafa;
    }

    .faq-section h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2rem;
      font-weight: 500;
      color: var(--navy);
      text-align: center;
      margin-bottom: 48px;
    }

    .faq-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .faq-item {
      background: white;
      padding: 28px;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    .faq-item h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .faq-item p {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.6;
    }

    /* CTA Section */
    .cta-section {
      padding: 100px 24px;
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
      text-align: center;
    }

    .cta-section h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: white;
      margin-bottom: 16px;
    }

    .cta-section p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.1rem;
      margin-bottom: 32px;
    }

    .cta-section .btn-primary {
      display: inline-block;
      background: var(--coral);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      padding: 16px 40px;
      border-radius: 50px;
      text-decoration: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
    }

    .cta-section .btn-primary:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .pricing-hero {
        padding: 100px 20px 60px;
      }

      .approach-section,
      .products-pricing,
      .faq-section {
        padding: 60px 20px;
      }

      .pricing-grid,
      .faq-grid {
        grid-template-columns: 1fr;
      }

      .price-card {
        padding: 24px;
      }

      .cta-section {
        padding: 60px 20px;
      }

      .cta-section h2 {
        font-size: 1.8rem;
      }
    }
  `;
}
