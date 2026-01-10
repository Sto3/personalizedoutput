/**
 * Homework Rescue - Landing Page & Related Pages
 *
 * Product page for personalized tutoring lessons.
 * Includes: landing, chat experience, order status, success, and remake pages.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';

// ============================================================
// LANDING PAGE
// ============================================================

export function renderHomeworkRescuePage(): string {
  return `
${renderPageStart({ title: 'Homework Rescue - Personalized Tutoring Lessons | Personalized Output' })}

<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${process.env.TIKTOK_PIXEL_ID || ''}');
  ttq.page();
}(window, document, 'ttq');
</script>

<style>
  :root {
    --hr-primary: #4F46E5;
    --hr-secondary: #818CF8;
    --hr-accent: #F59E0B;
    --hr-success: #10B981;
    --hr-bg-dark: #1E1B4B;
    --hr-bg-light: #F8FAFC;
    --hr-text: #1F2937;
    --hr-text-light: #6B7280;
  }

  .hr-hero {
    background: linear-gradient(135deg, var(--hr-bg-dark) 0%, #312E81 100%);
    padding: 80px 20px 100px;
    color: white;
    text-align: center;
  }

  .hr-hero h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 20px;
    line-height: 1.1;
  }

  .hr-hero .highlight {
    color: var(--hr-accent);
  }

  .hr-hero p {
    font-size: 1.25rem;
    opacity: 0.9;
    max-width: 700px;
    margin: 0 auto 30px;
  }

  .hr-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.1);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    margin-bottom: 20px;
  }

  .hr-cta-btn {
    background: var(--hr-accent);
    color: white;
    padding: 18px 40px;
    font-size: 1.2rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    text-decoration: none;
    display: inline-block;
  }

  .hr-cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);
  }

  .hr-price {
    margin-top: 15px;
    font-size: 1rem;
    opacity: 0.8;
  }

  .hr-price strong {
    font-size: 1.5rem;
  }

  /* Promise Section */
  .hr-promise {
    background: var(--hr-bg-light);
    padding: 60px 20px;
  }

  .hr-promise-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .hr-promise-card {
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    text-align: center;
  }

  .hr-promise-card .icon {
    font-size: 3rem;
    margin-bottom: 15px;
  }

  .hr-promise-card h3 {
    font-size: 1.3rem;
    margin-bottom: 10px;
    color: var(--hr-text);
  }

  .hr-promise-card p {
    color: var(--hr-text-light);
    line-height: 1.6;
  }

  /* How It Works */
  .hr-how-it-works {
    padding: 80px 20px;
    max-width: 900px;
    margin: 0 auto;
  }

  .hr-section-title {
    text-align: center;
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 50px;
    color: var(--hr-text);
  }

  .hr-steps {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .hr-step {
    display: flex;
    gap: 25px;
    align-items: flex-start;
  }

  .hr-step-number {
    width: 50px;
    height: 50px;
    background: var(--hr-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .hr-step-content h4 {
    font-size: 1.3rem;
    margin-bottom: 8px;
    color: var(--hr-text);
  }

  .hr-step-content p {
    color: var(--hr-text-light);
    line-height: 1.6;
  }

  /* What You Get */
  .hr-deliverables {
    background: var(--hr-bg-dark);
    color: white;
    padding: 80px 20px;
  }

  .hr-deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 25px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .hr-deliverable {
    background: rgba(255,255,255,0.1);
    padding: 25px;
    border-radius: 12px;
    text-align: center;
  }

  .hr-deliverable .icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }

  .hr-deliverable h4 {
    font-size: 1.1rem;
    margin-bottom: 8px;
  }

  .hr-deliverable p {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  /* Sample Section */
  .hr-samples {
    padding: 80px 20px;
    background: var(--hr-bg-light);
  }

  .hr-samples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .hr-sample-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }

  .hr-sample-preview {
    background: var(--hr-primary);
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 4rem;
  }

  .hr-sample-info {
    padding: 20px;
  }

  .hr-sample-info h4 {
    font-size: 1.1rem;
    margin-bottom: 8px;
    color: var(--hr-text);
  }

  .hr-sample-info p {
    font-size: 0.9rem;
    color: var(--hr-text-light);
  }

  /* Guarantee */
  .hr-guarantee {
    padding: 60px 20px;
    text-align: center;
    max-width: 700px;
    margin: 0 auto;
  }

  .hr-guarantee-box {
    background: linear-gradient(135deg, var(--hr-success) 0%, #059669 100%);
    color: white;
    padding: 40px;
    border-radius: 20px;
  }

  .hr-guarantee-box h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
  }

  .hr-guarantee-box p {
    font-size: 1.1rem;
    opacity: 0.95;
    line-height: 1.6;
  }

  /* FAQ */
  .hr-faq {
    padding: 80px 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .hr-faq-item {
    border-bottom: 1px solid #E5E7EB;
    padding: 25px 0;
  }

  .hr-faq-item h4 {
    font-size: 1.1rem;
    margin-bottom: 12px;
    color: var(--hr-text);
    cursor: pointer;
  }

  .hr-faq-item p {
    color: var(--hr-text-light);
    line-height: 1.6;
  }

  /* Final CTA */
  .hr-final-cta {
    background: linear-gradient(135deg, var(--hr-primary) 0%, #6366F1 100%);
    color: white;
    padding: 80px 20px;
    text-align: center;
  }

  .hr-final-cta h2 {
    font-size: 2.2rem;
    margin-bottom: 15px;
  }

  .hr-final-cta p {
    font-size: 1.1rem;
    opacity: 0.9;
    margin-bottom: 30px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  /* Trust badges */
  .hr-trust {
    padding: 40px 20px;
    text-align: center;
    background: white;
  }

  .hr-trust-items {
    display: flex;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
    color: var(--hr-text-light);
    font-size: 0.9rem;
  }

  .hr-trust-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  @media (max-width: 768px) {
    .hr-hero h1 { font-size: 2rem; }
    .hr-step { flex-direction: column; align-items: center; text-align: center; }
  }
</style>

<!-- Hero Section -->
<section class="hr-hero">
  <div class="hr-badge">
    <span>&#9889;</span> Usually delivered in 15 minutes
  </div>
  <h1>Homework Rescue</h1>
  <h1><span class="highlight">Personalized Tutoring Lessons</span></h1>
  <p>When homework brings tears, we bring clarity. A 10-minute video lesson that explains concepts using what YOUR child loves - delivered on demand.</p>
  <a href="/homework-rescue/start" class="hr-cta-btn">Get Started Now</a>
  <div class="hr-price">
    <strong>$25</strong> &bull; Math or Reading &bull; Grades K-6
  </div>
</section>

<!-- Promise Section -->
<section class="hr-promise">
  <div class="hr-promise-grid">
    <div class="hr-promise-card">
      <div class="icon">&#127919;</div>
      <h3>Otherworldly Personalization</h3>
      <p>We don't just use their name. We diagnose the exact point of confusion and explain it using what they love most.</p>
    </div>
    <div class="hr-promise-card">
      <div class="icon">&#128161;</div>
      <h3>Explained Their Way</h3>
      <p>Dinosaur analogies for fractions. Art concepts for the solar system. We connect new knowledge to existing passion.</p>
    </div>
    <div class="hr-promise-card">
      <div class="icon">&#9889;</div>
      <h3>Delivered On Demand</h3>
      <p>Usually within 15 minutes, always within 1 hour. Because homework meltdowns don't wait for business hours.</p>
    </div>
  </div>
</section>

<!-- How It Works -->
<section class="hr-how-it-works">
  <h2 class="hr-section-title">How It Works</h2>
  <div class="hr-steps">
    <div class="hr-step">
      <div class="hr-step-number">1</div>
      <div class="hr-step-content">
        <h4>Tell Us About the Struggle</h4>
        <p>Share the specific problem, what happened when they tried it, and where exactly they got stuck. Our chat guides you through the details.</p>
      </div>
    </div>
    <div class="hr-step">
      <div class="hr-step-number">2</div>
      <div class="hr-step-content">
        <h4>We Confirm Our Understanding</h4>
        <p>"It sounds like the tricky part for Maya is ___, especially when ___." We make sure we truly understand before creating.</p>
      </div>
    </div>
    <div class="hr-step">
      <div class="hr-step-number">3</div>
      <div class="hr-step-content">
        <h4>Connect Their Passion</h4>
        <p>Tell us what they love - dinosaurs, cooking, video games, art. We'll weave it throughout the lesson.</p>
      </div>
    </div>
    <div class="hr-step">
      <div class="hr-step-number">4</div>
      <div class="hr-step-content">
        <h4>Receive Your Personalized Lesson</h4>
        <p>A 10-minute video + practice sheet + answer key + parent summary. Usually ready in 15 minutes.</p>
      </div>
    </div>
  </div>
</section>

<!-- What You Get -->
<section class="hr-deliverables">
  <h2 class="hr-section-title" style="color: white;">What You Get</h2>
  <div class="hr-deliverables-grid">
    <div class="hr-deliverable">
      <div class="icon">&#127909;</div>
      <h4>10-Minute Video Lesson</h4>
      <p>Designed to take ~30 minutes with pause-and-practice prompts</p>
    </div>
    <div class="hr-deliverable">
      <div class="icon">&#128196;</div>
      <h4>Practice Sheet</h4>
      <p>Printable problems to reinforce the lesson</p>
    </div>
    <div class="hr-deliverable">
      <div class="icon">&#9989;</div>
      <h4>Answer Key</h4>
      <p>Full solutions with explanations</p>
    </div>
    <div class="hr-deliverable">
      <div class="icon">&#128105;&#8205;&#128187;</div>
      <h4>Parent Summary</h4>
      <p>How to reinforce learning at home</p>
    </div>
  </div>
</section>

<!-- Sample Lessons -->
<section class="hr-samples">
  <h2 class="hr-section-title">Sample Lessons</h2>
  <div class="hr-samples-grid">
    <div class="hr-sample-card">
      <div class="hr-sample-preview">&#129430;</div>
      <div class="hr-sample-info">
        <h4>Joe's Fractions Lesson</h4>
        <p>Grade 2 - Uses dinosaurs to explain halves and fourths</p>
      </div>
    </div>
    <div class="hr-sample-card">
      <div class="hr-sample-preview">&#127912;</div>
      <div class="hr-sample-info">
        <h4>Maya's Solar System</h4>
        <p>Grade 4 - Uses art and painting to explore planets</p>
      </div>
    </div>
  </div>
</section>

<!-- Guarantee -->
<section class="hr-guarantee">
  <div class="hr-guarantee-box">
    <h3>&#128170; Our Guarantee</h3>
    <p>If the lesson doesn't click, we'll remake it free. Different angle, different analogies, until it works. One free remake included with every purchase.</p>
  </div>
</section>

<!-- FAQ -->
<section class="hr-faq">
  <h2 class="hr-section-title">Frequently Asked Questions</h2>

  <div class="hr-faq-item">
    <h4>What grades and subjects do you cover?</h4>
    <p>Math and Reading for Kindergarten through 6th grade. This includes arithmetic, fractions, decimals, word problems, phonics, reading comprehension, vocabulary, and more.</p>
  </div>

  <div class="hr-faq-item">
    <h4>How personalized is it really?</h4>
    <p>Very. We ask about the specific problem, where they got stuck, and what they love. If they're obsessed with dinosaurs, the fractions lesson will use dinosaur examples throughout.</p>
  </div>

  <div class="hr-faq-item">
    <h4>How quickly will I receive the lesson?</h4>
    <p>Usually within 15 minutes of completing checkout. Always within 1 hour. We'll email you the moment it's ready.</p>
  </div>

  <div class="hr-faq-item">
    <h4>What if my child still doesn't understand?</h4>
    <p>You get one free remake. Tell us what didn't click and we'll create a new version with a different approach.</p>
  </div>

  <div class="hr-faq-item">
    <h4>Is this a replacement for tutoring?</h4>
    <p>It's a complement. Great for one-off struggles, homework emergencies, or concepts that need a fresh explanation. For ongoing support, we recommend finding a regular tutor.</p>
  </div>

  <div class="hr-faq-item">
    <h4>How do you ensure accuracy?</h4>
    <p>Every lesson goes through automated quality checks to verify math accuracy and reading correctness before delivery.</p>
  </div>
</section>

<!-- Trust -->
<section class="hr-trust">
  <div class="hr-trust-items">
    <div class="hr-trust-item">&#128274; Secure Payment</div>
    <div class="hr-trust-item">&#128231; Instant Delivery</div>
    <div class="hr-trust-item">&#128170; Free Remake Guarantee</div>
    <div class="hr-trust-item">&#129309; Thousands Served</div>
  </div>
</section>

<!-- Final CTA -->
<section class="hr-final-cta">
  <h2>Stop the Homework Tears</h2>
  <p>A personalized lesson that actually makes sense to YOUR child. Usually ready in 15 minutes.</p>
  <a href="/homework-rescue/start" class="hr-cta-btn">Get Started - $25</a>
</section>

<script>
  // Track page view
  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: '/homework-rescue', referrer: document.referrer })
  });

  // TikTok pixel - view content
  if (typeof ttq !== 'undefined') {
    ttq.track('ViewContent', { content_type: 'homework_rescue', content_id: 'landing' });
  }
</script>

${renderPageEnd()}
  `;
}

// ============================================================
// CHAT/PERSONALIZATION PAGE
// ============================================================

export function renderHomeworkRescueStartPage(): string {
  return `
${renderPageStart({ title: 'Start Your Personalized Lesson | Homework Rescue' })}

<style>
  .hr-chat-container {
    max-width: 700px;
    margin: 40px auto;
    padding: 20px;
  }

  .hr-chat-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .hr-chat-header h1 {
    font-size: 1.8rem;
    color: #1F2937;
    margin-bottom: 10px;
  }

  .hr-chat-header p {
    color: #6B7280;
  }

  .hr-chat-messages {
    background: #F9FAFB;
    border-radius: 16px;
    padding: 20px;
    min-height: 400px;
    max-height: 500px;
    overflow-y: auto;
    margin-bottom: 20px;
  }

  .hr-message {
    margin-bottom: 15px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hr-message.assistant {
    text-align: left;
  }

  .hr-message.user {
    text-align: right;
  }

  .hr-message-bubble {
    display: inline-block;
    max-width: 80%;
    padding: 12px 18px;
    border-radius: 18px;
    line-height: 1.5;
  }

  .hr-message.assistant .hr-message-bubble {
    background: white;
    border: 1px solid #E5E7EB;
  }

  .hr-message.user .hr-message-bubble {
    background: #4F46E5;
    color: white;
  }

  .hr-chat-input-area {
    display: flex;
    gap: 10px;
  }

  .hr-chat-input {
    flex: 1;
    padding: 15px;
    border: 2px solid #E5E7EB;
    border-radius: 12px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .hr-chat-input:focus {
    border-color: #4F46E5;
  }

  .hr-chat-send {
    background: #4F46E5;
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .hr-chat-send:hover {
    background: #4338CA;
  }

  .hr-chat-send:disabled {
    background: #9CA3AF;
    cursor: not-allowed;
  }

  .hr-progress-bar {
    height: 6px;
    background: #E5E7EB;
    border-radius: 3px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .hr-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4F46E5, #818CF8);
    transition: width 0.3s ease;
  }

  .hr-typing-indicator {
    display: flex;
    gap: 4px;
    padding: 10px 15px;
  }

  .hr-typing-dot {
    width: 8px;
    height: 8px;
    background: #9CA3AF;
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }

  .hr-typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .hr-typing-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }

  .hr-complete-notice {
    background: #10B981;
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    margin-top: 20px;
  }

  .hr-complete-notice h3 {
    margin-bottom: 10px;
  }

  .hr-checkout-btn {
    background: white;
    color: #10B981;
    border: none;
    padding: 12px 30px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 15px;
  }
</style>

<div class="hr-chat-container">
  <div class="hr-chat-header">
    <h1>Let's Create Your Personalized Lesson</h1>
    <p>Tell me about your child and what they're struggling with</p>
  </div>

  <div class="hr-progress-bar">
    <div class="hr-progress-fill" id="progressFill" style="width: 0%"></div>
  </div>

  <div class="hr-chat-messages" id="chatMessages">
    <!-- Messages will be inserted here -->
  </div>

  <div class="hr-chat-input-area" id="inputArea">
    <input type="text" class="hr-chat-input" id="chatInput" placeholder="Type your response..." autofocus>
    <button class="hr-chat-send" id="sendBtn">Send</button>
  </div>

  <div id="completeNotice" style="display: none;" class="hr-complete-notice">
    <h3>&#9989; Personalization Complete!</h3>
    <p>We have everything we need to create a perfect lesson.</p>
    <input type="email" id="emailInput" placeholder="Your email address" style="padding: 12px; border-radius: 8px; border: none; width: 250px; margin-top: 10px;">
    <button class="hr-checkout-btn" id="checkoutBtn">Continue to Checkout - $25</button>
  </div>
</div>

<script>
  let sessionId = null;
  let isComplete = false;

  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const progressFill = document.getElementById('progressFill');
  const inputArea = document.getElementById('inputArea');
  const completeNotice = document.getElementById('completeNotice');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const emailInput = document.getElementById('emailInput');

  // Phase to progress mapping
  const phaseProgress = {
    'greeting': 5,
    'basic_info': 15,
    'specific_struggle': 35,
    'diagnosis_confirmation': 50,
    'interest_discovery': 65,
    'learning_preferences': 75,
    'goals_and_tone': 85,
    'final_confirmation': 95,
    'complete': 100
  };

  // Start conversation
  async function startChat() {
    try {
      const response = await fetch('/api/homework-rescue/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        sessionId = data.sessionId;
        addMessage(data.message, 'assistant');
        updateProgress(data.phase);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      addMessage('Sorry, something went wrong. Please refresh and try again.', 'assistant');
    }
  }

  // Send message
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !sessionId) return;

    addMessage(message, 'user');
    chatInput.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
      const response = await fetch('/api/homework-rescue/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message })
      });
      const data = await response.json();

      hideTyping();
      sendBtn.disabled = false;

      if (data.success) {
        addMessage(data.message, 'assistant');
        updateProgress(data.phase);

        if (data.isComplete) {
          isComplete = true;
          inputArea.style.display = 'none';
          completeNotice.style.display = 'block';
        }
      }
    } catch (error) {
      hideTyping();
      sendBtn.disabled = false;
      addMessage('Sorry, something went wrong. Please try again.', 'assistant');
    }
  }

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = 'hr-message ' + role;
    div.innerHTML = '<div class="hr-message-bubble">' + text + '</div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'hr-message assistant';
    div.innerHTML = '<div class="hr-typing-indicator"><div class="hr-typing-dot"></div><div class="hr-typing-dot"></div><div class="hr-typing-dot"></div></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  }

  function updateProgress(phase) {
    const progress = phaseProgress[phase] || 0;
    progressFill.style.width = progress + '%';
  }

  // Checkout
  checkoutBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Creating checkout...';

    try {
      const response = await fetch('/api/homework-rescue/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email })
      });
      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Error creating checkout. Please try again.');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Continue to Checkout - $25';
      }
    } catch (error) {
      alert('Error creating checkout. Please try again.');
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Continue to Checkout - $25';
    }
  });

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Start on load
  startChat();
