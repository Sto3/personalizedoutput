/**
 * Premium Homepage V4 - Refined Premium Design
 *
 * Key design principles:
 * - Clean hero with reduced spacing, premium abstract gradient
 * - Company-wide value proposition (not just learning)
 * - Horizontally scrollable, clickable product cards
 * - Color scheme: Coral (#E85A6B), Navy (#1a1a2e), Purple (#7C3AED), White
 * - Premium, encapsulating, sophisticated
 */

import { renderPageStart, renderPageEnd } from '../components/layout';
import { PRODUCTS, ProductType, ProductInfo, getProductsOrderedBySales, ProductWithScore } from '../lib/supabase/orderService';

// ============================================================
// HOMEPAGE CONTENT
// ============================================================

export async function renderPremiumHomepageV4(): Promise<string> {
  // Get dynamically ordered products by sales
  let orderedProducts: ProductWithScore[];
  try {
    orderedProducts = await getProductsOrderedBySales();
  } catch (e) {
    // Fallback to static order if Supabase unavailable
    orderedProducts = Object.values(PRODUCTS)
      .filter(p => p.isActive)
      .map(p => ({ ...p, salesScore: 0, recentSales: 0 }));
  }

  // For the 3-card staggered display, we'll show the top 3 products
  // plus peek cards on each side
  const featuredProducts = orderedProducts.slice(0, 5); // Center 3 + 2 peek cards

  // Reviews section removed until we have real customer reviews

  const pageStyles = getHomepageStyles();
  const pageContent = `
    <main>
      <!-- Hero Section - BLACK background, Split Layout (Round 6) -->
      <section class="hero">
        <div class="hero-inner container">
          <div class="hero-split">
            <div class="hero-left">
              <div class="hero-headline">
                <h1>
                  <span class="headline-line headline-muted">PERSONALIZED</span>
                  <span class="headline-line headline-muted">EXPERIENCES</span>
                  <span class="headline-line headline-coral">POWERFUL ENOUGH</span>
                  <span class="headline-line headline-muted">TO HEAL, INSPIRE,</span>
                  <span class="headline-line headline-muted">AND MAKE YOU</span>
                  <span class="headline-line headline-coral">SMILE</span>
                </h1>
              </div>
            </div>
            <div class="hero-right">
              <p class="hero-subtitle">
                A child pays attention when their favorite dinosaur teaches fractions. An adult finally understands mortgages through their bakery. A vision board captures exactly who you are. We exist to create these moments — <em>products so personal customers say "it's unbelievable."</em>
              </p>
              <div class="hero-buttons">
                <a href="#products" class="btn btn-primary btn-hero">
                  Start Personalizing Today
                </a>
                <a href="/how-it-works" class="btn btn-secondary btn-hero-outline">
                  See How It Works
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Product Showcase - Swiper.js Carousel -->
      <section class="products-showcase" id="products">
        <span class="section-eyebrow products-label">Our Products</span>
        <div class="swiper products-swiper" id="productsSwiper">
          <div class="swiper-wrapper">
            ${orderedProducts.map((p, index) => renderScrollableProductCard(p, index)).join('')}
          </div>
        </div>
        <!-- Swiper Navigation -->
        <div class="swiper-nav-container">
          <button class="swiper-btn swiper-btn-prev" aria-label="Previous product">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="swiper-pagination-custom"></div>
          <button class="swiper-btn swiper-btn-next" aria-label="Next product">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- How It Works -->
      <section class="how-it-works section" id="how-it-works">
        <div class="section-header">
          <span class="section-eyebrow">How It Works</span>
          <h2>Simple Process, <span class="script-accent">Magical</span> Results</h2>
          <p>Creating something deeply personal takes just a few minutes.</p>
        </div>
        <div class="steps container">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Choose Product</h3>
            <p>Pick from Santa messages, vision boards, learning sessions, and more.</p>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Personalization Experience</h3>
            <p>Have an immersive, conversational experience where you share details about your person — their interests, achievements, dreams, and personality.</p>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>We Create Magic</h3>
            <p>Our powerful and immersive Personalization Experience weaves your details into something uniquely personal.</p>
          </div>
          <div class="step-connector"></div>
          <div class="step">
            <div class="step-number">4</div>
            <h3>Download & Share</h3>
            <p>Your personalized product is delivered instantly. Download it forever or share directly with the lucky recipient.</p>
          </div>
        </div>
      </section>

      <!-- All Products Grid -->
      <section class="products-grid section">
        <div class="section-header">
          <span class="section-eyebrow">Our Products</span>
          <h2>Choose Your <span class="script-accent">Experience</span></h2>
          <p>Each product is uniquely crafted around your specific interests and needs.</p>
        </div>
        <div class="products-container container">
          ${orderedProducts.map((p, index) => renderProductCard(p, index)).join('')}
        </div>
      </section>

      <!-- Reviews section will be added when we have real customer feedback -->

      <!-- Final CTA -->
      <section class="final-cta section">
        <div class="cta-card container-narrow">
          <h2>Ready to Learn <span class="script-accent">Your</span> Way?</h2>
          <p>
            Watch real demo lessons and see how our Thought Organizer™ connects
            what you love to what you need to learn. For kids AND adults.
          </p>
          <div class="cta-buttons">
            <a href="/demo-lessons" class="btn btn-primary btn-large">
              Listen to Demo Lessons
            </a>
            <a href="#products" class="btn btn-secondary btn-large">
              Browse All Products
            </a>
          </div>
        </div>
      </section>
    </main>
  `;

  const pageScripts = `
    <script>
      ${getHomepageScripts()}
    </script>
  `;

  return renderPageStart({
    title: 'Learn Anything Through What You Love',
    description: 'Personalized learning that uses YOUR interests to teach what you need. Kids learn fractions through dinosaurs. Adults master mortgages through their business.',
    currentPage: 'home',
    additionalStyles: pageStyles,
  }) + pageContent + pageScripts + renderPageEnd({ includeFooter: true }).replace('</body>', '');
}

