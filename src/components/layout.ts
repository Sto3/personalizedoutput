/**
 * Shared Layout Components
 *
 * Provides consistent header, footer, and layout across all pages.
 * Features:
 * - Black header with mega menu on Products hover
 * - Updated typography (Bodoni Moda headlines, Great Vibes accents)
 * - Coral/salmon CTA color (#E85A6B)
 * - Dark mode ready CSS variables
 * - Mobile responsive with drawer menu
 * - IP protection (copyright, TM)
 */

import { PRODUCTS, ProductType, ProductInfo } from '../lib/supabase/orderService';

// ============================================================
// SHARED CSS VARIABLES & STYLES
// ============================================================

export function getSharedStyles(): string {
  return `
    /* Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* CSS Variables - Light Theme (Dark Mode Ready) */
    :root {
      /* Primary CTA color - Coral/Salmon */
      --primary: #E85A6B;
      --primary-light: #FF7A8A;
      --primary-dark: #C94A5A;

      /* Accent colors */
      --accent: #f59e0b;
      --accent-light: #fbbf24;
      --accent-dark: #d97706;

      /* Light theme backgrounds */
      --bg-white: #ffffff;
      --bg-light: #f8fafc;
      --bg-subtle: #f1f5f9;
      --bg-muted: #e2e8f0;

      /* Surfaces */
      --surface-white: #ffffff;
      --surface-elevated: #ffffff;
      --surface-card: #ffffff;

      /* Text colors */
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --text-on-dark: #ffffff;

      /* Navigation - Black header */
      --nav-bg: #0a0a0f;
      --nav-text: #ffffff;

      /* Borders */
      --border-light: #e2e8f0;
      --border-subtle: #cbd5e1;

      /* Shadows */
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
      --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.1);
      --shadow-xl: 0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.06);
      --shadow-glow-primary: 0 0 20px rgba(232, 90, 107, 0.15), 0 0 40px rgba(232, 90, 107, 0.1);

      /* Gradients */
      --gradient-primary: linear-gradient(135deg, var(--primary), var(--primary-light));
      --gradient-warm: linear-gradient(135deg, #fef3c7, #fde68a);

      /* Transitions */
      --transition-fast: 0.15s ease;
      --transition-normal: 0.3s ease;
      --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);

      /* Spacing */
      --section-padding: 120px;
      --section-padding-mobile: 80px;
      --container-max: 1400px;
      --container-narrow: 900px;
    }

    /* Dark Mode (prepared for future) */
    [data-theme="dark"] {
      --bg-white: #0f0f1a;
      --bg-light: #1a1a2e;
      --bg-subtle: #242438;
      --bg-muted: #2e2e44;
      --surface-white: #1a1a2e;
      --surface-elevated: #242438;
      --surface-card: #1a1a2e;
      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --border-light: rgba(255,255,255,0.1);
      --border-subtle: rgba(255,255,255,0.15);
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-white);
      color: var(--text-primary);
      line-height: 1.6;
      overflow-x: hidden;
    }

    /* Typography */
    h1, h2, h3, .headline {
      font-family: 'Bodoni Moda', 'Playfair Display', Georgia, serif;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .script-accent {
      font-family: 'Great Vibes', cursive;
      font-weight: 400;
    }

    /* Animations */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes buttonShimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Utility Classes */
    .container {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: 0 24px;
    }
    .container-narrow {
      max-width: var(--container-narrow);
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all var(--transition-normal);
      font-size: 1rem;
      border: none;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--gradient-primary);
      color: white;
      box-shadow: var(--shadow-md), 0 0 20px rgba(232, 90, 107, 0.2);
      position: relative;
      overflow: hidden;
    }
    .btn-primary::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg), var(--shadow-glow-primary);
    }
    .btn-primary:hover::before {
      animation: buttonShimmer 0.6s ease-out;
    }
    .btn-secondary {
      background: var(--bg-white);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-sm);
    }
    .btn-secondary:hover {
      background: var(--bg-subtle);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    /* Nav button - white border on transparent/dark background */
    .nav .btn-secondary {
      background: transparent;
      color: #ffffff;
      border: 2px solid #ffffff;
      box-shadow: none;
    }
    .nav .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
      transform: translateY(-2px);
      box-shadow: none;
    }

    /* Section Styling */
    .section {
      padding: var(--section-padding) 24px;
    }
    .section-header {
      text-align: center;
      margin-bottom: 60px;
    }
    .section-eyebrow {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--primary);
      margin-bottom: 16px;
    }
    .section-header h2 {
      font-size: clamp(2rem, 4vw, 3rem);
      margin-bottom: 20px;
    }
    .section-header p {
      font-size: 1.125rem;
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .section {
        padding: var(--section-padding-mobile) 20px;
      }
    }
  `;
}

