/**
 * Demo Lessons Page
 *
 * Showcases sample personalized lessons and Santa message demos.
 * Premium design matching the new site styling with coral/purple colors.
 */

import { renderPageStart, renderPageEnd } from '../components/layout';

export function renderDemoLessonsPage(): string {
  const pageStyles = getDemoLessonsStyles();
  const pageContent = `
    <main class="demo-page">
      <!-- Hero Section -->
      <section class="demo-hero">
        <div class="container">
          <span class="eyebrow">Demo Videos</span>
          <h1>See the Magic <span class="highlight">In Action</span></h1>
          <p class="hero-desc">
            Watch real examples of our personalized creations.
            Every product is built uniquely for that person.
          </p>
        </div>
      </section>

      <!-- Vision Board Samples Section (FIRST - visual impact) -->
      <section class="demos-section">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">🎯</span> Vision Board Samples</h2>
            <p>Beautiful, personalized vision boards for every goal and personality</p>
          </div>

          <div class="demo-grid vision-grid">
            <div class="demo-card vision-card">
              <div class="image-container clickable-image" onclick="openLightbox('/demos/sample-vision-board-male.png', 'James: Built Different')">
                <img src="/demos/sample-vision-board-male.png" alt="James: Built Different - Personalized Vision Board" loading="lazy">
                <div class="image-overlay"><span>Click to view full screen</span></div>
              </div>
              <div class="demo-info">
                <h3>James: Built Different</h3>
                <p>A bold vision board focused on discipline, execution, and achieving greatness</p>
                <div class="demo-tags">
                  <span class="tag vision">Fully Custom</span>
                  <span class="tag">Any Theme</span>
                </div>
              </div>
            </div>

            <div class="demo-card vision-card">
              <div class="image-container clickable-image" onclick="openLightbox('/demos/sample-vision-board-female.png', 'Sarah\\'s Dream Year')">
                <img src="/demos/sample-vision-board-female.png" alt="Sarah's Dream Year - Personalized Vision Board" loading="lazy">
                <div class="image-overlay"><span>Click to view full screen</span></div>
              </div>
              <div class="demo-info">
                <h3>Sarah's Dream Year</h3>
                <p>A beautiful vision board designed around her personal dreams and style</p>
                <div class="demo-tags">
                  <span class="tag vision">Fully Custom</span>
                  <span class="tag">Your Style</span>
                </div>
              </div>
            </div>

            <div class="demo-card vision-card">
              <div class="image-container clickable-image" onclick="openLightbox('/demos/sample-vision-board-relationship.png', 'Jane & Jon\\'s 3-Month Reset')">
                <img src="/demos/sample-vision-board-relationship.png" alt="Jane & Jon's 3-Month Reset - Personalized Vision Board" loading="lazy">
                <div class="image-overlay"><span>Click to view full screen</span></div>
              </div>
              <div class="demo-info">
                <h3>Jane & Jon's 3-Month Reset</h3>
                <p>A couples' vision board for reconnecting and realigning your shared goals</p>
                <div class="demo-tags">
                  <span class="tag vision">Fully Custom</span>
                  <span class="tag">Couples</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lightbox Modal for fullscreen viewing -->
          <div id="lightbox" class="lightbox" onclick="closeLightbox()">
            <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
            <img id="lightbox-img" src="" alt="">
            <div id="lightbox-caption" class="lightbox-caption"></div>
          </div>
        </div>
      </section>

      <!-- Lesson Demos Section -->
      <section class="demos-section alt">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">📚</span> Personalized Lessons</h2>
            <p>See how we transform interests into engaging learning experiences</p>
          </div>

          <div class="demo-grid">
            <div class="demo-card">
              <div class="video-container">
                <video controls preload="metadata">
                  <source src="/demos/joe-dinosaurs-fractions.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Joe: Dinosaurs → Fractions</h3>
                <p>6 years old • Learning fractions through T-Rex adventures</p>
                <div class="demo-tags">
                  <span class="tag">Kid-Friendly</span>
                  <span class="tag">Math</span>
                </div>
              </div>
            </div>

            <div class="demo-card">
              <div class="video-container">
                <video controls preload="metadata">
                  <source src="/demos/maya-art-solar-system.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Maya: Art → Solar System</h3>
                <p>10 years old • Astronomy through creative expression</p>
                <div class="demo-tags">
                  <span class="tag">Creative</span>
                  <span class="tag">Science</span>
                </div>
              </div>
            </div>

            <div class="demo-card">
              <div class="video-container">
                <video controls preload="metadata">
                  <source src="/demos/sarah-bakery-mortgage.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Sarah: Bakery → Mortgage</h3>
                <p>Adult • Understanding mortgages through her baking passion</p>
                <div class="demo-tags">
                  <span class="tag">Adult</span>
                  <span class="tag">Finance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Santa Demos Section -->
      <section class="demos-section alt">
        <div class="container">
          <div class="section-header">
            <h2><span class="icon">🎅</span> Santa Message Demos</h2>
            <p>Magical moments showing how personal each message can be</p>
          </div>

          <div class="demo-grid santa-grid">
            <div class="demo-card santa-card">
              <div class="video-container portrait">
                <video controls preload="metadata">
                  <source src="/santa-demos/emma_invisible.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Emma: Feeling Invisible</h3>
                <p>Santa sees her kind heart and tells her she matters</p>
                <div class="demo-tags">
                  <span class="tag santa">Emotional</span>
                  <span class="tag">Validation</span>
                </div>
              </div>
            </div>

            <div class="demo-card santa-card">
              <div class="video-container portrait">
                <video controls preload="metadata">
                  <source src="/santa-demos/james_protecting.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>James: Protecting His Sister</h3>
                <p>Santa celebrates his courage and bravery</p>
                <div class="demo-tags">
                  <span class="tag santa">Courage</span>
                  <span class="tag">Sibling</span>
                </div>
              </div>
            </div>

            <div class="demo-card santa-card">
              <div class="video-container portrait">
                <video controls preload="metadata">
                  <source src="/santa-demos/sofia_smart.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Sofia: Not Smart Enough</h3>
                <p>Santa reminds her that effort matters more than being perfect</p>
                <div class="demo-tags">
                  <span class="tag santa">Encouragement</span>
                  <span class="tag">Growth</span>
                </div>
              </div>
            </div>

            <div class="demo-card santa-card">
              <div class="video-container portrait">
                <video controls preload="metadata">
                  <source src="/santa-demos/elijah_kindness.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Elijah: Unnoticed Kindness</h3>
                <p>Santa tells him the kindest hearts do good when no one's watching</p>
                <div class="demo-tags">
                  <span class="tag santa">Kindness</span>
                  <span class="tag">Validation</span>
                </div>
              </div>
            </div>

            <div class="demo-card santa-card">
              <div class="video-container portrait">
                <video controls preload="metadata">
                  <source src="/santa-demos/lily_moved.mp4" type="video/mp4">
                  Your browser does not support video.
                </video>
              </div>
              <div class="demo-info">
                <h3>Lily: Just Moved</h3>
                <p>Santa encourages her that new friendships are coming</p>
                <div class="demo-tags">
                  <span class="tag santa">New Start</span>
                  <span class="tag">Hope</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- What Makes It Special -->
      <section class="features-section">
        <div class="container">
          <h2>What Makes These Special</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">🎯</div>
              <h3>Truly Personal</h3>
              <p>Not just name insertion - every word is crafted around their specific life details.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">✨</div>
              <h3>Unique Every Time</h3>
              <p>No two creations are alike. Each is built from scratch for that individual.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">💝</div>
              <h3>Memorable Moments</h3>
              <p>Creates experiences that kids (and adults) remember for years.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Ready to Create Your Own?</h2>
          <p>Choose a product and see the magic happen for someone you love.</p>
          <div class="cta-buttons">
            <a href="/santa" class="btn btn-primary santa-btn">Create Santa Message</a>
            <a href="/flash-cards" class="btn btn-secondary">Create Learning Session</a>
          </div>
        </div>
      </section>
    </main>
  `;

  const lightboxScript = `
    <script>
      function openLightbox(imageSrc, caption) {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');

        lightboxImg.src = imageSrc;
        lightboxCaption.textContent = caption;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }

      // Close lightbox on Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeLightbox();
        }
      });
    </script>
  `;

  return renderPageStart({
    title: 'Demo Videos',
    description: 'Watch demo videos of personalized lessons and Santa messages. See how we transform interests into engaging, personal experiences.',
    currentPage: 'demos',
    additionalStyles: pageStyles
  }) + pageContent + lightboxScript + renderPageEnd();
}

