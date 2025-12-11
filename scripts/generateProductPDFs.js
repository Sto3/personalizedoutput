/**
 * Generate Product PDFs for Etsy Digital Downloads
 *
 * Creates PDFs that customers download immediately after purchase.
 * Each PDF contains instructions and a link to personalizedoutput.com
 *
 * Uses puppeteer to generate PDFs from HTML templates.
 *
 * Usage: node scripts/generateProductPDFs.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================================
// PRODUCT CONFIGURATIONS
// ============================================================

const PRODUCTS = [
  {
    id: 'santa_message',
    name: 'Personalized Santa Audio Message',
    subtitle: 'Made Just for Your Child!',
    url: 'https://personalizedoutput.com/santa',
    color: '#C41E3A', // Christmas red
    emoji: '🎅',
    step2: 'ANSWER A FEW SIMPLE QUESTIONS',
    step2detail: 'Our Thought Organizer will guide you through a short series of questions about your child\'s year.',
    step2time: '2-4 MINUTES',
    step3: 'RECEIVE YOUR CUSTOM SANTA MESSAGE',
    step3detail: 'Once you complete the questions, your child\'s 60-second personalized audio message will be generated instantly.',
    features: ['PLAY IT', 'DOWNLOAD IT', 'SAVE IT FOR CHRISTMAS MORNING!'],
    outputFile: 'Santa_Voice_Message_Instructions.pdf'
  },
  {
    id: 'holiday_reset',
    name: 'Holiday Relationship Reset Planner',
    subtitle: 'Navigate the Holidays with Clarity!',
    url: 'https://personalizedoutput.com/holiday-reset',
    color: '#27AE60', // Green
    emoji: '🎄',
    step2: 'SHARE YOUR SITUATION',
    step2detail: 'Our Thought Organizer will guide you through a thoughtful conversation about your family dynamics and holiday challenges.',
    step2time: '15-20 MINUTES',
    step3: 'RECEIVE YOUR PERSONALIZED PLANNER',
    step3detail: 'Once you complete the conversation, your personalized Holiday Game Plan will be generated.',
    features: ['SPECIFIC STRATEGIES FOR YOUR SITUATION', 'BOUNDARY-SETTING SCRIPTS', 'CONVERSATION GUIDES', 'SELF-CARE REMINDERS'],
    outputFile: 'Holiday_Reset_Planner_Instructions.pdf'
  },
  {
    id: 'new_year_reset',
    name: 'New Year Reflection & Reset Planner',
    subtitle: 'Honor Your Year. Shape Your Future!',
    url: 'https://personalizedoutput.com/new-year-reset',
    color: '#3498DB', // Blue
    emoji: '✨',
    step2: 'REFLECT ON YOUR YEAR',
    step2detail: 'Our Thought Organizer will guide you through a meaningful reflection on your year — the wins, the challenges, and the growth.',
    step2time: '20-30 MINUTES',
    step3: 'RECEIVE YOUR PERSONALIZED PLANNER',
    step3detail: 'Once you complete the reflection, your personalized Planner will be generated.',
    features: ['YOUR YEAR-IN-REVIEW SUMMARY', 'PERSONALIZED INTENTIONS FOR 2025', 'CUSTOM REFLECTION PROMPTS', 'ACTION STEPS BASED ON YOUR GOALS'],
    outputFile: 'New_Year_Reset_Planner_Instructions.pdf'
  },
  {
    id: 'vision_board',
    name: 'Personalized Vision Board',
    subtitle: 'Created Just for Your Dreams!',
    url: 'https://personalizedoutput.com/vision-board',
    color: '#9B59B6', // Purple
    emoji: '✨',
    step2: 'SHARE YOUR VISION',
    step2detail: 'Our Thought Organizer will guide you through a series of questions about your goals, dreams, and aesthetic preferences.',
    step2time: '7-10 MINUTES',
    step3: 'RECEIVE YOUR CUSTOM VISION BOARD',
    step3detail: 'Once you complete the questions, your personalized vision board will be generated instantly.',
    features: ['VIEW IT', 'DOWNLOAD IT', 'PRINT IT AND DISPLAY IT!'],
    outputFile: 'Vision_Board_Instructions.pdf'
  },
  {
    id: 'clarity_planner',
    name: 'Guided Clarity Planner',
    subtitle: 'Personalized Just for Your Journey!',
    url: 'https://personalizedoutput.com/planner',
    color: '#16A085', // Teal
    emoji: '📔',
    step2: 'SHARE YOUR JOURNEY',
    step2detail: 'Our Thought Organizer will guide you through a thoughtful conversation about where you are and where you want to go.',
    step2time: '15-20 MINUTES',
    step3: 'RECEIVE YOUR PERSONALIZED PLANNER',
    step3detail: 'Once you complete the conversation, your personalized Clarity Planner will be generated.',
    features: ['REFLECTION PROMPTS FOR YOUR SPECIFIC SITUATION', 'GUIDED EXERCISES TAILORED TO YOU', 'ACTION PLANNING WORKSHEETS', 'CLARITY CHECKPOINTS'],
    outputFile: 'Clarity_Planner_Instructions.pdf'
  }
];

// ============================================================
// HTML TEMPLATE
// ============================================================

function generateHTML(product) {
  const featuresHTML = product.features.map(f => `<div class="feature">${f}</div>`).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: Letter;
      margin: 0.5in;
    }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 6.5in;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.5;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .emoji {
      font-size: 40px;
      margin-bottom: 10px;
    }
    h1 {
      color: ${product.color};
      font-size: 26px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 {
      color: ${product.color};
      font-size: 16px;
      font-weight: normal;
      margin: 5px 0 0 0;
      font-style: italic;
    }
    .intro {
      text-align: center;
      margin: 25px 0;
      font-size: 14px;
      line-height: 1.8;
    }
    .step {
      margin: 20px 0;
    }
    .step-title {
      color: #E74C3C;
      font-weight: bold;
      font-size: 14px;
    }
    .step-content {
      margin-top: 5px;
      font-size: 13px;
    }
    .link-box {
      text-align: center;
      margin: 15px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .link {
      color: ${product.color};
      font-size: 13px;
      text-decoration: none;
      font-weight: bold;
    }
    .note {
      font-size: 11px;
      color: #888;
      margin-top: 8px;
      font-style: italic;
    }
    .time {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .features {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .features-title {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .feature {
      font-size: 12px;
      margin: 5px 0;
      font-weight: bold;
    }
    .help {
      margin-top: 35px;
      text-align: center;
      font-size: 13px;
    }
    .help-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .heart {
      color: #E74C3C;
    }
    .footer {
      text-align: center;
      margin-top: 35px;
      font-size: 13px;
      color: #666;
    }
    .brand {
      color: ${product.color};
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="emoji">${product.emoji}</div>
    <h1>${product.name}</h1>
    <h2>${product.subtitle}</h2>
  </div>

  <div class="intro">
    THANK YOU FOR YOUR PURCHASE!<br>
    YOU'RE JUST A FEW CLICKS AWAY FROM CREATING YOUR<br>
    PERSONALIZED ${product.id === 'santa_message' ? 'SANTA MESSAGE' : product.id === 'vision_board' ? 'VISION BOARD' : 'PLANNER'}.
  </div>

  <div class="step">
    <span class="step-title">STEP 1</span> — OPEN THE LINK BELOW<br>
    <div class="step-content">CLICK HERE TO BEGIN:</div>
    <div class="link-box">
      <a href="${product.url}" class="link">👉 ${product.url.toUpperCase()}</a>
      <div class="note">(If clicking doesn't work, copy and paste the link into your browser.)</div>
    </div>
  </div>

  <div class="step">
    <span class="step-title">STEP 2</span> — ${product.step2}<br>
    <div class="step-content">
      ${product.step2detail}
      <div class="time">THIS TAKES ${product.step2time}.</div>
    </div>
  </div>

  <div class="step">
    <span class="step-title">STEP 3</span> — ${product.step3}<br>
    <div class="step-content">${product.step3detail}</div>
    <div class="features">
      <div class="features-title">YOU'LL BE ABLE TO:</div>
      ${featuresHTML}
    </div>
  </div>

  <div class="help">
    <div class="help-title">NEED HELP?</div>
    If you have any questions, send me a message on Etsy anytime —<br>
    I'm here for you. <span class="heart">❤️</span>
  </div>

  <div class="footer">
    THANK YOU AGAIN FOR SUPPORTING A SMALL SHOP!<br>
    — <span class="brand">PERSONALIZED OUTPUT</span>
  </div>
</body>
</html>`;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function generateAllPDFs() {
  const outputDir = path.join(process.cwd(), 'assets', 'etsy', 'product_pdfs');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('='.repeat(60));
  console.log('GENERATING PRODUCT PDFs');
  console.log('='.repeat(60));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const product of PRODUCTS) {
    console.log(`Generating: ${product.name}...`);

    const html = generateHTML(product);
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(outputDir, product.outputFile);
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    await page.close();
    console.log(`  ✅ Created: ${pdfPath}`);
  }

  await browser.close();

  console.log('');
  console.log('='.repeat(60));
  console.log('ALL PDFs GENERATED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`\nOutput directory: ${outputDir}`);
  console.log('\nFiles created:');
  PRODUCTS.forEach(p => console.log(`  - ${p.outputFile}`));
}

// Run
generateAllPDFs().catch(console.error);