// ============================================================
// NAVIGATION / HEADER
// ============================================================

export interface NavOptions {
  currentPage?: string;
  showMegaMenu?: boolean;
}

export function renderNavigation(options: NavOptions = {}): string {
  const { currentPage = '', showMegaMenu = true } = options;

  // Group products by category for mega menu
  const productsByCategory = {
    kids: Object.values(PRODUCTS).filter(p => p.category === 'kids' && p.isActive),
    adults: Object.values(PRODUCTS).filter(p => p.category === 'adults' && p.isActive),
    life_planning: Object.values(PRODUCTS).filter(p => p.category === 'life_planning' && p.isActive),
  };

  return `
    <nav class="nav" id="main-nav">
      <div class="nav-inner">
        <a href="/" class="logo">personalized<span>output</span></a>

        <div class="nav-links">
          <a href="/how-it-works" class="nav-link ${currentPage === 'how-it-works' ? 'active' : ''}">How It Works</a>

          <div class="nav-dropdown">
            <a href="/products" class="nav-link nav-link-dropdown ${currentPage === 'products' ? 'active' : ''}">
              Products
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </a>
            ${showMegaMenu ? renderMegaMenu(productsByCategory) : ''}
          </div>

          <a href="/pricing" class="nav-link ${currentPage === 'pricing' ? 'active' : ''}">Pricing</a>
          <a href="/blog" class="nav-link ${currentPage === 'blog' ? 'active' : ''}">Blog</a>

          <!-- Sign Up Dropdown -->
          <div class="nav-dropdown nav-newsletter-dropdown" id="email-signup-dropdown">
            <button class="nav-link nav-link-dropdown" id="email-signup-btn" type="button">
              Sign Up
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
            <div class="newsletter-dropdown" id="newsletter-dropdown-panel">
              <div class="newsletter-dropdown-content">
                <h4>Stay in the Loop</h4>
                <p>Get early access, exclusive offers & product updates</p>
                <form class="nav-newsletter-form" id="nav-newsletter-form">
                  <input type="email" name="email" placeholder="your@email.com" required class="nav-newsletter-input" autocomplete="email">
                  <button type="submit" class="nav-newsletter-btn">Join</button>
                </form>
                <p class="newsletter-privacy-note">No spam, unsubscribe anytime</p>
              </div>
            </div>
          </div>

          <a href="/login" class="nav-link ${currentPage === 'login' ? 'active' : ''}">Login</a>
          <a href="/demo-lessons" class="nav-cta">Listen to Demos</a>
        </div>

        <button class="mobile-menu-btn" aria-label="Open menu">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </nav>

    <!-- Mobile Menu -->
    <div class="mobile-menu-overlay" id="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu-header">
        <a href="/" class="logo">personalized<span>output</span></a>
        <button class="mobile-close-btn" aria-label="Close menu">&times;</button>
      </div>
      <div class="mobile-menu-links">
        <a href="/how-it-works" class="mobile-link">How It Works</a>
        <div class="mobile-submenu">
          <div class="mobile-submenu-header">Products</div>
          ${Object.values(PRODUCTS).filter(p => p.isActive).map(p => {
            const isLaunched = LAUNCHED_PRODUCTS.includes(p.id);
            const link = isLaunched ? `/${p.slug}` : '/coming-soon';
            const badge = isLaunched ? '' : ' <span class="mobile-soon">Soon</span>';
            return `<a href="${link}" class="mobile-submenu-link">${p.name}${badge}</a>`;
          }).join('')}
        </div>
        <a href="/pricing" class="mobile-link">Pricing</a>
        <a href="/blog" class="mobile-link">Blog</a>
        <a href="/login" class="mobile-link">Login</a>
        <a href="/demo-lessons" class="mobile-cta">Listen to Demos</a>
      </div>
    </div>
  `;
}

