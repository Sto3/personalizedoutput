/**
 * ProductCarousel - Clean Swiper.js Coverflow Implementation
 *
 * This is a completely fresh rebuild from scratch.
 * DO NOT add any custom CSS transforms - let Swiper handle ALL 3D effects.
 */

import { ProductWithScore } from '../lib/supabase/orderService';

// Icons for each product
const PRODUCT_ICONS: Record<string, string> = {
  santa_message: '🎁',
  vision_board: '🎯',
  flash_cards: '📚',
  learning_session: '🧠',
  video_learning_session: '🎬',
  holiday_reset: '🎄',
  new_year_reset: '🌟',
  clarity_planner: '💡',
  thought_organizer: '✨',
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  kids: 'For Kids',
  adults: 'For Adults',
  life_planning: 'Life Planning',
};

/**
 * Generates the HTML for a single carousel slide
 */
function renderSlide(product: ProductWithScore): string {
  const icon = PRODUCT_ICONS[product.id] || '📦';
  const categoryLabel = CATEGORY_LABELS[product.category] || 'Product';

  return `
    <div class="swiper-slide">
      <a href="/${product.slug}" class="carousel-card">
        <span class="card-badge">${categoryLabel}</span>
        <div class="card-icon">${icon}</div>
        <h3 class="card-title">${product.name}</h3>
        <p class="card-desc">${product.description}</p>
        <div class="card-footer">
          <span class="card-price">$${(product.price / 100).toFixed(0)}</span>
          <span class="card-cta">Get Started →</span>
        </div>
      </a>
    </div>
  `;
}

/**
 * Generates the complete carousel HTML
 */
export function renderProductCarousel(products: ProductWithScore[]): string {
  return `
    <section class="products-carousel-section" id="products">
      <span class="carousel-label">Our Products</span>
      <div class="swiper carousel-swiper">
        <div class="swiper-wrapper">
          ${products.map(p => renderSlide(p)).join('')}
        </div>
        <div class="swiper-pagination"></div>
      </div>
    </section>
  `;
}

/**
 * Generates the carousel CSS
 * CRITICAL: NO custom transforms on slides - Swiper coverflow handles ALL 3D
 */
export function getCarouselStyles(): string {
  return `
    /* ================================================
       CAROUSEL SECTION - Clean Container
       ================================================ */
    .products-carousel-section {
      padding: 40px 0 60px;
      background: var(--purple);
      overflow: hidden;
    }

    .carousel-label {
      display: block;
      text-align: center;
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.35em;
      color: #E85A4F;
      margin-bottom: 20px;
    }

    /* ================================================
       SWIPER CONTAINER - Let Swiper do everything
       ================================================ */
    .carousel-swiper {
      width: 100%;
      padding: 50px 0;
    }

    .carousel-swiper .swiper-slide {
      width: 300px;
      height: 340px;
      /* CRITICAL: No transform, no transition - Swiper handles it */
    }

    /* ================================================
       CARD STYLING ONLY - No transforms here either
       ================================================ */
    .carousel-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: #0a0a10;
      border-radius: 20px;
      border: 1px solid rgba(124, 58, 237, 0.25);
      padding: 24px;
      text-decoration: none;
      color: white;
      /* NO transform properties */
    }

    .card-badge {
      background: rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      width: fit-content;
      margin-bottom: 16px;
    }

    .card-icon {
      font-size: 2.5rem;
      margin-bottom: 14px;
    }

    .card-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .card-desc {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      line-height: 1.5;
      flex-grow: 1;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: auto;
    }

    .card-price {
      font-size: 1.3rem;
      font-weight: 700;
    }

    .card-cta {
      color: #E85A4F;
      font-size: 0.85rem;
    }

    /* ================================================
       PAGINATION - Simple dots
       ================================================ */
    .carousel-swiper .swiper-pagination-bullet {
      background: rgba(255, 255, 255, 0.3);
    }

    .carousel-swiper .swiper-pagination-bullet-active {
      background: #E85A4F;
    }

    /* ================================================
       RESPONSIVE
       ================================================ */
    @media (max-width: 768px) {
      .carousel-swiper .swiper-slide {
        width: 260px;
        height: 320px;
      }
      .carousel-card {
        padding: 20px;
      }
    }
  `;
}

/**
 * Generates the carousel JavaScript
 * Uses native Swiper coverflow - NO custom position calculations
 */
export function getCarouselScript(): string {
  return `
    // Initialize Swiper coverflow carousel
    function initCarousel() {
      if (typeof Swiper === 'undefined') {
        console.warn('Swiper not loaded');
        return;
      }

      new Swiper('.carousel-swiper', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: false,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
      });
      console.log('Carousel initialized!');
    }

    // Initialize when ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCarousel);
    } else {
      initCarousel();
    }
  `;
}