function renderScrollableProductCard(product: ProductWithScore, index: number): string {
  // Unique icons - distinctive for each product
  const icons: Record<string, string> = {
    santa_message: '🎁',
    vision_board: '🎯',
    flash_cards: '📚',
    learning_session: '🎧',
    video_learning_session: '🎬',
    holiday_reset: '🎄',
    new_year_reset: '🌟',
    clarity_planner: '💡',
    thought_organizer: '✨',
  };

  const categoryLabels: Record<string, string> = {
    kids: 'For Kids',
    adults: 'For Adults',
    life_planning: 'Life Planning',
  };

  return `
    <div class="swiper-slide">
    <a href="/${product.slug}" class="scroll-product-card" style="--card-delay: ${index * 0.1}s">
      <div class="scroll-card-inner">
        <div class="scroll-card-badge">${categoryLabels[product.category]}</div>
        ${product.salesScore > 0 ? '<div class="scroll-card-popular">Popular</div>' : ''}
        <div class="scroll-card-icon">${icons[product.id] || '📦'}</div>
        <h3 class="scroll-card-title">${product.name}</h3>
        <p class="scroll-card-desc">${product.description}</p>
        <div class="scroll-card-footer">
          <span class="scroll-card-price">$${(product.price / 100).toFixed(0)}</span>
          <span class="scroll-card-cta">Get Started →</span>
        </div>
      </div>
    </a>
    </div>
  `;
}