// Products that are launched and ready for purchase
const LAUNCHED_PRODUCTS = ['santa_message', 'vision_board'];

function isProductLaunched(productId: string): boolean {
  return LAUNCHED_PRODUCTS.includes(productId);
}

function renderMegaMenuItem(p: ProductInfo): string {
  const isLaunched = isProductLaunched(p.id);
  const link = isLaunched ? `/${p.slug}` : '/coming-soon';
  const comingSoonBadge = isLaunched ? '' : '<span class="mega-menu-soon">Coming Soon</span>';

  return `
    <a href="${link}" class="mega-menu-item ${!isLaunched ? 'coming-soon' : ''}">
      <span class="mega-menu-icon">${getProductIcon(p.id)}</span>
      <div>
        <div class="mega-menu-name">${p.name}${p.id === 'thought_organizer' ? '<sup>™</sup>' : ''} ${comingSoonBadge}</div>
        <div class="mega-menu-desc">${p.description.substring(0, 60)}...</div>
        <div class="mega-menu-price">$${(p.price / 100).toFixed(0)}</div>
      </div>
    </a>
  `;
}

function renderMegaMenu(productsByCategory: Record<string, ProductInfo[]>): string {
  return `
    <div class="mega-menu">
      <div class="mega-menu-inner">
        <div class="mega-menu-column">
          <h4 class="mega-menu-title">For Kids</h4>
          ${productsByCategory.kids.map(p => renderMegaMenuItem(p)).join('')}
        </div>

        <div class="mega-menu-column">
          <h4 class="mega-menu-title">For Adults</h4>
          ${productsByCategory.adults.map(p => renderMegaMenuItem(p)).join('')}
        </div>

        <div class="mega-menu-column">
          <h4 class="mega-menu-title">Life Planning</h4>
          ${productsByCategory.life_planning.map(p => renderMegaMenuItem(p)).join('')}
        </div>
      </div>
      <div class="mega-menu-footer">
        <a href="/products" class="mega-menu-view-all">
          View All Products <span class="arrow">→</span>
        </a>
      </div>
    </div>
  `;
}

function getProductIcon(productId: string): string {
  const icons: Record<string, string> = {
    santa_message: '🎁',
    vision_board: '🎯',
    flash_cards: '📚',
    learning_session: '🧠🎧',
    video_learning_session: '🧠🎬',
    holiday_reset: '🎄',
    new_year_reset: '✨',
    clarity_planner: '💡',
    thought_organizer: '✨',
  };
  return icons[productId] || '📦';
}

