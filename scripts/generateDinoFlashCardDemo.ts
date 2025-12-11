/**
 * Dinosaur-Themed Flash Card Demo
 *
 * Proves we can deliver on the "themed flash cards" promise
 */

import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

// Dinosaur color palette - fun but educational
const COLORS = {
  dinoGreen: '#5DAB8B',
  dinoOrange: '#E8946A',
  dinoBlue: '#4A93B8',
  dinoYellow: '#E8C55A',
  dinoPurple: '#9B7BB8',
  bg: '#F5F9F7',
  bgAlt: '#E8F4EE',
  text: '#2D4035',
  textMuted: '#5A7065',
  white: '#FFFFFF'
};

// Simple dinosaur silhouette SVG paths
function dinoStegosaurus(x: number, y: number, scale: number, color: string): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Body -->
      <ellipse cx="50" cy="35" rx="40" ry="20" fill="${color}"/>
      <!-- Head -->
      <ellipse cx="95" cy="30" rx="12" ry="10" fill="${color}"/>
      <!-- Neck -->
      <rect x="80" y="25" width="15" height="15" fill="${color}"/>
      <!-- Legs -->
      <rect x="25" y="45" width="8" height="20" rx="3" fill="${color}"/>
      <rect x="45" y="45" width="8" height="20" rx="3" fill="${color}"/>
      <rect x="55" y="45" width="8" height="20" rx="3" fill="${color}"/>
      <rect x="70" y="45" width="8" height="20" rx="3" fill="${color}"/>
      <!-- Tail -->
      <path d="M10,35 Q-5,30 5,25 Q15,35 10,35" fill="${color}"/>
      <!-- Plates on back -->
      <path d="M20,15 L25,5 L30,15" fill="${color}"/>
      <path d="M35,10 L42,0 L49,10" fill="${color}"/>
      <path d="M52,12 L58,3 L64,12" fill="${color}"/>
      <path d="M67,15 L72,7 L77,15" fill="${color}"/>
      <!-- Eye -->
      <circle cx="98" cy="28" r="3" fill="${COLORS.white}"/>
      <circle cx="99" cy="28" r="1.5" fill="${COLORS.text}"/>
    </g>
  `;
}

function dinoTrex(x: number, y: number, scale: number, color: string): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Body -->
      <ellipse cx="40" cy="30" rx="30" ry="20" fill="${color}"/>
      <!-- Head (big!) -->
      <ellipse cx="80" cy="15" rx="20" ry="15" fill="${color}"/>
      <!-- Jaw -->
      <path d="M65,20 L100,25 L100,30 L70,25 Z" fill="${color}"/>
      <!-- Teeth -->
      <path d="M75,25 L77,30 L79,25 L81,30 L83,25 L85,30 L87,25 L89,30 L91,25" stroke="${COLORS.white}" stroke-width="2" fill="none"/>
      <!-- Neck -->
      <path d="M55,20 Q65,10 70,15" fill="${color}"/>
      <!-- Tiny arms -->
      <path d="M50,35 L55,45 L52,47" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- Legs -->
      <rect x="25" y="42" width="12" height="25" rx="4" fill="${color}"/>
      <rect x="45" y="42" width="12" height="25" rx="4" fill="${color}"/>
      <!-- Tail -->
      <path d="M10,30 Q-10,25 0,20 Q15,30 10,30" fill="${color}"/>
      <!-- Eye -->
      <circle cx="85" cy="12" r="4" fill="${COLORS.white}"/>
      <circle cx="86" cy="12" r="2" fill="${COLORS.text}"/>
    </g>
  `;
}

