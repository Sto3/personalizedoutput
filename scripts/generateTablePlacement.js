const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', { family: 'Bodoni 72 Smallcaps' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

async function generateTablePlacement() {
  // 5.5" x 8.5" at 300dpi = 1650 x 2550 pixels
  const width = 1650;
  const height = 2550;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === COLORS ===
  const burgundy = '#8B1A1A';
  const darkBurgundy = '#6B0F0F';
  const gold = '#D4AF37';
  const lightGold = '#E8D4A8';
  const darkGold = '#B8962E';

  // === BACKGROUND: Rich gold/champagne gradient with texture ===
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#F5E6C8');
  bgGradient.addColorStop(0.2, '#EBD9B0');
  bgGradient.addColorStop(0.5, '#E2CC98');
  bgGradient.addColorStop(0.8, '#EBD9B0');
  bgGradient.addColorStop(1, '#F5E6C8');

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Add radial luminosity from center
  const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.5);
  radialGradient.addColorStop(0, 'rgba(255, 252, 245, 0.4)');
  radialGradient.addColorStop(0.5, 'rgba(255, 250, 240, 0.2)');
  radialGradient.addColorStop(1, 'rgba(200, 175, 130, 0.15)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle texture
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.025;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // === DECORATIVE BORDER ===
  // Outer border
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // Inner border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, width - 110, height - 110);

  // === CORNER FLOURISHES ===
  const drawCornerFlourish = (x, y, scaleX, scaleY) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';

    // Main curl
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(30, 0, 50, 20, 50, 50);
    ctx.bezierCurveTo(50, 30, 35, 15, 15, 15);
    ctx.bezierCurveTo(25, 25, 30, 40, 25, 55);
    ctx.stroke();

    // Small accent curl
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.bezierCurveTo(20, 5, 25, 15, 20, 25);
    ctx.stroke();

    // Dot accents
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(5, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw corner flourishes
  drawCornerFlourish(70, 70, 1, 1);
  drawCornerFlourish(width - 70, 70, -1, 1);
  drawCornerFlourish(70, height - 70, 1, -1);
  drawCornerFlourish(width - 70, height - 70, -1, -1);

  // === TOP DECORATIVE FLOURISH ===
  const drawTopFlourish = (centerX, y) => {
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;

    // Center scroll
    ctx.beginPath();
    ctx.moveTo(centerX - 120, y);
    ctx.bezierCurveTo(centerX - 80, y - 20, centerX - 40, y - 25, centerX, y - 15);
    ctx.bezierCurveTo(centerX + 40, y - 25, centerX + 80, y - 20, centerX + 120, y);
    ctx.stroke();

    // Left curl
    ctx.beginPath();
    ctx.moveTo(centerX - 120, y);
    ctx.bezierCurveTo(centerX - 140, y + 10, centerX - 150, y - 5, centerX - 135, y - 15);
    ctx.stroke();

    // Right curl
    ctx.beginPath();
    ctx.moveTo(centerX + 120, y);
    ctx.bezierCurveTo(centerX + 140, y + 10, centerX + 150, y - 5, centerX + 135, y - 15);
    ctx.stroke();

    // Center diamond
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(centerX, y - 25);
    ctx.lineTo(centerX + 8, y - 15);
    ctx.lineTo(centerX, y - 5);
    ctx.lineTo(centerX - 8, y - 15);
    ctx.closePath();
    ctx.fill();
  };

  drawTopFlourish(width / 2, 130);

  // === HEADER ===
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Celebrating" in Snell Roundhand - FILL PAGE
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 140px "Snell Roundhand"';
  ctx.fillText('Celebrating', width / 2, 200);

  // "50 Years" in Bodoni - FILL PAGE
  ctx.font = '210px "Bodoni 72"';
  ctx.fillText('50 Years', width / 2, 370);

  // "of Marriage" in Snell Roundhand - FILL PAGE
  ctx.font = 'italic 140px "Snell Roundhand"';
  ctx.fillText('of Marriage', width / 2, 520);

  // Interlocking rings motif (subtle gold on gold)
  const drawRings = (x, y, size) => {
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    ctx.lineWidth = 3;

    // Left ring
    ctx.beginPath();
    ctx.arc(x - size * 0.4, y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Right ring
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y, size, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawRings(width / 2, 610, 35);

  // Date - FILL PAGE
  ctx.fillStyle = darkBurgundy;
  ctx.font = '58px "Bodoni 72"';
  ctx.fillText('Sunday, December 21, 2025', width / 2, 720);

  // === DECORATIVE DIVIDER AFTER HEADER ===
  const drawDivider = (y) => {
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;

    // Center line with curves
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, y);
    ctx.lineTo(width / 2 - 30, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 + 30, y);
    ctx.lineTo(width / 2 + 200, y);
    ctx.stroke();

    // Center ornament
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(width / 2, y - 8);
    ctx.lineTo(width / 2 + 10, y);
    ctx.lineTo(width / 2, y + 8);
    ctx.lineTo(width / 2 - 10, y);
    ctx.closePath();
    ctx.fill();

    // Small dots
    ctx.beginPath();
    ctx.arc(width / 2 - 20, y, 2, 0, Math.PI * 2);
    ctx.arc(width / 2 + 20, y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  drawDivider(800);

  // === SCRIPTURES ===
  const scriptures = [
    {
      text: '"Therefore shall a man leave his father and his mother, and shall cleave unto his wife: and they shall be one flesh."',
      ref: '— Genesis 2:24'
    },
    {
      text: '"Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD."',
      ref: '— Proverbs 18:22'
    },
    {
      text: '"Many waters cannot quench love, neither can the floods drown it."',
      ref: '— Song of Solomon 8:7'
    },
    {
      text: '"Who can find a virtuous woman? for her price is far above rubies."',
      ref: '— Proverbs 31:10'
    },
    {
      text: '"Two are better than one... a cord of three strands is not quickly broken."',
      ref: '— Ecclesiastes 4:9, 12'
    }
  ];

  // Helper function to wrap text
  const wrapText = (text, maxWidth, fontSize) => {
    ctx.font = `bold italic ${fontSize}px "Snell Roundhand"`;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  let yPos = 870;
  const scriptureWidth = width - 120;
  const scriptureFontSize = 70;
  const refFontSize = 50;
  const lineHeight = 82;
  const scriptureSpacing = 90;

  // Small ornamental flourish between scriptures
  const drawSmallFlourish = (y) => {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(width / 2 - 25, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2 + 25, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let i = 0; i < scriptures.length; i++) {
    const scripture = scriptures[i];

    // Draw scripture text
    ctx.fillStyle = burgundy;
    const lines = wrapText(scripture.text, scriptureWidth, scriptureFontSize);

    for (const line of lines) {
      ctx.font = `bold italic ${scriptureFontSize}px "Snell Roundhand"`;
      ctx.fillText(line, width / 2, yPos);
      yPos += lineHeight;
    }

    // Draw reference
    ctx.font = `bold ${refFontSize}px "Bodoni 72"`;
    ctx.fillStyle = darkBurgundy;
    yPos += 5;
    ctx.fillText(scripture.ref, width / 2, yPos);
    yPos += 25;

    // Draw small flourish between scriptures (not after the last one)
    if (i < scriptures.length - 1) {
      yPos += 20;
      drawSmallFlourish(yPos);
      yPos += scriptureSpacing - 20;
    }
  }

  // === BOTTOM DECORATIVE FLOURISH ===
  const drawBottomFlourish = (centerX, y) => {
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;

    // Main horizontal scroll
    ctx.beginPath();
    ctx.moveTo(centerX - 150, y);
    ctx.bezierCurveTo(centerX - 100, y + 15, centerX - 50, y + 20, centerX, y + 10);
    ctx.bezierCurveTo(centerX + 50, y + 20, centerX + 100, y + 15, centerX + 150, y);
    ctx.stroke();

    // Left curl
    ctx.beginPath();
    ctx.moveTo(centerX - 150, y);
    ctx.bezierCurveTo(centerX - 170, y - 10, centerX - 175, y + 15, centerX - 160, y + 20);
    ctx.stroke();

    // Right curl
    ctx.beginPath();
    ctx.moveTo(centerX + 150, y);
    ctx.bezierCurveTo(centerX + 170, y - 10, centerX + 175, y + 15, centerX + 160, y + 20);
    ctx.stroke();

    // Center ornament
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(centerX, y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  drawBottomFlourish(width / 2, height - 300);

  // === FOOTER === BALANCED POSITION
  ctx.fillStyle = burgundy;
  ctx.font = 'bold italic 100px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', width / 2, height - 195);

  ctx.font = 'bold 68px "Bodoni 72"';
  ctx.fillStyle = darkBurgundy;
  ctx.fillText('With God at the Center', width / 2, height - 100);

  // === SAVE OUTPUT ===
  const outputDir = '/Users/matthewriley/EtsyInnovations/outputs/anniversary';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '50th_anniversary_table_placement.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ Table placement saved to: ${outputPath}`);
  console.log(`  Dimensions: ${width}x${height}px`);
  console.log(`  Print size: 5.5x8.5 inches at 300dpi`);

  return outputPath;
}

generateTablePlacement().catch(console.error);
