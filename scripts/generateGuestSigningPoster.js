const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', { family: 'Bodoni 72 Smallcaps' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

async function generateGuestSigningPoster() {
  // 24x36 inches at 300dpi = 7200x10800 pixels
  const width = 7200;
  const height = 10800;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND: Rich gold/champagne gradient with texture ===
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#F5E6C8');
  bgGradient.addColorStop(0.3, '#E8D4A8');
  bgGradient.addColorStop(0.5, '#D4AF37');
  bgGradient.addColorStop(0.7, '#E8D4A8');
  bgGradient.addColorStop(1, '#F5E6C8');

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle radial luminosity
  const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.2);
  radialGradient.addColorStop(0, 'rgba(255, 250, 240, 0.3)');
  radialGradient.addColorStop(0.5, 'rgba(255, 250, 240, 0.1)');
  radialGradient.addColorStop(1, 'rgba(180, 150, 100, 0.2)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle texture/noise
  for (let i = 0; i < 200000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // === COLORS ===
  const burgundy = '#8B1A1A';
  const darkBurgundy = '#6B0F0F';
  const gold = '#D4AF37';

  // === HEADER TEXT ===
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Happy" in Snell Roundhand
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 480px "Snell Roundhand"';
  ctx.fillText('Happy', width/2, 500);

  // "50th" in Bodoni 72
  ctx.font = '900px "Bodoni 72"';
  ctx.fillText('50th', width/2, 1250);

  // "Wedding Anniversary" in Snell Roundhand
  ctx.font = 'italic 420px "Snell Roundhand"';
  ctx.fillText('Wedding Anniversary', width/2, 1950);

  // Date subheading
  ctx.fillStyle = darkBurgundy;
  ctx.font = '200px "Bodoni 72"';
  ctx.fillText('Sunday, December 21, 2025', width/2, 2350);

  // === DECORATIVE BORDER FOR SIGNING AREA - LARGER ===
  const signingAreaTop = 2600;
  const signingAreaHeight = 6400;
  const signingAreaBottom = signingAreaTop + signingAreaHeight;

  // Elegant gold border for signing area
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
  ctx.lineWidth = 28;
  ctx.strokeRect(300, signingAreaTop, width - 600, signingAreaHeight);

  // Inner glow line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 8;
  ctx.strokeRect(328, signingAreaTop + 28, width - 656, signingAreaHeight - 56);

  // Outer subtle shadow line
  ctx.strokeStyle = 'rgba(180, 150, 80, 0.3)';
  ctx.lineWidth = 12;
  ctx.strokeRect(272, signingAreaTop - 28, width - 544, signingAreaHeight + 56);

  // === "Please Sign Below" text in signing area ===
  ctx.fillStyle = 'rgba(139, 26, 26, 0.25)';
  ctx.font = 'italic 180px "Snell Roundhand"';
  ctx.fillText('Please sign your well wishes below', width/2, signingAreaTop + 300);

  // === NAMES (Below signing area) - moved down further ===
  const namesY = signingAreaBottom + 380;

  ctx.fillStyle = burgundy;
  ctx.font = 'bold italic 300px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', width/2, namesY);

  // === SCRIPTURE TEXT (Bottom) ===
  const scriptureY = namesY + 280;

  // Decorative gold line above scripture
  ctx.strokeStyle = gold;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(width/2 - 1400, scriptureY - 100);
  ctx.lineTo(width/2 + 1400, scriptureY - 100);
  ctx.stroke();

  // Diamond accent
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(width/2, scriptureY - 145);
  ctx.lineTo(width/2 + 50, scriptureY - 100);
  ctx.lineTo(width/2, scriptureY - 55);
  ctx.lineTo(width/2 - 50, scriptureY - 100);
  ctx.closePath();
  ctx.fill();

  // Quote in Snell Roundhand
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 240px "Snell Roundhand"';
  ctx.fillText('"Two are better than one...', width/2, scriptureY + 60);
  ctx.fillText('a cord of three strands is not quickly broken."', width/2, scriptureY + 350);

  // Reference in Bodoni
  ctx.font = '180px "Bodoni 72"';
  ctx.fillStyle = darkBurgundy;
  ctx.fillText('— ECCLESIASTES 4:9, 12', width/2, scriptureY + 620);

  // === SAVE OUTPUT ===
  const outputDir = '/Users/matthewriley/EtsyInnovations/outputs/anniversary';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '50th_anniversary_guest_signing_24x36.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ Guest Signing Poster saved to: ${outputPath}`);
  console.log(`  Dimensions: ${width}x${height}px`);
  console.log(`  Print size: 24x36 inches at 300dpi`);

  return outputPath;
}

generateGuestSigningPoster().catch(console.error);