function getDemoLessonsStyles(): string {
  return `
    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --navy: #1a1a2e;
      --navy-light: #2d2d4a;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
    }

    .demo-page {
      background: #fafafa;
    }

    /* Hero Section */
    .demo-hero {
      padding: 90px 24px 40px;
      background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #fafafa 100%);
      text-align: center;
    }

    .demo-hero .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--purple);
      margin-bottom: 16px;
    }

    .demo-hero h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 20px;
    }

    .demo-hero h1 .highlight {
      color: var(--purple);
      font-style: italic;
    }

    .demo-hero .hero-desc {
      font-size: 1.1rem;
      color: #64748b;
      max-width: 550px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Demos Section */
    .demos-section {
      padding: 50px 24px;
    }

    .demos-section.alt {
      background: white;
    }

    .demos-section .section-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .demos-section .section-header h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .demos-section .section-header h2 .icon {
      margin-right: 8px;
    }

    .demos-section .section-header p {
      color: #64748b;
      font-size: 1rem;
    }

    /* Demo Grid */
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .santa-grid {
      max-width: 1000px;
    }

    /* Demo Card */
    .demo-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.04);
      transition: all 0.3s ease;
    }

    .demo-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(124, 58, 237, 0.12);
    }

    .video-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: var(--navy);
    }

    .video-container.portrait {
      aspect-ratio: 9/16;
      max-height: 400px;
    }

    .video-container video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .demo-info {
      padding: 24px;
    }

    .demo-info h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 8px;
    }

    .demo-info p {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 16px;
    }

    .demo-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      display: inline-block;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      color: var(--navy);
      font-weight: 500;
    }

    .tag.santa {
      background: rgba(232, 90, 107, 0.1);
      color: var(--coral);
    }

    .tag.vision {
      background: rgba(124, 58, 237, 0.1);
      color: var(--purple);
    }

    /* Vision Board Cards */
    .vision-grid {
      max-width: 1200px;
    }

    .image-container {
      position: relative;
      width: 100%;
      aspect-ratio: 3/4;
      background: var(--navy);
      overflow: hidden;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .vision-card:hover .image-container img {
      transform: scale(1.05);
    }

    /* Clickable image overlay */
    .clickable-image {
      cursor: pointer;
      position: relative;
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
    }

    .image-overlay span {
      color: white;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 25px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }

    .clickable-image:hover .image-overlay {
      background: rgba(0, 0, 0, 0.3);
    }

    .clickable-image:hover .image-overlay span {
      opacity: 1;
      transform: translateY(0);
    }

    /* Lightbox Modal Styles */
    .lightbox {
      display: none;
      position: fixed;
      z-index: 9999;
      padding: 20px;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0, 0, 0, 0.95);
      cursor: pointer;
    }

    .lightbox.active {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 35px;
      color: #f1f1f1;
      font-size: 50px;
      font-weight: 300;
      transition: color 0.3s ease;
      z-index: 10000;
    }

    .lightbox-close:hover {
      color: var(--coral);
    }

    #lightbox-img {
      max-width: 95%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
    }

    .lightbox-caption {
      color: white;
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      text-align: center;
      margin-top: 16px;
      padding: 10px 20px;
    }

    /* Features Section */
    .features-section {
      padding: 80px 24px;
      background: #fafafa;
    }

    .features-section h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.5rem;
      font-weight: 500;
      color: var(--navy);
      text-align: center;
      margin-bottom: 48px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .feature-card {
      text-align: center;
      padding: 32px 24px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    }

    .feature-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .feature-card h3 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--navy);
      margin-bottom: 12px;
    }

    .feature-card p {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
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

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-block;
      font-size: 1rem;
      font-weight: 600;
      padding: 16px 40px;
      border-radius: 50px;
      text-decoration: none;
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

    .btn-primary.santa-btn {
      background: linear-gradient(135deg, #c41e3a, #8B0000);
      box-shadow: 0 4px 20px rgba(139, 0, 0, 0.3);
    }

    .btn-primary.santa-btn:hover {
      box-shadow: 0 8px 30px rgba(139, 0, 0, 0.4);
    }

    .btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .demo-hero {
        padding: 100px 20px 60px;
      }

      .demos-section {
        padding: 60px 20px;
      }

      .demo-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .video-container.portrait {
        max-height: 300px;
      }

      .features-section {
        padding: 60px 20px;
      }

      .features-section h2 {
        font-size: 2rem;
      }

      .cta-section {
        padding: 60px 20px;
      }

      .cta-section h2 {
        font-size: 1.8rem;
      }

      .cta-buttons {
        flex-direction: column;
        align-items: center;
      }

      .btn {
        width: 100%;
        max-width: 300px;
      }
    }
  `;
}
