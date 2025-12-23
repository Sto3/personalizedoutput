/**
 * ISOLATED CAROUSEL JAVASCRIPT - v2.0
 * Wrapped in IIFE to prevent any conflicts with other code
 * Pure vanilla JS - no dependencies
 * Now with mobile-first horizontal scroll and Coming Soon support
 */
(function() {
  'use strict';

  console.log('[Carousel] Initializing isolated 3D carousel...');

  // Product data with launch status
  // ORDERED so Santa Message is in CENTER with Vision Board next to it
  const products = [
    { badge: 'Education', icon: '📚', title: 'Custom Flash Cards', desc: 'Personalized learning cards', price: '$12', slug: 'flash-cards', launched: false },
    { badge: 'Planning', icon: '💡', title: 'Clarity Planner', desc: 'Achieve your goals', price: '$25', slug: 'clarity-planner', launched: false },
    { badge: 'For Adults', icon: '🎯', title: 'Custom Vision Board', desc: 'Personalized vision board', price: '$15', slug: 'vision-board', launched: true },
    { badge: 'For Kids', icon: '🎁', title: 'Personalized Santa Message', desc: 'A magical audio message from Santa', price: '$20', slug: 'santa', launched: true },
    { badge: 'Life Planning', icon: '✨', title: 'Thought Organizer™', desc: 'Ideas into insights', price: '$20', slug: 'thought-organizer', launched: false },
    { badge: 'Learning', icon: '🎧', title: '30-Minute Audio Lesson', desc: 'Learn through what you love', price: '$23', slug: 'learning-session', launched: false },
    { badge: 'Learning', icon: '🎬', title: '30-Minute Video Lesson', desc: 'Video lesson with visuals', price: '$33', slug: 'video-learning-session', launched: false }
  ];

  // Santa Message is at index 3 (center of 7 products)
  const SANTA_INDEX = 3;

  // Position configurations for 3D coverflow effect (desktop only)
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

  // Start with Santa Message centered
  let current = SANTA_INDEX;
  let cards = [];
  let dots = [];
  let wrapper = null;
  let dotsEl = null;

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

  // Render all cards in their positions (desktop only)
  function render() {
    cards.forEach(function(card, index) {
      var offset = index - current;
      var posName = getPosition(offset);
      var pos = positions[posName];

      card.style.setProperty('--tx', pos.tx + 'px');
      card.style.setProperty('--tz', pos.tz + 'px');
      card.style.setProperty('--ry', pos.ry + 'deg');
      card.style.setProperty('--scale', pos.scale);
      card.style.opacity = pos.opacity;
      card.style.zIndex = pos.zIndex;
      card.style.pointerEvents = posName === 'center' ? 'auto' : 'none';
    });

    dots.forEach(function(dot, index) {
      dot.classList.toggle('active', index === current);
    });
  }

  // Navigate to a specific slide (desktop only)
  function goToSlide(index) {
    if (index < 0) index = products.length - 1;
    if (index >= products.length) index = 0;
    current = index;
    render();
  }

  // Initialize the carousel
  function init() {
    wrapper = document.getElementById('carouselWrapper');
    dotsEl = document.getElementById('carouselDots');

    if (!wrapper) {
      console.error('[Carousel] #carouselWrapper not found');
      return;
    }

    // ========================================
    // UNIFIED 3D CAROUSEL — Works on all devices
    // ========================================
    var isMobile = window.innerWidth <= 768;
    console.log('[Carousel] Initializing 3D coverflow' + (isMobile ? ' (mobile)' : ' (desktop)'));

    wrapper.innerHTML = '';
    if (dotsEl) dotsEl.innerHTML = '';
    cards = [];
    dots = [];

    // Create cards for desktop
    products.forEach(function(p, index) {
      var cardLink = p.launched ? '/' + p.slug : '/coming-soon';
      var comingSoonBadge = p.launched ? '' : '<span class="coming-soon-badge">Coming Soon</span>';

      var card = document.createElement('a');
      card.className = 'carousel-card';
      card.href = cardLink;
      card.setAttribute('data-index', index);
      card.innerHTML =
        '<div class="carousel-card-content">' +
          comingSoonBadge +
          '<span class="card-badge">' + p.badge + '</span>' +
          '<div class="card-icon">' + p.icon + '</div>' +
          '<h3 class="card-title">' + p.title + '</h3>' +
          '<p class="card-desc">' + p.desc + '</p>' +
          '<div class="card-footer">' +
            '<span class="card-price">' + p.price + '</span>' +
            '<span class="card-cta">Get Started →</span>' +
          '</div>' +
        '</div>';

      card.addEventListener('click', function(e) {
        if (index !== current) {
          e.preventDefault();
          goToSlide(index);
        }
      });

      wrapper.appendChild(card);
      cards.push(card);
    });

    // Create dots for desktop
    if (dotsEl) {
      products.forEach(function(_, index) {
        var dot = document.createElement('button');
        dot.className = 'dot';
        dot.addEventListener('click', function() { goToSlide(index); });
        dotsEl.appendChild(dot);
        dots.push(dot);
      });
    }

    // Mouse wheel navigation
    var wheelLocked = false;
    var accumulatedDelta = 0;
    var DELTA_THRESHOLD = 50;
    var LOCK_DURATION = 600;

    wrapper.addEventListener('wheel', function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (wheelLocked) return;

      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      accumulatedDelta += delta;

      if (Math.abs(accumulatedDelta) >= DELTA_THRESHOLD) {
        wheelLocked = true;

        if (accumulatedDelta > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }

        accumulatedDelta = 0;

        setTimeout(function() {
          wheelLocked = false;
        }, LOCK_DURATION);
      }
    }, { passive: false });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') goToSlide(current - 1);
      if (e.key === 'ArrowRight') goToSlide(current + 1);
    });

    // Touch swipe support - works on all devices
    var touchStartX = 0;
    var touchStartY = 0;
    var isSwiping = false;

    wrapper.parentElement.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = true;
    }, { passive: true });

    wrapper.parentElement.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;

      // Check if horizontal swipe (prevent vertical scroll interference)
      var diffX = Math.abs(e.touches[0].clientX - touchStartX);
      var diffY = Math.abs(e.touches[0].clientY - touchStartY);

      if (diffX > diffY && diffX > 10) {
        e.preventDefault(); // Prevent page scroll during horizontal swipe
      }
    }, { passive: false });

    wrapper.parentElement.addEventListener('touchend', function(e) {
      if (!isSwiping) return;
      isSwiping = false;

      var touchEndX = e.changedTouches[0].clientX;
      var diff = touchStartX - touchEndX;

      // Swipe threshold - 40px for responsive feel
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }
      }
    }, { passive: true });

    // Initial render
    render();
    console.log('[Carousel] 3D carousel initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