function dinoBronto(x: number, y: number, scale: number, color: string): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Body -->
      <ellipse cx="50" cy="45" rx="35" ry="22" fill="${color}"/>
      <!-- Long neck -->
      <path d="M75,35 Q90,20 95,5 Q100,0 105,5" stroke="${color}" stroke-width="15" fill="none" stroke-linecap="round"/>
      <!-- Head -->
      <ellipse cx="108" cy="8" rx="10" ry="7" fill="${color}"/>
      <!-- Legs -->
      <rect x="25" y="58" width="10" height="22" rx="4" fill="${color}"/>
      <rect x="42" y="58" width="10" height="22" rx="4" fill="${color}"/>
      <rect x="55" y="58" width="10" height="22" rx="4" fill="${color}"/>
      <rect x="70" y="58" width="10" height="22" rx="4" fill="${color}"/>
      <!-- Tail -->
      <path d="M15,45 Q-10,40 -5,35 Q5,40 15,45" fill="${color}"/>
      <!-- Eye -->
      <circle cx="112" cy="6" r="2.5" fill="${COLORS.white}"/>
      <circle cx="113" cy="6" r="1.2" fill="${COLORS.text}"/>
    </g>
  `;
}

function dinoTriceratops(x: number, y: number, scale: number, color: string): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Body -->
      <ellipse cx="45" cy="35" rx="35" ry="22" fill="${color}"/>
      <!-- Head/Frill -->
      <circle cx="90" cy="25" r="22" fill="${color}"/>
      <circle cx="90" cy="25" r="16" fill="${color}" opacity="0.7"/>
      <!-- Face -->
      <ellipse cx="105" cy="35" rx="12" ry="10" fill="${color}"/>
      <!-- Horns -->
      <path d="M95,15 L100,0 L98,15" fill="${color}"/>
      <path d="M85,18 L78,5 L82,18" fill="${color}"/>
      <path d="M108,30 L120,28 L110,33" fill="${color}"/>
      <!-- Legs -->
      <rect x="20" y="48" width="10" height="20" rx="4" fill="${color}"/>
      <rect x="38" y="48" width="10" height="20" rx="4" fill="${color}"/>
      <rect x="52" y="48" width="10" height="20" rx="4" fill="${color}"/>
      <rect x="68" y="48" width="10" height="20" rx="4" fill="${color}"/>
      <!-- Tail -->
      <path d="M10,35 Q0,30 5,25 Q12,32 10,35" fill="${color}"/>
      <!-- Eye -->
      <circle cx="108" cy="33" r="3" fill="${COLORS.white}"/>
      <circle cx="109" cy="33" r="1.5" fill="${COLORS.text}"/>
    </g>
  `;
}

function footprint(x: number, y: number, size: number, color: string, rotation: number = 0): string {
  return `
    <g transform="translate(${x}, ${y}) rotate(${rotation})">
      <ellipse cx="0" cy="0" rx="${size * 0.6}" ry="${size}" fill="${color}" opacity="0.15"/>
      <ellipse cx="${-size * 0.5}" cy="${-size * 0.8}" rx="${size * 0.2}" ry="${size * 0.35}" fill="${color}" opacity="0.15"/>
      <ellipse cx="0" cy="${-size * 1.1}" rx="${size * 0.2}" ry="${size * 0.35}" fill="${color}" opacity="0.15"/>
      <ellipse cx="${size * 0.5}" cy="${-size * 0.8}" rx="${size * 0.2}" ry="${size * 0.35}" fill="${color}" opacity="0.15"/>
    </g>
  `;
}

