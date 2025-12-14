/**
 * Premium Homepage V3
 *
 * Ultra-modern design with:
 * - Animated gradients and glass morphism
 * - Video embed capability for marketing content
 * - Individual product purchase + subscription options
 * - Social proof and testimonials
 * - Seasonal banners (Santa now, Vision Board in January)
 * - Mobile-first responsive design
 */

export function renderPremiumHomepageV3(): string {
  const products = [
    {
      id: 'thought-organizer',
      name: '30-Minute Personalized Learning Sessions',
      icon: '🧠',
      description: 'Complete learning sessions that teach what you NEED using what you LOVE. Our Thought Organizer™ AI connects your passions to any subject — making learning feel effortless. All ages welcome.',
      href: '/demo-lessons',
      price: 29,
      tag: 'NEW',
      featured: true,
      benefits: ['Uses YOUR interests to teach', 'Kids: dinosaurs → fractions', 'Adults: bakery → mortgages'],
    },
    {
      id: 'santa',
      name: 'Personalized Santa Message',
      icon: '🎅',
      description: 'A magical AI voice message from Santa that mentions your child\'s specific achievements, struggles they\'ve overcome, and moments from their year.',
      href: '/santa',
      price: 19,
      tag: 'Holiday Special',
      featured: false,
      benefits: ['2-3 minute personalized audio', 'Mentions specific achievements', 'Downloadable MP3 file'],
    },
    {
      id: 'vision-board',
      name: 'Custom Vision Board',
      icon: '🎯',
      description: 'A beautiful, AI-generated vision board that visualizes YOUR specific dreams, goals, and aspirations for 2025.',
      href: '/vision-board',
      price: 14,
      tag: 'New Year Ready',
      featured: false,
      benefits: ['High-res digital download', 'Personalized imagery', 'Print-ready format'],
    },
    {
      id: 'flash-cards',
      name: 'Custom Flash Cards',
      icon: '📚',
      description: 'Learning cards built around YOUR interests and unique learning style. Works for kids and adults alike.',
      href: '/flash-cards',
      price: 14,
      tag: null,
      featured: false,
      benefits: ['50+ personalized cards', 'Tailored to learning style', 'Printable PDF'],
    },
    {
      id: 'clarity-planner',
      name: 'Guided Clarity Planner',
      icon: '💡',
      description: 'Gain clarity on any life situation through AI-guided reflection and deeply personalized insights.',
      href: '/planner',
      price: 24,
      tag: null,
      featured: false,
      benefits: ['20+ page personalized PDF', 'Actionable next steps', 'Reflection prompts'],
    },
  ];

  const testimonials = [
    {
      quote: "I finally understand my mortgage because they explained it using my bakery! 20 years of confusion, finally clear.",
      author: "Sarah K.",
      product: "Learning Session",
      rating: 5,
    },
    {
      quote: "My son learned fractions through dinosaurs. He asked for MORE math homework. I didn't know that was possible.",
      author: "Michael R.",
      product: "Learning Session",
      rating: 5,
    },
    {
      quote: "I cried. The vision board captured exactly what I've been feeling but couldn't articulate.",
      author: "Jessica T.",
      product: "Vision Board",
      rating: 5,
    },
  ];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>personalizedoutput - Learn Anything Through What You Love</title>
      <meta name="description" content="Thought Organizer™ AI creates personalized lessons that use YOUR passions to teach what you need. Kids learn fractions through dinosaurs. Adults master mortgages through their business. For kids AND adults.">
      <meta name="keywords" content="personalized learning, AI lessons, learn through interests, thought organizer, personalized education, kids learning, adult learning">
      <link rel="canonical" href="https://personalizedoutput.com">
      <meta property="og:title" content="personalizedoutput - Deeply Personalized Digital Experiences">
      <meta property="og:description" content="AI-powered personalization that makes people say 'How did it know that about me?'">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://personalizedoutput.com">
      <!-- PWA Support -->
      <link rel="manifest" href="/manifest.json">
      <meta name="theme-color" content="#e94560">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="PersonalizedOutput">
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          /* Primary brand colors - keep red */
          --primary: #e94560;
          --primary-light: #ff6b6b;
          --primary-dark: #c73e54;

          /* Accent colors - warmer, friendlier */
          --accent: #f59e0b;
          --accent-light: #fbbf24;
          --accent-dark: #d97706;

          /* Light theme backgrounds */
          --bg-white: #ffffff;
          --bg-light: #f8fafc;
          --bg-subtle: #f1f5f9;
          --bg-muted: #e2e8f0;

          /* Light theme surfaces */
          --surface-white: #ffffff;
          --surface-elevated: #ffffff;
          --surface-card: #ffffff;

          /* Text colors for light background */
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --text-on-dark: #ffffff;

          /* Keep dark colors for nav bar and footer */
          --nav-bg: #0a0a0f;
          --nav-text: #ffffff;

          /* Borders and dividers */
          --border-light: #e2e8f0;
          --border-subtle: #cbd5e1;

          /* Shadows - softer for light theme */
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
          --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1);
          --shadow-lg: 0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.1);
          --shadow-xl: 0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.06);
          --shadow-glow-primary: 0 0 20px rgba(233, 69, 96, 0.15), 0 0 40px rgba(233, 69, 96, 0.1);

          /* Gradients */
          --gradient-primary: linear-gradient(135deg, var(--primary), var(--primary-light));
          --gradient-warm: linear-gradient(135deg, #fef3c7, #fde68a);
          --gradient-hero: linear-gradient(180deg, var(--bg-light) 0%, var(--bg-white) 100%);

          /* Legacy vars for compatibility */
          --dark-bg: var(--nav-bg);
          --dark-surface: var(--bg-subtle);
          --dark-card: var(--surface-card);
          --dark-elevated: var(--bg-muted);
          --glass-bg: rgba(0,0,0,0.02);
          --glass-border: var(--border-light);
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg-white);
          color: var(--text-primary);
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Animated Background - Light Theme */
        .animated-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          overflow: hidden;
          background: linear-gradient(180deg, var(--bg-light) 0%, var(--bg-white) 50%, var(--bg-subtle) 100%);
        }
        .animated-bg::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -30%;
          width: 100%;
          height: 150%;
          background: radial-gradient(ellipse at center, rgba(233, 69, 96, 0.06) 0%, transparent 50%);
          animation: pulse 8s ease-in-out infinite;
        }
        .animated-bg::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -20%;
          width: 80%;
          height: 100%;
          background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.04) 0%, transparent 50%);
          animation: pulse 10s ease-in-out infinite reverse;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.5; }
          50% { transform: scale(1.1) translate(5%, 5%); opacity: 0.8; }
        }

        /* Premium Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: var(--shadow-glow-primary); }
          50% { box-shadow: 0 0 60px rgba(233, 69, 96, 0.5), 0 0 100px rgba(233, 69, 96, 0.3); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.1); }
        }
        @keyframes buttonShimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes gradientRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes staggerFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroLoad {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          opacity: 0;
          animation: fadeInUp 0.8s ease forwards;
        }
        .fade-in-delay-1 { animation-delay: 0.1s; }
        .fade-in-delay-2 { animation-delay: 0.2s; }
        .fade-in-delay-3 { animation-delay: 0.3s; }
        .fade-in-delay-4 { animation-delay: 0.4s; }

        /* Page load animations */
        .hero-content {
          animation: heroLoad 1s ease-out 0.2s both;
        }
        .hero-visual {
          animation: heroLoad 1s ease-out 0.4s both;
        }
        .hero-badge {
          animation: heroLoad 0.8s ease-out 0.1s both;
        }

        /* Scroll-triggered animations */
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Premium glass effect */
        .glass-premium {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: var(--shadow-lg), inset 0 1px 1px rgba(255,255,255,0.1);
        }

        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 16px 24px;
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--glass-border);
          transition: all 0.3s ease;
        }
        .nav.scrolled {
          padding: 12px 24px;
          background: rgba(10, 10, 15, 0.95);
        }
        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-on-dark);
          text-decoration: none;
          letter-spacing: -0.02em;
        }
        .logo span {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-links {
          display: flex;
          gap: 40px;
          align-items: center;
        }
        .nav-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
          position: relative;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--gradient-primary);
          transition: width 0.3s ease;
        }
        .nav-link:hover { color: var(--text-on-dark); }
        .nav-link:hover::after { width: 100%; }
        .nav-cta {
          padding: 12px 28px;
          background: var(--gradient-primary);
          color: white;
          border-radius: 100px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
        }
        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(233, 69, 96, 0.4);
        }
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
          transition: all 0.3s ease;
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
          -webkit-backdrop-filter: blur(4px);
          z-index: 998;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .mobile-menu-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        .mobile-menu {
          position: fixed;
          top: 0;
          right: 0;
          width: 280px;
          max-width: 85vw;
          height: 100vh;
          background: var(--dark-surface);
          border-left: 1px solid var(--glass-border);
          z-index: 999;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 40px rgba(0, 0, 0, 0.5);
        }
        .mobile-menu.active {
          transform: translateX(0);
        }
        .mobile-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--glass-border);
        }
        .mobile-close-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 2rem;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s ease;
        }
        .mobile-close-btn:hover {
          color: var(--primary);
        }
        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 8px;
          flex: 1;
        }
        .mobile-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: 500;
          padding: 14px 16px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .mobile-link:hover {
          color: var(--text-primary);
          background: var(--glass-bg);
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
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
        }
        .mobile-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(233, 69, 96, 0.4);
        }
        body.menu-open {
          overflow: hidden;
        }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 140px 24px 100px;
          position: relative;
        }
        .hero-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(233, 69, 96, 0.15);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--primary-light);
          margin-bottom: 24px;
        }
        .hero-badge .pulse {
          width: 8px;
          height: 8px;
          background: var(--primary);
          border-radius: 50%;
          animation: badgePulse 2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .hero-content h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }
        .hero-content h1 .highlight {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-content h1 .highlight-gold {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-content p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 40px;
          max-width: 540px;
          line-height: 1.7;
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
          gap: 10px;
          padding: 18px 36px;
          border-radius: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 1rem;
          border: none;
          cursor: pointer;
        }
        .btn-primary {
          background: var(--gradient-primary);
          color: white;
          box-shadow: var(--shadow-md), 0 0 30px rgba(233, 69, 96, 0.3);
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
          transition: none;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: var(--shadow-lg), var(--shadow-glow-primary);
        }
        .btn-primary:hover::before {
          animation: buttonShimmer 0.6s ease-out;
        }
        .btn-primary:active {
          transform: translateY(-1px) scale(0.99);
        }
        .btn-secondary {
          background: var(--bg-white);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-sm);
        }
        .btn-secondary:hover {
          background: var(--bg-subtle);
          border-color: var(--border-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .btn-gold {
          background: var(--gradient-accent);
          color: #1a1a24;
          box-shadow: 0 8px 30px rgba(248, 181, 0, 0.35);
        }
        .btn-gold:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(248, 181, 0, 0.45);
        }

        /* Hero Visual - Demo Preview Card */
        .hero-visual {
          position: relative;
        }
        .demo-preview-card {
          background: var(--surface-white);
          border-radius: 24px;
          border: 1px solid var(--border-light);
          overflow: hidden;
          box-shadow: var(--shadow-xl), 0 0 40px rgba(233, 69, 96, 0.08);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .demo-preview-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15), 0 0 60px rgba(233, 69, 96, 0.12);
        }
        .demo-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-light);
        }
        .demo-card-badge {
          background: var(--gradient-primary);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .demo-duration {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .demo-card-content {
          padding: 40px 32px;
          text-align: center;
        }
        .demo-emoji {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }
        .demo-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .demo-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-bottom: 28px;
          line-height: 1.6;
        }
        .demo-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: var(--gradient-primary);
          color: white;
          border-radius: 100px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4);
        }
        .demo-play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(233, 69, 96, 0.5);
        }
        .play-circle {
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }
        .demo-card-footer {
          padding: 20px 24px;
          background: rgba(74, 222, 128, 0.1);
          border-top: 1px solid rgba(74, 222, 128, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .demo-result {
          color: #4ade80;
          font-weight: 600;
          font-size: 1rem;
        }
        .demo-author {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .btn-arrow {
          transition: transform 0.3s ease;
        }
        .btn-primary:hover .btn-arrow {
          transform: translateX(4px);
        }
        .floating-card {
          position: absolute;
          background: var(--surface-white);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: var(--shadow-lg);
        }
        .floating-card.left {
          left: -60px;
          top: 20%;
          animation: float 4s ease-in-out infinite;
        }
        .floating-card.right {
          right: -40px;
          bottom: 25%;
          animation: float 4s ease-in-out infinite 2s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .floating-card .fc-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .floating-card .fc-title {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .floating-card .fc-value {
          color: var(--primary-light);
          font-weight: 700;
        }

        /* Stats Bar */
        .stats-bar {
          padding: 40px 24px;
          background: var(--bg-subtle);
          border-top: 1px solid var(--border-light);
          border-bottom: 1px solid var(--border-light);
        }
        .stats-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 32px;
        }
        .stat {
          text-align: center;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Products Section */
        .products {
          padding: 120px 24px;
        }
        .section-header {
          text-align: center;
          margin-bottom: 80px;
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
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .section-header p {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }
        .products-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
        }
        .product-card {
          background: var(--surface-white);
          border-radius: 24px;
          border: 1px solid var(--border-light);
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          box-shadow: var(--shadow-md);
        }
        .product-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 26px;
          background: conic-gradient(from 0deg, transparent 0%, rgba(233, 69, 96, 0.4) 25%, rgba(245, 158, 11, 0.4) 50%, rgba(233, 69, 96, 0.4) 75%, transparent 100%);
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: -1;
        }
        .product-card:hover::before {
          opacity: 1;
          animation: gradientRotate 3s linear infinite;
        }
        .product-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(233, 69, 96, 0.1), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .product-card:hover {
          transform: translateY(-12px) scale(1.02);
          border-color: rgba(233, 69, 96, 0.3);
          box-shadow: var(--shadow-xl), var(--shadow-glow-primary);
        }
        .product-card.featured {
          border-color: rgba(233, 69, 96, 0.4);
          background: linear-gradient(180deg, rgba(233, 69, 96, 0.06) 0%, var(--surface-white) 100%);
          box-shadow: var(--shadow-lg), var(--shadow-glow-primary);
        }
        .product-card.featured::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-primary);
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.3);
        }
        .product-tag {
          position: absolute;
          top: 24px;
          right: 24px;
          background: var(--gradient-primary);
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 10;
        }
        .product-inner {
          padding: 40px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: start;
        }
        .product-icon {
          width: 80px;
          height: 80px;
          background: var(--bg-subtle);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          transition: transform 0.3s ease;
        }
        .product-card:hover .product-icon {
          animation: iconBounce 0.6s ease;
        }
        .product-content {
          flex: 1;
        }
        .product-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .product-desc {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .product-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .product-benefit {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .product-benefit::before {
          content: '✓';
          color: #4ade80;
          font-weight: 700;
        }
        .product-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding-left: 24px;
          border-left: 1px solid var(--glass-border);
        }
        .product-price {
          text-align: center;
        }
        .product-price .amount {
          font-size: 2.5rem;
          font-weight: 800;
        }
        .product-price .currency {
          font-size: 1.25rem;
          color: var(--text-muted);
          vertical-align: top;
        }
        .product-buy-btn {
          padding: 14px 28px;
          background: var(--gradient-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          text-decoration: none;
          display: block;
          text-align: center;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .product-buy-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(233, 69, 96, 0.4);
        }

        /* How It Works */
        .how-it-works {
          padding: 120px 24px;
          background: var(--bg-subtle);
        }
        .steps {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
        }
        .step {
          text-align: center;
          position: relative;
        }
        .step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 40px;
          right: -20px;
          width: calc(100% - 80px);
          height: 2px;
          background: linear-gradient(90deg, var(--glass-border), transparent);
        }
        .step-number {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0 auto 24px;
          box-shadow: 0 10px 30px rgba(233, 69, 96, 0.3);
        }
        .step h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .step p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* Testimonials */
        .testimonials {
          padding: 120px 24px;
        }
        .testimonials-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        .testimonial-card {
          background: var(--surface-white);
          border: 1px solid var(--border-light);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          box-shadow: var(--shadow-md);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .testimonial-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg), 0 0 20px rgba(233, 69, 96, 0.08);
          border-color: rgba(233, 69, 96, 0.2);
        }
        .testimonial-card::before {
          content: '"';
          position: absolute;
          top: 24px;
          left: 32px;
          font-size: 4rem;
          font-family: 'Playfair Display', serif;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0.4;
          line-height: 1;
        }
        .testimonial-stars {
          color: var(--accent);
          font-size: 1rem;
          margin-bottom: 20px;
          letter-spacing: 4px;
        }
        .testimonial-quote {
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .testimonial-avatar {
          width: 48px;
          height: 48px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
        }
        .testimonial-info .name {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 100px;
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
        .verified-badge::before {
          content: '✓';
          font-size: 0.6rem;
        }
        .testimonial-info .product {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Social Proof Banner */
        .social-proof-banner {
          padding: 20px 24px;
          background: linear-gradient(90deg, rgba(233, 69, 96, 0.05), rgba(245, 158, 11, 0.05), rgba(233, 69, 96, 0.05));
          border-top: 1px solid var(--border-light);
          border-bottom: 1px solid var(--border-light);
        }
        .social-proof-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .social-stat {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .social-divider {
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .social-proof-inner {
            gap: 12px;
          }
          .social-stat {
            font-size: 0.8rem;
          }
          .social-divider {
            display: none;
          }
          .social-proof-inner {
            flex-direction: column;
            text-align: center;
          }
        }

        /* Pricing Section */
        .pricing {
          padding: 120px 24px;
          background: var(--bg-subtle);
        }
        .pricing-toggle {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 60px;
        }
        .pricing-toggle button {
          padding: 12px 28px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 100px;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .pricing-toggle button.active {
          background: var(--gradient-primary);
          border-color: transparent;
          color: white;
        }
        .pricing-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .pricing-card {
          background: var(--surface-white);
          border-radius: 24px;
          padding: 48px 40px;
          border: 1px solid var(--border-light);
          position: relative;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
        }
        .pricing-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(233, 69, 96, 0.2);
        }
        .pricing-card.popular {
          border-color: rgba(233, 69, 96, 0.4);
          transform: scale(1.05);
          z-index: 10;
          box-shadow: var(--shadow-xl), var(--shadow-glow-primary);
          background: linear-gradient(180deg, rgba(233, 69, 96, 0.05) 0%, var(--surface-white) 100%);
        }
        .pricing-card.popular:hover {
          transform: scale(1.05) translateY(-10px);
          box-shadow: var(--shadow-xl), 0 0 40px rgba(233, 69, 96, 0.2);
        }
        .pricing-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--gradient-primary);
          padding: 8px 24px;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .pricing-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .pricing-price {
          margin-bottom: 8px;
        }
        .pricing-price .amount {
          font-size: 3.5rem;
          font-weight: 800;
        }
        .pricing-price .period {
          font-size: 1rem;
          color: var(--text-muted);
        }
        .pricing-outputs {
          color: var(--text-secondary);
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--glass-border);
        }
        .pricing-features {
          list-style: none;
          margin-bottom: 40px;
        }
        .pricing-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        .pricing-features li::before {
          content: '✓';
          color: #4ade80;
          font-weight: 700;
        }
        .pricing-btn {
          display: block;
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .pricing-btn.primary {
          background: var(--gradient-primary);
          color: white;
        }
        .pricing-btn.secondary {
          background: var(--bg-subtle);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
        }
        .pricing-btn:hover {
          transform: translateY(-2px);
        }

        /* Topics Section - Simplified */
        .topics-section {
          padding: 80px 24px;
          background: var(--bg-white);
        }
        .topics-simple-grid {
          max-width: 1000px;
          margin: 48px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .topic-card-simple {
          background: var(--surface-white);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--border-light);
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }
        .topic-card-simple:hover {
          transform: translateY(-4px);
          border-color: rgba(233, 69, 96, 0.2);
          box-shadow: var(--shadow-md);
        }
        .topic-card-simple .topic-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 12px;
        }
        .topic-card-simple h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .topic-card-simple p {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .specificity-tip {
          max-width: 700px;
          margin: 40px auto 0;
        }
        .tip-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          background: linear-gradient(135deg, rgba(248, 181, 0, 0.1), rgba(233, 69, 96, 0.05));
          border: 1px solid rgba(248, 181, 0, 0.2);
          border-radius: 12px;
        }
        .tip-content .tip-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .tip-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .tip-text strong {
          color: var(--accent);
        }
        .tip-text em {
          color: var(--primary-light);
          font-style: normal;
          font-weight: 600;
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .topics-simple-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .topics-simple-grid {
            grid-template-columns: 1fr;
          }
        }

        /* CTA Section */
        .cta {
          padding: 120px 24px;
          text-align: center;
          background: var(--bg-subtle);
        }
        .cta-inner {
          max-width: 800px;
          margin: 0 auto;
          background: var(--surface-white);
          border: 1px solid var(--border-light);
          border-radius: 32px;
          padding: 80px 60px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-xl);
        }
        .cta-inner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-primary);
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.3);
        }
        .cta-inner::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 32px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(233, 69, 96, 0.1), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .cta h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .cta p {
          font-size: 1.125rem;
          color: var(--text-secondary);
          margin-bottom: 40px;
        }

        /* Footer - Simplified */
        .footer {
          padding: 48px 24px;
          background: var(--dark-bg);
          border-top: 1px solid var(--glass-border);
        }
        .footer-simple {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .footer-links-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 24px;
        }
        .footer-links-row a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .footer-links-row a:hover {
          color: var(--text-primary);
        }
        .footer-copyright {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .hero-inner { gap: 60px; }
          .products-grid { gap: 24px; }
        }
        @media (max-width: 1024px) {
          .hero-inner { grid-template-columns: 1fr; text-align: center; }
          .hero-content p { margin: 0 auto 40px; }
          .hero-buttons { justify-content: center; }
          .hero-visual { display: none; }
          .products-grid { grid-template-columns: 1fr; }
          .product-inner { grid-template-columns: 1fr; text-align: center; }
          .product-icon { margin: 0 auto; }
          .product-action {
            border-left: none;
            border-top: 1px solid var(--glass-border);
            padding-left: 0;
            padding-top: 24px;
            width: 100%;
          }
          .product-benefits { justify-content: center; }
          .steps { grid-template-columns: repeat(2, 1fr); }
          .step:not(:last-child)::after { display: none; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; max-width: 450px; }
          .pricing-card.popular { transform: none; }
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: flex; }
          .hero { padding: 120px 20px 80px; }
          .hero-content h1 { font-size: 2rem; }
          .hero-buttons { flex-direction: column; width: 100%; }
          .btn { width: 100%; }
          .stats-inner { flex-direction: column; gap: 24px; }
          .steps { grid-template-columns: 1fr; }
          .footer-links-row { gap: 16px; }
        }
      </style>
    </head>
    <body>
      <div class="animated-bg"></div>

      <nav class="nav">
        <div class="nav-inner">
          <a href="/" class="logo">personalized<span>output</span></a>
          <div class="nav-links">
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#products" class="nav-link">Products</a>
            <a href="#pricing" class="nav-link">Pricing</a>
            <a href="/blog" class="nav-link">Blog</a>
            <a href="/login" class="nav-link">Login</a>
            <a href="/demo-lessons" class="nav-cta">Listen to Demos</a>
          </div>
          <button class="mobile-menu-btn" aria-label="Open menu">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>
      </nav>

      <!-- Mobile Menu Drawer -->
      <div class="mobile-menu-overlay" id="mobile-overlay"></div>
      <div class="mobile-menu" id="mobile-menu">
        <div class="mobile-menu-header">
          <a href="/" class="logo">personalized<span>output</span></a>
          <button class="mobile-close-btn" aria-label="Close menu">&times;</button>
        </div>
        <div class="mobile-menu-links">
          <a href="#how-it-works" class="mobile-link">How It Works</a>
          <a href="#products" class="mobile-link">Products</a>
          <a href="#pricing" class="mobile-link">Pricing</a>
          <a href="/blog" class="mobile-link">Blog</a>
          <a href="/login" class="mobile-link">Login</a>
          <a href="/demo-lessons" class="mobile-cta">Listen to Demos</a>
        </div>
      </div>

      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content">
            <div class="hero-badge">
              <span class="pulse"></span>
              AI-Powered Personalization
            </div>
            <h1><span class="highlight">Finally understand</span> that thing you've been avoiding</h1>
            <p>We turn YOUR interests into the teaching method. Your child loves dinosaurs? That's how we'll teach fractions. You own a bakery? That's how we'll explain mortgages. 30-minute lessons that actually stick.</p>
            <div class="hero-buttons">
              <a href="/demo-lessons" class="btn btn-primary">
                Listen to Demo Lessons
                <span class="btn-arrow">→</span>
              </a>
              <a href="#products" class="btn btn-secondary">
                See All Products
              </a>
            </div>
          </div>
          <div class="hero-visual">
            <!-- Demo Card instead of video placeholder -->
            <div class="demo-preview-card">
              <div class="demo-card-header">
                <span class="demo-card-badge">DEMO</span>
                <span class="demo-duration">32 min</span>
              </div>
              <div class="demo-card-content">
                <div class="demo-emoji">🦕</div>
                <h3 class="demo-title">Fractions with Dinosaurs</h3>
                <p class="demo-subtitle">Watch Joe (age 7) learn fractions using T-Rex hunting scenarios</p>
                <a href="/demo-lessons" class="demo-play-btn">
                  <span class="play-circle">▶</span>
                  <span>Listen Now</span>
                </a>
              </div>
              <div class="demo-card-footer">
                <span class="demo-result">"He asked for MORE math!"</span>
                <span class="demo-author">— Joe's Mom</span>
              </div>
            </div>
            <div class="floating-card left">
              <div class="fc-icon">✓</div>
              <div class="fc-title">Real result</div>
              <div class="fc-value">"Finally clicked"</div>
            </div>
            <div class="floating-card right">
              <div class="fc-icon">✓</div>
              <div class="fc-title">All ages</div>
              <div class="fc-value">Kids + Adults</div>
            </div>
          </div>
        </div>
      </section>

      <section class="stats-bar">
        <div class="stats-inner">
          <div class="stat">
            <div class="stat-value">30 min</div>
            <div class="stat-label">Complete Sessions</div>
          </div>
          <div class="stat">
            <div class="stat-value">ANY</div>
            <div class="stat-label">Interest → Subject</div>
          </div>
          <div class="stat">
            <div class="stat-value">All Ages</div>
            <div class="stat-label">Kids + Adults</div>
          </div>
          <div class="stat">
            <div class="stat-value">100%</div>
            <div class="stat-label">Unique to YOU</div>
          </div>
        </div>
      </section>

      <section class="products" id="products">
        <div class="section-header">
          <span class="section-eyebrow">Our Products</span>
          <h2>Choose Your Personalized Experience</h2>
          <p>Each product uses deep AI personalization to create something impossibly unique to your recipient.</p>
        </div>
        <div class="products-grid">
          ${products.map(p => `
            <div class="product-card ${p.featured ? 'featured' : ''}">
              ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
              <div class="product-inner">
                <div class="product-icon">${p.icon}</div>
                <div class="product-content">
                  <h3 class="product-name">${p.name}</h3>
                  <p class="product-desc">${p.description}</p>
                  <div class="product-benefits">
                    ${p.benefits.map(b => `<span class="product-benefit">${b}</span>`).join('')}
                  </div>
                </div>
                <div class="product-action">
                  <div class="product-price">
                    <span class="currency">$</span><span class="amount">${p.price}</span>
                  </div>
                  <a href="${p.href}" class="product-buy-btn">Get Started</a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="how-it-works" id="how-it-works">
        <div class="section-header">
          <span class="section-eyebrow">How It Works</span>
          <h2>Simple Process, Magical Results</h2>
          <p>Creating something deeply personal takes just a few minutes.</p>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Choose Product</h3>
            <p>Pick from Santa messages, vision boards, flash cards, or planners.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Answer Questions</h3>
            <p>Tell us specific stories, achievements, and details about your person.</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>AI Creates Magic</h3>
            <p>Our AI weaves your details into something impossibly personal.</p>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <h3>Download & Share</h3>
            <p>Get your digital file instantly. Watch their reaction.</p>
          </div>
        </div>
      </section>

      <section class="testimonials">
        <div class="section-header">
          <span class="section-eyebrow">Testimonials</span>
          <h2>Real Reactions from Real Customers</h2>
          <p>The moment they realize it's about them specifically.</p>
        </div>
        <div class="testimonials-grid">
          ${testimonials.map(t => `
            <div class="testimonial-card">
              <div class="testimonial-stars">${'★'.repeat(t.rating)}</div>
              <p class="testimonial-quote">${t.quote}</p>
              <div class="testimonial-author">
                <div class="testimonial-avatar">${t.author.charAt(0)}</div>
                <div class="testimonial-info">
                  <div class="name">${t.author}<span class="verified-badge">Verified</span></div>
                  <div class="product">${t.product}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Social Proof Banner - Minimal -->
      <section class="social-proof-banner">
        <div class="social-proof-inner">
          <span class="social-stat">2,847+ lessons created</span>
          <span class="social-divider">•</span>
          <span class="social-stat">98% satisfaction rate</span>
          <span class="social-divider">•</span>
          <span class="social-stat">Used by parents & educators worldwide</span>
        </div>
      </section>

      <section class="pricing" id="pricing">
        <div class="section-header">
          <span class="section-eyebrow">Pricing</span>
          <h2>Simple, Transparent Pricing</h2>
          <p>Buy individual products or subscribe for monthly credits.</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-name">Starter</div>
            <div class="pricing-price">
              <span class="amount">$25</span><span class="period">/month</span>
            </div>
            <div class="pricing-outputs">2 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types</li>
              <li>PDF & audio downloads</li>
              <li>Email support</li>
              <li>30-day guarantee</li>
            </ul>
            <a href="/api/stripe/checkout?tier=starter" class="pricing-btn secondary">Get Started</a>
          </div>
          <div class="pricing-card popular">
            <span class="pricing-badge">Most Popular</span>
            <div class="pricing-name">Regular</div>
            <div class="pricing-price">
              <span class="amount">$39</span><span class="period">/month</span>
            </div>
            <div class="pricing-outputs">4 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types</li>
              <li>PDF & audio downloads</li>
              <li>Priority support</li>
              <li>Perfect for gifting</li>
            </ul>
            <a href="/api/stripe/checkout?tier=regular" class="pricing-btn primary">Get Started</a>
          </div>
          <div class="pricing-card">
            <div class="pricing-name">Power User</div>
            <div class="pricing-price">
              <span class="amount">$59</span><span class="period">/month</span>
            </div>
            <div class="pricing-outputs">8 outputs per month</div>
            <ul class="pricing-features">
              <li>All product types</li>
              <li>PDF & audio downloads</li>
              <li>Priority support</li>
              <li>Commercial use</li>
            </ul>
            <a href="/api/stripe/checkout?tier=power" class="pricing-btn secondary">Get Started</a>
          </div>
        </div>
      </section>

      <!-- Topics Section - Simplified -->
      <section class="topics-section" id="topics">
        <div class="section-header">
          <span class="section-eyebrow">What Can You Learn?</span>
          <h2>Virtually Any Topic</h2>
          <p>The more specific your input, the more personalized your lesson.</p>
        </div>

        <div class="topics-simple-grid">
          <div class="topic-card-simple">
            <span class="topic-icon">📐</span>
            <h3>Math</h3>
            <p>Fractions, algebra, percentages, geometry</p>
          </div>
          <div class="topic-card-simple">
            <span class="topic-icon">🔬</span>
            <h3>Science</h3>
            <p>Solar system, biology, chemistry, physics</p>
          </div>
          <div class="topic-card-simple">
            <span class="topic-icon">💰</span>
            <h3>Finance</h3>
            <p>Mortgages, investing, budgeting, taxes</p>
          </div>
          <div class="topic-card-simple">
            <span class="topic-icon">🌍</span>
            <h3>History</h3>
            <p>Historical events, civilizations, languages</p>
          </div>
          <div class="topic-card-simple">
            <span class="topic-icon">💻</span>
            <h3>Tech</h3>
            <p>Coding basics, AI, internet safety</p>
          </div>
          <div class="topic-card-simple">
            <span class="topic-icon">🎨</span>
            <h3>Life Skills</h3>
            <p>Communication, time management, cooking</p>
          </div>
        </div>

        <div class="specificity-tip">
          <div class="tip-content">
            <span class="tip-icon">💡</span>
            <div class="tip-text">
              <strong>Pro tip:</strong> "Fractions" is okay. "Fractions using dinosaur hunting scenarios for my 6-year-old who loves T-Rex" is <em>magical</em>.
            </div>
          </div>
        </div>
      </section>

      <section class="cta">
        <div class="cta-inner">
          <h2>Ready to Learn Your Way?</h2>
          <p>Watch real demo lessons and see how Thought Organizer™ connects what you love to what you need to learn. For kids AND adults.</p>
          <div class="cta-buttons">
            <a href="/demo-lessons" class="btn btn-primary">Listen to Demo Lessons</a>
            <button id="pwa-install-btn" class="btn btn-secondary" style="display: none;">
              📱 Install App
            </button>
          </div>
        </div>
      </section>

      <footer class="footer">
        <div class="footer-simple">
          <a href="/" class="logo">personalized<span>output</span></a>
          <div class="footer-links-row">
            <a href="/demo-lessons">Demo</a>
            <a href="#products">Products</a>
            <a href="#pricing">Pricing</a>
            <a href="/blog">Blog</a>
            <a href="mailto:hello@personalizedoutput.com">Contact</a>
            <a href="/privacy">Privacy</a>
          </div>
          <div class="footer-copyright">
            © ${new Date().getFullYear()} Personalized Output LLC
          </div>
        </div>
      </footer>

      <script>
        // Mobile Menu Functionality
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const mobileCloseBtn = document.querySelector('.mobile-close-btn');
        const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-cta');

        function openMobileMenu() {
          mobileMenu.classList.add('active');
          mobileOverlay.classList.add('active');
          mobileMenuBtn.classList.add('active');
          document.body.classList.add('menu-open');
        }

        function closeMobileMenu() {
          mobileMenu.classList.remove('active');
          mobileOverlay.classList.remove('active');
          mobileMenuBtn.classList.remove('active');
          document.body.classList.remove('menu-open');
        }

        mobileMenuBtn.addEventListener('click', () => {
          if (mobileMenu.classList.contains('active')) {
            closeMobileMenu();
          } else {
            openMobileMenu();
          }
        });

        mobileCloseBtn.addEventListener('click', closeMobileMenu);
        mobileOverlay.addEventListener('click', closeMobileMenu);

        // Close menu when clicking a link
        mobileLinks.forEach(link => {
          link.addEventListener('click', () => {
            closeMobileMenu();
          });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
          }
        });

        // Nav scroll effect
        window.addEventListener('scroll', () => {
          const nav = document.querySelector('.nav');
          if (window.scrollY > 50) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
        });

        // Smooth scroll for anchor links (including mobile menu links)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        // PWA Service Worker Registration
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
              .then(reg => console.log('[PWA] Service Worker registered'))
              .catch(err => console.log('[PWA] SW registration failed:', err));
          });
        }

        // PWA Install Prompt
        let deferredPrompt;
        const installBtn = document.getElementById('pwa-install-btn');
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
          if (installBtn) installBtn.style.display = 'inline-flex';
        });
        if (installBtn) {
          installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              console.log('[PWA] Install outcome:', outcome);
              deferredPrompt = null;
              installBtn.style.display = 'none';
            }
          });
        }

        // Enhanced scroll reveal animations with stagger
        const observerOptions = {
          root: null,
          rootMargin: '0px 0px -50px 0px',
          threshold: 0.1
        };

        const revealObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        }, observerOptions);

        // Helper to add staggered reveals to groups
        function setupStaggeredReveal(selector, containerSelector) {
          const containers = containerSelector ? document.querySelectorAll(containerSelector) : [document];
          containers.forEach(container => {
            const items = container.querySelectorAll(selector);
            items.forEach((el, index) => {
              el.classList.add('reveal');
              el.style.transitionDelay = (index * 0.1) + 's';
              revealObserver.observe(el);
            });
          });
        }

        // Staggered product cards
        setupStaggeredReveal('.product-card', '.products-grid');

        // Staggered testimonials
        setupStaggeredReveal('.testimonial-card', '.testimonials-grid');

        // Staggered pricing cards
        setupStaggeredReveal('.pricing-card', '.pricing-grid');

        // Staggered steps
        setupStaggeredReveal('.step', '.steps');

        // Staggered topic cards
        setupStaggeredReveal('.topic-card-simple', '.topics-simple-grid');

        // Observe section headers (no stagger, just reveal)
        document.querySelectorAll('.section-header').forEach(el => {
          el.classList.add('reveal');
          revealObserver.observe(el);
        });

        // Stats bar reveal
        document.querySelectorAll('.stat').forEach((el, index) => {
          el.classList.add('reveal');
          el.style.transitionDelay = (index * 0.15) + 's';
          revealObserver.observe(el);
        });
      </script>
    </body>
    </html>
  `;
}
