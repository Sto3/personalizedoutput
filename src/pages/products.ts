/**
 * Products Page
 *
 * Premium product showcase page with all products displayed
 * in a clean, sophisticated grid layout.
 * Matches the new homepage design with coral/purple color scheme.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';
import { PRODUCTS, ProductType, getProductsOrderedBySales, ProductWithScore } from '../lib/supabase/orderService';

export async function renderProductsPage(): Promise<string> {
  // Get dynamically ordered products by sales
  let orderedProducts: ProductWithScore[];
  try {
    orderedProducts = await getProductsOrderedBySales();
  } catch (e) {
    orderedProducts = Object.values(PRODUCTS)
      .filter(p => p.isActive)
      .map(p => ({ ...p, salesScore: 0, recentSales: 0 }));
  }

  // Group products by category
  const kidsProducts = orderedProducts.filter(p => p.category === 'kids');
  const adultsProducts = orderedProducts.filter(p => p.category === 'adults');
  const planningProducts = orderedProducts.filter(p => p.category === 'life_planning');

  const pageStyles = getProductsPageStyles();
  const pageContent = `
    <main class="products-page">
      <!-- Hero Section -->
      <section class="products-hero">
        <div class="container">
          <span class="eyebrow">Our Products</span>
          <h1>Every Product, <span class="highlight">Uniquely Yours</span></h1>
          <p class="hero-desc">
            Each experience is crafted around your specific details, interests, and goals.
            No templates. No generic content. Just deeply personal creations.
          </p>
        </div>
      </section>

      <!-- Featured Products Grid -->
      <section class="products-section">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">🎓</span> For Kids & Learning</h2>
            <p>Educational experiences that use what they love to teach what they need</p>
          </div>
          <div class="products-grid">
            ${kidsProducts.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>

      <section class="products-section alt">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">✨</span> For Adults</h2>
            <p>Personal growth tools designed around your unique journey</p>
          </div>
          <div class="products-grid">
            ${adultsProducts.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>

      <section class="products-section">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">🎯</span> Life Planning</h2>
            <p>Strategic planning tools that reflect your actual priorities</p>
          </div>
          <div class="products-grid">
            ${planningProducts.map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Not Sure Which Product Is Right?</h2>
          <p>Every product starts with a simple questionnaire. We'll guide you through it.</p>
          <a href="/how-it-works" class="btn btn-primary">See How It Works</a>
        </div>
      </section>
    </main>
  `;

  return renderPageStart({
    title: 'All Products',
    description: 'Browse our collection of personalized products. Santa messages, vision boards, learning sessions, planners, and more - each uniquely crafted for you.',
    currentPage: 'products',
    additionalStyles: pageStyles
  }) + pageContent + renderPageEnd();
}

function renderProductCard(product: ProductWithScore): string {
  const icons: Record<string, string> = {
    santa_message: '🎅',
    vision_board: '🎯',
    flash_cards: '📚',
    learning_session: '🧠',
    holiday_reset: '🎄',
    new_year_reset: '✨',
    clarity_planner: '💡',
    thought_organizer: '🧠',
  };

  return `
    <a href="/${product.slug}" class="product-card">
      <div class="card-content">
        <div class="card-icon">${icons[product.id] || '📦'}</div>
        ${product.salesScore > 0 ? '<span class="popular-badge">Popular</span>' : ''}
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="card-footer">
          <span class="price">$${(product.price / 100).toFixed(0)}</span>
          <span class="cta">Learn More <span class="arrow">→</span></span>
        </div>
      </div>
    </a>
  `;
}

function getProductsPageStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .products-page {
      background: #fafafa;
    }

    /* Hero Section */
    .products-hero {
      padding: 120px 24px 80px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      text-align: center;
    }

    .products-hero .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--purple);
      margin-bottom: 16px;
    }

    .products-hero h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 20px;
    }

    .products-hero h1 .highlight {
      color: var(--purple);
      font-style: italic;
    }

    .products-hero .hero-desc {
      font-size: 1.1rem;
      color: #64748b;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Products Section */
    .products-section {
      padding: 80px 24px;
    }

    .products-section.alt {
      background: white;
    }

    .products-section .section-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .products-section .section-header h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .products-section .section-header h2 .icon {
      margin-right: 8px;
    }

    .products-section .section-header p {
      color: #64748b;
      font-size: 1rem;
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Product Card */
    .product-card {
      display: block;
      background: white;
      border-radius: 20px;
      padding: 32px;
      text-decoration: none;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.04);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .product-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--purple), var(--coral));
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 0;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(124, 58, 237, 0.15);
    }

    .product-card:hover::before {
      opacity: 0.03;
    }

    .card-content {
      position: relative;
      z-index: 1;
    }

    .card-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .popular-badge {
      position: absolute;
      top: 0;
      right: 0;
      background: var(--coral);
      color: white;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 12px;
      border-radius: 20px;
    }

    .product-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .product-card p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }

    .price {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--navy);
    }

    .cta {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--coral);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .cta .arrow {
      transition: transform 0.2s ease;
    }

    .product-card:hover .cta .arrow {
      transform: translateX(4px);
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
      .products-hero {
        padding: 100px 20px 60px;
      }

      .products-section {
        padding: 60px 20px;
      }

      .products-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .product-card {
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