async function generateDinoFlashCards(): Promise<Buffer> {
  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.bg}"/>
        <stop offset="100%" style="stop-color:${COLORS.bgAlt}"/>
      </linearGradient>
      <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="20" stdDeviation="40" flood-color="rgba(45,64,53,0.15)"/>
      </filter>
      <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="rgba(45,64,53,0.12)"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGrad)"/>

    <!-- Scattered footprints -->
    ${footprint(150, 200, 30, COLORS.dinoGreen, -20)}
    ${footprint(1800, 300, 25, COLORS.dinoOrange, 15)}
    ${footprint(200, 1700, 28, COLORS.dinoBlue, -10)}
    ${footprint(1850, 1600, 32, COLORS.dinoPurple, 25)}

    <!-- Header -->
    <rect x="200" y="60" width="1600" height="140" rx="24" fill="${COLORS.dinoGreen}" filter="url(#softShadow)"/>
    ${dinoTrex(250, 65, 1.0, COLORS.white)}
    <text x="1000" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${COLORS.white}">DINO MATH CARDS</text>
    ${dinoStegosaurus(1550, 70, 0.9, COLORS.white)}

    <!-- Card 1: Addition with Stegosaurus -->
    <g transform="translate(80, 280)">
      <rect x="0" y="0" width="580" height="420" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="580" height="90" rx="28 28 0 0" fill="${COLORS.dinoGreen}"/>
      <text x="290" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}">ADDITION</text>

      ${dinoStegosaurus(40, 120, 1.5, COLORS.dinoGreen)}

      <text x="290" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="85" font-weight="900" fill="${COLORS.text}">3 + 4 = ?</text>

      <!-- Dino decoration -->
      ${footprint(500, 370, 20, COLORS.dinoGreen, 15)}
    </g>

    <!-- Card 2: Subtraction with T-Rex -->
    <g transform="translate(710, 280)">
      <rect x="0" y="0" width="580" height="420" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="580" height="90" rx="28 28 0 0" fill="${COLORS.dinoOrange}"/>
      <text x="290" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}">SUBTRACTION</text>

      ${dinoTrex(380, 110, 1.4, COLORS.dinoOrange)}

      <text x="290" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="85" font-weight="900" fill="${COLORS.text}">9 - 5 = ?</text>

      ${footprint(80, 370, 18, COLORS.dinoOrange, -10)}
    </g>

    <!-- Card 3: Counting with Brontosaurus -->
    <g transform="translate(1340, 280)">
      <rect x="0" y="0" width="580" height="420" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="580" height="90" rx="28 28 0 0" fill="${COLORS.dinoBlue}"/>
      <text x="290" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}">COUNTING</text>

      ${dinoBronto(180, 100, 1.3, COLORS.dinoBlue)}

      <text x="290" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="70" font-weight="900" fill="${COLORS.text}">How many</text>
      <text x="290" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="70" font-weight="900" fill="${COLORS.text}">legs? ____</text>
    </g>

    <!-- Card 4: Multiplication with Triceratops -->
    <g transform="translate(235, 760)">
      <rect x="0" y="0" width="580" height="420" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="580" height="90" rx="28 28 0 0" fill="${COLORS.dinoPurple}"/>
      <text x="290" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}">MULTIPLY</text>

      ${dinoTriceratops(30, 115, 1.4, COLORS.dinoPurple)}

      <text x="290" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="85" font-weight="900" fill="${COLORS.text}">2 × 6 = ?</text>

      ${footprint(510, 360, 18, COLORS.dinoPurple, 20)}
    </g>

    <!-- Card 5: Word Problem -->
    <g transform="translate(865, 760)">
      <rect x="0" y="0" width="820" height="420" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
      <rect x="0" y="0" width="820" height="90" rx="28 28 0 0" fill="${COLORS.dinoYellow}"/>
      <text x="410" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.text}">DINO WORD PROBLEM</text>

      ${dinoTrex(50, 115, 1.0, COLORS.dinoYellow)}
      ${dinoBronto(600, 100, 1.0, COLORS.dinoYellow)}

      <text x="410" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="${COLORS.text}">Rex found 5 bones.</text>
      <text x="410" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="${COLORS.text}">Bronto gave him 3 more.</text>
      <text x="410" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="${COLORS.text}">How many bones now?</text>
    </g>

    <!-- Footer banner -->
    <rect x="100" y="1280" width="1800" height="200" rx="28" fill="${COLORS.white}" filter="url(#cardShadow)"/>
    <rect x="100" y="1280" width="1800" height="14" rx="7 7 0 0" fill="${COLORS.dinoGreen}"/>

    ${dinoStegosaurus(180, 1330, 1.2, COLORS.dinoGreen)}
    ${dinoTriceratops(450, 1340, 1.0, COLORS.dinoOrange)}
    ${dinoBronto(700, 1320, 1.0, COLORS.dinoBlue)}
    ${dinoTrex(1000, 1340, 1.0, COLORS.dinoPurple)}

    <text x="1450" y="1400" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="700" fill="${COLORS.text}">Themed For Your</text>
    <text x="1450" y="1455" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="700" fill="${COLORS.dinoGreen}">Dino-Loving Learner!</text>

    <!-- Bottom info -->
    <rect x="100" y="1560" width="1800" height="350" rx="28" fill="${COLORS.dinoGreen}" opacity="0.12"/>
    <text x="1000" y="1660" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="600" fill="${COLORS.text}">Custom Flash Cards - Dinosaur Theme</text>
    <text x="1000" y="1740" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="${COLORS.textMuted}">Every card features friendly dinosaurs to keep learning fun!</text>
    <text x="1000" y="1820" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="${COLORS.textMuted}">Math • Reading • Vocabulary • Phonics - all with dinos!</text>

    <!-- Corner dinos -->
    ${dinoStegosaurus(50, 1800, 0.8, COLORS.dinoGreen)}
    ${dinoTrex(1800, 1820, 0.7, COLORS.dinoOrange)}
  </svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

async function main() {
  console.log('Generating Dinosaur-Themed Flash Card Demo...');

  const buffer = await generateDinoFlashCards();
  const outputPath = path.join(__dirname, '..', 'listing_packets', 'flash_cards', 'images', 'dino_theme_demo.png');

  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Saved to ${outputPath}`);
  console.log(`  Size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)}KB`);
}

main().catch(console.error);