export function getNavigationStyles(): string {
  return `
    /* Navigation - Purple header (matches page purple) */
    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 16px 24px;
      background: #7C3AED;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-bottom: none;
      transition: all var(--transition-normal);
    }
    .nav.scrolled {
      padding: 12px 24px;
      background: #7C3AED;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .nav-inner {
      max-width: var(--container-max);
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Logo */
    .logo {
      font-family: 'Bodoni Moda', 'Playfair Display', serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-on-dark);
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .logo span {
      color: #E85A4F;
      -webkit-text-fill-color: #E85A4F;
    }

    /* Nav Links */
    .nav-links {
      display: flex;
      gap: 32px;
      align-items: center;
    }
    .nav-link {
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: color var(--transition-fast);
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: linear-gradient(135deg, #7C3AED, #A78BFA);
      transition: width var(--transition-normal);
    }
    .nav-link:hover, .nav-link.active { color: #FFFFFF; }
    .nav-link:hover::after, .nav-link.active::after { width: 100%; }

    .nav-link-dropdown svg {
      transition: transform var(--transition-fast);
    }
    .nav-dropdown:hover .nav-link-dropdown svg {
      transform: rotate(180deg);
    }

    /* Nav CTA Button */
    .nav-cta {
      padding: 12px 24px;
      background: var(--gradient-primary);
      color: white;
      border-radius: 100px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all var(--transition-normal);
      box-shadow: 0 4px 15px rgba(232, 90, 107, 0.3);
    }
    .nav-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(232, 90, 107, 0.4);
    }

    /* Mega Menu */
    .nav-dropdown {
      position: relative;
    }
    .mega-menu {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: var(--surface-white);
      border-radius: 20px;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xl);
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
      min-width: 800px;
      margin-top: 20px;
    }
    .nav-dropdown:hover .mega-menu {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
    .mega-menu-inner {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      padding: 36px 40px 24px;
    }
    .mega-menu-column {
      min-width: 0;
    }
    .mega-menu-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7C3AED;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(124, 58, 237, 0.15);
    }
    .mega-menu-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      border-radius: 16px;
      text-decoration: none;
      transition: all var(--transition-fast);
      margin-bottom: 8px;
    }
    .mega-menu-item:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(232, 90, 107, 0.05));
      transform: translateX(4px);
    }
    .mega-menu-icon {
      font-size: 2rem;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(232, 90, 107, 0.1));
      border-radius: 14px;
      flex-shrink: 0;
    }
    .mega-menu-name {
      font-family: 'Bodoni Moda', serif;
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .mega-menu-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .mega-menu-price {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary);
    }
    .mega-menu-footer {
      border-top: 1px solid var(--border-light);
      padding: 16px 40px;
      text-align: center;
      background: var(--bg-subtle);
      border-radius: 0 0 20px 20px;
    }
    .mega-menu-view-all {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #7C3AED;
      text-decoration: none;
      transition: all var(--transition-fast);
    }
    .mega-menu-view-all:hover {
      color: var(--primary);
    }
    .mega-menu-view-all .arrow {
      transition: transform var(--transition-fast);
    }
    .mega-menu-view-all:hover .arrow {
      transform: translateX(4px);
    }

    /* Coming Soon badge in mega menu */
    .mega-menu-soon {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-left: 6px;
      vertical-align: middle;
    }
    .mega-menu-item.coming-soon {
      opacity: 0.85;
    }
    .mega-menu-item.coming-soon:hover {
      opacity: 1;
    }

    /* Email Signup Dropdown in Header */
    .nav-newsletter-dropdown button {
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }
    .newsletter-dropdown {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: var(--surface-white);
      border-radius: 16px;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xl);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: all var(--transition-normal);
      min-width: 320px;
      margin-top: 20px;
      z-index: 1001;
    }
    .nav-newsletter-dropdown.open .newsletter-dropdown,
    .nav-newsletter-dropdown:hover .newsletter-dropdown {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateX(-50%) translateY(0);
    }
    .newsletter-dropdown-content {
      padding: 28px 24px;
      text-align: center;
    }
    .newsletter-dropdown-content h4 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.2rem;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .newsletter-dropdown-content > p {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 20px;
      line-height: 1.4;
    }
    .nav-newsletter-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .nav-newsletter-input {
      padding: 14px 16px;
      border-radius: 10px;
      border: 2px solid var(--border-light);
      font-size: 1rem;
      width: 100%;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .nav-newsletter-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }
    .nav-newsletter-btn {
      padding: 14px 24px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #E85A4F 0%, #E85A6B 100%) !important;
      color: white !important;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: block;
      width: 100%;
      text-align: center;
    }
    .nav-newsletter-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(232, 90, 107, 0.35);
      background: linear-gradient(135deg, #d64a3f 0%, #d64a5b 100%) !important;
    }
    .nav-newsletter-btn:active {
      transform: translateY(0);
    }
    .newsletter-privacy-note {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 12px;
      opacity: 0.8;
    }

    .btn-small {
      padding: 10px 20px;
      font-size: 0.85rem;
    }

    /* Mobile Menu Button */
    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      color: var(--text-on-dark);
      cursor: pointer;
      padding: 8px;
      flex-direction: column;
      gap: 5px;
      z-index: 1001;
    }
    .hamburger-line {
      display: block;
      width: 24px;
      height: 2px;
      background: var(--text-on-dark);
      border-radius: 2px;
      transition: all var(--transition-normal);
    }
    .mobile-menu-btn.active .hamburger-line:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    .mobile-menu-btn.active .hamburger-line:nth-child(2) {
      opacity: 0;
    }
    .mobile-menu-btn.active .hamburger-line:nth-child(3) {
      transform: rotate(-45deg) translate(5px, -5px);
    }

    /* Mobile Menu Overlay & Drawer */
    .mobile-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 998;
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
    }
    .mobile-menu-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .mobile-menu {
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      max-width: 85vw;
      height: 100vh;
      background: var(--nav-bg);
      border-left: 1px solid rgba(255,255,255,0.1);
      z-index: 999;
      transform: translateX(100%);
      transition: transform var(--transition-slow);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .mobile-menu.active {
      transform: translateX(0);
    }
    .mobile-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .mobile-close-btn {
      background: none;
      border: none;
      color: var(--text-on-dark);
      font-size: 2rem;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    .mobile-menu-links {
      display: flex;
      flex-direction: column;
      padding: 24px;
      gap: 4px;
      flex: 1;
    }
    .mobile-link {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 500;
      padding: 14px 16px;
      border-radius: 12px;
      transition: all var(--transition-fast);
    }
    .mobile-link:hover {
      color: white;
      background: rgba(255,255,255,0.1);
    }
    .mobile-submenu {
      margin: 8px 0;
    }
    .mobile-submenu-header {
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 8px 16px;
    }
    .mobile-submenu-link {
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 0.95rem;
      padding: 10px 16px 10px 28px;
      display: block;
      border-radius: 8px;
      transition: all var(--transition-fast);
    }
    .mobile-submenu-link:hover {
      color: white;
      background: rgba(255,255,255,0.05);
    }
    .mobile-soon {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-left: 6px;
      vertical-align: middle;
    }
    .mobile-cta {
      margin-top: 16px;
      padding: 16px 24px;
      background: var(--gradient-primary);
      color: white;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      text-align: center;
      transition: all var(--transition-normal);
    }
    body.menu-open {
      overflow: hidden;
    }

    @media (max-width: 1024px) {
      .mega-menu {
        display: none;
      }
    }
    @media (max-width: 900px) {
      .nav-links { display: none; }
      .mobile-menu-btn { display: flex; }
    }
  `;
}