function renderFeatureCards(products: ProductWithScore[]): string {
  // Planquanta-style 3-card staggered layout
  // Center card is elevated, side cards are slightly behind
  // Plus peek cards on far left/right edges

  const cardConfigs = [
    { position: 'peek-left', product: products[0] },
    { position: 'side-left', product: products[1] || products[0] },
    { position: 'center', product: products[2] || products[0] },
    { position: 'side-right', product: products[3] || products[1] || products[0] },
    { position: 'peek-right', product: products[4] || products[0] },
  ];

  // Card illustrations - matching Planquanta's visual style
  const cardIllustrations: Record<string, { title: string; visual: string; description: string }> = {
    learning_session: {
      title: 'Seamless Learning Experience',
      visual: `
        <div class="card-illustration chat-style">
          <div class="chat-message user">
            <div class="avatar">👦</div>
            <div class="message">I love dinosaurs!</div>
          </div>
          <div class="chat-message system">
            <div class="avatar">🧠</div>
            <div class="message">Let's use T-Rex hunting to learn fractions...</div>
          </div>
          <div class="chat-message result">
            <div class="avatar">✨</div>
            <div class="message">Lesson created in your style!</div>
          </div>
        </div>
      `,
      description: 'Connect interests to learning seamlessly.'
    },
    santa_message: {
      title: 'Personalized Magic',
      visual: `
        <div class="card-illustration diagram-style">
          <div class="diagram-center">
            <div class="diagram-logo">🎅</div>
            <div class="diagram-label">Santa</div>
          </div>
          <div class="diagram-nodes">
            <span class="node">Names</span>
            <span class="node">Achievements</span>
            <span class="node">Wishes</span>
            <span class="node">Personal Details</span>
          </div>
        </div>
      `,
      description: 'Every detail woven into the experience.'
    },
    vision_board: {
      title: 'Secure & Personal',
      visual: `
        <div class="card-illustration security-style">
          <div class="security-icon">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#888" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4" stroke="#16a34a"/>
            </svg>
          </div>
          <div class="security-badge">
            <span class="check">✓</span>
            <span>Your vision, realized</span>
          </div>
        </div>
      `,
      description: 'Transform your goals into reality.'
    },
    flash_cards: {
      title: 'All-in-One Learning',
      visual: `
        <div class="card-illustration diagram-style">
          <div class="diagram-center">
            <div class="diagram-logo">📚</div>
            <div class="diagram-label">Personalized</div>
          </div>
          <div class="diagram-nodes">
            <span class="node">Your Interests</span>
            <span class="node">Learning Goals</span>
            <span class="node">Study Style</span>
            <span class="node">Progress</span>
          </div>
        </div>
      `,
      description: 'Multiple tools combined for you.'
    },
    holiday_reset: {
      title: 'Reflect & Reset',
      visual: `
        <div class="card-illustration chat-style">
          <div class="chat-message user">
            <div class="avatar">🎄</div>
            <div class="message">What do I want to change?</div>
          </div>
          <div class="chat-message system">
            <div class="avatar">💭</div>
            <div class="message">Let's explore your year together...</div>
          </div>
        </div>
      `,
      description: 'End the year with clarity.'
    },
    new_year_reset: {
      title: 'Start Fresh',
      visual: `
        <div class="card-illustration security-style">
          <div class="security-icon">
            <div style="font-size: 48px">✨</div>
          </div>
          <div class="security-badge">
            <span class="check">✓</span>
            <span>Goals set successfully</span>
          </div>
        </div>
      `,
      description: 'Begin with intention.'
    },
    clarity_planner: {
      title: 'Plan With Purpose',
      visual: `
        <div class="card-illustration diagram-style">
          <div class="diagram-center">
            <div class="diagram-logo">💡</div>
            <div class="diagram-label">Clarity</div>
          </div>
          <div class="diagram-nodes">
            <span class="node">Goals</span>
            <span class="node">Steps</span>
            <span class="node">Timeline</span>
            <span class="node">Success</span>
          </div>
        </div>
      `,
      description: 'Turn chaos into action.'
    },
    thought_organizer: {
      title: 'Organize Ideas',
      visual: `
        <div class="card-illustration chat-style">
          <div class="chat-message user">
            <div class="avatar">💭</div>
            <div class="message">I have so many ideas...</div>
          </div>
          <div class="chat-message system">
            <div class="avatar">🧠</div>
            <div class="message">Let's structure them together</div>
          </div>
          <div class="chat-message result">
            <div class="avatar">✅</div>
            <div class="message">3 actionable insights ready!</div>
          </div>
        </div>
      `,
      description: 'Transform chaos into clarity.'
    }
  };

  return `
    <div class="feature-cards-wrapper">
      ${cardConfigs.map(({ position, product }) => {
        const illustration = cardIllustrations[product.id] || cardIllustrations.learning_session;
        return `
          <div class="feature-card feature-card-${position}">
            <h3 class="feature-card-title">${illustration.title}</h3>
            <p class="feature-card-desc">${illustration.description}</p>
            ${illustration.visual}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderProductCard(product: ProductWithScore, index: number): string {
  // Unique icons - distinctive for each product
  const icons: Record<string, string> = {
    santa_message: '🎁',
    vision_board: '🎯',
    flash_cards: '📚',
    learning_session: '🎧',
    video_learning_session: '🎬',
    holiday_reset: '🎄',
    new_year_reset: '🌟',
    clarity_planner: '💡',
    thought_organizer: '✨',
  };

  const benefits: Record<string, string[]> = {
    santa_message: ['2-3 min personalized audio', 'Mentions specific achievements', 'Downloadable MP3'],
    vision_board: ['High-res digital download', 'Personalized imagery', 'Print-ready format'],
    flash_cards: ['50+ personalized cards', 'Tailored to learning style', 'Printable PDF'],
    learning_session: ['Uses YOUR interests', 'Works for any topic', '30-min audio lesson'],
    video_learning_session: ['Custom animations', 'Visual storytelling', '30-min video lesson'],
    holiday_reset: ['Guided reflection', 'Year-end clarity', 'Personalized prompts'],
    new_year_reset: ['Goal setting framework', 'Personalized action plan', 'Monthly check-ins'],
    clarity_planner: ['20+ page PDF', 'Actionable steps', 'Reflection exercises'],
    thought_organizer: ['Transform ideas', 'Actionable insights', 'Custom framework'],
  };

  const isFeatured = index === 0;
  const productBenefits = benefits[product.id] || ['Deeply personalized', 'Instant delivery', 'Digital format'];

  return `
    <div class="product-card ${isFeatured ? 'featured' : ''}" data-index="${index}">
      ${product.salesScore > 0 ? `<span class="product-tag">Popular</span>` : ''}
      <div class="product-icon">${icons[product.id] || '📦'}</div>
      <h3 class="product-name">${product.name}${product.id === 'thought_organizer' ? '<sup>™</sup>' : ''}</h3>
      <p class="product-desc">${product.description}</p>
      <ul class="product-benefits">
        ${productBenefits.map(b => `<li>${b}</li>`).join('')}
      </ul>
      <div class="product-footer">
        <div class="product-price">
          <span class="price-currency">$</span>
          <span class="price-amount">${(product.price / 100).toFixed(0)}</span>
        </div>
        <a href="/${product.slug}" class="btn btn-primary btn-small">Get Started</a>
      </div>
    </div>
  `;
}

function getHomepageStyles(): string {
  return `
    /* ================================================
       COLOR SCHEME - Premium Palette
       ================================================ */
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
      --white: #ffffff;
      --off-white: #fafafa;
    }

    /* ================================================
       HERO SECTION - BLACK Background, Split Layout (Round 6)
       ================================================ */
    .hero {
      min-height: auto;
      display: flex;
      align-items: center;
      padding: 120px 24px 60px;
      position: relative;
      background: #0a0a0f;
      overflow: hidden;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 1400px;
      width: 100%;
    }

    /* Split Layout - Headline Left, Subheading Right */
    .hero-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }

    .hero-left {
      /* Headlines on left */
    }

    .hero-right {
      /* Subheading and CTA on right */
    }

    .hero h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 0;
      color: white;
      font-variant: small-caps;
      letter-spacing: 0.05em;
    }

    .hero h1 .highlight {
      color: var(--coral);
      font-style: italic;
      font-variant: normal;
    }

    /* Staggered Headline Animation */
    .hero-headline h1 {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .headline-line {
      display: block;
      opacity: 0;
      transform: translateY(25px);
      animation: fadeUpIn 0.7s ease forwards;
    }

    .headline-line:nth-child(1) { animation-delay: 0s; }
    .headline-line:nth-child(2) { animation-delay: 0.15s; }
    .headline-line:nth-child(3) { animation-delay: 0.3s; }
    .headline-line:nth-child(4) { animation-delay: 0.45s; }
    .headline-line:nth-child(5) { animation-delay: 0.6s; }
    .headline-line:nth-child(6) { animation-delay: 0.75s; }

    .headline-muted {
      color: #8B7082;
      font-variant: small-caps;
    }

    .headline-coral {
      color: #E8735A;
      font-style: italic;
      font-variant: normal;
    }

    @keyframes fadeUpIn {
      from {
        opacity: 0;
        transform: translateY(25px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Animation reset state */
    .headline-line.animate-reset {
      animation: none;
      opacity: 0;
      transform: translateY(25px);
    }

    .hero-subtitle {
      font-family: 'Cormorant Garamond', 'Georgia', serif;
      font-size: 1.2rem;
      line-height: 1.8;
      color: #F5F0F5;
      margin: 0 0 24px;
      font-weight: 400;
      font-style: italic;
    }

    .hero-subtitle em {
      font-family: 'Great Vibes', cursive;
      font-style: normal;
      font-size: 1.2em;
      color: var(--coral-light);
    }

    .hero-buttons {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    .btn-hero {
      padding: 14px 28px;
      font-size: 0.95rem;
      border-radius: 100px;
      background: var(--coral);
      color: white;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.4);
    }

    .btn-hero:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 107, 0.5);
    }

    .btn-hero-outline {
      background: transparent;
      border: 2px solid rgba(255, 255, 255, 0.4);
      color: white;
      box-shadow: none;
    }

    .btn-hero-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: white;
      box-shadow: 0 8px 30px rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 900px) {
      .hero-split {
        grid-template-columns: 1fr;
        gap: 30px;
        text-align: center;
      }
      .hero-buttons {
        justify-content: center;
      }
    }

    /* ================================================
       PRODUCTS SHOWCASE - Swiper.js Carousel
       Triangle/Perspective Layout - Cards rotate TOWARD center
       PURPLE background per Round 6
       ================================================ */
    .products-showcase {
      padding: 40px 0 60px;
      background: var(--purple);
      overflow: hidden;
      position: relative;
    }

    .products-label {
      display: block;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--coral);
      margin-bottom: 12px;
    }

    /* Swiper Container */
    .products-swiper {
      width: 100%;
      padding: 30px 0 50px;
      overflow: visible;
    }

    .products-swiper .swiper-wrapper {
      align-items: center;
      perspective: 1200px;
      transform-style: preserve-3d;
    }

    .products-swiper .swiper-slide {
      width: 360px;
      transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transform-style: preserve-3d;
    }

    /* Swiper Navigation */
    .swiper-nav-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 24px;
      margin-top: 20px;
    }

    .swiper-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .swiper-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.1);
    }

    .swiper-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
    }

    .swiper-pagination-custom {
      display: flex;
      gap: 8px;
    }

    .swiper-pagination-custom .swiper-pagination-bullet {
      width: 10px;
      height: 10px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .swiper-pagination-custom .swiper-pagination-bullet-active {
      background: var(--coral);
      width: 28px;
      border-radius: 5px;
    }

    .scroll-product-card {
      flex-shrink: 0;
      width: 360px;
      text-decoration: none;
      display: block;
      scroll-snap-align: center;
      transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transform-style: preserve-3d;
      /* Default state: cards appear smaller/faded - positioned on left by default */
      transform: scale(0.72) rotateY(30deg) translateZ(-120px);
      opacity: 0.4;
      filter: blur(2px);
    }

    /* Active/center card - no rotation, full scale, pop forward */
    .scroll-product-card.active {
      transform: scale(1) rotateY(0deg) translateZ(60px);
      opacity: 1;
      filter: blur(0);
      z-index: 10;
    }

    /* LEFT adjacent card - rotates RIGHT (positive rotateY) toward center */
    .scroll-product-card.adjacent-left {
      transform: scale(0.85) rotateY(28deg) translateZ(-40px) translateX(15px);
      opacity: 0.9;
      filter: blur(0);
      z-index: 5;
    }

    /* RIGHT adjacent card - rotates LEFT (negative rotateY) toward center */
    .scroll-product-card.adjacent-right {
      transform: scale(0.85) rotateY(-28deg) translateZ(-40px) translateX(-15px);
      opacity: 0.9;
      filter: blur(0);
      z-index: 5;
    }

    /* Far LEFT cards - more dramatic rotation RIGHT toward center */
    .scroll-product-card.far-left {
      transform: scale(0.65) rotateY(40deg) translateZ(-180px) translateX(30px);
      opacity: 0.3;
      filter: blur(3px);
      z-index: 1;
    }

    /* Far RIGHT cards - more dramatic rotation LEFT toward center */
    .scroll-product-card.far-right {
      transform: scale(0.65) rotateY(-40deg) translateZ(-180px) translateX(-30px);
      opacity: 0.3;
      filter: blur(3px);
      z-index: 1;
    }

    /* Legacy far class for compatibility */
    .scroll-product-card.far {
      transform: scale(0.65) rotateY(40deg) translateZ(-180px);
      opacity: 0.3;
      filter: blur(3px);
      z-index: 1;
    }

    .scroll-card-inner {
      background: linear-gradient(145deg, var(--navy) 0%, #0f0f1a 100%);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 28px;
      padding: 36px 32px;
      height: 100%;
      min-height: 400px;
      position: relative;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4),
                  0 0 40px rgba(124, 58, 237, 0.1);
    }

    .scroll-product-card.active .scroll-card-inner {
      box-shadow: 0 35px 100px rgba(0, 0, 0, 0.5),
                  0 0 60px rgba(124, 58, 237, 0.25),
                  0 0 0 2px var(--purple);
      border-color: var(--purple);
    }

    .scroll-product-card:hover .scroll-card-inner {
      transform: translateY(-12px);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45),
                  0 0 50px rgba(124, 58, 237, 0.2),
                  0 0 0 2px var(--purple);
      border-color: var(--purple);
    }

    .scroll-card-badge {
      position: absolute;
      top: 24px;
      left: 24px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.85);
      padding: 8px 14px;
      border-radius: 100px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .scroll-card-popular {
      position: absolute;
      top: 24px;
      right: 24px;
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: white;
      padding: 8px 14px;
      border-radius: 100px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .scroll-card-icon {
      font-size: 5rem;
      margin: 40px 0 24px;
      text-align: center;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }

    .scroll-card-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.6rem;
      font-weight: 500;
      color: white;
      margin-bottom: 12px;
      text-align: center;
    }

    .scroll-card-desc {
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.7;
      text-align: center;
      flex-grow: 1;
      margin-bottom: 24px;
    }

    .scroll-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .scroll-card-price {
      font-family: 'Inter', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      color: white;
    }

    .scroll-card-cta {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--coral);
      transition: all 0.3s ease;
    }

    .scroll-product-card:hover .scroll-card-cta {
      color: var(--purple-light);
      transform: translateX(4px);
    }

    .scroll-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      color: #888;
      font-size: 0.85rem;
    }

    .scroll-indicator svg {
      animation: arrowBounce 1.5s ease-in-out infinite;
    }

    @keyframes arrowBounce {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(5px); }
    }

    @media (max-width: 768px) {
      .scroll-product-card {
        width: 280px;
        /* Simpler 3D effects on mobile */
        transform: scale(0.9) rotateY(20deg);
        opacity: 0.7;
        filter: blur(1px);
      }
      .scroll-product-card.active {
        transform: scale(1) rotateY(0deg);
        opacity: 1;
        filter: none;
      }
      .scroll-product-card.adjacent-left {
        transform: scale(0.92) rotateY(15deg);
        opacity: 0.85;
        filter: none;
      }
      .scroll-product-card.adjacent-right {
        transform: scale(0.92) rotateY(-15deg);
        opacity: 0.85;
        filter: none;
      }
      .scroll-product-card.far-left,
      .scroll-product-card.far-right,
      .scroll-product-card.far {
        transform: scale(0.8) rotateY(25deg);
        opacity: 0.4;
        filter: blur(2px);
      }
      .products-scroll {
        padding: 0 calc(50vw - 140px);
        gap: 16px;
      }
      .products-scroll-container {
        padding: 20px 0 40px;
      }
    }

    /* ================================================
       PRODUCTS GRID - Full catalog
       ================================================ */
    .products-grid {
      background: #fafafa;
    }

    .products-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .product-card {
      background: var(--surface-white);
      border-radius: 20px;
      border: 1px solid var(--border-light);
      padding: 28px;
      position: relative;
      transition: all var(--transition-slow);
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }

    .product-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.1);
      border-color: rgba(232, 90, 107, 0.2);
    }

    .product-card.featured {
      border-color: rgba(232, 90, 107, 0.3);
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.1);
    }

    .product-card.featured::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-primary);
      border-radius: 20px 20px 0 0;
    }

    .product-tag {
      position: absolute;
      top: 16px;
      right: 16px;
      background: var(--gradient-primary);
      color: white;
      padding: 5px 10px;
      border-radius: 100px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .product-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .product-name {
      font-size: 1.15rem;
      margin-bottom: 10px;
    }

    .product-desc {
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.6;
      margin-bottom: 16px;
      min-height: 54px;
    }

    .product-benefits {
      list-style: none;
      margin-bottom: 20px;
    }

    .product-benefits li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--text-muted);
      padding: 5px 0;
    }

    .product-benefits li::before {
      content: '✓';
      color: #16a34a;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .product-price {
      display: flex;
      align-items: baseline;
    }

    .price-currency {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-right: 2px;
    }

    .price-amount {
      font-size: 1.75rem;
      font-weight: 800;
    }

    /* ================================================
       HOW IT WORKS
       ================================================ */
    .steps {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .step {
      flex: 1;
      min-width: 200px;
      max-width: 240px;
      text-align: center;
    }

    .step-number {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 800;
      margin: 0 auto 18px;
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.25);
    }

    .step h3 {
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .step p {
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .step-connector {
      width: 50px;
      height: 2px;
      background: linear-gradient(90deg, var(--primary), transparent);
      margin-top: 30px;
      display: none;
    }

    @media (min-width: 900px) {
      .step-connector { display: block; }
    }

    /* ================================================
       TESTIMONIALS
       ================================================ */
    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .testimonial-card {
      background: var(--surface-white);
      border: 1px solid var(--border-light);
      border-radius: 16px;
      padding: 28px;
      transition: all var(--transition-slow);
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }

    .testimonial-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    }

    .testimonial-stars {
      color: var(--accent);
      font-size: 0.9rem;
      margin-bottom: 14px;
      letter-spacing: 2px;
    }

    .testimonial-quote {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin-bottom: 18px;
      font-style: italic;
    }

    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .testimonial-avatar {
      width: 40px;
      height: 40px;
      background: var(--gradient-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .testimonial-info .name {
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .verified {
      font-size: 0.65rem;
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
      padding: 2px 6px;
      border-radius: 100px;
    }

    .testimonial-info .product {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* ================================================
       FINAL CTA
       ================================================ */
    .final-cta {
      background: var(--bg-subtle);
    }

    .cta-card {
      background: var(--surface-white);
      border: 1px solid var(--border-light);
      border-radius: 28px;
      padding: 70px 50px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    }

    .cta-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-primary);
    }

    .cta-card h2 {
      font-size: clamp(1.6rem, 3vw, 2.25rem);
      margin-bottom: 14px;
    }

    .cta-card p {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-bottom: 28px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .cta-buttons {
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-large {
      padding: 16px 32px;
      font-size: 1rem;
    }

    /* ================================================
       RESPONSIVE
       ================================================ */
    @media (max-width: 1200px) {
      .feature-card-peek-left,
      .feature-card-peek-right {
        display: none;
      }

      .feature-card-side-left {
        margin-right: -20px;
      }

      .feature-card-side-right {
        margin-left: -20px;
      }
    }

    @media (max-width: 900px) {
      .feature-cards-wrapper {
        flex-direction: column;
        gap: 20px;
        padding: 20px;
      }

      .feature-card {
        width: 100%;
        max-width: 360px;
      }

      .feature-card-center,
      .feature-card-side-left,
      .feature-card-side-right {
        transform: none;
        margin: 0;
        opacity: 1;
      }

      .feature-card-side-left,
      .feature-card-side-right {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .hero {
        padding: 80px 20px 24px;
        min-height: auto;
      }

      .hero h1 {
        font-size: 1.75rem;
      }

      .hero-subtitle {
        font-size: 0.95rem;
        margin-bottom: 20px;
      }

      .products-container {
        grid-template-columns: 1fr;
      }

      .cta-card {
        padding: 50px 24px;
      }

      .cta-buttons {
        flex-direction: column;
      }

      .btn-large {
        width: 100%;
      }
    }
  `;
}

function getHomepageScripts(): string {
  return `
    // Swiper.js Carousel with 3D Effects
    // Cards rotate toward center for triangle/vanishing point effect
    function initProductsSwiper() {
      if (typeof Swiper === 'undefined') {
        console.warn('Swiper not loaded');
        return;
      }

      const swiperEl = document.querySelector('.products-swiper');
      if (!swiperEl) return;

      const swiper = new Swiper('.products-swiper', {
        // Slide settings
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 12,
        grabCursor: true,

        // Speed and smoothness
        speed: 600,

        // Loop for infinite scroll
        loop: true,

        // Auto-play (optional - disabled for manual control)
        // autoplay: { delay: 4000, disableOnInteraction: false },

        // Responsive breakpoints
        breakpoints: {
          320: { slidesPerView: 1.2, spaceBetween: 16 },
          480: { slidesPerView: 1.5, spaceBetween: 16 },
          768: { slidesPerView: 2.5, spaceBetween: 16 },
          1024: { slidesPerView: 3, spaceBetween: 12 },
          1400: { slidesPerView: 4, spaceBetween: 12 }
        },

        // Navigation buttons
        navigation: {
          nextEl: '.swiper-btn-next',
          prevEl: '.swiper-btn-prev',
        },

        // Pagination
        pagination: {
          el: '.swiper-pagination-custom',
          clickable: true,
          dynamicBullets: true,
        },

        // Custom 3D Effect on slide change
        on: {
          slideChange: function() {
            update3DEffect(this);
          },
          init: function() {
            update3DEffect(this);
          }
        }
      });

      // 3D rotation effect - cards rotate TOWARD center
      function update3DEffect(swiper) {
        const slides = swiper.slides;
        const activeIndex = swiper.activeIndex;

        slides.forEach((slide, index) => {
          const card = slide.querySelector('.scroll-product-card');
          if (!card) return;

          // Calculate real index accounting for loop
          let realIndex = index;
          if (swiper.params.loop) {
            realIndex = parseInt(slide.getAttribute('data-swiper-slide-index') || index);
          }

          const diff = index - activeIndex;
          const absDiff = Math.abs(diff);

          // Remove previous classes
          card.classList.remove('active', 'adjacent-left', 'adjacent-right', 'far-left', 'far-right');

          if (absDiff === 0) {
            // Center card
            card.classList.add('active');
          } else if (absDiff === 1) {
            // Adjacent cards
            card.classList.add(diff < 0 ? 'adjacent-left' : 'adjacent-right');
          } else {
            // Far cards
            card.classList.add(diff < 0 ? 'far-left' : 'far-right');
          }
        });
      }
    }

    // Initialize Swiper
    initProductsSwiper();

    // Scroll reveal animations
    const revealElements = document.querySelectorAll('.step, .testimonial-card, .product-card, .feature-card');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = entry.target.classList.contains('feature-card-center')
              ? 'scale(1.05) translateY(-10px)'
              : 'translateY(0)';
          }, index * 50);
        }
      });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'all 0.6s ease';
      revealObserver.observe(el);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // 30-second headline animation loop reset
    function resetHeadlineAnimation() {
      const lines = document.querySelectorAll('.headline-line');
      if (!lines.length) return;

      // Add reset class to stop animation and reset position
      lines.forEach(line => {
        line.classList.add('animate-reset');
      });

      // Brief pause then re-trigger animation
      setTimeout(() => {
        lines.forEach(line => {
          line.classList.remove('animate-reset');
          // Force reflow to restart animation
          void line.offsetWidth;
        });
      }, 100);
    }

    // Start the 30-second loop
    setInterval(resetHeadlineAnimation, 30000);
  `;
}

// Keep sync version for backwards compatibility
export function renderPremiumHomepageV4Sync(): string {
  // Synchronous fallback using static product order
  const orderedProducts = Object.values(PRODUCTS)
    .filter(p => p.isActive)
    .map(p => ({ ...p, salesScore: 0, recentSales: 0 }));

  // Return a simplified version without async
  // In practice, the async version should always be used
  return '<!-- Use renderPremiumHomepageV4() async version -->';
}
