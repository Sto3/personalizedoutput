/**
 * Blog Pages
 *
 * Renders blog listing and individual post pages with SEO optimization.
 * Premium editorial design with coral/purple color scheme and Bodoni Moda typography.
 */

import { BlogPost } from '../lib/supabase/client';

/**
 * Render the blog listing page
 */
export function renderBlogListPage(posts: BlogPost[]): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blog - Personalized Output | Tips for Meaningful Gifts & Personal Growth</title>
      <meta name="description" content="Expert tips on creating personalized gifts, vision boards, year-end reflection, and making meaningful connections with the people you love.">
      <meta name="keywords" content="personalized gifts, santa message, vision board, new year reflection, holiday planning">
      <link rel="canonical" href="https://personalizedoutput.com/blog">
      <meta property="og:title" content="Blog - Personalized Output">
      <meta property="og:description" content="Expert tips on creating personalized gifts and meaningful connections.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://personalizedoutput.com/blog">
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --coral: #E85A6B;
          --coral-light: #F08B96;
          --navy: #1a1a2e;
          --navy-light: #2d2d4a;
          --purple: #7C3AED;
          --purple-light: #A78BFA;
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #fafafa;
          min-height: 100vh;
          color: var(--navy);
        }

        /* Navigation Header - PURPLE like homepage */
        .nav-header {
          background: rgba(124, 58, 237, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.25);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.5rem;
          font-weight: 500;
          color: #ffffff;
          text-decoration: none;
        }

        .nav-link {
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-link:hover {
          color: #ffffff;
        }

        /* Hero Section */
        .blog-hero {
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          padding: 100px 24px 80px;
          text-align: center;
          position: relative;
        }

        .blog-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--coral), var(--purple));
        }

        .blog-hero .eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--purple);
          margin-bottom: 16px;
        }

        .blog-hero h1 {
          font-family: 'Bodoni Moda', serif;
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 500;
          color: var(--navy);
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }

        .blog-hero h1 .highlight {
          color: var(--purple);
          font-style: italic;
        }

        .blog-hero .tagline {
          font-size: 1.125rem;
          color: #64748b;
          max-width: 550px;
          margin: 0 auto;
          line-height: 1.7;
        }

        /* Main Content */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
        }

        /* Featured Post - Larger and more prominent */
        .featured-post {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 60px;
          margin-bottom: 100px;
          padding: 40px;
          background: #ffffff;
          border-radius: 32px;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .featured-image {
          aspect-ratio: 16/10;
          background: linear-gradient(135deg, var(--coral) 0%, var(--coral-light) 50%, var(--purple-light) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7rem;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(232, 90, 107, 0.2);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }

        .featured-image:hover {
          transform: scale(1.02);
          box-shadow: 0 30px 60px rgba(232, 90, 107, 0.25);
        }

        .featured-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px 0;
        }

        .featured-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--purple);
          margin-bottom: 20px;
          padding: 8px 16px;
          background: rgba(124, 58, 237, 0.08);
          border-radius: 50px;
          width: fit-content;
        }

        .featured-label::before {
          content: '★';
        }

        .featured-title {
          font-family: 'Bodoni Moda', serif;
          font-size: 2.5rem;
          font-weight: 500;
          color: var(--navy);
          line-height: 1.25;
          margin-bottom: 20px;
        }

        .featured-title a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }

        .featured-title a:hover {
          color: var(--purple);
        }

        .featured-excerpt {
          font-size: 1.0625rem;
          color: #64748b;
          line-height: 1.75;
          margin-bottom: 28px;
        }

        .featured-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .featured-date {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .featured-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          padding: 14px 28px;
          background: var(--coral);
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
          width: fit-content;
        }

        .featured-cta:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }

        /* Posts Grid */
        .posts-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 48px;
        }

        .posts-section-title {
          font-family: 'Bodoni Moda', serif;
          font-size: 2rem;
          font-weight: 500;
          color: var(--navy);
        }

        .posts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        @media (max-width: 900px) {
          .posts-grid { grid-template-columns: repeat(2, 1fr); }
          .featured-post {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 24px;
          }
          .featured-title { font-size: 2rem; }
        }

        @media (max-width: 600px) {
          .posts-grid { grid-template-columns: 1fr; }
          .blog-hero { padding: 80px 20px 60px; }
          .container { padding: 60px 20px; }
          .featured-post { padding: 20px; border-radius: 24px; }
        }

        .post-card {
          text-decoration: none;
          color: inherit;
          display: block;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
        }

        .post-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(124, 58, 237, 0.12);
        }

        .post-card:hover .post-title {
          color: var(--purple);
        }

        .post-image {
          aspect-ratio: 16/10;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          overflow: hidden;
          position: relative;
        }

        .post-image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(232, 90, 107, 0.15), rgba(124, 58, 237, 0.15));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .post-card:hover .post-image::after {
          opacity: 1;
        }

        .post-content {
          padding: 24px;
        }

        .post-category {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--purple);
          margin-bottom: 10px;
        }

        .post-title {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.375rem;
          font-weight: 500;
          color: var(--navy);
          line-height: 1.35;
          margin-bottom: 10px;
          transition: color 0.2s;
        }

        .post-excerpt {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.65;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .post-date {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        /* Newsletter Section - Premium Design */
        .newsletter-section {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
          border-radius: 32px;
          padding: 80px 60px;
          margin-top: 100px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .newsletter-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);
          border-radius: 50%;
        }

        .newsletter-section::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(232, 90, 107, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .newsletter-content {
          position: relative;
          z-index: 1;
        }

        .newsletter-section h2 {
          font-family: 'Bodoni Moda', serif;
          font-size: 2.5rem;
          font-weight: 500;
          margin-bottom: 16px;
          color: #ffffff;
        }

        .newsletter-section p {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 32px;
          font-size: 1.0625rem;
        }

        .newsletter-form {
          display: flex;
          max-width: 440px;
          margin: 0 auto;
          gap: 12px;
        }

        .newsletter-input {
          flex: 1;
          padding: 16px 20px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          font-size: 0.9375rem;
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transition: all 0.3s;
        }

        .newsletter-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .newsletter-input:focus {
          border-color: var(--purple-light);
          background: rgba(255, 255, 255, 0.12);
        }

        .newsletter-btn {
          padding: 16px 32px;
          background: var(--coral);
          color: #fff;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
        }

        .newsletter-btn:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }

        @media (max-width: 600px) {
          .newsletter-section { padding: 60px 24px; }
          .newsletter-section h2 { font-size: 1.875rem; }
          .newsletter-form { flex-direction: column; }
          .newsletter-btn { width: 100%; }
        }

        /* Footer */
        .blog-footer {
          border-top: 1px solid rgba(0, 0, 0, 0.04);
          padding: 48px 24px;
          text-align: center;
          margin-top: 100px;
          background: #ffffff;
        }

        .blog-footer p {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .blog-footer a {
          color: var(--navy);
          text-decoration: none;
          font-weight: 500;
        }

        .blog-footer a:hover {
          color: var(--purple);
        }
      </style>
    </head>
    <body>
      <!-- Navigation -->
      <header class="nav-header">
        <div class="nav-container">
          <a href="/" class="nav-logo">Personalized Output</a>
          <a href="/" class="nav-link">← Back to Home</a>
        </div>
      </header>

      <!-- Hero -->
      <section class="blog-hero">
        <span class="eyebrow">Our Blog</span>
        <h1>The <span class="highlight">Journal</span></h1>
        <p class="tagline">Expert insights on creating meaningful personalized experiences and fostering personal growth</p>
      </section>

      <div class="container">
        ${posts.length > 0 ? renderFeaturedPost(posts[0]) : ''}

        ${posts.length > 1 ? `
          <div class="posts-section-header">
            <h2 class="posts-section-title">Latest Articles</h2>
          </div>

          <div class="posts-grid">
            ${posts.slice(1).map(post => renderPostCard(post)).join('')}
          </div>
        ` : ''}

        <section class="newsletter-section">
          <div class="newsletter-content">
            <h2>Stay Inspired</h2>
            <p>Get the latest tips on personalization and meaningful gift-giving delivered to your inbox.</p>
            <form class="newsletter-form" onsubmit="event.preventDefault()">
              <input type="email" class="newsletter-input" placeholder="Enter your email" required>
              <button type="submit" class="newsletter-btn">Subscribe</button>
            </form>
          </div>
        </section>
      </div>

      <footer class="blog-footer">
        <p>© ${new Date().getFullYear()} <a href="/">Personalized Output</a>. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `;
}

function renderFeaturedPost(post: BlogPost): string {
  const emoji = getPostEmoji(post.tags || []);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const category = getPostCategory(post.tags || []);

  return `
    <article class="featured-post">
      <a href="/blog/${post.slug}" class="featured-image">${emoji}</a>
      <div class="featured-content">
        <div class="featured-label">Featured</div>
        <h2 class="featured-title"><a href="/blog/${post.slug}">${post.title}</a></h2>
        <p class="featured-excerpt">${post.excerpt || ''}</p>
        <div class="featured-meta">
          <span class="featured-date">${date}</span>
          <span>•</span>
          <span>${category}</span>
        </div>
        <a href="/blog/${post.slug}" class="featured-cta">Read Article →</a>
      </div>
    </article>
  `;
}

function renderPostCard(post: BlogPost): string {
  const emoji = getPostEmoji(post.tags || []);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const category = getPostCategory(post.tags || []);

  return `
    <a href="/blog/${post.slug}" class="post-card">
      <div class="post-image">${emoji}</div>
      <div class="post-content">
        <div class="post-category">${category}</div>
        <h3 class="post-title">${post.title}</h3>
        <p class="post-excerpt">${post.excerpt || ''}</p>
        <div class="post-date">${date}</div>
      </div>
    </a>
  `;
}

/**
 * Render a single blog post page
 */
export function renderBlogPostPage(post: BlogPost): string {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const category = getPostCategory(post.tags || []);

  // Convert markdown-style content to HTML
  const htmlContent = convertMarkdownToHtml(post.content);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${post.meta_title || post.title} - Personalized Output</title>
      <meta name="description" content="${post.meta_description || post.excerpt || ''}">
      <meta name="author" content="${post.author}">
      <link rel="canonical" href="https://personalizedoutput.com/blog/${post.slug}">
      <meta property="og:title" content="${post.meta_title || post.title}">
      <meta property="og:description" content="${post.meta_description || post.excerpt || ''}">
      <meta property="og:type" content="article">
      <meta property="og:url" content="https://personalizedoutput.com/blog/${post.slug}">
      <meta property="article:published_time" content="${post.published_at || ''}">
      <meta property="article:author" content="${post.author}">
      ${(post.tags || []).map(tag => `<meta property="article:tag" content="${tag}">`).join('\n')}
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --coral: #E85A6B;
          --coral-light: #F08B96;
          --navy: #1a1a2e;
          --navy-light: #2d2d4a;
          --purple: #7C3AED;
          --purple-light: #A78BFA;
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #fafafa;
          min-height: 100vh;
          color: var(--navy);
        }

        /* Navigation Header - PURPLE like homepage */
        .nav-header {
          background: rgba(124, 58, 237, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.25);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.5rem;
          font-weight: 500;
          color: #ffffff;
          text-decoration: none;
        }

        .nav-link {
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #ffffff;
        }

        /* Article Header */
        .article-header {
          max-width: 800px;
          margin: 0 auto;
          padding: 100px 24px 48px;
          text-align: center;
        }

        .article-category {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--purple);
          margin-bottom: 24px;
          padding: 8px 16px;
          background: rgba(124, 58, 237, 0.08);
          border-radius: 50px;
        }

        .article-title {
          font-family: 'Bodoni Moda', serif;
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 500;
          color: var(--navy);
          line-height: 1.15;
          margin-bottom: 28px;
          letter-spacing: -0.02em;
        }

        .article-excerpt {
          font-size: 1.25rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 28px;
          max-width: 650px;
          margin-left: auto;
          margin-right: auto;
        }

        .article-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .article-author {
          font-weight: 500;
          color: var(--navy);
        }

        /* Featured Image */
        .featured-image-container {
          max-width: 900px;
          margin: 0 auto 70px;
          padding: 0 24px;
        }

        .featured-image {
          width: 100%;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, var(--coral) 0%, var(--coral-light) 50%, var(--purple-light) 100%);
          border-radius: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8rem;
          box-shadow: 0 20px 60px rgba(232, 90, 107, 0.2);
        }

        /* Article Content */
        .article-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        .content {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.1875rem;
          line-height: 1.85;
          color: #334155;
        }

        .content h2 {
          font-family: 'Bodoni Moda', serif;
          font-size: 2rem;
          font-weight: 500;
          color: var(--navy);
          margin-top: 64px;
          margin-bottom: 28px;
          letter-spacing: -0.01em;
        }

        .content h3 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--navy);
          margin-top: 48px;
          margin-bottom: 20px;
        }

        .content p {
          margin-bottom: 28px;
        }

        .content ul, .content ol {
          margin-bottom: 28px;
          padding-left: 28px;
        }

        .content li {
          margin-bottom: 14px;
        }

        .content strong {
          font-weight: 600;
          color: var(--navy);
        }

        .content a {
          color: var(--purple);
          text-decoration: none;
          border-bottom: 2px solid rgba(124, 58, 237, 0.25);
          transition: border-color 0.2s;
        }

        .content a:hover {
          border-color: var(--purple);
        }

        .content blockquote {
          margin: 48px 0;
          padding: 28px 36px;
          border-left: 4px solid var(--purple);
          background: #ffffff;
          border-radius: 0 16px 16px 0;
          font-style: italic;
          color: #475569;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        /* Tags */
        .article-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 56px;
          padding-top: 36px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .article-tag {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 8px 16px;
          background: #ffffff;
          border-radius: 50px;
          color: #64748b;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        /* CTA Section */
        .cta-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .cta-card {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
          border-radius: 32px;
          padding: 64px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);
          border-radius: 50%;
        }

        .cta-card h3 {
          font-family: 'Bodoni Moda', serif;
          font-size: 2rem;
          font-weight: 500;
          margin-bottom: 16px;
          color: #ffffff;
          position: relative;
          z-index: 1;
        }

        .cta-card p {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 32px;
          font-size: 1.0625rem;
          position: relative;
          z-index: 1;
        }

        .cta-btn {
          display: inline-block;
          padding: 18px 40px;
          background: var(--coral);
          color: #fff;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(232, 90, 107, 0.3);
          position: relative;
          z-index: 1;
        }

        .cta-btn:hover {
          background: var(--coral-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232, 90, 107, 0.4);
        }

        /* Author Section */
        .author-section {
          max-width: 720px;
          margin: 70px auto 0;
          padding: 0 24px;
        }

        .author-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .author-avatar {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, var(--coral), var(--purple-light));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: #fff;
          font-weight: 600;
          flex-shrink: 0;
        }

        .author-info h4 {
          font-family: 'Bodoni Moda', serif;
          font-size: 1.25rem;
          font-weight: 500;
          margin-bottom: 6px;
          color: var(--navy);
        }

        .author-info p {
          font-size: 0.9375rem;
          color: #64748b;
        }

        /* Footer */
        .blog-footer {
          border-top: 1px solid rgba(0, 0, 0, 0.04);
          padding: 48px 24px;
          text-align: center;
          margin-top: 100px;
          background: #ffffff;
        }

        .blog-footer p {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .blog-footer a {
          color: var(--navy);
          text-decoration: none;
          font-weight: 500;
        }

        .blog-footer a:hover {
          color: var(--purple);
        }

        /* Responsive */
        @media (max-width: 600px) {
          .article-header { padding: 80px 20px 40px; }
          .article-title { font-size: 2rem; }
          .article-excerpt { font-size: 1rem; }
          .content { font-size: 1rem; }
          .content h2 { font-size: 1.5rem; margin-top: 48px; }
          .cta-card { padding: 40px 24px; border-radius: 24px; }
          .featured-image { border-radius: 24px; font-size: 5rem; }
          .author-card { padding: 24px; }
        }
      </style>
    </head>
    <body>
      <!-- Navigation -->
      <header class="nav-header">
        <div class="nav-container">
          <a href="/" class="nav-logo">Personalized Output</a>
          <a href="/blog" class="nav-link">← Back to Journal</a>
        </div>
      </header>

      <article>
        <!-- Header -->
        <header class="article-header">
          <div class="article-category">${category}</div>
          <h1 class="article-title">${post.title}</h1>
          ${post.excerpt ? `<p class="article-excerpt">${post.excerpt}</p>` : ''}
          <div class="article-meta">
            <span class="article-author">${post.author}</span>
            <span>•</span>
            <span>${date}</span>
          </div>
        </header>

        <!-- Featured Image -->
        <div class="featured-image-container">
          <div class="featured-image">${getPostEmoji(post.tags || [])}</div>
        </div>

        <!-- Content -->
        <div class="article-content">
          <div class="content">
            ${htmlContent}
          </div>

          ${post.tags && post.tags.length > 0 ? `
            <div class="article-tags">
              ${post.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- CTA -->
        <section class="cta-section">
          <div class="cta-card">
            <h3>Ready to Create Something Personal?</h3>
            <p>Explore our personalized products — for yourself or as meaningful gifts for the people you love.</p>
            <a href="/" class="cta-btn">Explore Products</a>
          </div>
        </section>

        <!-- Author -->
        <section class="author-section">
          <div class="author-card">
            <div class="author-avatar">${post.author.charAt(0)}</div>
            <div class="author-info">
              <h4>${post.author}</h4>
              <p>Content creator at Personalized Output</p>
            </div>
          </div>
        </section>
      </article>

      <footer class="blog-footer">
        <p>© ${new Date().getFullYear()} <a href="/">Personalized Output</a>. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `;
}

/**
 * Get category based on post tags
 */
function getPostCategory(tags: string[]): string {
  if (tags.includes('santa') || tags.includes('christmas')) return 'Holiday';
  if (tags.includes('vision-board')) return 'Goal Setting';
  if (tags.includes('holiday')) return 'Seasonal';
  if (tags.includes('new-year')) return 'New Year';
  if (tags.includes('education') || tags.includes('flash-cards')) return 'Education';
  if (tags.includes('clarity')) return 'Personal Growth';
  if (tags.includes('gifts')) return 'Gift Ideas';
  return 'Insights';
}

/**
 * Get emoji based on post tags
 */
function getPostEmoji(tags: string[]): string {
  if (tags.includes('santa') || tags.includes('christmas')) return '🎅';
  if (tags.includes('vision-board')) return '🎯';
  if (tags.includes('holiday')) return '🎄';
  if (tags.includes('new-year')) return '✨';
  if (tags.includes('education') || tags.includes('flash-cards')) return '📚';
  if (tags.includes('clarity')) return '💡';
  if (tags.includes('gifts')) return '🎁';
  return '📝';
}

/**
 * Basic markdown to HTML conversion
 */
function convertMarkdownToHtml(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>') // Convert h1 to h2 since page already has h1
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || para.startsWith('<blockquote')) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join('\n');
}
