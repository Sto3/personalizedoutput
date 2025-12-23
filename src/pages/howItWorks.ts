/**
 * How It Works Page
 *
 * Explains the simple process of getting a personalized product.
 * Clean, sophisticated design matching the new homepage.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';

export function renderHowItWorksPage(): string {
  const pageStyles = getHowItWorksStyles();
  const pageContent = `
    <main class="how-it-works-page">
      <!-- Hero Section -->
      <section class="hiw-hero">
        <div class="container">
          <span class="eyebrow">How It Works</span>
          <h1>The <span class="highlight">Personalization Experience</span></h1>
          <p class="hero-desc">
            Every creation is built from scratch around what makes your recipient unique.
            Here's how we transform your insights into something extraordinary.
          </p>
        </div>
      </section>

      <!-- Steps Section -->
      <section class="steps-section">
        <div class="container">
          <!-- Step 1 -->
          <div class="step-block">
            <div class="step-number-container">
              <div class="step-number">1</div>
              <div class="step-line"></div>
            </div>
            <div class="step-content">
              <h2>Choose Your Product</h2>
              <p>
                Browse our collection of personalized experiences. From heartfelt
                Santa messages for kids to vision boards for personal growth,
                each product is designed to create something meaningful.
              </p>
              <div class="step-features">
                <span class="feature">🎅 Santa Messages</span>
                <span class="feature">🎯 Vision Boards</span>
                <span class="feature">🧠 Learning Sessions</span>
                <span class="feature">💡 Planners</span>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step-block">
            <div class="step-number-container">
              <div class="step-number">2</div>
              <div class="step-line"></div>
            </div>
            <div class="step-content">
              <h2>Complete the Personalization Experience</h2>
              <p>
                Share what makes you (or your recipient) truly unique through our thoughtful
                Personalization Experience. The more you share about interests,
                goals, challenges, and personality, the more deeply personal the
                result becomes — this is where something special happens.
              </p>
              <div class="example-box">
                <span class="example-label">We'll explore things like:</span>
                <ul>
                  <li>What passions and interests drive you?</li>
                  <li>What challenges are you navigating?</li>
                  <li>What would truly resonate with you?</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="step-block">
            <div class="step-number-container">
              <div class="step-number">3</div>
              <div class="step-line"></div>
            </div>
            <div class="step-content">
              <h2>We Create Something Unique</h2>
              <p>
                Our Personalization Experience technology weaves your specific details
                into a one-of-a-kind creation. This isn't a template with your
                name dropped in — it's built from scratch around exactly what
                you told us.
              </p>
              <div class="tech-highlight">
                <span class="tech-icon">✨</span>
                <span class="tech-text">
                  <strong>Personalization Experience</strong><br>
                  Our proprietary system that transforms your inputs into
                  deeply personal experiences.
                </span>
              </div>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="step-block">
            <div class="step-number-container">
              <div class="step-number">4</div>
            </div>
            <div class="step-content">
              <h2>Download & Enjoy</h2>
              <p>
                Receive your digital file instantly after completing the Personalization Experience.
                Whether it's for yourself or as a meaningful gift for someone special,
                you'll have something truly personal that you can use immediately
                or share with loved ones.
              </p>
              <div class="outcome-cards">
                <div class="outcome-card">
                  <span class="outcome-icon">📱</span>
                  <span class="outcome-text">Instant delivery</span>
                </div>
                <div class="outcome-card">
                  <span class="outcome-icon">🔄</span>
                  <span class="outcome-text">Unlimited downloads</span>
                </div>
                <div class="outcome-card">
                  <span class="outcome-icon">💝</span>
                  <span class="outcome-text">Ready to share</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Different Section -->
      <section class="why-different">
        <div class="container">
          <h2>Why We're Different</h2>
          <div class="comparison-grid">
            <div class="comparison-card theirs">
              <h3>Generic "Personalized" Products</h3>
              <ul>
                <li>✗ Just add your name to a template</li>
                <li>✗ Same content for everyone</li>
                <li>✗ Feels mass-produced</li>
                <li>✗ Quickly forgotten</li>
              </ul>
            </div>
            <div class="comparison-card ours">
              <h3>Personalized Output</h3>
              <ul>
                <li>✓ Built from scratch for each person</li>
                <li>✓ Unique content based on their life</li>
                <li>✓ Feels like you wrote it yourself</li>
                <li>✓ Treasured for years</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Ready to Create Something Special?</h2>
          <p>Browse our products and begin your personalization journey.</p>
          <a href="/products" class="btn btn-primary">View All Products</a>
        </div>
      </section>
    </main>
  `;

  return renderPageStart({
    title: 'How It Works',
    description: 'Learn how our personalized products are created in just 4 simple steps. From the Personalization Experience to delivery, see how we create deeply personal experiences.',
    currentPage: 'how-it-works',
    additionalStyles: pageStyles
  }) + pageContent + renderPageEnd();
}

function getHowItWorksStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .how-it-works-page {
      background: #fafafa;
    }

    /* Hero Section */
    .hiw-hero {
      padding: 120px 24px 80px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      text-align: center;
    }

    .hiw-hero .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--purple);
      margin-bottom: 16px;
    }

    .hiw-hero h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 20px;
    }

    .hiw-hero h1 .highlight {
      color: var(--purple);
      font-style: italic;
    }

    .hiw-hero .hero-desc {
      font-size: 1.1rem;
      color: #64748b;
      max-width: 550px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Steps Section */
    .steps-section {
      padding: 80px 24px 100px;
      background: white;
    }

    .step-block {
      display: flex;
      gap: 40px;
      max-width: 800px;
      margin: 0 auto 60px;
    }

    .step-block:last-child {
      margin-bottom: 0;
    }

    .step-number-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .step-number {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: white;
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.2);
    }

    .step-line {
      width: 2px;
      flex: 1;
      background: linear-gradient(180deg, var(--purple-light), rgba(124, 58, 237, 0.1));
      margin-top: 16px;
      min-height: 60px;
    }

    .step-content h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.75rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
    }

    .step-content p {
      color: #64748b;
      font-size: 1.05rem;
      line-height: 1.7;
      margin-bottom: 24px;
    }

    .step-features {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .feature {
      display: inline-block;
      background: #f1f5f9;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      color: var(--navy);
    }

    .example-box {
      background: #fafafa;
      border-left: 3px solid var(--purple);
      padding: 20px 24px;
      border-radius: 0 12px 12px 0;
    }

    .example-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--purple);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .example-box ul {
      margin: 0;
      padding-left: 20px;
    }

    .example-box li {
      color: #64748b;
      margin-bottom: 8px;
    }

    .tech-highlight {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(232, 90, 107, 0.05));
      padding: 20px 24px;
      border-radius: 16px;
      border: 1px solid rgba(124, 58, 237, 0.1);
    }

    .tech-icon {
      font-size: 2rem;
    }

    .tech-text {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .tech-text strong {
      color: var(--navy);
      display: block;
      margin-bottom: 4px;
    }

    .outcome-cards {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .outcome-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      padding: 12px 20px;
      border-radius: 12px;
    }

    .outcome-icon {
      font-size: 1.25rem;
    }

    .outcome-text {
      color: var(--navy);
      font-weight: 500;
      font-size: 0.9rem;
    }

    /* Why Different Section */
    .why-different {
      padding: 80px 24px;
      background: #fafafa;
    }

    .why-different h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: var(--navy);
      text-align: center;
      margin-bottom: 48px;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
    }

    .comparison-card {
      padding: 32px;
      border-radius: 20px;
    }

    .comparison-card.theirs {
      background: white;
      border: 1px solid #e2e8f0;
    }

    .comparison-card.ours {
      background: linear-gradient(135deg, var(--navy), var(--navy-light));
      color: white;
      box-shadow: 0 20px 40px rgba(26, 26, 46, 0.2);
    }

    .comparison-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 24px;
    }

    .comparison-card.theirs h3 {
      color: #64748b;
    }

    .comparison-card ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .comparison-card li {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 1rem;
    }

    .comparison-card.theirs li {
      color: #64748b;
      border-bottom-color: #f1f5f9;
    }

    .comparison-card.ours li {
      color: rgba(255, 255, 255, 0.9);
    }

    .comparison-card li:last-child {
      border-bottom: none;
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
      .hiw-hero {
        padding: 100px 20px 60px;
      }

      .steps-section {
        padding: 60px 20px;
      }

      .step-block {
        flex-direction: column;
        gap: 20px;
      }

      .step-number-container {
        flex-direction: row;
        gap: 16px;
      }

      .step-line {
        display: none;
      }

      .outcome-cards {
        flex-direction: column;
      }

      .why-different {
        padding: 60px 20px;
      }

      .why-different h2 {
        font-size: 2rem;
      }

      .comparison-grid {
        grid-template-columns: 1fr;
      }

      .testimonial-section {
        padding: 60px 20px;
      }

      .testimonial-section blockquote {
        font-size: 1.25rem;
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