</script>

${renderPageEnd()}
  `;
}

// ============================================================
// ORDER STATUS PAGE
// ============================================================

export function renderOrderStatusPage(orderId: string): string {
  return `
${renderPageStart({ title: 'Your Lesson Status | Homework Rescue' })}

<style>
  .hr-status-container {
    max-width: 600px;
    margin: 60px auto;
    padding: 20px;
    text-align: center;
  }

  .hr-status-header h1 {
    font-size: 2rem;
    margin-bottom: 10px;
  }

  .hr-status-card {
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    margin-top: 30px;
  }

  .hr-progress-ring {
    width: 150px;
    height: 150px;
    margin: 0 auto 30px;
    position: relative;
  }

  .hr-progress-ring svg {
    transform: rotate(-90deg);
  }

  .hr-progress-ring circle {
    fill: none;
    stroke-width: 10;
  }

  .hr-progress-ring .bg {
    stroke: #E5E7EB;
  }

  .hr-progress-ring .progress {
    stroke: #4F46E5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s ease;
  }

  .hr-progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    font-weight: 700;
    color: #4F46E5;
  }

  .hr-current-step {
    font-size: 1.2rem;
    color: #1F2937;
    margin-bottom: 10px;
  }

  .hr-step-list {
    text-align: left;
    margin-top: 30px;
  }

  .hr-step-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #F3F4F6;
  }

  .hr-step-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }

  .hr-step-icon.done {
    background: #10B981;
    color: white;
  }

  .hr-step-icon.active {
    background: #4F46E5;
    color: white;
  }

  .hr-step-icon.pending {
    background: #E5E7EB;
    color: #9CA3AF;
  }

  .hr-delivery-box {
    background: #10B981;
    color: white;
    padding: 30px;
    border-radius: 16px;
    margin-top: 30px;
  }

  .hr-delivery-box h3 {
    margin-bottom: 15px;
  }

  .hr-download-btn {
    background: white;
    color: #10B981;
    padding: 12px 25px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    display: inline-block;
    margin: 5px;
  }
