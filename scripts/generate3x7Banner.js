const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', { family: 'Bodoni 72 Smallcaps' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

async function generate3x7Banner() {
  // 3 feet x 7 feet at 300dpi = 10800 x 25200 pixels
  const width = 10800;
  const height = 25200;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND ===
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#F5E6C8');
  bgGradient.addColorStop(0.3, '#E8D4A8');
  bgGradient.addColorStop(0.5, '#D4AF37');
  bgGradient.addColorStop(0.7, '#E8D4A8');
  bgGradient.addColorStop(1, '#F5E6C8');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Radial luminosity
  const radialGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.2);
  radialGradient.addColorStop(0, 'rgba(255, 250, 240, 0.3)');
  radialGradient.addColorStop(0.5, 'rgba(255, 250, 240, 0.1)');
  radialGradient.addColorStop(1, 'rgba(180, 150, 100, 0.2)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle texture
  for (let i = 0; i < 500000; i++) {
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

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // === LOAD PHOTOS FIRST to calculate layout ===
  const photo1975Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image (1).jpeg';
  const photo2025Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image.jpeg';

  const photo1975 = await loadImage(photo1975Path);
  const photo2025 = await loadImage(photo2025Path);

  // Calculate aspect ratios
  const photo1975Ratio = photo1975.width / photo1975.height;
  const photo2025Ratio = photo2025.width / photo2025.height;

  // === LAYOUT - fit everything on canvas ===
  // Total: 25200px
  // Header: 4000px
  // Photo 1: 10500px (wedding photo - portrait, needs more height)
  // Overlap: 1500px (elegant transition zone)
  // Photo 2: 7500px (2025 photo - landscape)
  // Footer: 4700px
  // Total: 4000 + 10500 - 1500 + 7500 + 4700 = 25200 ✓

  const headerHeight = 4000;
  const photo1MaxHeight = 10500;
  const transitionOverlap = 1500;
  const photo2MaxHeight = 7500;

  // Scale photos to fit their allocated heights while filling width where possible
  let photo1Width, photo1Height, photo1X;
  let photo2Width, photo2Height, photo2X;

  // Photo 1 (portrait) - fit to height, may be narrower than canvas
  photo1Height = photo1MaxHeight;
  photo1Width = photo1Height * photo1975Ratio;
  photo1X = (width - photo1Width) / 2; // Center horizontally

  // Photo 2 (landscape) - fit to width, may not fill full height
  photo2Width = width;
  photo2Height = width / photo2025Ratio;
  photo2X = 0;

  // If photo 2 is taller than allocated, scale down
  if (photo2Height > photo2MaxHeight) {
    photo2Height = photo2MaxHeight;
    photo2Width = photo2Height * photo2025Ratio;
    photo2X = (width - photo2Width) / 2;
  }

  const photo1Top = headerHeight;
  const photo1Bottom = photo1Top + photo1Height;
  const photo2Top = photo1Bottom - transitionOverlap;
  const photo2Bottom = photo2Top + photo2Height;

  console.log(`Photo 1: ${photo1Width}x${photo1Height}px, x=${photo1X}`);
  console.log(`Photo 2: ${photo2Width}x${photo2Height}px, x=${photo2X}`);
  console.log(`Photo section ends at: ${photo2Bottom}`);

  // === BURGUNDY BORDER ===
  const borderWidth = 100;
  ctx.strokeStyle = burgundy;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(borderWidth/2, borderWidth/2, width - borderWidth, height - borderWidth);

  // Inner gold accent line
  ctx.strokeStyle = gold;
  ctx.lineWidth = 10;
  ctx.strokeRect(borderWidth + 20, borderWidth + 20, width - borderWidth*2 - 40, height - borderWidth*2 - 40);

  // === HEADER - VERY LARGE TEXT with better spacing ===

  // "Happy" - LARGER - moved up
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 900px "Snell Roundhand"';
  ctx.fillText('Happy', width/2, 750);

  // "50th" - LARGER - moved up
  ctx.font = '1600px "Bodoni 72"';
  ctx.fillText('50th', width/2, 1950);

  // "Wedding Anniversary" - LARGER - moved up
  ctx.font = 'italic 750px "Snell Roundhand"';
  ctx.fillText('Wedding Anniversary', width/2, 2950);

  // Date - moved down a bit
  ctx.fillStyle = darkBurgundy;
  ctx.font = '400px "Bodoni 72"';
  ctx.fillText('Sunday, December 21, 2025', width/2, 3600);

  // === 1975 PHOTO ===

  // Draw photo 1 directly on main canvas at centered position
  ctx.drawImage(photo1975, photo1X, photo1Top, photo1Width, photo1Height);

  // Create fade overlays for smooth transitions
  // Top fade (blend with header)
  const topFadeHeight = 400;
  const topFade = ctx.createLinearGradient(0, photo1Top, 0, photo1Top + topFadeHeight);
  topFade.addColorStop(0, 'rgba(232, 212, 168, 1)');
  topFade.addColorStop(1, 'rgba(232, 212, 168, 0)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, photo1Top, width, topFadeHeight);

  // Bottom fade (for transition to photo 2)
  const bottomFadeHeight = transitionOverlap + 500;
  const bottomFade = ctx.createLinearGradient(0, photo1Bottom - bottomFadeHeight, 0, photo1Bottom);
  bottomFade.addColorStop(0, 'rgba(232, 212, 168, 0)');
  bottomFade.addColorStop(1, 'rgba(232, 212, 168, 1)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, photo1Bottom - bottomFadeHeight, width, bottomFadeHeight);

  // Side fades for photo 1
  const sideFade = 200;
  const leftFade = ctx.createLinearGradient(photo1X, 0, photo1X + sideFade, 0);
  leftFade.addColorStop(0, 'rgba(232, 212, 168, 1)');
  leftFade.addColorStop(1, 'rgba(232, 212, 168, 0)');
  ctx.fillStyle = leftFade;
  ctx.fillRect(photo1X, photo1Top, sideFade, photo1Height);

  const rightFade = ctx.createLinearGradient(photo1X + photo1Width - sideFade, 0, photo1X + photo1Width, 0);
  rightFade.addColorStop(0, 'rgba(232, 212, 168, 0)');
  rightFade.addColorStop(1, 'rgba(232, 212, 168, 1)');
  ctx.fillStyle = rightFade;
  ctx.fillRect(photo1X + photo1Width - sideFade, photo1Top, sideFade, photo1Height);

  // === "1975" YEAR LABEL - elegant, in fade zone ===
  const year1975Y = photo1Bottom - 600;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.95)';
  ctx.font = 'italic 600px "Snell Roundhand"';
  ctx.fillText('1975', width/2, year1975Y);

  // === 2025 PHOTO ===

  // Draw photo 2 directly on main canvas
  ctx.drawImage(photo2025, photo2X, photo2Top, photo2Width, photo2Height);

  // Top fade (transition from photo 1) - very short, only at very top edge
  const topFadeHeight2 = 200;
  const topFade2 = ctx.createLinearGradient(0, photo2Top, 0, photo2Top + topFadeHeight2);
  topFade2.addColorStop(0, 'rgba(232, 212, 168, 0.8)');
  topFade2.addColorStop(1, 'rgba(232, 212, 168, 0)');
  ctx.fillStyle = topFade2;
  ctx.fillRect(0, photo2Top, width, topFadeHeight2);

  // No bottom fade - keep faces clear

  // Side fades for photo 2
  const leftFade2 = ctx.createLinearGradient(photo2X, 0, photo2X + sideFade, 0);
  leftFade2.addColorStop(0, 'rgba(232, 212, 168, 1)');
  leftFade2.addColorStop(1, 'rgba(232, 212, 168, 0)');
  ctx.fillStyle = leftFade2;
  ctx.fillRect(photo2X, photo2Top, sideFade, photo2Height);

  const rightFade2 = ctx.createLinearGradient(photo2X + photo2Width - sideFade, 0, photo2X + photo2Width, 0);
  rightFade2.addColorStop(0, 'rgba(232, 212, 168, 0)');
  rightFade2.addColorStop(1, 'rgba(232, 212, 168, 1)');
  ctx.fillStyle = rightFade2;
  ctx.fillRect(photo2X + photo2Width - sideFade, photo2Top, sideFade, photo2Height);

  // === "2025" YEAR LABEL - elegant, in fade zone ===
  const year2025Y = photo2Top + 600;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.95)';
  ctx.font = 'italic 600px "Snell Roundhand"';
  ctx.fillText('2025', width/2, year2025Y);

  // === FOOTER SECTION - Names and Scripture only ===

  // Names - VERY LARGE and BOLD
  const namesY = photo2Bottom + 650;

  // Decorative line above names
  ctx.strokeStyle = gold;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, namesY - 400);
  ctx.lineTo(width * 0.4, namesY - 400);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.6, namesY - 400);
  ctx.lineTo(width * 0.9, namesY - 400);
  ctx.stroke();

  // Diamond
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(width/2, namesY - 500);
  ctx.lineTo(width/2 + 100, namesY - 400);
  ctx.lineTo(width/2, namesY - 300);
  ctx.lineTo(width/2 - 100, namesY - 400);
  ctx.closePath();
  ctx.fill();

  // Names - VERY LARGE and BOLD
  ctx.fillStyle = burgundy;
  ctx.font = 'bold italic 800px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', width/2, namesY);

  // Scripture - moved down more
  const scriptureY = namesY + 1300;

  // Decorative line above scripture
  ctx.strokeStyle = gold;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, scriptureY - 350);
  ctx.lineTo(width * 0.38, scriptureY - 350);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.62, scriptureY - 350);
  ctx.lineTo(width * 0.92, scriptureY - 350);
  ctx.stroke();

  // Diamond
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(width/2, scriptureY - 450);
  ctx.lineTo(width/2 + 100, scriptureY - 350);
  ctx.lineTo(width/2, scriptureY - 250);
  ctx.lineTo(width/2 - 100, scriptureY - 350);
  ctx.closePath();
  ctx.fill();

  // Scripture - LARGE
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 550px "Snell Roundhand"';
  ctx.fillText('"Two are better than one...', width/2, scriptureY + 100);
  ctx.fillText('a cord of three strands is not quickly broken."', width/2, scriptureY + 750);

  // Reference - LARGE
  ctx.font = '450px "Bodoni 72"';
  ctx.fillStyle = darkBurgundy;
  ctx.fillText('— ECCLESIASTES 4:9, 12', width/2, scriptureY + 1350);

  // Bottom decorative line
  ctx.strokeStyle = gold;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height - 200);
  ctx.lineTo(width * 0.92, height - 200);
  ctx.stroke();

  // === SAVE OUTPUT ===
  const outputDir = '/Users/matthewriley/EtsyInnovations/outputs/anniversary';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '50th_anniversary_banner_3x7ft_300dpi.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ 3x7 Banner saved to: ${outputPath}`);
  console.log(`  Dimensions: ${width}x${height}px`);
  console.log(`  Print size: 3ft x 7ft at 300dpi`);

  return outputPath;
}

generate3x7Banner().catch(console.error);
