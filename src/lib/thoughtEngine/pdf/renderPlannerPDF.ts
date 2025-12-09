/**
 * Render Planner to PDF
 *
 * Simplified wrapper for planner PDF generation.
 * Creates beautiful, personalized PDFs from planner output.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlannerOutput, SectionOutput } from '../models/meaningModel';

// ============================================================
// TYPES
// ============================================================

export interface PDFMetadata {
  orderId?: string;
  productId?: string;
  jobId?: string;
  version?: string;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function renderPlannerToPDF(
  plannerOutput: PlannerOutput,
  outputPath: string,
  metadata?: PDFMetadata
): Promise<void> {
  // Build full HTML with orderId footer
  const html = buildPlannerHtml(plannerOutput, metadata);

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Try to use Puppeteer if available
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'Letter',
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      },
      printBackground: true
    });

    await browser.close();
    console.log(`[PDF] Generated: ${outputPath}`);
  } catch (e) {
    // Fallback: save as HTML file if Puppeteer not available
    console.warn('[PDF] Puppeteer not available, saving as HTML instead');
    const htmlPath = outputPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, html);

    // Also create a simple text placeholder
    fs.writeFileSync(outputPath.replace('.pdf', '.txt'),
      `PDF generation requires Puppeteer.\nHTML version saved at: ${htmlPath}\n\nTo enable PDF generation:\nnpm install puppeteer`
    );
  }
}

// ============================================================
// HTML BUILDING
// ============================================================

function buildPlannerHtml(output: PlannerOutput, metadata?: PDFMetadata): string {
  const sectionsHtml = output.sections
    .map(section => renderSection(section))
    .join('\n');

  const generatedDate = formatDate(output.generatedAt);
  const emotionalWeather = output.meaningModel?.emotionalWeather || 'Your personal journey';
  const timeframe = output.meaningModel?.timeframe?.label || 'Personal Planner';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(output.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Open+Sans:wght@400;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Open Sans', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2D3436;
      background: #FAFAFA;
    }

    .cover {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #F8F6F4 0%, #E8E4E0 100%);
      padding: 2in;
    }

    .cover h1 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28pt;
      font-weight: 400;
      color: #4A4A4A;
      margin-bottom: 0.5in;
      letter-spacing: 0.02em;
      line-height: 1.3;
    }

    .cover .subtitle {
      font-size: 12pt;
      color: #6B6B6B;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .cover .emotional-weather {
      margin-top: 1in;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 14pt;
      color: #8B7355;
      max-width: 5in;
    }

    .cover .date {
      margin-top: 0.5in;
      font-size: 10pt;
      color: #999;
    }

    .planner-section {
      page-break-inside: avoid;
      margin-bottom: 0.5in;
      padding: 0.25in 0;
    }

    .section-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18pt;
      font-weight: 600;
      color: #4A4A4A;
      border-bottom: 1px solid #E0DCD8;
      padding-bottom: 0.15in;
      margin-bottom: 0.25in;
    }

    .section-content {
      padding-left: 0.1in;
    }

    .section-content p {
      margin-bottom: 0.15in;
    }

    .section-content h3 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14pt;
      font-weight: 600;
      color: #5D5D5D;
      margin-top: 0.25in;
      margin-bottom: 0.1in;
    }

    .section-content h4 {
      font-size: 11pt;
      font-weight: 600;
      color: #6B6B6B;
      margin-top: 0.2in;
      margin-bottom: 0.08in;
    }

    .section-content ul, .section-content ol {
      margin-left: 0.3in;
      margin-bottom: 0.15in;
    }

    .section-content li {
      margin-bottom: 0.08in;
    }

    .section-content strong {
      color: #3D3D3D;
    }

    .section-content em {
      font-style: italic;
      color: #5D5D5D;
    }

    .highlight-box {
      background: #F5F2EF;
      border-left: 3px solid #8B7355;
      padding: 0.2in;
      margin: 0.2in 0;
    }

    .footer {
      margin-top: 0.5in;
      padding-top: 0.25in;
      border-top: 1px solid #E0DCD8;
      font-size: 9pt;
      color: #999;
      text-align: center;
    }

    @media print {
      body {
        background: white;
      }

      .cover {
        background: linear-gradient(135deg, #F8F6F4 0%, #E8E4E0 100%);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .highlight-box {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(output.title)}</h1>
    <div class="subtitle">${escapeHtml(timeframe)}</div>
    <div class="emotional-weather">"${escapeHtml(emotionalWeather)}"</div>
    <div class="date">Created ${escapeHtml(generatedDate)}</div>
  </div>

  <main>
    ${sectionsHtml}
  </main>

  <footer class="footer">
    <p>This planner is a tool for organizing your thoughts. It is not a substitute for professional advice.</p>
    <p>Created with Personalized Output</p>
    ${metadata?.orderId ? `<p style="margin-top: 0.25in; font-size: 8pt;">Order ID: ${escapeHtml(metadata.orderId)} | This personalized planner was generated exclusively for this purchase.</p>` : ''}
  </footer>
</body>
</html>`;
}

function renderSection(section: SectionOutput): string {
  const contentHtml = markdownToHtml(section.content);

  return `
    <section class="planner-section" id="${escapeHtml(section.id)}">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="section-content">
        ${contentHtml}
      </div>
    </section>
  `;
}

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<(h[234]|ul|ol)/g, '<$1');
  html = html.replace(/<\/(h[234]|ul|ol)>\s*<\/p>/g, '</$1>');

  return html;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export { buildPlannerHtml };
