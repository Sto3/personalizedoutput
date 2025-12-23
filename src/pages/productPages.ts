/**
 * Product Detail Pages
 *
 * Premium, sophisticated product pages with Stripe checkout integration.
 * Each product page includes: hero, features, process, FAQ, and CTA.
 * Matches the coral/purple color scheme of the new homepage.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';
import { PRODUCTS, ProductType, ProductInfo } from '../lib/supabase/orderService';

// ============================================================
// PRODUCT PAGE CONTENT
// ============================================================

interface ProductPageContent {
  heroSubtitle: string;
  heroDescription: string;
  features: Array<{ icon: string; title: string; description: string }>;
  processSteps: Array<{ step: number; title: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
  testimonials: Array<{ name: string; location: string; quote: string; rating: number }>;
  examples?: Array<{ title: string; description: string }>;
  deliverables: string[];
  guarantee: string;
}

const PRODUCT_CONTENT: Record<ProductType, ProductPageContent> = {
  learning_session: {
    heroSubtitle: 'Personalized Audio Education',
    heroDescription: 'A 30-minute audio lesson that uses what they already love to teach what they need to learn. Not a generic template - every word is crafted around their specific interests.',
    features: [
      { icon: '🎯', title: 'Interest-Based Learning', description: 'We take their passion - dinosaurs, baking, video games - and weave the lesson around it.' },
      { icon: '🧠', title: 'Cognitive Science Backed', description: 'Built on proven learning principles that make concepts stick through emotional connection.' },
      { icon: '🎧', title: '30 Minutes of Focus', description: 'Designed for optimal attention spans with natural engagement hooks throughout.' },
      { icon: '📖', title: 'Story-Driven', description: 'Lessons unfold as narratives, not lectures. Learning happens through adventure.' },
    ],
    processSteps: [
      { step: 1, title: 'Tell Us About Them', description: 'Share their interests, age, and what they need to learn. The more details, the more personal.' },
      { step: 2, title: 'We Craft the Lesson', description: 'Our system weaves their interests into a captivating educational narrative.' },
      { step: 3, title: 'Professional Audio', description: 'Your custom lesson is voiced by professional narrators with engaging delivery.' },
      { step: 4, title: 'Instant Download', description: 'Receive your MP3 file ready to play anywhere - car rides, bedtime, anytime.' },
    ],
    faqs: [
      { question: 'What age range is this for?', answer: 'We create lessons for ages 4-14 primarily, but also serve adults learning new concepts. Just tell us the age and we adjust vocabulary, pace, and complexity accordingly.' },
      { question: 'What subjects can you teach?', answer: 'Math, science, history, reading comprehension, social skills, life skills, and more. If you can explain it, we can teach it through their interests.' },
      { question: 'How personal does it get?', answer: 'Very. We mention their name, reference their specific interests (their favorite dinosaur, their pet\'s name), and create scenarios they\'d find exciting.' },
      { question: 'What if they don\'t like it?', answer: 'We offer a full refund within 7 days if the lesson doesn\'t meet your expectations. No questions asked.' },
    ],
    testimonials: [],
    deliverables: ['30-minute MP3 audio lesson', 'Professional narration', 'Companion PDF guide with key concepts', 'Unlimited replays'],
    guarantee: '7-day money-back guarantee if you\'re not completely satisfied',
  },

  video_learning_session: {
    heroSubtitle: 'Personalized Video Education',
    heroDescription: 'A 30-minute video lesson that combines engaging visuals with personalized content. Watch their eyes light up as concepts come alive through animation and storytelling tailored to their interests.',
    features: [
      { icon: '🎬', title: 'Visual Learning', description: 'Dynamic animations and graphics that make abstract concepts concrete and memorable.' },
      { icon: '🎯', title: 'Interest-Based Content', description: 'Everything from the examples to the visuals is customized to what they love.' },
      { icon: '🧠', title: 'Multi-Sensory Engagement', description: 'Combines audio narration with visual storytelling for deeper understanding.' },
      { icon: '📱', title: 'Watch Anywhere', description: 'MP4 format works on any device - tablet, phone, computer, or TV.' },
    ],
    processSteps: [
      { step: 1, title: 'Tell Us About Them', description: 'Share their interests, age, and what they need to learn. The more details, the more personal.' },
      { step: 2, title: 'We Create the Video', description: 'Custom animations and visuals are created around their specific interests.' },
      { step: 3, title: 'Professional Production', description: 'Your lesson is produced with engaging narration and polished visuals.' },
      { step: 4, title: 'Instant Download', description: 'Receive your MP4 video file ready to watch anywhere, anytime.' },
    ],
    faqs: [
      { question: 'What age range is this for?', answer: 'We create video lessons for ages 4-14 primarily, but also serve adults learning new concepts. The visual style and complexity adjust to match the learner.' },
      { question: 'How is this different from audio lessons?', answer: 'Video lessons include animated visuals, on-screen graphics, and visual demonstrations that make complex concepts easier to understand. Perfect for visual learners.' },
      { question: 'What subjects work best for video?', answer: 'Math, science, geography, and any topic with visual or spatial components shine in video format. Abstract concepts become concrete when you can see them.' },
      { question: 'What if they don\'t like it?', answer: 'We offer a full refund within 7 days if the lesson doesn\'t meet your expectations. No questions asked.' },
    ],
    testimonials: [],
    deliverables: ['30-minute MP4 video lesson', 'Custom animations and visuals', 'Professional narration', 'Companion PDF guide with key concepts', 'Unlimited replays'],
    guarantee: '7-day money-back guarantee if you\'re not completely satisfied',
  },

  flash_cards: {
    heroSubtitle: 'Custom Learning Cards',
    heroDescription: 'Printable flashcards designed around their interests. Dinosaur facts for multiplication. Space themes for vocabulary. Whatever clicks for them.',
    features: [
      { icon: '🎨', title: 'Beautifully Designed', description: 'Premium card designs that kids actually want to use. Not boring templates.' },
      { icon: '🧩', title: 'Interest-Integrated', description: 'Every card connects the content to something they care about.' },
      { icon: '📱', title: 'Print or Digital', description: 'Get both printable PDFs and digital versions for tablets.' },
      { icon: '♻️', title: 'Reusable System', description: 'Designed with spaced repetition in mind for long-term retention.' },
    ],
    processSteps: [
      { step: 1, title: 'Share Their Details', description: 'Tell us their interests, age, and what they\'re learning.' },
      { step: 2, title: 'We Design the Deck', description: 'Custom cards created around their specific passions.' },
      { step: 3, title: 'Review & Refine', description: 'See your cards and request any adjustments.' },
      { step: 4, title: 'Download & Print', description: 'High-quality PDFs ready to print at home or any print shop.' },
    ],
    faqs: [
      { question: 'How many cards do I get?', answer: 'Each deck includes 30-50 cards depending on the subject complexity. Enough to thoroughly cover one topic.' },
      { question: 'Can I request specific content?', answer: 'Absolutely. Tell us exactly what concepts need covering and we\'ll build the deck around that.' },
      { question: 'What print size works best?', answer: 'We provide multiple sizes: standard 3x5, mini cards for on-the-go, and full-page versions for younger kids.' },
    ],
    testimonials: [],
    deliverables: ['30-50 custom flashcards', 'Multiple print sizes (3x5, mini, full-page)', 'Digital version for tablets', 'Study guide with tips'],
    guarantee: 'Free revision if the cards don\'t match your expectations',
  },

  vision_board: {
    heroSubtitle: 'Goals Visualized',
    heroDescription: 'A stunning, personalized vision board that reflects your actual goals, values, and dreams. Not generic stock imagery - every element chosen for you.',
    features: [
      { icon: '✨', title: 'Truly Personal', description: 'Based on your specific goals, values, and aesthetic preferences.' },
      { icon: '🎨', title: 'Professional Design', description: 'Created by designers, not algorithms. Cohesive, beautiful, intentional.' },
      { icon: '📐', title: 'Print-Ready', description: 'High-resolution files sized for framing. Museum-quality output.' },
      { icon: '🔄', title: 'Multiple Formats', description: 'Poster, desktop wallpaper, phone wallpaper - see your vision everywhere.' },
    ],
    processSteps: [
      { step: 1, title: 'Deep Discovery', description: 'Complete the Personalization Experience — share your goals, dreams, and visual style.' },
      { step: 2, title: 'Curated Creation', description: 'We select and arrange imagery that represents YOUR specific vision.' },
      { step: 3, title: 'Design Review', description: 'Preview your board and request any changes.' },
      { step: 4, title: 'High-Res Delivery', description: 'Receive print-ready files in multiple sizes and formats.' },
    ],
    faqs: [
      { question: 'How is this different from Pinterest?', answer: 'Pinterest shows you other people\'s visions. This is YOUR vision, professionally designed and ready to display prominently in your space.' },
      { question: 'What sizes do I get?', answer: 'Standard includes 24x36 poster, 16x20 print, desktop wallpaper, and phone wallpaper. All high-resolution.' },
      { question: 'Can I get revisions?', answer: 'Yes! One round of revisions is included. We want you to love it.' },
    ],
    testimonials: [],
    deliverables: ['24x36" print-ready poster', '16x20" print file', 'Desktop wallpaper', 'Phone wallpaper', 'One revision round'],
    guarantee: 'Love it or we\'ll redo it - satisfaction guaranteed',
  },

  santa_message: {
    heroSubtitle: 'Holiday Favorite',
    heroDescription: 'A personalized audio experience from Santa that knows their name, their interests, their accomplishments, and their wishes. A truly special experience.',
    features: [
      { icon: '🎅', title: 'Deeply Personal', description: 'Santa knows their name, their pet, their achievements, their wishes - everything you share.' },
      { icon: '🎙️', title: 'Professional Voice', description: 'Warm, authentic Santa voice that sounds like the real deal.' },
      { icon: '⏱️', title: '2-3 Minutes', description: 'The perfect length to capture attention and create lasting memories.' },
      { icon: '🎁', title: 'Special Mention', description: 'Santa can reference specific gifts, upcoming events, or special encouragements.' },
    ],
    processSteps: [
      { step: 1, title: 'Share the Details', description: 'Tell us everything - their name, interests, accomplishments, wishes, and what Santa should say.' },
      { step: 2, title: 'Script Creation', description: 'We craft a heartfelt, personalized script just for them.' },
      { step: 3, title: 'Professional Recording', description: 'Your personalized script is voiced by our Santa with warmth and authenticity.' },
      { step: 4, title: 'Instant Delivery', description: 'Download your MP3 immediately. Play it Christmas morning or anytime.' },
    ],
    faqs: [
      { question: 'How personal can it be?', answer: 'Very! Santa can mention their name, siblings, pets, favorite activities, recent accomplishments, specific wishes, and more.' },
      { question: 'When will I receive it?', answer: 'Most orders are ready within 24-48 hours. Rush delivery available for same-day turnaround.' },
      { question: 'Can I preview before sharing?', answer: 'Of course! You receive the file first to review before playing for the child.' },
    ],
    testimonials: [],
    deliverables: ['2-3 minute personalized audio', 'MP3 download', 'Transcript included', 'Christmas memory forever'],
    guarantee: 'Not personal enough? Full refund - we\'re that confident',
  },

  holiday_reset: {
    heroSubtitle: 'Reflect & Renew',
    heroDescription: 'A personalized reflection guide for the holiday season. Process the year, celebrate wins, release what didn\'t serve you, and enter the new year with clarity.',
    features: [
      { icon: '📝', title: 'Guided Reflection', description: 'Thoughtful prompts tailored to YOUR year and YOUR circumstances.' },
      { icon: '🎯', title: 'Goal Integration', description: 'Connects your reflections to actionable intentions for the new year.' },
      { icon: '🧘', title: 'Mindful Design', description: 'Beautiful, calming layout that creates space for deep thinking.' },
      { icon: '📅', title: 'Structured Process', description: '7-day framework that fits into the holiday week without overwhelm.' },
    ],
    processSteps: [
      { step: 1, title: 'Tell Us About Your Year', description: 'Share your highlights, challenges, and what you want to focus on.' },
      { step: 2, title: 'Custom Content Creation', description: 'We create prompts and frameworks specific to your situation.' },
      { step: 3, title: 'Beautiful Formatting', description: 'Your guide is designed to be both printable and digital-friendly.' },
      { step: 4, title: 'Immediate Access', description: 'Download and begin your reflection journey immediately.' },
    ],
    faqs: [
      { question: 'How is this personalized?', answer: 'Based on what you share about your year, we tailor the prompts, examples, and focus areas to be relevant to YOUR life.' },
      { question: 'Do I need to complete it all at once?', answer: 'No! It\'s designed as a 7-day journey with 15-20 minutes per day. Perfect for the holiday week.' },
    ],
    testimonials: [],
    deliverables: ['Personalized 7-day reflection guide', 'Printable PDF + digital version', 'Journaling prompts', 'Goal-setting framework'],
    guarantee: 'Full refund within 7 days if it doesn\'t resonate',
  },

  new_year_reset: {
    heroSubtitle: 'Start Fresh',
    heroDescription: 'A personalized planning system for the new year. Not generic resolutions - a strategic framework built around YOUR goals, YOUR constraints, and YOUR life.',
    features: [
      { icon: '🎯', title: 'Goal Clarity', description: 'Structured process to identify what you actually want (not what you think you should want).' },
      { icon: '📊', title: 'Action Planning', description: 'Break big goals into quarterly, monthly, and weekly actions.' },
      { icon: '🚧', title: 'Obstacle Mapping', description: 'Identify and plan for the specific barriers you\'ll face.' },
      { icon: '⚡', title: 'Quick Wins', description: 'Build momentum with early victories that compound.' },
    ],
    processSteps: [
      { step: 1, title: 'Vision Exploration', description: 'Answer our strategic questions about what you want this year.' },
      { step: 2, title: 'Custom Framework', description: 'We build a planning system around your specific goals and constraints.' },
      { step: 3, title: 'Actionable Deliverables', description: 'Receive your personalized planner with monthly and weekly breakdowns.' },
      { step: 4, title: 'Start Immediately', description: 'Begin the year with crystal clear direction.' },
    ],
    faqs: [
      { question: 'How does personalization work?', answer: 'Tell us your goals, life circumstances, and constraints. We create a system that works for YOUR actual life, not an idealized version.' },
      { question: 'Is this just a planner?', answer: 'It\'s a strategic framework with your goals built in, plus actionable steps, accountability checkpoints, and obstacle plans.' },
    ],
    testimonials: [],
    deliverables: ['Personalized annual planning guide', 'Quarterly breakdown', 'Monthly action plans', 'Weekly reflection templates'],
    guarantee: 'Transform your year or get your money back',
  },

  clarity_planner: {
    heroSubtitle: 'Strategic Planning',
    heroDescription: 'A comprehensive planning system built around your unique goals, values, and life circumstances. Not a one-size-fits-all template - a strategic tool designed for YOU.',
    features: [
      { icon: '🔮', title: 'Vision Work', description: 'Clarify what you actually want across all life domains.' },
      { icon: '📈', title: 'Goal Architecture', description: 'Structure goals in a way that leads to achievement, not abandonment.' },
      { icon: '⏰', title: 'Time Blocking', description: 'Custom schedule templates that fit your actual life.' },
      { icon: '🔄', title: 'Review System', description: 'Built-in checkpoints to stay on track and adjust course.' },
    ],
    processSteps: [
      { step: 1, title: 'Deep Intake', description: 'Complete the Personalization Experience — share your goals and what matters most in your life.' },
      { step: 2, title: 'Strategic Design', description: 'We architect a planning system specific to your needs.' },
      { step: 3, title: 'Custom Production', description: 'Your planner is created with your goals embedded throughout.' },
      { step: 4, title: 'Multi-Format Delivery', description: 'Receive printable PDF, digital version, and quick-reference cards.' },
    ],
    faqs: [
      { question: 'What makes this different from other planners?', answer: 'Every page is built around YOUR goals. No irrelevant sections, no wasted space. Everything serves your specific objectives.' },
      { question: 'How long is the planning horizon?', answer: '12-month system with quarterly, monthly, and weekly views. Designed for sustained progress, not just initial enthusiasm.' },
    ],
    testimonials: [],
    deliverables: ['12-month personalized planner', 'Quarterly planning templates', 'Weekly review system', 'Digital + printable formats'],
    guarantee: 'Complete satisfaction or full refund within 14 days',
  },

  thought_organizer: {
    heroSubtitle: 'Mental Clarity',
    heroDescription: 'Transform scattered thoughts into organized action. A personalized system for capturing, processing, and acting on your ideas based on how YOUR mind works.',
    features: [
      { icon: '🧠', title: 'Capture System', description: 'Methods tailored to how you naturally think and process.' },
      { icon: '🗂️', title: 'Organization Framework', description: 'Custom categories based on your life domains and priorities.' },
      { icon: '⚡', title: 'Action Triggers', description: 'Clear criteria for turning thoughts into tasks.' },
      { icon: '🔍', title: 'Review Rhythms', description: 'Sustainable practices to keep the system working.' },
    ],
    processSteps: [
      { step: 1, title: 'Thinking Style Assessment', description: 'Understand how you naturally process information.' },
      { step: 2, title: 'System Design', description: 'Create an organization framework that matches your mind.' },
      { step: 3, title: 'Implementation Guide', description: 'Step-by-step setup with your specific categories and flows.' },
      { step: 4, title: 'Ongoing Support', description: 'Templates and guides for maintaining the system.' },
    ],
    faqs: [
      { question: 'Is this digital or paper-based?', answer: 'We design for YOUR preference. Some people need paper, some need apps. We\'ll recommend and customize for your style.' },
      { question: 'I\'ve tried GTD and other systems - how is this different?', answer: 'Those are generic frameworks. We analyze how YOU think and build a system around YOUR patterns, not a methodology you have to adapt to.' },
    ],
    testimonials: [],
    deliverables: ['Personalized thought system design', 'Implementation guide', 'Template collection', 'Weekly review framework'],
    guarantee: 'Mental clarity or your money back - 14 day guarantee',
  },
};

// ============================================================
// PAGE RENDERER
// ============================================================

export function renderProductPage(productId: ProductType): string {
  const product = PRODUCTS[productId];
  const content = PRODUCT_CONTENT[productId];

  if (!product || !content) {
    return renderNotFoundPage();
  }

  const icons: Record<ProductType, string> = {
    santa_message: '🎅',
    vision_board: '🎯',
    flash_cards: '📚',
    learning_session: '🧠🎧',
    video_learning_session: '🧠🎬',
    holiday_reset: '🎄',
    new_year_reset: '✨',
    clarity_planner: '💡',
    thought_organizer: '🧠',
  };

  const priceFormatted = `$${(product.price / 100).toFixed(0)}`;

  const pageStyles = getProductPageStyles();
  const pageContent = `
    <main class="product-detail-page">
      <!-- Hero Section -->
      <section class="product-hero">
        <div class="container">
          <div class="hero-content">
            <span class="eyebrow">${content.heroSubtitle}</span>
            <h1>${product.name}</h1>
            <p class="hero-desc">${content.heroDescription}</p>
            <div class="hero-cta">
              <div class="price-tag">
                <span class="price">${priceFormatted}</span>
                <span class="price-note">one-time purchase</span>
              </div>
              <button class="btn btn-primary buy-btn" data-product-id="${product.id}">
                Buy Now <span class="arrow">→</span>
              </button>
            </div>
            <p class="guarantee-text">${content.guarantee}</p>
          </div>
          <div class="hero-visual">
            <div class="product-icon">${icons[productId]}</div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <h2>What Makes This <span class="highlight">Special</span></h2>
          <div class="features-grid">
            ${content.features.map(f => `
              <div class="feature-card">
                <div class="feature-icon">${f.icon}</div>
                <h3>${f.title}</h3>
                <p>${f.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Process Section -->
      <section class="process-section">
        <div class="container">
          <h2>How It <span class="highlight">Works</span></h2>
          <div class="process-steps">
            ${content.processSteps.map(s => `
              <div class="step-card">
                <div class="step-number">${s.step}</div>
                <h3>${s.title}</h3>
                <p>${s.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Deliverables Section -->
      <section class="deliverables-section">
        <div class="container">
          <h2>What You'll <span class="highlight">Receive</span></h2>
          <div class="deliverables-card">
            <ul class="deliverables-list">
              ${content.deliverables.map(d => `
                <li><span class="check">✓</span> ${d}</li>
              `).join('')}
            </ul>
            <div class="deliverables-cta">
              <div class="price-display">${priceFormatted}</div>
              <button class="btn btn-primary buy-btn" data-product-id="${product.id}">
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      ${content.testimonials.length > 0 ? `
        <section class="testimonials-section">
          <div class="container">
            <h2>What People <span class="highlight">Say</span></h2>
            <div class="testimonials-grid">
              ${content.testimonials.map(t => `
                <div class="testimonial-card">
                  <div class="stars">${'★'.repeat(t.rating)}</div>
                  <p class="quote">"${t.quote}"</p>
                  <div class="attribution">
                    <span class="name">${t.name}</span>
                    <span class="location">${t.location}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      ` : ''}

      <!-- FAQ Section -->
      <section class="faq-section">
        <div class="container">
          <h2>Common <span class="highlight">Questions</span></h2>
          <div class="faq-list">
            ${content.faqs.map(f => `
              <div class="faq-item">
                <button class="faq-question">
                  <span>${f.question}</span>
                  <span class="faq-toggle">+</span>
                </button>
                <div class="faq-answer">
                  <p>${f.answer}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Final CTA Section -->
      <section class="final-cta-section">
        <div class="container">
          <h2>Ready to Get Started?</h2>
          <p>${content.heroDescription.split('.')[0]}.</p>
          <div class="final-cta-box">
            <div class="price-final">${priceFormatted}</div>
            <button class="btn btn-primary btn-large buy-btn" data-product-id="${product.id}">
              Buy ${product.name}
            </button>
            <p class="guarantee-final">${content.guarantee}</p>
          </div>
        </div>
      </section>
    </main>

    <!-- Email Modal for Checkout -->
    <div id="emailModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;">
      <div style="background:#1a1a2e; padding:32px; border-radius:16px; max-width:420px; width:90%; text-align:center; border:1px solid rgba(255,255,255,0.1);">
        <h3 style="margin:0 0 20px 0; font-family:'Bodoni Moda',serif; font-size:1.5rem;">Continue to Checkout</h3>

        <!-- Purchase Section -->
        <div id="purchaseSection" style="margin-bottom:20px;">
          <label style="display:block; text-align:left; color:rgba(255,255,255,0.9); font-size:0.85rem; margin-bottom:6px; font-weight:500;">Your Email</label>
          <input type="email" id="modalEmail" placeholder="your@email.com" style="width:100%; padding:14px 16px; border:1px solid rgba(255,255,255,0.2); border-radius:8px; background:rgba(0,0,0,0.3); color:#fff; font-size:1rem; margin-bottom:10px;">
          <label style="display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.8); font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" id="isGiftCheckbox" style="width:16px; height:16px; cursor:pointer;">
            I'm buying this as a gift for someone else
          </label>
        </div>

        <button id="modalSubmit" style="width:100%; padding:14px; background:#E85A6B; color:#fff; border:none; border-radius:50px; font-size:1rem; font-weight:600; cursor:pointer;">Continue to Payment</button>

        <!-- Divider -->
        <div style="display:flex; align-items:center; margin:20px 0; gap:12px;">
          <div style="flex:1; height:1px; background:rgba(255,255,255,0.15);"></div>
          <span style="color:rgba(255,255,255,0.5); font-size:0.8rem;">OR</span>
          <div style="flex:1; height:1px; background:rgba(255,255,255,0.15);"></div>
        </div>

        <!-- Gift Code Redemption Section -->
        <div id="giftCodeSection">
          <label style="display:block; text-align:left; color:rgba(255,255,255,0.9); font-size:0.85rem; margin-bottom:6px; font-weight:500;">Redeem a Gift Code</label>
          <input type="text" id="giftCodeInput" placeholder="GIFT-XXXX-XXXX" style="width:100%; padding:14px 16px; border:1px solid rgba(255,255,255,0.2); border-radius:8px; background:rgba(0,0,0,0.3); color:#fff; font-size:1rem; font-family:monospace; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">
          <button id="redeemBtn" style="width:100%; padding:12px; background:transparent; color:#E85A6B; border:1px solid #E85A6B; border-radius:50px; font-size:0.95rem; font-weight:500; cursor:pointer;">Redeem Gift</button>
        </div>

        <button id="modalCancel" style="width:100%; padding:10px; background:transparent; color:rgba(255,255,255,0.5); border:none; font-size:0.85rem; cursor:pointer; margin-top:16px;">Cancel</button>
      </div>
    </div>

    <!-- Checkout Script -->
    <script>
      const emailModal = document.getElementById('emailModal');
      const modalEmail = document.getElementById('modalEmail');
      const giftCodeInput = document.getElementById('giftCodeInput');
      const modalSubmit = document.getElementById('modalSubmit');
      const redeemBtn = document.getElementById('redeemBtn');
      const modalCancel = document.getElementById('modalCancel');
      let currentProductId = null;
      let currentBtn = null;

      // Show modal when buy button clicked
      document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentProductId = btn.dataset.productId;
          currentBtn = btn;
          emailModal.style.display = 'flex';
          modalEmail.value = '';
          giftCodeInput.value = '';
          modalEmail.focus();
        });
      });

      // Cancel modal
      modalCancel.addEventListener('click', () => {
        emailModal.style.display = 'none';
      });

      // Close on background click
      emailModal.addEventListener('click', (e) => {
        if (e.target === emailModal) emailModal.style.display = 'none';
      });

      // Regular checkout (email + optional gift)
      modalSubmit.addEventListener('click', processCheckout);
      modalEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processCheckout();
      });

      // Gift code redemption
      redeemBtn.addEventListener('click', redeemGiftCode);
      giftCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') redeemGiftCode();
      });

      async function processCheckout() {
        const email = modalEmail.value.trim();
        const isGift = document.getElementById('isGiftCheckbox').checked;

        // Validate email
        if (!email || !email.includes('@')) {
          modalEmail.style.borderColor = '#E85A6B';
          return;
        }
        modalEmail.style.borderColor = 'rgba(255,255,255,0.2)';

        modalSubmit.disabled = true;
        modalSubmit.textContent = 'Processing...';

        try {
          const response = await fetch('/api/checkout/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: currentProductId,
              email: email,
              isGift: isGift
            })
          });

          const data = await response.json();

          if (data.url) {
            window.location.href = data.url;
          } else {
            alert(data.error || 'Something went wrong. Please try again.');
            modalSubmit.disabled = false;
            modalSubmit.textContent = 'Continue to Payment';
          }
        } catch (err) {
          console.error(err);
          alert('Unable to process. Please check your connection and try again.');
          modalSubmit.disabled = false;
          modalSubmit.textContent = 'Continue to Payment';
        }
      }

      async function redeemGiftCode() {
        const code = giftCodeInput.value.trim().toUpperCase();

        // Validate gift code format
        if (!code || !code.startsWith('GIFT-') || code.length < 14) {
          giftCodeInput.style.borderColor = '#E85A6B';
          return;
        }
        giftCodeInput.style.borderColor = 'rgba(255,255,255,0.2)';

        redeemBtn.disabled = true;
        redeemBtn.textContent = 'Redeeming...';

        try {
          const response = await fetch('/api/checkout/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: currentProductId,
              email: code  // Gift code goes in email field for validation
            })
          });

          const data = await response.json();

          if (data.url) {
            window.location.href = data.url;
          } else {
            alert(data.error || 'Invalid or expired gift code. Please check and try again.');
            redeemBtn.disabled = false;
            redeemBtn.textContent = 'Redeem Gift';
          }
        } catch (err) {
          console.error(err);
          alert('Unable to redeem. Please check your connection and try again.');
          redeemBtn.disabled = false;
          redeemBtn.textContent = 'Redeem Gift';
        }
      }

      // FAQ accordion
      document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
          const item = q.closest('.faq-item');
          const isOpen = item.classList.contains('open');

          // Close all
          document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

          // Open clicked if wasn't open
          if (!isOpen) {
            item.classList.add('open');
          }
        });
      });
    </script>
  `;

  return renderPageStart({
    title: product.name,
    description: content.heroDescription,
    currentPage: product.slug,
    additionalStyles: pageStyles
  }) + pageContent + renderPageEnd();
}

function renderNotFoundPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Product Not Found</title>
    </head>
    <body>
      <h1>Product Not Found</h1>
      <p><a href="/products">View all products</a></p>
    </body>
    </html>
  `;
}

// ============================================================
// SUCCESS PAGE
// ============================================================

export function renderSuccessPage(): string {
  const pageStyles = getSuccessPageStyles();
  const pageContent = `
    <main class="success-page">
      <div class="container">
        <div class="success-card">
          <div class="success-icon">🎉</div>
          <h1>Thank You!</h1>
          <p class="success-message">Your purchase was successful. We're preparing your personalized experience.</p>

          <div id="order-details" class="order-details">
            <div class="loading">Loading your order details...</div>
          </div>

          <div class="next-steps">
            <h2>What Happens Next</h2>
            <ol>
              <li><strong>Start the Personalization Experience below</strong> - takes about 5-10 minutes</li>
              <li>Tell us what makes you (or the person you're gifting) unique</li>
              <li>Your personalized product will be ready — usually instant! <span class="note">(may take up to 15-20 min during peak times)</span></li>
            </ol>
          </div>

          <div id="start-personalization" class="start-personalization">
            <a href="/santa" id="personalization-link" class="btn btn-primary btn-large">Start Personalization Experience →</a>
            <p class="personalization-note">Link will update based on your purchase</p>
          </div>

          <div class="tag-us-cta">
            <p class="tag-us-title">We'd love to see the reaction!</p>
            <p class="tag-us-text">Tag us in your reaction videos - we might share them!</p>
            <p class="tag-us-handle">@personalizedoutput</p>
          </div>

          <div class="success-cta">
            <a href="/" class="btn btn-secondary">Return Home</a>
            <a href="/products" class="btn btn-primary">Browse More Products</a>
          </div>
        </div>
      </div>
    </main>

    <script>
      // Get session ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      // Product to personalization URL mapping
      const personalizationUrls = {
        'santa_message': '/santa',
        'vision_board': '/vision-board',
        'thought_organizer': '/thought-organizer',
        'clarity_planner': '/clarity-planner',
        'flash_cards': '/flash-cards',
        'learning_session': '/learning-session',
        'video_learning_session': '/video-learning-session',
        'holiday_reset': '/holiday-reset',
        'new_year_reset': '/new-year-reset'
      };

      if (sessionId) {
        fetch('/api/checkout/session/' + sessionId)
          .then(res => res.json())
          .then(data => {
            console.log('[Success] Session data:', data);
            const container = document.getElementById('order-details');
            const personalizationLink = document.getElementById('personalization-link');
            const personalizationNote = document.querySelector('.personalization-note');

            if (data.productName) {
              // Check if this is a gift purchase
              if (data.isGift && data.giftCode) {
                // Gift purchase - show gift code prominently
                container.innerHTML = \`
                  <div class="order-info">
                    <div class="order-row">
                      <span class="label">Product:</span>
                      <span class="value">\${data.productName}</span>
                    </div>
                    <div class="order-row">
                      <span class="label">Status:</span>
                      <span class="value status-paid">✓ Paid</span>
                    </div>
                  </div>
                  <div class="gift-code-section" style="background:#1a1a2e; border-radius:12px; padding:24px; margin-top:20px; text-align:center;">
                    <h3 style="color:#E85A6B; margin:0 0 8px 0; font-size:1.1rem;">🎁 Gift Code for Your Recipient</h3>
                    <p style="color:rgba(255,255,255,0.7); margin:0 0 16px 0; font-size:0.9rem;">Share this code with them to redeem their personalized experience:</p>
                    <div style="background:#000; padding:16px 24px; border-radius:8px; font-family:monospace; font-size:1.5rem; color:#fff; letter-spacing:2px; user-select:all;">\${data.giftCode}</div>
                    <p style="color:rgba(255,255,255,0.5); margin:16px 0 0 0; font-size:0.8rem;">They can enter this code at checkout to access their gift</p>
                  </div>
                \`;

                // Hide personalization section for gift purchases
                const personalizationSection = document.getElementById('start-personalization');
                if (personalizationSection) {
                  personalizationSection.style.display = 'none';
                }

                // Update next steps for gift
                const nextSteps = document.querySelector('.next-steps');
                if (nextSteps) {
                  nextSteps.innerHTML = \`
                    <h2>How to Gift This</h2>
                    <ol>
                      <li><strong>Copy the gift code above</strong></li>
                      <li>Share the code with your recipient (text, email, card, etc.)</li>
                      <li>They visit personalizedoutput.com and click "Buy Now" on the product</li>
                      <li>They enter the gift code instead of their email</li>
                      <li>They complete their own personalization experience!</li>
                    </ol>
                  \`;
                }
              } else {
                // Regular purchase
                container.innerHTML = \`
                  <div class="order-info">
                    <div class="order-row">
                      <span class="label">Product:</span>
                      <span class="value">\${data.productName}</span>
                    </div>
                    <div class="order-row">
                      <span class="label">Email:</span>
                      <span class="value">\${data.customerEmail || 'Not provided'}</span>
                    </div>
                    <div class="order-row">
                      <span class="label">Amount:</span>
                      <span class="value">$\${(data.amountTotal / 100).toFixed(2)} \${data.currency?.toUpperCase() || 'USD'}</span>
                    </div>
                    <div class="order-row">
                      <span class="label">Status:</span>
                      <span class="value status-paid">✓ Paid</span>
                    </div>
                  </div>
                \`;

                // Set personalization link based on product
                if (personalizationLink && data.productId) {
                  const url = personalizationUrls[data.productId] || '/' + (data.productSlug || 'santa');
                  personalizationLink.href = url;
                  console.log('[Success] Set personalization link to:', url);
                }

                // Hide the note once we have the real link
                if (personalizationNote) {
                  personalizationNote.style.display = 'none';
                }
              }
            } else {
              container.innerHTML = '<p>Unable to load order details. You can still start your personalization below.</p>';
            }
          })
          .catch(err => {
            console.error('[Success] Error:', err);
            document.getElementById('order-details').innerHTML = '<p>Unable to load order details. You can still start your personalization below.</p>';
          });
      } else {
        // No session ID - hide order details
        document.getElementById('order-details').innerHTML = '<p>Order details not available.</p>';
      }
    </script>
  `;

  return renderPageStart({
    title: 'Purchase Successful',
    description: 'Thank you for your purchase! Your personalized product is being prepared.',
    currentPage: 'success',
    additionalStyles: pageStyles
  }) + pageContent + renderPageEnd();
}

// ============================================================
// STYLES
// ============================================================

function getProductPageStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .product-detail-page {
      background: #fafafa;
    }

    /* Hero Section */
    .product-hero {
      padding: 120px 24px 80px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
    }

    .product-hero .container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 60px;
      align-items: center;
    }

    .hero-content .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--purple);
      margin-bottom: 16px;
    }

    .hero-content h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2.5rem, 4vw, 3.5rem);
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 20px;
      line-height: 1.15;
    }

    .hero-content .hero-desc {
      font-size: 1.15rem;
      color: #64748b;
      line-height: 1.7;
      margin-bottom: 32px;
      max-width: 600px;
    }

    .hero-cta {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 20px;
    }

    .price-tag {
      display: flex;
      flex-direction: column;
    }

    .price-tag .price {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--navy);
    }

    .price-tag .price-note {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      padding: 16px 40px;
      border-radius: 50px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: var(--coral);
      color: white;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
    }

    .btn-primary:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
    }

    .btn-primary:disabled {
      background: #ccc;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    .btn-large {
      padding: 20px 48px;
      font-size: 1.1rem;
    }

    .guarantee-text {
      font-size: 0.9rem;
      color: #94a3b8;
      font-style: italic;
    }

    .hero-visual {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-icon {
      font-size: 180px;
      line-height: 1;
      filter: drop-shadow(0 20px 40px rgba(0,0,0,0.1));
    }

    /* Features Section */
    .features-section {
      padding: 100px 24px;
      background: white;
    }

    .features-section h2,
    .process-section h2,
    .deliverables-section h2,
    .testimonials-section h2,
    .faq-section h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: var(--navy);
      text-align: center;
      margin-bottom: 48px;
    }

    .highlight {
      color: var(--purple);
      font-style: italic;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .feature-card {
      background: #fafafa;
      padding: 32px;
      border-radius: 20px;
      text-align: center;
    }

    .feature-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .feature-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.3rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .feature-card p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    /* Process Section */
    .process-section {
      padding: 100px 24px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%);
    }

    .process-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .step-card {
      background: white;
      padding: 32px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }

    .step-number {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--purple);
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .step-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.2rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .step-card p {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.6;
    }

    /* Deliverables Section */
    .deliverables-section {
      padding: 100px 24px;
      background: white;
    }

    .deliverables-card {
      max-width: 800px;
      margin: 0 auto;
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
      border-radius: 24px;
      padding: 48px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 40px;
      align-items: center;
    }

    .deliverables-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .deliverables-list li {
      color: white;
      font-size: 1.1rem;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .deliverables-list .check {
      color: #4ade80;
      font-weight: bold;
    }

    .deliverables-cta {
      text-align: center;
    }

    .price-display {
      font-size: 3rem;
      font-weight: 700;
      color: white;
      margin-bottom: 20px;
    }

    .deliverables-cta .btn-primary {
      background: var(--coral);
      white-space: nowrap;
    }

    /* Testimonials Section */
    .testimonials-section {
      padding: 100px 24px;
      background: #fafafa;
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
    }

    .testimonial-card {
      background: white;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }

    .stars {
      color: #fbbf24;
      font-size: 1.25rem;
      margin-bottom: 16px;
    }

    .quote {
      font-size: 1rem;
      color: #475569;
      line-height: 1.7;
      font-style: italic;
      margin-bottom: 20px;
    }

    .attribution {
      display: flex;
      flex-direction: column;
    }

    .attribution .name {
      font-weight: 600;
      color: var(--navy);
    }

    .attribution .location {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* FAQ Section */
    .faq-section {
      padding: 100px 24px;
      background: white;
    }

    .faq-list {
      max-width: 700px;
      margin: 0 auto;
    }

    .faq-item {
      border-bottom: 1px solid #e2e8f0;
    }

    .faq-question {
      width: 100%;
      background: none;
      border: none;
      padding: 24px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--navy);
      text-align: left;
    }

    .faq-toggle {
      font-size: 1.5rem;
      color: var(--purple);
      transition: transform 0.3s ease;
    }

    .faq-item.open .faq-toggle {
      transform: rotate(45deg);
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .faq-item.open .faq-answer {
      max-height: 500px;
    }

    .faq-answer p {
      padding-bottom: 24px;
      color: #64748b;
      line-height: 1.7;
    }

    /* Final CTA Section */
    .final-cta-section {
      padding: 100px 24px;
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
      text-align: center;
    }

    .final-cta-section h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: white;
      margin-bottom: 16px;
    }

    .final-cta-section > .container > p {
      color: rgba(255,255,255,0.7);
      font-size: 1.1rem;
      margin-bottom: 40px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .final-cta-box {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px;
      display: inline-block;
    }

    .price-final {
      font-size: 3.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 24px;
    }

    .guarantee-final {
      margin-top: 20px;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      font-style: italic;
    }

    .email-input-wrapper {
      margin-bottom: 16px;
    }

    .checkout-email-input {
      width: 100%;
      max-width: 320px;
      padding: 14px 18px;
      font-size: 1rem;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      text-align: center;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .checkout-email-input::placeholder {
      color: rgba(255,255,255,0.5);
    }

    .checkout-email-input:focus {
      outline: none;
      border-color: var(--coral);
      box-shadow: 0 0 0 3px rgba(232, 90, 107, 0.2);
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .product-hero {
        padding: 100px 20px 60px;
      }

      .product-hero .container {
        grid-template-columns: 1fr;
        gap: 40px;
        text-align: center;
      }

      .hero-content .hero-desc {
        margin-left: auto;
        margin-right: auto;
      }

      .hero-cta {
        flex-direction: column;
        gap: 16px;
      }

      .hero-visual {
        order: -1;
      }

      .product-icon {
        font-size: 120px;
      }

      .features-section,
      .process-section,
      .deliverables-section,
      .testimonials-section,
      .faq-section,
      .final-cta-section {
        padding: 60px 20px;
      }

      .features-section h2,
      .process-section h2,
      .deliverables-section h2,
      .testimonials-section h2,
      .faq-section h2 {
        font-size: 2rem;
      }

      .deliverables-card {
        grid-template-columns: 1fr;
        text-align: center;
        padding: 32px;
      }

      .deliverables-list li {
        justify-content: center;
      }

      .final-cta-box {
        padding: 32px 20px;
        width: 100%;
      }

      .price-final {
        font-size: 2.5rem;
      }
    }
  `;
}

function getSuccessPageStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .success-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%);
      padding: 100px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-card {
      max-width: 600px;
      background: white;
      border-radius: 24px;
      padding: 48px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.08);
    }

    .success-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }

    .success-card h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
    }

    .success-message {
      font-size: 1.1rem;
      color: #64748b;
      margin-bottom: 32px;
    }

    .order-details {
      background: #f8fafc;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .order-info {
      text-align: left;
    }

    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .order-row:last-child {
      border-bottom: none;
    }

    .order-row .label {
      color: #64748b;
    }

    .order-row .value {
      font-weight: 500;
      color: var(--navy);
    }

    .status-paid {
      color: #22c55e !important;
    }

    .loading {
      color: #94a3b8;
      font-style: italic;
    }

    .next-steps {
      text-align: left;
      margin-bottom: 32px;
    }

    .next-steps h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 16px;
    }

    .next-steps ol {
      padding-left: 20px;
      color: #64748b;
      line-height: 1.8;
    }

    .next-steps li {
      margin-bottom: 8px;
    }

    .tag-us-cta {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(232, 90, 107, 0.1) 100%);
      border: 1px solid rgba(124, 58, 237, 0.2);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 32px;
    }

    .tag-us-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: 8px;
    }

    .tag-us-text {
      color: #64748b;
      font-size: 0.95rem;
      margin-bottom: 12px;
    }

    .tag-us-handle {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--purple);
      margin: 0;
    }

    .next-steps .note {
      font-size: 0.85rem;
      color: #94a3b8;
      font-style: italic;
    }

    .start-personalization {
      text-align: center;
      margin-bottom: 32px;
    }

    .start-personalization .btn-large {
      padding: 20px 48px;
      font-size: 1.15rem;
    }

    .personalization-note {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 12px;
      font-style: italic;
    }

    .success-cta {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 50px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: var(--coral);
      color: white;
      box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
    }

    .btn-primary:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: transparent;
      color: var(--navy);
      border: 2px solid #e2e8f0;
    }

    .btn-secondary:hover {
      border-color: var(--navy);
      transform: translateY(-2px);
    }

    @media (max-width: 600px) {
      .success-card {
        padding: 32px 24px;
      }

      .success-card h1 {
        font-size: 2rem;
      }

      .success-cta {
        flex-direction: column;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `;
}
