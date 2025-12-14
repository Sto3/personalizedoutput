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
          --primary: #e94560;
          --primary-light: #ff6b6b;
          --primary-dark: #c73e54;
          --accent: #f8b500;
          --accent-light: #ffd700;
          --bronze: #cd7f32;
          --dark-bg: #0a0a0f;
          --dark-surface: #111118;
          --dark-card: #1a1a24;
          --dark-elevated: #242432;
          --text-primary: #ffffff;
          --text-secondary: rgba(255,255,255,0.75);
          --text-muted: rgba(255,255,255,0.5);
          --glass-bg: rgba(255,255,255,0.03);
          --glass-border: rgba(255,255,255,0.08);
          --gradient-primary: linear-gradient(135deg, var(--primary), var(--primary-light));
          --gradient-accent: linear-gradient(135deg, var(--accent), var(--accent-light));
          --gradient-bronze: linear-gradient(135deg, var(--bronze), #d4a84b);
          /* Premium shadows */
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
          --shadow-md: 0 8px 24px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3);
          --shadow-lg: 0 16px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3);
          --shadow-xl: 0 32px 64px rgba(0,0,0,0.6), 0 16px 32px rgba(0,0,0,0.4);
          --shadow-glow-primary: 0 0 40px rgba(233, 69, 96, 0.4), 0 0 80px rgba(233, 69, 96, 0.2);
          --shadow-glow-accent: 0 0 40px rgba(248, 181, 0, 0.3), 0 0 80px rgba(248, 181, 0, 0.15);
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--dark-bg);
          color: var(--text-primary);
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Animated Background */
        .animated-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          overflow: hidden;
        }
        .animated-bg::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -30%;
          width: 100%;
          height: 150%;
          background: radial-gradient(ellipse at center, rgba(233, 69, 96, 0.12) 0%, transparent 50%);
          animation: pulse 8s ease-in-out infinite;
        }
        .animated-bg::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -20%;
          width: 80%;
          height: 100%;
          background: radial-gradient(ellipse at center, rgba(248, 181, 0, 0.08) 0%, transparent 50%);
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
        .fade-in {
          opacity: 0;
          animation: fadeInUp 0.8s ease forwards;
        }
        .fade-in-delay-1 { animation-delay: 0.1s; }
        .fade-in-delay-2 { animation-delay: 0.2s; }
        .fade-in-delay-3 { animation-delay: 0.3s; }
        .fade-in-delay-4 { animation-delay: 0.4s; }

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
          color: var(--text-primary);
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
          color: var(--text-secondary);
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
        .nav-link:hover { color: var(--text-primary); }
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
          color: var(--text-primary);
          font-size: 1.5rem;
          cursor: pointer;
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
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: var(--shadow-lg), var(--shadow-glow-primary);
        }
        .btn-primary:hover::before {
          transform: translateX(100%);
        }
        .btn-secondary {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          color: white;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow-sm);
        }
        .btn-secondary:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          border-color: rgba(255,255,255,0.2);
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

        /* Hero Video/Visual */
        .hero-visual {
          position: relative;
        }
        .hero-video-container {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          background: var(--dark-card);
          border: 1px solid var(--glass-border);
          aspect-ratio: 9/16;
          max-height: 600px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }
        .hero-video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--dark-card) 0%, var(--dark-elevated) 100%);
          padding: 40px;
          text-align: center;
        }
        .hero-video-placeholder .play-icon {
          width: 80px;
          height: 80px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 24px;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .hero-video-placeholder .play-icon:hover {
          transform: scale(1.1);
        }
        .hero-video-placeholder h3 {
          font-size: 1.25rem;
          margin-bottom: 8px;
        }
        .hero-video-placeholder p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .floating-card {
          position: absolute;
          background: var(--dark-elevated);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 16px 20px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
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
          background: var(--dark-surface);
          border-top: 1px solid var(--glass-border);
          border-bottom: 1px solid var(--glass-border);
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
          background: linear-gradient(135deg, rgba(26, 26, 36, 0.9) 0%, rgba(26, 26, 36, 0.7) 100%);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          box-shadow: var(--shadow-md);
        }
        .product-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .product-card:hover {
          transform: translateY(-12px) scale(1.02);
          border-color: rgba(233, 69, 96, 0.4);
          box-shadow: var(--shadow-xl), var(--shadow-glow-primary);
        }
        .product-card.featured {
          border-color: rgba(233, 69, 96, 0.5);
          background: linear-gradient(180deg, rgba(233, 69, 96, 0.12) 0%, rgba(26, 26, 36, 0.9) 100%);
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
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
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
          background: var(--dark-elevated);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
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
          background: var(--dark-surface);
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
          background: linear-gradient(135deg, rgba(26, 26, 36, 0.85) 0%, rgba(26, 26, 36, 0.6) 100%);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          box-shadow: var(--shadow-md);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .testimonial-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg), 0 0 30px rgba(233, 69, 96, 0.1);
          border-color: rgba(255,255,255,0.15);
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
        }
        .testimonial-info .product {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Social Section */
        .social-section {
          padding: 100px 24px;
        }
        .social-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .social-card {
          background: linear-gradient(135deg, rgba(26, 26, 36, 0.85) 0%, rgba(26, 26, 36, 0.6) 100%);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: var(--shadow-md);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .social-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(255,255,255,0.15);
        }
        .social-video-container {
          position: relative;
          width: 100%;
          padding-bottom: 177.78%; /* 9:16 aspect ratio */
          background: var(--dark-elevated);
        }
        .social-video-container iframe,
        .social-video-container video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .social-video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(26, 26, 36, 0.9) 0%, rgba(233, 69, 96, 0.2) 100%);
          padding: 24px;
          text-align: center;
        }
        .social-video-placeholder .platform-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .social-video-placeholder h4 {
          font-size: 1.1rem;
          margin-bottom: 8px;
        }
        .social-video-placeholder p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .social-video-placeholder .coming-soon {
          padding: 8px 16px;
          background: rgba(233, 69, 96, 0.2);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-light);
        }
        .social-links-bar {
          max-width: 800px;
          margin: 48px auto 0;
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .social-link-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        .social-link-btn:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .social-link-btn .icon {
          font-size: 1.25rem;
        }
        @media (max-width: 1024px) {
          .social-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .social-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
          }
          .social-links-bar {
            flex-direction: column;
            align-items: center;
          }
          .social-link-btn {
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }
        }

        /* Pricing Section */
        .pricing {
          padding: 120px 24px;
          background: var(--dark-surface);
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
          background: linear-gradient(135deg, rgba(26, 26, 36, 0.9) 0%, rgba(26, 26, 36, 0.7) 100%);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          border-radius: 24px;
          padding: 48px 40px;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
        }
        .pricing-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(255,255,255,0.15);
        }
        .pricing-card.popular {
          border-color: rgba(233, 69, 96, 0.5);
          transform: scale(1.05);
          z-index: 10;
          box-shadow: var(--shadow-xl), var(--shadow-glow-primary);
          background: linear-gradient(180deg, rgba(233, 69, 96, 0.1) 0%, rgba(26, 26, 36, 0.9) 100%);
        }
        .pricing-card.popular:hover {
          transform: scale(1.05) translateY(-10px);
          box-shadow: var(--shadow-xl), 0 0 60px rgba(233, 69, 96, 0.4);
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
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: white;
        }
        .pricing-btn:hover {
          transform: translateY(-2px);
        }

        /* Topics Section */
        .topics-section {
          padding: 100px 24px;
          background: var(--dark-surface);
        }
        .be-specific-banner {
          max-width: 800px;
          margin: 24px auto 0;
          padding: 20px 28px;
          background: linear-gradient(135deg, rgba(248, 181, 0, 0.15), rgba(233, 69, 96, 0.1));
          border: 1px solid rgba(248, 181, 0, 0.3);
          border-radius: 16px;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .be-specific-banner .tip-icon {
          margin-right: 8px;
        }
        .be-specific-banner em {
          color: var(--accent);
          font-style: normal;
          font-weight: 600;
        }
        .topic-classification {
          max-width: 1200px;
          margin: 40px auto 32px;
        }
        .classification-header {
          display: flex;
          justify-content: center;
          gap: 32px;
          flex-wrap: wrap;
        }
        .class-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .class-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .class-item.green .class-dot { background: #4ade80; }
        .class-item.yellow .class-dot { background: #facc15; }
        .class-item.red .class-dot { background: #f87171; }
        .topics-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .topic-category {
          background: linear-gradient(135deg, rgba(26, 26, 36, 0.85) 0%, rgba(26, 26, 36, 0.6) 100%);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border-radius: 20px;
          padding: 28px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: var(--shadow-md);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .topic-category:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(255,255,255,0.15);
        }
        .topic-category h3 {
          font-size: 1.1rem;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .topic-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .topic-tag {
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid transparent;
        }
        .topic-tag.green {
          background: rgba(74, 222, 128, 0.15);
          border-color: rgba(74, 222, 128, 0.3);
          color: #4ade80;
        }
        .topic-tag.yellow {
          background: rgba(250, 204, 21, 0.15);
          border-color: rgba(250, 204, 21, 0.3);
          color: #facc15;
        }
        .topic-tag.red {
          background: rgba(248, 113, 113, 0.15);
          border-color: rgba(248, 113, 113, 0.3);
          color: #f87171;
        }
        .be-specific-examples {
          max-width: 900px;
          margin: 48px auto 0;
          background: var(--dark-card);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid var(--glass-border);
        }
        .be-specific-examples h4 {
          text-align: center;
          font-size: 1.25rem;
          margin-bottom: 24px;
          color: var(--accent);
        }
        .example-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .example {
          padding: 16px;
          background: var(--dark-elevated);
          border-radius: 12px;
        }
        .example-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
          padding: 4px 10px;
          border-radius: 4px;
          display: inline-block;
        }
        .example-label.bad {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }
        .example-label.good {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }
        .example-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .example-grid {
            grid-template-columns: 1fr;
          }
          .classification-header {
            gap: 16px;
          }
        }

        /* CTA Section */
        .cta {
          padding: 120px 24px;
          text-align: center;
        }
        .cta-inner {
          max-width: 800px;
          margin: 0 auto;
          background: linear-gradient(180deg, rgba(26, 26, 36, 0.95) 0%, rgba(26, 26, 36, 0.8) 100%);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 32px;
          padding: 80px 60px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-xl), inset 0 1px 1px rgba(255,255,255,0.1);
        }
        .cta-inner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-primary);
          box-shadow: 0 0 30px rgba(233, 69, 96, 0.5);
        }
        .cta-inner::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 32px;
          padding: 1px;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent);
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

        /* Footer */
        .footer {
          padding: 80px 24px 40px;
          background: var(--dark-bg);
          border-top: 1px solid var(--glass-border);
        }
        .footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr);
          gap: 60px;
        }
        .footer-brand .logo {
          margin-bottom: 20px;
          display: inline-block;
        }
        .footer-brand p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.7;
          max-width: 300px;
        }
        .footer-section h4 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 24px;
        }
        .footer-links {
          list-style: none;
        }
        .footer-links li {
          margin-bottom: 14px;
        }
        .footer-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: var(--text-primary);
        }
        .footer-bottom {
          max-width: 1400px;
          margin: 60px auto 0;
          padding-top: 32px;
          border-top: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .footer-social {
          display: flex;
          gap: 16px;
        }
        .footer-social a {
          color: var(--text-muted);
          font-size: 1.25rem;
          transition: color 0.2s;
        }
        .footer-social a:hover {
          color: var(--primary);
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
          .footer-inner { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .mobile-menu-btn { display: block; }
          .hero { padding: 120px 20px 80px; }
          .hero-content h1 { font-size: 2rem; }
          .hero-buttons { flex-direction: column; width: 100%; }
          .btn { width: 100%; }
          .stats-inner { flex-direction: column; gap: 24px; }
          .steps { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr; text-align: center; }
          .footer-brand p { margin: 0 auto; }
          .footer-bottom { flex-direction: column; gap: 16px; }
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
          <button class="mobile-menu-btn">☰</button>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content">
            <div class="hero-badge">
              <span class="pulse"></span>
              Thought Organizer™ - NOW LIVE
            </div>
            <h1>Learn Anything Through <span class="highlight">What You Love</span></h1>
            <p>Our Thought Organizer™ AI creates personalized lessons that use YOUR passions to teach what you need. Kids learn fractions through dinosaurs. Adults master mortgages through their bakery business. Learning finally clicks.</p>
            <div class="hero-buttons">
              <a href="/demo-lessons" class="btn btn-primary">
                🧠 Watch Demo Lessons
              </a>
              <a href="#products" class="btn btn-secondary">
                Explore All Products
              </a>
            </div>
          </div>
          <div class="hero-visual">
            <div class="hero-video-container">
              <div class="hero-video-placeholder" id="hero-video">
                <div class="play-icon">▶</div>
                <h3>See It In Action</h3>
                <p>Watch Joe learn fractions through dinosaurs</p>
              </div>
            </div>
            <div class="floating-card left">
              <div class="fc-icon">🧠</div>
              <div class="fc-title">Thought Organizer™</div>
              <div class="fc-value">Passions → Learning</div>
            </div>
            <div class="floating-card right">
              <div class="fc-icon">👨‍👩‍👧‍👦</div>
              <div class="fc-title">For Everyone</div>
              <div class="fc-value">Kids & Adults</div>
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
                  <div class="name">${t.author}</div>
                  <div class="product">${t.product}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- See Us On Social Section -->
      <section class="social-section" id="social">
        <div class="section-header">
          <span class="section-eyebrow">See Us On Social</span>
          <h2>Watch Personalized Learning in Action</h2>
          <p>Short videos showing real lessons, real reactions, and real results.</p>
        </div>
        <div class="social-grid">
          <div class="social-card">
            <div class="social-video-container">
              <div class="social-video-placeholder">
                <div class="platform-icon">📱</div>
                <h4>Joe Learns Fractions</h4>
                <p>Watch Joe master fractions through dinosaurs!</p>
                <span class="coming-soon">Video Coming Soon</span>
              </div>
            </div>
          </div>
          <div class="social-card">
            <div class="social-video-container">
              <div class="social-video-placeholder">
                <div class="platform-icon">🎬</div>
                <h4>Parent Reactions</h4>
                <p>Mom sees her child ask for MORE homework</p>
                <span class="coming-soon">Video Coming Soon</span>
              </div>
            </div>
          </div>
          <div class="social-card">
            <div class="social-video-container">
              <div class="social-video-placeholder">
                <div class="platform-icon">✨</div>
                <h4>Adult Learning Wins</h4>
                <p>Adults finally understanding finance</p>
                <span class="coming-soon">Video Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
        <div class="social-links-bar">
          <a href="https://tiktok.com/@personalizedoutput" target="_blank" rel="noopener" class="social-link-btn">
            <span class="icon">🎵</span>
            <span>Follow on TikTok</span>
          </a>
          <a href="https://instagram.com/personalizedoutput" target="_blank" rel="noopener" class="social-link-btn">
            <span class="icon">📸</span>
            <span>Follow on Instagram</span>
          </a>
          <a href="https://youtube.com/@personalizedoutput" target="_blank" rel="noopener" class="social-link-btn">
            <span class="icon">▶️</span>
            <span>Subscribe on YouTube</span>
          </a>
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

      <!-- Topics & Be Specific Section -->
      <section class="topics-section" id="topics">
        <div class="section-header">
          <span class="section-eyebrow">What Can You Learn?</span>
          <h2>Virtually Any Topic</h2>
          <p class="be-specific-banner">
            <span class="tip-icon">💡</span>
            <strong>Be Specific = Magic Output</strong> — The more specific your input, the more personalized your lesson. "Fractions" is okay. "Fractions using dinosaur hunting scenarios for my 6-year-old who loves T-Rex" is <em>magical</em>.
          </p>
        </div>

        <div class="topic-classification">
          <div class="classification-header">
            <div class="class-item green">
              <span class="class-dot"></span>
              <span class="class-label">Works Great</span>
            </div>
            <div class="class-item yellow">
              <span class="class-dot"></span>
              <span class="class-label">Good with Specificity</span>
            </div>
            <div class="class-item red">
              <span class="class-dot"></span>
              <span class="class-label">Needs Extra Detail</span>
            </div>
          </div>
        </div>

        <div class="topics-grid">
          <div class="topic-category">
            <h3>📐 Math & Numbers</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Fractions</span>
              <span class="topic-tag green">Multiplication</span>
              <span class="topic-tag green">Basic Algebra</span>
              <span class="topic-tag green">Percentages</span>
              <span class="topic-tag yellow">Geometry</span>
              <span class="topic-tag yellow">Statistics</span>
              <span class="topic-tag yellow">Calculus Basics</span>
            </div>
          </div>
          <div class="topic-category">
            <h3>🔬 Science</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Solar System</span>
              <span class="topic-tag green">Weather</span>
              <span class="topic-tag green">Human Body</span>
              <span class="topic-tag green">Animals & Habitats</span>
              <span class="topic-tag yellow">Chemistry Basics</span>
              <span class="topic-tag yellow">Physics Concepts</span>
              <span class="topic-tag yellow">Biology</span>
            </div>
          </div>
          <div class="topic-category">
            <h3>💰 Finance & Business</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Mortgages</span>
              <span class="topic-tag green">Interest Rates</span>
              <span class="topic-tag green">Budgeting</span>
              <span class="topic-tag green">Investing Basics</span>
              <span class="topic-tag yellow">Taxes</span>
              <span class="topic-tag yellow">Business Planning</span>
              <span class="topic-tag red">Advanced Trading</span>
            </div>
          </div>
          <div class="topic-category">
            <h3>🌍 Languages & History</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Spanish Basics</span>
              <span class="topic-tag green">French Basics</span>
              <span class="topic-tag green">Historical Events</span>
              <span class="topic-tag yellow">Grammar Rules</span>
              <span class="topic-tag yellow">World Wars</span>
              <span class="topic-tag yellow">Ancient Civilizations</span>
            </div>
          </div>
          <div class="topic-category">
            <h3>🎨 Life Skills</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Cooking Basics</span>
              <span class="topic-tag green">Time Management</span>
              <span class="topic-tag green">Communication</span>
              <span class="topic-tag yellow">Emotional Intelligence</span>
              <span class="topic-tag yellow">Public Speaking</span>
              <span class="topic-tag yellow">Critical Thinking</span>
            </div>
          </div>
          <div class="topic-category">
            <h3>💻 Technology</h3>
            <div class="topic-tags">
              <span class="topic-tag green">Internet Safety</span>
              <span class="topic-tag green">How Computers Work</span>
              <span class="topic-tag yellow">Coding Basics</span>
              <span class="topic-tag yellow">AI Fundamentals</span>
              <span class="topic-tag red">Advanced Programming</span>
            </div>
          </div>
        </div>

        <div class="be-specific-examples">
          <h4>The Specificity Secret</h4>
          <div class="example-grid">
            <div class="example">
              <div class="example-label bad">Generic</div>
              <div class="example-text">"Teach fractions"</div>
            </div>
            <div class="example">
              <div class="example-label good">Specific</div>
              <div class="example-text">"Teach fractions to my 7-year-old who loves Minecraft, using blocks and building"</div>
            </div>
            <div class="example">
              <div class="example-label bad">Generic</div>
              <div class="example-text">"Explain mortgages"</div>
            </div>
            <div class="example">
              <div class="example-label good">Specific</div>
              <div class="example-text">"Explain mortgages using my bakery business as the example - I understand flour costs and delivery fees"</div>
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
        <div class="footer-inner">
          <div class="footer-brand">
            <a href="/" class="logo">personalized<span>output</span></a>
            <p>Powered by Thought Organizer™ AI — creating deeply personalized digital experiences that make people say "How did it know that about me?"</p>
          </div>
          <div class="footer-section">
            <h4>Products</h4>
            <ul class="footer-links">
              <li><a href="/demo-lessons">Learning Sessions</a></li>
              <li><a href="/santa">Santa Message</a></li>
              <li><a href="/vision-board">Vision Board</a></li>
              <li><a href="/flash-cards">Flash Cards</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Company</h4>
            <ul class="footer-links">
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="mailto:hello@personalizedoutput.com">Contact</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Legal</h4>
            <ul class="footer-links">
              <li><a href="/terms">Terms</a></li>
              <li><a href="/privacy">Privacy</a></li>
              <li><a href="/copyright">Copyright</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div>© ${new Date().getFullYear()} Personalized Output. Thought Organizer™ is a trademark of Personalized Output LLC. All rights reserved.</div>
          <div class="footer-social">
            <a href="#">📸</a>
            <a href="#">🎵</a>
            <a href="#">📌</a>
          </div>
        </div>
      </footer>

      <script>
        // Nav scroll effect
        window.addEventListener('scroll', () => {
          const nav = document.querySelector('.nav');
          if (window.scrollY > 50) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
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

        // Scroll reveal animations
        const observerOptions = {
          root: null,
          rootMargin: '0px',
          threshold: 0.1
        };

        const revealObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              // Add staggered delay to children
              const children = entry.target.querySelectorAll('.reveal-child');
              children.forEach((child, index) => {
                setTimeout(() => {
                  child.classList.add('visible');
                }, index * 100);
              });
            }
          });
        }, observerOptions);

        // Observe all sections and cards
        document.querySelectorAll('.product-card, .testimonial-card, .pricing-card, .topic-category, .step, .social-card').forEach(el => {
          el.classList.add('reveal');
          revealObserver.observe(el);
        });

        // Observe section headers
        document.querySelectorAll('.section-header').forEach(el => {
          el.classList.add('reveal');
          revealObserver.observe(el);
        });
      </script>
    </body>
    </html>
  `;
}
