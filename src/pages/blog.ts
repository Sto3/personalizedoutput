/**
 * Blog Pages
 *
 * Renders blog listing and individual post pages with SEO optimization.
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          color: #0f172a;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        .header {
          margin-bottom: 60px;
        }
        .back-link {
          display: inline-block;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 24px;
        }
        .back-link:hover { color: #0f172a; }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }
        .tagline {
          color: #64748b;
          font-size: 1.125rem;
        }
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .post-card {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          color: inherit;
          display: block;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1);
        }
        .post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.1);
        }
        .post-image {
          height: 180px;
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .post-content {
          padding: 24px;
        }
        .post-date {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .post-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
          line-height: 1.3;
          color: #0f172a;
        }
        .post-excerpt {
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.6;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .tag {
          font-size: 0.75rem;
          padding: 4px 10px;
          background: rgba(233, 69, 96, 0.1);
          border-radius: 12px;
          color: #e94560;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="/" class="back-link">← Back to Personalized Output</a>
          <h1>Our Blog</h1>
          <p class="tagline">Tips for creating meaningful gifts and personal growth</p>
        </div>

        <div class="posts-grid">
          ${posts.map(post => {
            const emoji = getPostEmoji(post.tags || []);
            const date = post.published_at
              ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '';
            return `
              <a href="/blog/${post.slug}" class="post-card">
                <div class="post-image">${emoji}</div>
                <div class="post-content">
                  <div class="post-date">${date}</div>
                  <h2 class="post-title">${post.title}</h2>
                  <p class="post-excerpt">${post.excerpt || ''}</p>
                  ${post.tags && post.tags.length > 0 ? `
                    <div class="tags">
                      ${post.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render a single blog post page
 */
export function renderBlogPostPage(post: BlogPost): string {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          color: #e2e8f0;
          line-height: 1.8;
        }
        .container {
          max-width: 720px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        .back-link {
          display: inline-block;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          margin-bottom: 40px;
        }
        .back-link:hover { color: #fff; }
        .meta {
          margin-bottom: 24px;
        }
        .date {
          color: #e94560;
          font-size: 0.875rem;
          font-weight: 500;
        }
        h1 {
          font-size: 2.5rem;
          line-height: 1.2;
          margin-bottom: 16px;
          color: #fff;
        }
        .excerpt {
          font-size: 1.25rem;
          color: rgba(255,255,255,0.7);
          margin-bottom: 32px;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 40px;
        }
        .tag {
          font-size: 0.75rem;
          padding: 4px 12px;
          background: rgba(233, 69, 96, 0.2);
          border-radius: 12px;
          color: #e94560;
        }
        .content {
          font-size: 1.0625rem;
        }
        .content h2 {
          font-size: 1.75rem;
          margin-top: 48px;
          margin-bottom: 20px;
          color: #fff;
        }
        .content h3 {
          font-size: 1.25rem;
          margin-top: 32px;
          margin-bottom: 16px;
          color: #fff;
        }
        .content p {
          margin-bottom: 20px;
          color: #cbd5e1;
        }
        .content ul, .content ol {
          margin-bottom: 20px;
          padding-left: 24px;
        }
        .content li {
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        .content strong {
          color: #fff;
          font-weight: 600;
        }
        .content a {
          color: #e94560;
          text-decoration: none;
        }
        .content a:hover {
          text-decoration: underline;
        }
        .cta {
          background: linear-gradient(135deg, rgba(233, 69, 96, 0.2), rgba(255, 107, 107, 0.2));
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 16px;
          padding: 32px;
          margin-top: 48px;
          text-align: center;
        }
        .cta h3 {
          margin-bottom: 12px;
          color: #fff;
        }
        .cta p {
          color: rgba(255,255,255,0.7);
          margin-bottom: 20px;
        }
        .cta-btn {
          display: inline-block;
          padding: 14px 28px;
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          color: #fff;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
        }
        .author {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/blog" class="back-link">← Back to Blog</a>

        <article>
          <div class="meta">
            <div class="date">${date}</div>
          </div>

          <h1>${post.title}</h1>

          ${post.excerpt ? `<p class="excerpt">${post.excerpt}</p>` : ''}

          ${post.tags && post.tags.length > 0 ? `
            <div class="tags">
              ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}

          <div class="content">
            ${htmlContent}
          </div>

          <div class="cta">
            <h3>Ready to Create Something Personal?</h3>
            <p>Explore our personalized products and create meaningful gifts for the people you love.</p>
            <a href="/" class="cta-btn">Explore Products</a>
          </div>

          <div class="author">
            Written by ${post.author}
          </div>
        </article>
      </div>
    </body>
    </html>
  `;
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
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol')) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join('\n');
}