// ============================================================
// FOOTER
// ============================================================

export function renderFooter(): string {
  const currentYear = new Date().getFullYear();

  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-main">
          <div class="footer-brand">
            <a href="/" class="logo">personalized<span>output</span></a>
            <p class="footer-tagline">Products so personal that customers tell us: "I'm so thankful for a product I can fine-tune to exactly what I truly need — it's unbelievable."</p>
          </div>

          <div class="footer-links">
            <div class="footer-column">
              <h4>Products</h4>
              ${Object.values(PRODUCTS).filter(p => p.isActive).slice(0, 4).map(p => `
                <a href="/${p.slug}">${p.name}</a>
              `).join('')}
            </div>

            <div class="footer-column">
              <h4>Company</h4>
              <a href="/how-it-works">How It Works</a>
              <a href="/pricing">Pricing</a>
              <a href="/blog">Blog</a>
              <a href="mailto:hello@personalizedoutput.com">Contact</a>
            </div>

            <div class="footer-column">
              <h4>Legal</h4>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="/copyright">Copyright</a>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="footer-copyright">
            © ${currentYear} Personalized Output. All rights reserved.
            <br>
            <span class="footer-tm">Thought Organizer™ is a trademark of Personalized Output.</span>
          </p>
        </div>
      </div>
    </footer>
  `;
}

export function getFooterStyles(): string {
  return `
    /* Footer */
    .footer {
      background: var(--nav-bg);
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 80px 24px 40px;
    }
    .footer-inner {
      max-width: var(--container-max);
      margin: 0 auto;
    }
    .footer-main {
      display: grid;
      grid-template-columns: 1.5fr 2fr;
      gap: 80px;
      margin-bottom: 60px;
    }
    .footer-brand .logo {
      margin-bottom: 16px;
      display: inline-block;
    }
    .footer-tagline {
      color: var(--text-muted);
      font-size: 0.95rem;
      max-width: 300px;
      line-height: 1.6;
    }
    .footer-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
    }
    .footer-column h4 {
      color: var(--text-on-dark);
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 20px;
    }
    .footer-column a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      padding: 6px 0;
      transition: color var(--transition-fast);
    }
    .footer-column a:hover {
      color: var(--text-on-dark);
    }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 30px;
      text-align: center;
    }
    .footer-copyright {
      color: var(--text-muted);
      font-size: 0.85rem;
      line-height: 1.8;
    }
    .footer-tm {
      font-size: 0.8rem;
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      .footer-main {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      .footer-links {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      .footer-links {
        grid-template-columns: 1fr;
      }
    }
  `;
}

// ============================================================
// PAGE WRAPPER / LAYOUT
// ============================================================

export interface PageOptions {
  title: string;
  description?: string;
  canonical?: string;
  currentPage?: string;
  includeNavigation?: boolean;
  includeFooter?: boolean;
  bodyClass?: string;
  additionalHead?: string;
  additionalStyles?: string;
}

export function renderPageStart(options: PageOptions): string {
  const {
    title,
    description = 'Products so personal that customers tell us: "I\'m so thankful for a product I can fine-tune to exactly what I truly need — it\'s unbelievable."',
    canonical = 'https://personalizedoutput.com',
    currentPage = '',
    includeNavigation = true,
    bodyClass = '',
    additionalHead = '',
    additionalStyles = '',
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} | personalizedoutput</title>
      <meta name="description" content="${description}">
      <link rel="canonical" href="${canonical}">

      <!-- Open Graph -->
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${canonical}">

      <!-- PWA -->
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#E85A6B">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="PersonalizedOutput">
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png">

      <!-- Fonts -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700&family=Spectral:ital,wght@0,400;0,500;1,400;1,500&family=Great+Vibes&family=Dancing+Script:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@1,400;1,500&display=swap" rel="stylesheet">

      <!-- Swiper.js for smooth carousel -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
      <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

      ${additionalHead}

      <style>
        ${getSharedStyles()}
        ${getNavigationStyles()}
        ${getFooterStyles()}
        ${additionalStyles}
      </style>
    </head>
    <body class="${bodyClass}">
      ${includeNavigation ? renderNavigation({ currentPage }) : ''}
  `;
}

export function renderPageEnd(options: { includeFooter?: boolean } = {}): string {
  const { includeFooter = true } = options;

  return `
      ${includeFooter ? renderFooter() : ''}

      <script>
        // Navigation scroll effect
        window.addEventListener('scroll', () => {
          const nav = document.getElementById('main-nav');
          if (nav) {
            if (window.scrollY > 50) {
              nav.classList.add('scrolled');
            } else {
              nav.classList.remove('scrolled');
            }
          }
        });

        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const mobileCloseBtn = document.querySelector('.mobile-close-btn');
        const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-cta, .mobile-submenu-link');

        function openMobileMenu() {
          mobileMenu?.classList.add('active');
          mobileOverlay?.classList.add('active');
          mobileMenuBtn?.classList.add('active');
          document.body.classList.add('menu-open');
        }

        function closeMobileMenu() {
          mobileMenu?.classList.remove('active');
          mobileOverlay?.classList.remove('active');
          mobileMenuBtn?.classList.remove('active');
          document.body.classList.remove('menu-open');
        }

        mobileMenuBtn?.addEventListener('click', () => {
          if (mobileMenu?.classList.contains('active')) {
            closeMobileMenu();
          } else {
            openMobileMenu();
          }
        });

        mobileCloseBtn?.addEventListener('click', closeMobileMenu);
        mobileOverlay?.addEventListener('click', closeMobileMenu);
        mobileLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
            closeMobileMenu();
          }
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        // PWA Service Worker
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          });
        }

        // Email Signup Dropdown - Click to toggle
        const emailSignupDropdown = document.getElementById('email-signup-dropdown');
        const emailSignupBtn = document.getElementById('email-signup-btn');
        const dropdownPanel = document.getElementById('newsletter-dropdown-panel');

        if (emailSignupBtn && emailSignupDropdown) {
          // Toggle dropdown on button click
          emailSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            emailSignupDropdown.classList.toggle('open');
            // Focus the input when opening
            if (emailSignupDropdown.classList.contains('open')) {
              const input = emailSignupDropdown.querySelector('.nav-newsletter-input');
              if (input) setTimeout(() => input.focus(), 100);
            }
          });

          // Keep dropdown open when clicking inside
          if (dropdownPanel) {
            dropdownPanel.addEventListener('click', function(e) {
              e.stopPropagation();
            });
          }

          // Close dropdown when clicking outside
          document.addEventListener('click', function(e) {
            if (!emailSignupDropdown.contains(e.target)) {
              emailSignupDropdown.classList.remove('open');
            }
          });

          // Close on Escape key
          document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              emailSignupDropdown.classList.remove('open');
            }
          });
        }

        // Header Newsletter form
        const navNewsletterForm = document.getElementById('nav-newsletter-form');
        if (navNewsletterForm) {
          navNewsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('.nav-newsletter-input');
            const submitBtn = this.querySelector('.nav-newsletter-btn');
            const email = emailInput.value.trim();

            if (!email) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Joining...';

            try {
              const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              const data = await response.json();

              if (data.success) {
                emailInput.value = '';
                submitBtn.textContent = 'You\\'re in!';
                submitBtn.style.background = '#22c55e';
                setTimeout(() => {
                  submitBtn.textContent = 'Join';
                  submitBtn.style.background = '';
                  submitBtn.disabled = false;
                  // Close dropdown after success
                  if (emailSignupDropdown) emailSignupDropdown.classList.remove('open');
                }, 2500);
              } else {
                submitBtn.textContent = 'Try again';
                submitBtn.style.background = '#ef4444';
                setTimeout(() => {
                  submitBtn.textContent = 'Join';
                  submitBtn.style.background = '';
                  submitBtn.disabled = false;
                }, 3000);
              }
            } catch (error) {
              submitBtn.textContent = 'Try again';
              submitBtn.style.background = '#ef4444';
              setTimeout(() => {
                submitBtn.textContent = 'Join';
                submitBtn.style.background = '';
                submitBtn.disabled = false;
              }, 3000);
            }
          });
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Render a complete page with layout
 */
export function renderPage(content: string, options: PageOptions): string {
  return renderPageStart(options) + content + renderPageEnd({ includeFooter: options.includeFooter });
}