</style>

<div class="hr-status-container">
  <div class="hr-status-header">
    <h1>Creating Your Lesson</h1>
    <p id="childInfo">Loading...</p>
  </div>

  <div class="hr-status-card">
    <div class="hr-progress-ring">
      <svg width="150" height="150">
        <circle class="bg" cx="75" cy="75" r="60"></circle>
        <circle class="progress" id="progressCircle" cx="75" cy="75" r="60"
                stroke-dasharray="377" stroke-dashoffset="377"></circle>
      </svg>
      <div class="hr-progress-text" id="progressPercent">0%</div>
    </div>

    <div class="hr-current-step" id="currentStep">Starting...</div>

    <div class="hr-step-list" id="stepList">
      <!-- Steps will be inserted here -->
    </div>
  </div>

  <div class="hr-delivery-box" id="deliveryBox" style="display: none;">
    <h3>&#127881; Your Lesson is Ready!</h3>
    <p>Download your personalized materials:</p>
    <div id="downloadLinks"></div>
  </div>
</div>

<script>
  const orderId = '${orderId}';
  const steps = [
    { key: 'generating_script', label: 'Creating lesson script' },
    { key: 'verifying_qa', label: 'Verifying accuracy' },
    { key: 'generating_audio', label: 'Generating voiceover' },
    { key: 'generating_visuals', label: 'Creating visuals' },
    { key: 'rendering_video', label: 'Rendering video' },
    { key: 'generating_pdfs', label: 'Creating materials' },
    { key: 'uploading', label: 'Preparing delivery' },
    { key: 'completed', label: 'Complete!' }
  ];

  function renderSteps(currentStatus, progress) {
    const stepList = document.getElementById('stepList');
    let currentIndex = steps.findIndex(s => s.key === currentStatus);
    if (currentIndex === -1) currentIndex = 0;

    stepList.innerHTML = steps.map((step, i) => {
      let iconClass = 'pending';
      let icon = (i + 1);
      if (i < currentIndex) {
        iconClass = 'done';
        icon = '&#10003;';
      } else if (i === currentIndex) {
        iconClass = 'active';
      }
      return '<div class="hr-step-item"><div class="hr-step-icon ' + iconClass + '">' + icon + '</div><span>' + step.label + '</span></div>';
    }).join('');
  }

  function updateProgress(progress) {
    const circle = document.getElementById('progressCircle');
    const text = document.getElementById('progressPercent');
    const circumference = 377; // 2 * PI * 60
    const offset = circumference - (progress / 100 * circumference);
    circle.style.strokeDashoffset = offset;
    text.textContent = progress + '%';
  }

  async function checkStatus() {
    try {
      const response = await fetch('/api/homework-rescue/order/' + orderId + '/status');
      const data = await response.json();

      if (data.success) {
        const order = data.order;
        document.getElementById('childInfo').textContent =
          order.childName + "'s " + order.subject + " Lesson: " + order.topic;
        document.getElementById('currentStep').textContent = order.currentStep;

        updateProgress(order.progress);
        renderSteps(order.status, order.progress);

        if (order.status === 'completed' || order.status === 'delivered') {
          document.getElementById('deliveryBox').style.display = 'block';
          document.getElementById('downloadLinks').innerHTML =
            '<a href="' + order.videoUrl + '" class="hr-download-btn">&#127909; Video Lesson</a>' +
            '<a href="' + order.practiceSheetUrl + '" class="hr-download-btn">&#128196; Practice Sheet</a>' +
            '<a href="' + order.answerKeyUrl + '" class="hr-download-btn">&#9989; Answer Key</a>' +
            '<a href="' + order.parentSummaryUrl + '" class="hr-download-btn">&#128105; Parent Summary</a>';
          return; // Stop polling
        }

        // Keep polling if not complete
        setTimeout(checkStatus, 3000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setTimeout(checkStatus, 5000);
    }
  }

  // Start polling
  checkStatus();
</script>

${renderPageEnd()}
  `;
}

// ============================================================
// SUCCESS PAGE (After Checkout)
// ============================================================

export function renderSuccessPage(orderId: string): string {
  return `
${renderPageStart({ title: 'Thank You! | Homework Rescue' })}

<style>
  .hr-success-container {
    max-width: 600px;
    margin: 80px auto;
    padding: 20px;
    text-align: center;
  }

  .hr-success-icon {
    font-size: 5rem;
    margin-bottom: 20px;
  }

  .hr-success-container h1 {
    font-size: 2rem;
    margin-bottom: 15px;
    color: #10B981;
  }

  .hr-success-container p {
    font-size: 1.1rem;
    color: #6B7280;
    margin-bottom: 30px;
  }

  .hr-status-btn {
    background: #4F46E5;
    color: white;
    padding: 15px 40px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .hr-time-estimate {
    background: #F3F4F6;
    padding: 20px;
    border-radius: 12px;
    margin: 30px 0;
  }
</style>

<div class="hr-success-container">
  <div class="hr-success-icon">&#127881;</div>
  <h1>Your Lesson is Being Created!</h1>
  <p>We're crafting a personalized lesson just for your child. You'll receive an email when it's ready.</p>

  <div class="hr-time-estimate">
    <strong>Estimated delivery:</strong> Usually within 15 minutes
  </div>

  <a href="/homework-rescue/order/${orderId}/status" class="hr-status-btn">Watch Progress</a>
</div>

<script>
  // Track conversion
  if (typeof ttq !== 'undefined') {
    ttq.track('CompletePayment', { value: 25, currency: 'USD' });
  }
</script>

${renderPageEnd()}
  `;
}

// ============================================================
// REMAKE REQUEST PAGE
// ============================================================

export function renderRemakePage(orderId: string): string {
  return `
${renderPageStart({ title: 'Request a Remake | Homework Rescue' })}

<style>
  .hr-remake-container {
    max-width: 600px;
    margin: 60px auto;
    padding: 20px;
  }

  .hr-remake-container h1 {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }

  .hr-remake-form {
    background: white;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    margin-top: 30px;
  }

  .hr-form-group {
    margin-bottom: 25px;
  }

  .hr-form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1F2937;
  }

  .hr-form-group select,
  .hr-form-group textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #E5E7EB;
    border-radius: 8px;
    font-size: 1rem;
  }

  .hr-form-group textarea {
    min-height: 100px;
    resize: vertical;
  }

  .hr-submit-btn {
    background: #4F46E5;
    color: white;
    padding: 15px 30px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
  }
</style>

<div class="hr-remake-container">
  <h1>Request a Free Remake</h1>
  <p>We want to get this right. Tell us what didn't work and we'll create a new version.</p>

  <div class="hr-remake-form">
    <div class="hr-form-group">
      <label>What didn't click?</label>
      <select id="remakeReason">
        <option value="still_confusing">Still confusing - they didn't understand</option>
        <option value="too_fast">Too fast - need slower pace</option>
        <option value="too_slow">Too slow - need more challenge</option>
        <option value="wrong_focus">Wrong focus - missed the real issue</option>
        <option value="interest_mismatch">Interest hook didn't resonate</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="hr-form-group">
      <label>What should we do differently?</label>
      <textarea id="remakeFeedback" placeholder="Tell us more about what didn't work and how we can improve..."></textarea>
    </div>

    <div class="hr-form-group">
      <label>Preferred tone (optional)</label>
      <select id="remakeTone">
        <option value="">Same as before</option>
        <option value="enthusiastic">More enthusiastic/energetic</option>
        <option value="calm">Slower/calmer</option>
        <option value="encouraging">More encouraging</option>
        <option value="matter_of_fact">More direct/matter-of-fact</option>
      </select>
    </div>

    <button class="hr-submit-btn" id="submitRemake">Request Remake</button>
  </div>
</div>

<script>
  document.getElementById('submitRemake').addEventListener('click', async () => {
    const reason = document.getElementById('remakeReason').value;
    const feedback = document.getElementById('remakeFeedback').value;
    const tone = document.getElementById('remakeTone').value;

    const btn = document.getElementById('submitRemake');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/homework-rescue/order/${orderId}/remake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          feedback,
          adjustments: { tone: tone || undefined, additionalContext: feedback }
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Remake requested! We\\'ll email you when it\\'s ready.');
        window.location.href = '/homework-rescue/order/' + data.remakeOrderId + '/status';
      } else {
        alert(data.error || 'Error submitting remake request');
        btn.disabled = false;
        btn.textContent = 'Request Remake';
      }
    } catch (error) {
      alert('Error submitting remake request');
      btn.disabled = false;
      btn.textContent = 'Request Remake';
    }
  });
</script>

${renderPageEnd()}
  `;
}
