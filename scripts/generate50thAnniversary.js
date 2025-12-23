const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register fonts
registerFont('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', { family: 'Snell Roundhand' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72 Smallcaps Book.ttf', { family: 'Bodoni 72 Smallcaps' });
registerFont('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', { family: 'Bodoni 72' });

async function generate50thAnniversary(printVersion = false) {
  // Canvas dimensions
  // Instagram: 1080x1350, Print: 11x14 at 300dpi = 3300x4200
  const width = printVersion ? 3300 : 1080;
  const height = printVersion ? 4200 : 1350;
  const scale = printVersion ? 3.06 : 1; // Scale factor for print

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND: Rich gold/champagne gradient with texture ===
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#F5E6C8');      // Light champagne
  bgGradient.addColorStop(0.3, '#E8D4A8');    // Warm gold
  bgGradient.addColorStop(0.5, '#D4AF37');    // Rich gold
  bgGradient.addColorStop(0.7, '#E8D4A8');    // Warm gold
  bgGradient.addColorStop(1, '#F5E6C8');      // Light champagne

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
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.03;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // === COLORS ===
  const burgundy = '#8B1A1A';  // Deep burgundy/crimson
  const darkBurgundy = '#6B0F0F';
  const gold = '#D4AF37';

  // === HEADER TEXT ===
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Happy" in Snell Roundhand
  ctx.fillStyle = burgundy;
  ctx.font = `italic ${Math.round(52 * scale)}px "Snell Roundhand"`;
  ctx.fillText('Happy', width/2, Math.round(55 * scale));

  // "50th" in Bodoni 72 (large, prominent)
  ctx.font = `${Math.round(90 * scale)}px "Bodoni 72"`;
  ctx.fillText('50th', width/2, Math.round(130 * scale));

  // "Wedding Anniversary" in Snell Roundhand
  ctx.font = `italic ${Math.round(48 * scale)}px "Snell Roundhand"`;
  ctx.fillText('Wedding Anniversary', width/2, Math.round(195 * scale));

  // Date subheading
  ctx.fillStyle = darkBurgundy;
  ctx.font = `${Math.round(24 * scale)}px "Bodoni 72"`;
  ctx.fillText('Sunday, December 21, 2025', width/2, Math.round(240 * scale));

  // === LOAD PHOTOS ===
  const photo1975Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image (1).jpeg';
  const photo2025Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image.jpeg';

  const photo1975 = await loadImage(photo1975Path);
  const photo2025 = await loadImage(photo2025Path);

  // === PHOTO AREA ===
  const photoAreaTop = Math.round(270 * scale);
  const photoAreaHeight = Math.round(820 * scale);
  const photoAreaBottom = photoAreaTop + photoAreaHeight;

  // Create off-screen canvases for photo processing
  const photoCanvas = createCanvas(width, photoAreaHeight);
  const photoCtx = photoCanvas.getContext('2d');

  // Calculate photo dimensions to fill their halves while maintaining aspect ratio
  const halfWidth = width / 2;

  // 1975 photo (portrait) - left side
  const photo1975Ratio = photo1975.width / photo1975.height;
  let draw1975Width, draw1975Height, draw1975X, draw1975Y;

  // Fill the left half, crop as needed
  if (photo1975Ratio < halfWidth / photoAreaHeight) {
    // Photo is taller than space, fit to width
    draw1975Width = halfWidth + Math.round(100 * scale); // Extra for blending overlap
    draw1975Height = draw1975Width / photo1975Ratio;
    draw1975X = 0;
    draw1975Y = (photoAreaHeight - draw1975Height) / 2;
  } else {
    // Photo is wider than space, fit to height
    draw1975Height = photoAreaHeight;
    draw1975Width = draw1975Height * photo1975Ratio;
    draw1975X = 0;
    draw1975Y = 0;
  }

  // 2025 photo (landscape) - right side
  // This photo is landscape, we need to show the couple centered
  const photo2025Ratio = photo2025.width / photo2025.height;
  let draw2025Width, draw2025Height, draw2025X, draw2025Y;

  // Fill height and position to show couple well on right side
  draw2025Height = photoAreaHeight;
  draw2025Width = draw2025Height * photo2025Ratio;
  // Position to center the couple in the right half with slight overlap
  draw2025X = halfWidth - Math.round(280 * scale) - (draw2025Width - width) / 2;
  draw2025Y = 0;

  // Draw 2025 photo first (right side, will be under the blend)
  photoCtx.save();
  photoCtx.drawImage(photo2025, draw2025X, draw2025Y, draw2025Width, draw2025Height);
  photoCtx.restore();

  // Create gradient mask for blending - wider, smoother transition
  const blendStart = halfWidth - Math.round(100 * scale);
  const blendEnd = halfWidth + Math.round(200 * scale);
  const blendGradient = photoCtx.createLinearGradient(blendStart, 0, blendEnd, 0);
  blendGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  blendGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.9)');
  blendGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
  blendGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
  blendGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  // Draw 1975 photo with gradient mask (left side)
  const tempCanvas = createCanvas(width, photoAreaHeight);
  const tempCtx = tempCanvas.getContext('2d');

  // Draw 1975 photo on temp canvas
  tempCtx.drawImage(photo1975, draw1975X, draw1975Y, draw1975Width, draw1975Height);

  // Apply gradient mask
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.fillStyle = blendGradient;
  tempCtx.fillRect(0, 0, width, photoAreaHeight);

  // Composite onto photo canvas
  photoCtx.drawImage(tempCanvas, 0, 0);

  // Add a soft gold/champagne vertical gradient in the blend zone for elegance
  const blendZone = Math.round(50 * scale);
  const blendOverlay = photoCtx.createLinearGradient(halfWidth - blendZone, 0, halfWidth + blendZone, 0);
  blendOverlay.addColorStop(0, 'rgba(232, 212, 168, 0)');
  blendOverlay.addColorStop(0.5, 'rgba(232, 212, 168, 0.15)');
  blendOverlay.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = blendOverlay;
  photoCtx.fillRect(halfWidth - Math.round(80 * scale), 0, Math.round(160 * scale), photoAreaHeight);

  // Add soft vignette edges
  const vignetteSize = Math.round(60 * scale);
  const vignetteGradientTop = photoCtx.createLinearGradient(0, 0, 0, vignetteSize);
  vignetteGradientTop.addColorStop(0, 'rgba(232, 212, 168, 1)');
  vignetteGradientTop.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = vignetteGradientTop;
  photoCtx.fillRect(0, 0, width, vignetteSize);

  const vignetteGradientBottom = photoCtx.createLinearGradient(0, photoAreaHeight - vignetteSize, 0, photoAreaHeight);
  vignetteGradientBottom.addColorStop(0, 'rgba(232, 212, 168, 0)');
  vignetteGradientBottom.addColorStop(1, 'rgba(232, 212, 168, 1)');
  photoCtx.fillStyle = vignetteGradientBottom;
  photoCtx.fillRect(0, photoAreaHeight - vignetteSize, width, vignetteSize);

  const vignetteSide = Math.round(40 * scale);
  const vignetteGradientLeft = photoCtx.createLinearGradient(0, 0, vignetteSide, 0);
  vignetteGradientLeft.addColorStop(0, 'rgba(232, 212, 168, 1)');
  vignetteGradientLeft.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = vignetteGradientLeft;
  photoCtx.fillRect(0, 0, vignetteSide, photoAreaHeight);

  const vignetteGradientRight = photoCtx.createLinearGradient(width - vignetteSide, 0, width, 0);
  vignetteGradientRight.addColorStop(0, 'rgba(232, 212, 168, 0)');
  vignetteGradientRight.addColorStop(1, 'rgba(232, 212, 168, 1)');
  photoCtx.fillStyle = vignetteGradientRight;
  photoCtx.fillRect(width - vignetteSide, 0, vignetteSide, photoAreaHeight);

  // Draw the photo composite onto main canvas
  ctx.drawImage(photoCanvas, 0, photoAreaTop);

  // Add subtle gold border/frame effect
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = Math.round(3 * scale);
  ctx.strokeRect(Math.round(25 * scale), photoAreaTop + Math.round(15 * scale), width - Math.round(50 * scale), photoAreaHeight - Math.round(30 * scale));

  // Inner glow line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = Math.round(1 * scale);
  ctx.strokeRect(Math.round(28 * scale), photoAreaTop + Math.round(18 * scale), width - Math.round(56 * scale), photoAreaHeight - Math.round(36 * scale));

  // === SCRIPTURE TEXT (Bottom) ===
  const scriptureY = photoAreaBottom + Math.round(45 * scale);

  // Quote in Snell Roundhand (italic script)
  ctx.fillStyle = burgundy;
  ctx.font = `italic ${Math.round(26 * scale)}px "Snell Roundhand"`;
  ctx.fillText('"Two are better than one...', width/2, scriptureY);
  ctx.fillText('a cord of three strands is not quickly broken."', width/2, scriptureY + Math.round(35 * scale));

  // Reference in Bodoni small caps
  ctx.font = `${Math.round(18 * scale)}px "Bodoni 72"`;
  ctx.fillStyle = darkBurgundy;
  ctx.fillText('— ECCLESIASTES 4:9, 12', width/2, scriptureY + Math.round(75 * scale));

  // === DECORATIVE ELEMENTS ===
  // Add subtle gold flourish/divider above scripture
  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.round(1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(width/2 - Math.round(150 * scale), photoAreaBottom + Math.round(15 * scale));
  ctx.lineTo(width/2 + Math.round(150 * scale), photoAreaBottom + Math.round(15 * scale));
  ctx.stroke();

  // Small diamond accent
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(width/2, photoAreaBottom + Math.round(10 * scale));
  ctx.lineTo(width/2 + Math.round(6 * scale), photoAreaBottom + Math.round(15 * scale));
  ctx.lineTo(width/2, photoAreaBottom + Math.round(20 * scale));
  ctx.lineTo(width/2 - Math.round(6 * scale), photoAreaBottom + Math.round(15 * scale));
  ctx.closePath();
  ctx.fill();

  // === SAVE OUTPUT ===
  const outputDir = '/Users/matthewriley/EtsyInnovations/outputs/anniversary';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const suffix = printVersion ? '_print_11x14_300dpi' : '_instagram';
  const outputPath = path.join(outputDir, `50th_anniversary${suffix}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ Anniversary graphic saved to: ${outputPath}`);
  console.log(`  Dimensions: ${width}x${height}px`);
  if (printVersion) {
    console.log(`  Print size: 11x14 inches at 300dpi`);
  }

  return outputPath;
}

async function generate24x36Poster() {
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

  // === HEADER TEXT (VERY LARGE for older crowd on 24x36 poster) ===
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Happy" in Snell Roundhand - VERY LARGE
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 480px "Snell Roundhand"';
  ctx.fillText('Happy', width/2, 500);

  // "50th" in Bodoni 72 - MASSIVE
  ctx.font = '900px "Bodoni 72"';
  ctx.fillText('50th', width/2, 1250);

  // "Wedding Anniversary" in Snell Roundhand - VERY LARGE
  ctx.font = 'italic 420px "Snell Roundhand"';
  ctx.fillText('Wedding Anniversary', width/2, 1950);

  // Date subheading - LARGE
  ctx.fillStyle = darkBurgundy;
  ctx.font = '200px "Bodoni 72"';
  ctx.fillText('Sunday, December 21, 2025', width/2, 2350);

  // === LOAD PHOTOS ===
  const photo1975Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image (1).jpeg';
  const photo2025Path = '/Users/matthewriley/EtsyInnovations/50 Anniversary /Image.jpeg';

  const photo1975 = await loadImage(photo1975Path);
  const photo2025 = await loadImage(photo2025Path);

  // === PHOTO AREA (maximize photo size) ===
  const photoAreaTop = 2550;
  const photoAreaHeight = 6100;
  const photoAreaBottom = photoAreaTop + photoAreaHeight;

  // Create off-screen canvases for photo processing
  const photoCanvas = createCanvas(width, photoAreaHeight);
  const photoCtx = photoCanvas.getContext('2d');

  const halfWidth = width / 2;

  // 1975 photo (portrait) - left side, show full couple
  const photo1975Ratio = photo1975.width / photo1975.height;
  let draw1975Width, draw1975Height, draw1975X, draw1975Y;

  draw1975Height = photoAreaHeight;
  draw1975Width = draw1975Height * photo1975Ratio;
  // Position further left to show more of the wedding photo
  draw1975X = -200;
  draw1975Y = 0;

  // 2025 photo (landscape) - right side
  const photo2025Ratio = photo2025.width / photo2025.height;
  let draw2025Width, draw2025Height, draw2025X, draw2025Y;

  draw2025Height = photoAreaHeight;
  draw2025Width = draw2025Height * photo2025Ratio;
  // Position 2025 couple - balanced to show both wife and husband
  draw2025X = halfWidth - 2350;
  draw2025Y = 0;

  // Draw 2025 photo first
  photoCtx.save();
  photoCtx.drawImage(photo2025, draw2025X, draw2025Y, draw2025Width, draw2025Height);
  photoCtx.restore();

  // Create gradient mask for blending - tighter blend zone so 2025 photo is crisp
  const blendStart = halfWidth - 400;
  const blendEnd = halfWidth + 300;
  const blendGradient = photoCtx.createLinearGradient(blendStart, 0, blendEnd, 0);
  blendGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  blendGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
  blendGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  // Draw 1975 photo with gradient mask
  const tempCanvas = createCanvas(width, photoAreaHeight);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(photo1975, draw1975X, draw1975Y, draw1975Width, draw1975Height);
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.fillStyle = blendGradient;
  tempCtx.fillRect(0, 0, width, photoAreaHeight);
  photoCtx.drawImage(tempCanvas, 0, 0);

  // Add very subtle gold overlay only in the blend seam area
  const blendOverlay = photoCtx.createLinearGradient(halfWidth - 200, 0, halfWidth + 200, 0);
  blendOverlay.addColorStop(0, 'rgba(232, 212, 168, 0)');
  blendOverlay.addColorStop(0.5, 'rgba(232, 212, 168, 0.08)');
  blendOverlay.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = blendOverlay;
  photoCtx.fillRect(halfWidth - 250, 0, 500, photoAreaHeight);

  // Add minimal soft vignette edges - just enough to blend into background
  const vignetteSize = 150;
  const vignetteGradientTop = photoCtx.createLinearGradient(0, 0, 0, vignetteSize);
  vignetteGradientTop.addColorStop(0, 'rgba(232, 212, 168, 1)');
  vignetteGradientTop.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = vignetteGradientTop;
  photoCtx.fillRect(0, 0, width, vignetteSize);

  const vignetteGradientBottom = photoCtx.createLinearGradient(0, photoAreaHeight - vignetteSize, 0, photoAreaHeight);
  vignetteGradientBottom.addColorStop(0, 'rgba(232, 212, 168, 0)');
  vignetteGradientBottom.addColorStop(1, 'rgba(232, 212, 168, 1)');
  photoCtx.fillStyle = vignetteGradientBottom;
  photoCtx.fillRect(0, photoAreaHeight - vignetteSize, width, vignetteSize);

  const vignetteSide = 100;
  const vignetteGradientLeft = photoCtx.createLinearGradient(0, 0, vignetteSide, 0);
  vignetteGradientLeft.addColorStop(0, 'rgba(232, 212, 168, 1)');
  vignetteGradientLeft.addColorStop(1, 'rgba(232, 212, 168, 0)');
  photoCtx.fillStyle = vignetteGradientLeft;
  photoCtx.fillRect(0, 0, vignetteSide, photoAreaHeight);

  const vignetteGradientRight = photoCtx.createLinearGradient(width - vignetteSide, 0, width, 0);
  vignetteGradientRight.addColorStop(0, 'rgba(232, 212, 168, 0)');
  vignetteGradientRight.addColorStop(1, 'rgba(232, 212, 168, 1)');
  photoCtx.fillStyle = vignetteGradientRight;
  photoCtx.fillRect(width - vignetteSide, 0, vignetteSide, photoAreaHeight);

  // Draw the photo composite onto main canvas
  ctx.drawImage(photoCanvas, 0, photoAreaTop);

  // Add elegant gold border/frame effect
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
  ctx.lineWidth = 28;
  ctx.strokeRect(120, photoAreaTop + 80, width - 240, photoAreaHeight - 160);

  // Inner glow line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 8;
  ctx.strokeRect(148, photoAreaTop + 108, width - 296, photoAreaHeight - 216);

  // Outer subtle shadow line
  ctx.strokeStyle = 'rgba(180, 150, 80, 0.3)';
  ctx.lineWidth = 12;
  ctx.strokeRect(92, photoAreaTop + 52, width - 184, photoAreaHeight - 104);

  // === NAMES (Below photos) - moved down
  const namesY = photoAreaBottom + 320;

  ctx.fillStyle = burgundy;
  ctx.font = 'bold italic 300px "Snell Roundhand"';
  ctx.fillText('Matthew & Elizabeth Riley', width/2, namesY);

  // === SCRIPTURE TEXT (Bottom) - LARGE ===
  const scriptureY = namesY + 300;

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

  // Quote in Snell Roundhand - LARGE
  ctx.fillStyle = burgundy;
  ctx.font = 'italic 240px "Snell Roundhand"';
  ctx.fillText('"Two are better than one...', width/2, scriptureY + 60);
  ctx.fillText('a cord of three strands is not quickly broken."', width/2, scriptureY + 350);

  // Reference in Bodoni - LARGE
  ctx.font = '180px "Bodoni 72"';
  ctx.fillStyle = darkBurgundy;
  ctx.fillText('— ECCLESIASTES 4:9, 12', width/2, scriptureY + 620);

  // === SAVE OUTPUT ===
  const outputDir = '/Users/matthewriley/EtsyInnovations/outputs/anniversary';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '50th_anniversary_poster_24x36_300dpi.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ 24x36 Poster saved to: ${outputPath}`);
  console.log(`  Dimensions: ${width}x${height}px`);
  console.log(`  Print size: 24x36 inches at 300dpi`);

  return outputPath;
}

async function main() {
  // Generate 24x36 Poster version
  console.log('Generating 24x36 Poster version (300dpi)...');
  await generate24x36Poster();

  console.log('\n✓ Poster complete!');
}

main().catch(console.error);
