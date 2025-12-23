/**
 * ISOLATED CAROUSEL JAVASCRIPT - v3.2
 * Wrapped in IIFE to prevent any conflicts with other code
 * Pure vanilla JS - no dependencies
 * FORTIFIED: Prevents accidental navigation during horizontal swipes
 * v3.2: Fixed mobile taps - only block clicks on actual swipes, not taps
 */
(function() {
  'use strict';

  console.log('[Carousel] Initializing isolated 3D carousel v3.2...');

  // Product data with launch status
  // ORDERED so Santa Message is in CENTER with Vision Board next to it
  const products = [
    { badge: 'Education', icon: '📚', title: 'Custom Flash Cards', desc: 'Personalized learning cards', price: '$12', slug: 'flash-cards', launched: false },
    { badge: 'Planning', icon: '💡', title: 'Clarity Planner', desc: 'Achieve your goals', price: '$25', slug: 'clarity-planner', launched: false },
    { badge: 'For Adults', icon: '🎯', title: 'Custom Vision Board', desc: 'Personalized vision board', price: '$15', slug: 'vision-board', launched: true },
    { badge: 'For Kids', icon: '🎁', title: 'Personalized Santa', desc: 'A heartfelt audio experience from Santa', price: '$20', slug: 'santa', launched: true },
    { badge: 'Life Planning', icon: '✨', title: 'Thought Organizer™', desc: 'Ideas into insights', price: '$20', slug: 'thought-organizer', launched: false },
    { badge: 'Learning', icon: '🎧', title: '30-Minute Audio Lesson', desc: 'Learn through what you love', price: '$23', slug: 'learning-session', launched: false },
    { badge: 'Learning', icon: '🎬', title: '30-Minute Video Lesson', desc: 'Video lesson with visuals', price: '$33', slug: 'video-learning-session', launched: false }
  ];

  // Santa Message is at index 3 (center of 7 products)
  const SANTA_INDEX = 3;

  // Position configurations for 3D coverflow effect - DESKTOP
  const desktopPositions = {
    'center':  { tx: 0,    tz: 0,    ry: 0,   scale: 1,    opacity: 1,   zIndex: 10 },
    'left-1':  { tx: -200, tz: -120, ry: 25,  scale: 0.85, opacity: 0.7, zIndex: 5 },
    'left-2':  { tx: -350, tz: -220, ry: 35,  scale: 0.7,  opacity: 0.4, zIndex: 3 },
    'left-3':  { tx: -450, tz: -300, ry: 40,  scale: 0.55, opacity: 0.2, zIndex: 1 },
    'right-1': { tx: 200,  tz: -120, ry: -25, scale: 0.85, opacity: 0.7, zIndex: 5 },
    'right-2': { tx: 350,  tz: -220, ry: -35, scale: 0.7,  opacity: 0.4, zIndex: 3 },
    'right-3': { tx: 450,  tz: -300, ry: -40, scale: 0.55, opacity: 0.2, zIndex: 1 },
    'hidden':  { tx: 0,    tz: -400, ry: 0,   scale: 0.3,  opacity: 0,   zIndex: 0 }
  };

  // Position configurations for 3D coverflow effect - MOBILE (tighter spacing)
  const mobilePositions = {
    'center':  { tx: 0,    tz: 0,    ry: 0,   scale: 1,    opacity: 1,   zIndex: 10 },
    'left-1':  { tx: -130, tz: -80,  ry: 30,  scale: 0.75, opacity: 0.5, zIndex: 5 },
    'left-2':  { tx: -200, tz: -150, ry: 40,  scale: 0.55, opacity: 0.25, zIndex: 3 },
    'left-3':  { tx: -250, tz: -200, ry: 45,  scale: 0.4,  opacity: 0.1, zIndex: 1 },
    'right-1': { tx: 130,  tz: -80,  ry: -30, scale: 0.75, opacity: 0.5, zIndex: 5 },
    'right-2': { tx: 200,  tz: -150, ry: -40, scale: 0.55, opacity: 0.25, zIndex: 3 },
    'right-3': { tx: 250,  tz: -200, ry: -45, scale: 0.4,  opacity: 0.1, zIndex: 1 },
    'hidden':  { tx: 0,    tz: -300, ry: 0,   scale: 0.3,  opacity: 0,   zIndex: 0 }
  };

  // Use mobile or desktop positions based on screen width
  let positions = window.innerWidth <= 768 ? mobilePositions : desktopPositions;

  // Start with Santa Message centered
  let current = SANTA_INDEX;
  let cards = [];
  let dots = [];
  let wrapper = null;
  let dotsEl = null;
  let carouselContainer = null;

  // FORTIFIED: Global state management for swipe/interaction blocking
  let isAnimating = false;
  let interactionLocked = false;
  let lastInteractionTime = 0;
  const INTERACTION_COOLDOWN = 500; // ms to wait after any interaction before allowing navigation

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

  // Lock interactions temporarily
  function lockInteractions(duration) {
    interactionLocked = true;
    lastInteractionTime = Date.now();
    setTimeout(function() {
      interactionLocked = false;
    }, duration || INTERACTION_COOLDOWN);
  }

  // Check if we're within cooldown period
  function isInCooldown() {
    return interactionLocked || (Date.now() - lastInteractionTime < 200);
  }

  // Render all cards in their positions
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

  // Navigate to a specific slide with animation lock
  function goToSlide(index) {
    if (isAnimating) return;

    if (index < 0) index = products.length - 1;
    if (index >= products.length) index = 0;

    if (index === current) return;

    isAnimating = true;
    current = index;
    render();

    // Unlock after animation completes
    setTimeout(function() {
      isAnimating = false;
    }, 400);
  }

  // FORTIFIED: Prevent all navigation events during swipe
  function blockNavigation(e) {
    if (window._carouselInteracting) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }

  // Initialize the carousel
  function init() {
    wrapper = document.getElementById('carouselWrapper');
    dotsEl = document.getElementById('carouselDots');
    carouselContainer = wrapper ? wrapper.parentElement : null;

    if (!wrapper) {
      console.error('[Carousel] #carouselWrapper not found');
      return;
    }

    var isMobile = window.innerWidth <= 768;
    console.log('[Carousel] Initializing 3D coverflow v3.2' + (isMobile ? ' (mobile)' : ' (desktop)'));

    wrapper.innerHTML = '';
    if (dotsEl) dotsEl.innerHTML = '';
    cards = [];
    dots = [];

    // Initialize global interaction state
    window._carouselInteracting = false;
    window._carouselDidSwipe = false;

    // Create cards
    products.forEach(function(p, index) {
      var cardLink = p.launched ? '/product/' + p.slug : '/coming-soon';
      var comingSoonBadge = p.launched ? '' : '<span class="coming-soon-badge">Coming Soon</span>';

      var card = document.createElement('a');
      card.className = 'carousel-card';
      card.href = cardLink;
      card.setAttribute('data-index', index);
      card.setAttribute('draggable', 'false'); // Prevent drag
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

      // FORTIFIED: Only allow clicks on center card, and only after cooldown
      card.addEventListener('click', function(e) {
        // Always block if we're interacting
        if (window._carouselInteracting || window._carouselDidSwipe || isInCooldown()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }

        // If not the center card, rotate carousel instead of navigating
        if (index !== current) {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(index);
          return false;
        }

        // Center card - allow navigation (the <a> href will handle it)
      }, true);

      wrapper.appendChild(card);
      cards.push(card);
    });

    // Create dots
    if (dotsEl) {
      products.forEach(function(_, index) {
        var dot = document.createElement('button');
        dot.className = 'dot';
        dot.type = 'button'; // Prevent form submission
        dot.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!isInCooldown()) {
            goToSlide(index);
            lockInteractions(300);
          }
        });
        dotsEl.appendChild(dot);
        dots.push(dot);
      });
    }

    // ========================================
    // FORTIFIED: Mouse wheel navigation - ONLY for horizontal swipes
    // Allow normal vertical page scrolling to pass through
    // ========================================
    var wheelLocked = false;
    var accumulatedDeltaX = 0;
    var DELTA_THRESHOLD = 50; // Threshold for horizontal swipes
    var LOCK_DURATION = 500;

    carouselContainer.addEventListener('wheel', function(e) {
      // IMPORTANT: Only intercept horizontal scrolls, let vertical scroll pass through for page scrolling
      var isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5;

      // If it's a vertical scroll (normal page scrolling), let it pass through
      if (!isHorizontal) {
        return; // Don't prevent default - allow normal page scroll
      }

      // Only handle horizontal swipes for carousel navigation
      e.preventDefault();
      e.stopPropagation();

      if (wheelLocked || isAnimating) return;

      accumulatedDeltaX += e.deltaX;

      if (Math.abs(accumulatedDeltaX) >= DELTA_THRESHOLD) {
        wheelLocked = true;
        window._carouselInteracting = true;

        if (accumulatedDeltaX > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }

        accumulatedDeltaX = 0;

        setTimeout(function() {
          wheelLocked = false;
          window._carouselInteracting = false;
        }, LOCK_DURATION);
      }
    }, { passive: false, capture: true });

    // ========================================
    // FORTIFIED: Keyboard navigation
    // ========================================
    document.addEventListener('keydown', function(e) {
      // Only respond if carousel is in view
      var rect = carouselContainer.getBoundingClientRect();
      var isInView = rect.top < window.innerHeight && rect.bottom > 0;

      if (isInView && !isAnimating) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToSlide(current - 1);
          lockInteractions(300);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToSlide(current + 1);
          lockInteractions(300);
        }
      }
    });

    // ========================================
    // FORTIFIED: Touch/Mouse swipe support
    // ========================================
    var swipeStartX = 0;
    var swipeStartY = 0;
    var swipeStartTime = 0;
    var isTouchActive = false;
    var isMouseActive = false;
    var hasMoved = false;
    var SWIPE_THRESHOLD = 60; // Higher threshold for intentional swipes
    var SWIPE_TIME_LIMIT = 500; // Must complete swipe within this time

    // Prevent all drag behavior
    carouselContainer.addEventListener('dragstart', function(e) {
      e.preventDefault();
      return false;
    }, true);

    // Block select on carousel
    carouselContainer.addEventListener('selectstart', function(e) {
      e.preventDefault();
      return false;
    }, true);

    // ========================================
    // TOUCH EVENTS (with passive: false for full control)
    // ========================================
    carouselContainer.addEventListener('touchstart', function(e) {
      if (isAnimating) return;

      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
      swipeStartTime = Date.now();
      isTouchActive = true;
      hasMoved = false;
      // DON'T set _carouselInteracting here - only set it if user actually swipes
      window._carouselDidSwipe = false;
    }, { passive: true, capture: true });

    carouselContainer.addEventListener('touchmove', function(e) {
      if (!isTouchActive) return;

      var diffX = e.touches[0].clientX - swipeStartX;
      var diffY = e.touches[0].clientY - swipeStartY;
      var absDiffX = Math.abs(diffX);
      var absDiffY = Math.abs(diffY);

      // If horizontal movement is dominant, prevent ALL default behavior
      // This stops browser back/forward gestures
      if (absDiffX > absDiffY && absDiffX > 5) {
        e.preventDefault(); // CRITICAL: Prevent browser back gesture
        e.stopPropagation();
        hasMoved = true;
        window._carouselDidSwipe = true;
        window._carouselInteracting = true; // Only set when actually swiping
      }
    }, { passive: false, capture: true });

    carouselContainer.addEventListener('touchend', function(e) {
      if (!isTouchActive) return;
      isTouchActive = false;

      var touchEndX = e.changedTouches[0].clientX;
      var diff = swipeStartX - touchEndX;
      var swipeTime = Date.now() - swipeStartTime;

      // If user didn't move (it's a tap), immediately allow clicks
      if (!hasMoved) {
        window._carouselInteracting = false;
        window._carouselDidSwipe = false;
        return; // Let the tap/click happen naturally
      }

      // Only trigger swipe if threshold met and within time limit
      if (Math.abs(diff) > SWIPE_THRESHOLD && swipeTime < SWIPE_TIME_LIMIT && hasMoved) {
        if (diff > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }
      }

      // Keep swipe flag active longer to block accidental clicks after swipe
      lockInteractions(500);
      setTimeout(function() {
        window._carouselInteracting = false;
        window._carouselDidSwipe = false;
      }, 500);
    }, { passive: true, capture: true });

    carouselContainer.addEventListener('touchcancel', function() {
      isTouchActive = false;
      hasMoved = false;
      setTimeout(function() {
        window._carouselInteracting = false;
        window._carouselDidSwipe = false;
      }, 200);
    }, { passive: true });

    // ========================================
    // MOUSE EVENTS (for trackpad and mouse drag)
    // ========================================
    carouselContainer.addEventListener('mousedown', function(e) {
      if (isAnimating) return;

      // Only start drag if not clicking on center card
      var clickedCard = e.target.closest('.carousel-card');
      if (clickedCard && clickedCard.getAttribute('data-index') == current) {
        // Let center card handle its own click
        return;
      }

      e.preventDefault();
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
      swipeStartTime = Date.now();
      isMouseActive = true;
      hasMoved = false;
      window._carouselInteracting = true;
      window._carouselDidSwipe = false;
    }, { capture: true });

    carouselContainer.addEventListener('mousemove', function(e) {
      if (!isMouseActive) return;

      var diffX = Math.abs(e.clientX - swipeStartX);
      var diffY = Math.abs(e.clientY - swipeStartY);

      if (diffX > diffY && diffX > 15) {
        hasMoved = true;
        window._carouselDidSwipe = true;
        e.preventDefault();
      }
    }, { capture: true });

    carouselContainer.addEventListener('mouseup', function(e) {
      if (!isMouseActive) return;
      isMouseActive = false;

      var diff = swipeStartX - e.clientX;
      var swipeTime = Date.now() - swipeStartTime;

      if (Math.abs(diff) > SWIPE_THRESHOLD && swipeTime < SWIPE_TIME_LIMIT && hasMoved) {
        if (diff > 0) {
          goToSlide(current + 1);
        } else {
          goToSlide(current - 1);
        }
      }

      lockInteractions(400);
      setTimeout(function() {
        window._carouselInteracting = false;
        window._carouselDidSwipe = false;
      }, 400);
    }, { capture: true });

    carouselContainer.addEventListener('mouseleave', function() {
      if (isMouseActive) {
        isMouseActive = false;
        hasMoved = false;
        setTimeout(function() {
          window._carouselInteracting = false;
          window._carouselDidSwipe = false;
        }, 200);
      }
    });

    // ========================================
    // FORTIFIED: Click blocking on carousel container
    // ========================================
    carouselContainer.addEventListener('click', function(e) {
      // If we were interacting (swiping), block the click entirely
      if (window._carouselDidSwipe || isInCooldown()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // If clicking on a non-center card, rotate to it instead of navigating
      var clickedCard = e.target.closest('.carousel-card');
      if (clickedCard) {
        var clickedIndex = parseInt(clickedCard.getAttribute('data-index'), 10);
        if (clickedIndex !== current) {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(clickedIndex);
          return false;
        }
      }
    }, true); // Capture phase for earliest interception

    // ========================================
    // FORTIFIED: Block link navigation during any carousel interaction
    // ========================================
    wrapper.addEventListener('click', function(e) {
      if (window._carouselInteracting || window._carouselDidSwipe || isInCooldown()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }, true);

    // Initial render
    render();
    console.log('[Carousel] 3D carousel v3.2 initialized - mobile taps fixed');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
