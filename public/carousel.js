/**
 * ISOLATED CAROUSEL JAVASCRIPT - v1.0
 * Wrapped in IIFE to prevent any conflicts with other code
 * Pure vanilla JS - no dependencies
 */
(function() {
  'use strict';

  console.log('[Carousel] Initializing isolated 3D carousel...');

  // Product data
  const products = [
    { id: 'santa_message', name: 'Personalized Santa Message', desc: 'A magical, personalized audio message from Santa Claus', price: 20, icon: '🎁', category: 'For Kids' },
    { id: 'learning_session', name: 'Personalized Lesson', desc: 'Learn anything through what you love', price: 23, icon: '🧠', category: 'Learning' },
    { id: 'vision_board', name: 'Vision Board', desc: 'Personalized goals visualization', price: 15, icon: '🎯', category: 'For Adults' },
    { id: 'flash_cards', name: 'Flash Cards', desc: 'Personalized learning cards', price: 12, icon: '📚', category: 'Education' },
    { id: 'thought_organizer', name: 'Thought Organizer', desc: 'Transform ideas into actionable insights', price: 20, icon: '✨', category: 'Life Planning' },
    { id: 'clarity_planner', name: 'Clarity Planner', desc: 'Find clarity in life decisions', price: 15, icon: '💡', category: 'Planning' },
    { id: 'holiday_reset', name: 'Holiday Reset', desc: 'Reflect and reset for the new year', price: 18, icon: '🎄', category: 'Seasonal' }
  ];

  // Position configurations for 3D coverflow effect
  const positions = {
    'center':  { tx: 0,    tz: 0,    ry: 0,   scale: 1,    opacity: 1,   zIndex: 10 },
    'left-1':  { tx: -200, tz: -120, ry: 25,  scale: 0.85, opacity: 0.7, zIndex: 5 },
    'left-2':  { tx: -350, tz: -220, ry: 35,  scale: 0.7,  opacity: 0.4, zIndex: 3 },
    'left-3':  { tx: -450, tz: -300, ry: 40,  scale: 0.55, opacity: 0.2, zIndex: 1 },
    'right-1': { tx: 200,  tz: -120, ry: -25, scale: 0.85, opacity: 0.7, zIndex: 5 },
    'right-2': { tx: 350,  tz: -220, ry: -35, scale: 0.7,  opacity: 0.4, zIndex: 3 },
    'right-3': { tx: 450,  tz: -300, ry: -40, scale: 0.55, opacity: 0.2, zIndex: 1 },
    'hidden':  { tx: 0,    tz: -400, ry: 0,   scale: 0.3,  opacity: 0,   zIndex: 0 }
  };

  let current = Math.floor(products.length / 2); // Start centered
  let cards = [];
  let dots = [];

  // Get position name based on offset from center
  function getPosition(offset) {
    if (offset === 0) return 'center';
    if (offset === -1) return 'left-1';
    if (offset === -2) return 'left-2';
    if (offset === -3) return 'left-3';
    if (offset === 1) return 'right-1';
    if (offset === 2) return 'right-2';
    if (offset === 3) return 'right-3';
    return 'hidden';
  }

  // Render all cards in their positions
  function render() {
    cards.forEach((card, index) => {
      const offset = index - current;
      const posName = getPosition(offset);
      const pos = positions[posName];

      // Apply CSS custom properties
      card.style.setProperty('--tx', pos.tx + 'px');
      card.style.setProperty('--tz', pos.tz + 'px');
      card.style.setProperty('--ry', pos.ry + 'deg');
      card.style.setProperty('--scale', pos.scale);
      card.style.opacity = pos.opacity;
      card.style.zIndex = pos.zIndex;
      card.style.pointerEvents = posName === 'center' ? 'auto' : 'none';
    });

    // Update dots
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === current);
    });

    console.log('[Carousel] Rendered at index:', current);
  }

  // Navigate to a specific slide
  function goToSlide(index) {
    if (index < 0) index = products.length - 1;
    if (index >= products.length) index = 0;
    current = index;
    render();
  }

  // Create card HTML
  function createCard(product, index) {
    const card = document.createElement('a');
    card.className = 'carousel-card';
    card.href = '/product/' + product.id;
    card.innerHTML = `
      <span class="card-badge">${product.category}</span>
      <div class="card-icon">${product.icon}</div>
      <h3 class="card-title">${product.name}</h3>
      <p class="card-desc">${product.desc}</p>
      <div class="card-footer">
        <span class="card-price">$${product.price}</span>
        <span class="card-cta">Get Started →</span>
      </div>
    `;

    card.addEventListener('click', function(e) {
      if (index !== current) {
        e.preventDefault();
        goToSlide(index);
      }
    });

    return card;
  }

  // Initialize the carousel
  function init() {
    const wrapper = document.getElementById('carouselWrapper');
    const dotsContainer = document.getElementById('carouselDots');

    if (!wrapper || !dotsContainer) {
      console.warn('[Carousel] Container elements not found, retrying...');
      setTimeout(init, 100);
      return;
    }

    console.log('[Carousel] Found containers, building cards...');

    // Clear existing content
    wrapper.innerHTML = '';
    dotsContainer.innerHTML = '';
    cards = [];
    dots = [];

    // Create cards
    products.forEach((product, index) => {
      const card = createCard(product, index);
      wrapper.appendChild(card);
      cards.push(card);
    });

    // Create dots
    products.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.addEventListener('click', () => goToSlide(index));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });

    // Mouse wheel navigation - with debouncing to prevent glitchy behavior
    let wheelTimeout = null;
    let isWheeling = false;
    wrapper.parentElement.addEventListener('wheel', function(e) {
      // Only prevent default for horizontal-ish scrolls or when focused on carousel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || isWheeling) {
        e.preventDefault();
      }

      // Debounce to prevent rapid firing
      if (wheelTimeout) return;

      isWheeling = true;
      if (e.deltaY > 0 || e.deltaX > 0) {
        goToSlide(current + 1);
      } else {
        goToSlide(current - 1);
      }

      wheelTimeout = setTimeout(function() {
        wheelTimeout = null;
        isWheeling = false;
      }, 300); // 300ms debounce
    }, { passive: false });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') goToSlide(current - 1);
      if (e.key === 'ArrowRight') goToSlide(current + 1);
    });

    // Touch swipe support
    let touchStartX = 0;
    wrapper.parentElement.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    wrapper.parentElement.addEventListener('touchend', function(e) {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }
      }
    }, { passive: true });

    // Initial render
    render();
    console.log('[Carousel] Initialization complete!');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
