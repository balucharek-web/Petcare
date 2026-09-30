import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 3 Cute Animal Paws PetCare Icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Emerald Teal to Deep Oceanic Teal -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="42%" stop-color="#0d9488" />
      <stop offset="82%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>

    <!-- Warm Golden Ambient Radial Glow -->
    <radialGradient id="warmGlow" cx="28%" cy="22%" r="72%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.38" />
      <stop offset="45%" stop-color="#34d399" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Paw 1: Main Big Paw (Warm Gold / Amber / Cream) -->
    <linearGradient id="paw1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>

    <!-- Paw 2: Second Paw (Warm Coral / Peach) -->
    <linearGradient id="paw2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#ffe4e6" />
      <stop offset="100%" stop-color="#fecdd3" />
    </linearGradient>

    <!-- Paw 3: Third Lead Paw (Fresh Mint / Ice Teal) -->
    <linearGradient id="paw3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#bae6fd" />
    </linearGradient>

    <!-- Drop Shadows for 3D tactile elevation -->
    <filter id="pawShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#022c22" flood-opacity="0.5" />
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.25" />
    </filter>

    <!-- Reusable 4-toe animal paw template centered at origin -->
    <g id="single-paw">
      <!-- 4 Toe Beans -->
      <ellipse cx="-36" cy="-36" rx="12.5" ry="16" transform="rotate(-28 -36 -36)" />
      <ellipse cx="-12" cy="-54" rx="13.5" ry="18" transform="rotate(-8 -12 -54)" />
      <ellipse cx="15" cy="-54" rx="13.5" ry="18" transform="rotate(8 15 -54)" />
      <ellipse cx="38" cy="-36" rx="12.5" ry="16" transform="rotate(28 38 -36)" />
      <!-- Main Pad with soft ergonomic pet contours -->
      <path d="M 0,26 C -32,26 -46,-4 -34,-22 C -24,-33 -7,-30 0,-18 C 7,-30 24,-33 34,-22 C 46,-4 32,26 0,26 Z" />
    </g>
  </defs>

  <!-- Squircle Base for App Icon -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />
  <rect width="512" height="512" rx="115" fill="url(#warmGlow)" />

  <!-- Subtle Inner Glass Ring -->
  <rect x="12" y="12" width="488" height="488" rx="104" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-opacity="0.22" />

  <!-- Playful Decorative Sparkles -->
  <g fill="#fef08a" opacity="0.8" transform="translate(85, 80)">
    <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15 Z" />
  </g>
  <g fill="#ffffff" opacity="0.65" transform="translate(425, 90)">
    <path d="M 0,-11 Q 0,0 11,0 Q 0,0 0,11 Q 0,0 -11,0 Q 0,0 0,-11 Z" />
  </g>
  <g fill="#fef08a" opacity="0.55" transform="translate(420, 415)">
    <path d="M 0,-9 Q 0,0 9,0 Q 0,0 0,9 Q 0,0 -9,0 Q 0,0 0,-9 Z" />
  </g>

  <!-- Playful Curved Paw Trail Arc -->
  <path d="M 135,390 C 185,355 210,265 205,170" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="4,8" stroke-linecap="round" opacity="0.32" />

  <!-- 3 ANIMAL PAWS (Ascending diagonal playful step sequence) -->

  <!-- Paw 1 (First Step, Bottom-Left): Coral/Peach tinted, 1.1x -->
  <g filter="url(#pawShadow)" transform="translate(155, 345) rotate(-18) scale(1.1)" fill="url(#paw2Grad)">
    <use href="#single-paw" />
    <ellipse cx="0" cy="2" rx="10" ry="7" fill="#ffffff" opacity="0.5" />
  </g>

  <!-- Paw 2 (Center Hero Paw, Center-Right): Warm Gold/Amber tinted, 1.35x -->
  <g filter="url(#pawShadow)" transform="translate(290, 240) rotate(16) scale(1.35)" fill="url(#paw1Grad)">
    <use href="#single-paw" />
    <!-- Embedded health heart in center pad -->
    <path d="M 0,8 C -5,2 -10,6 -10,11 C -10,16 -2,20 0,22 C 2,20 10,16 10,11 C 10,6 5,2 0,8 Z" fill="#0d9488" opacity="0.45" />
    <ellipse cx="0" cy="-5" rx="14" ry="8" fill="#ffffff" opacity="0.55" />
  </g>

  <!-- Paw 3 (Lead Step, Top-Left): Fresh Mint/Teal tinted, 0.95x -->
  <g filter="url(#pawShadow)" transform="translate(205, 125) rotate(-10) scale(0.95)" fill="url(#paw3Grad)">
    <use href="#single-paw" />
    <ellipse cx="0" cy="1" rx="8" ry="5" fill="#ffffff" opacity="0.5" />
  </g>
</svg>`;

// Round version for ic_launcher_round
const svgIconRound = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="42%" stop-color="#0d9488" />
      <stop offset="82%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <radialGradient id="warmGlow" cx="28%" cy="22%" r="72%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.38" />
      <stop offset="45%" stop-color="#34d399" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="paw1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>
    <linearGradient id="paw2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#ffe4e6" />
      <stop offset="100%" stop-color="#fecdd3" />
    </linearGradient>
    <linearGradient id="paw3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#bae6fd" />
    </linearGradient>
    <filter id="pawShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#022c22" flood-opacity="0.5" />
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.25" />
    </filter>
    <g id="single-paw">
      <ellipse cx="-36" cy="-36" rx="12.5" ry="16" transform="rotate(-28 -36 -36)" />
      <ellipse cx="-12" cy="-54" rx="13.5" ry="18" transform="rotate(-8 -12 -54)" />
      <ellipse cx="15" cy="-54" rx="13.5" ry="18" transform="rotate(8 15 -54)" />
      <ellipse cx="38" cy="-36" rx="12.5" ry="16" transform="rotate(28 38 -36)" />
      <path d="M 0,26 C -32,26 -46,-4 -34,-22 C -24,-33 -7,-30 0,-18 C 7,-30 24,-33 34,-22 C 46,-4 32,26 0,26 Z" />
    </g>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="250" />
    </clipPath>
  </defs>
  <g clip-path="url(#circleClip)">
    <circle cx="256" cy="256" r="256" fill="url(#bgGrad)" />
    <circle cx="256" cy="256" r="256" fill="url(#warmGlow)" />
    <circle cx="256" cy="256" r="248" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.25" />
    <g fill="#fef08a" opacity="0.8" transform="translate(100, 95)">
      <path d="M 0,-14 Q 0,0 14,0 Q 0,0 0,14 Q 0,0 -14,0 Q 0,0 0,-14 Z" />
    </g>
    <g fill="#ffffff" opacity="0.65" transform="translate(410, 105)">
      <path d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10 Z" />
    </g>
    <path d="M 135,390 C 185,355 210,265 205,170" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="4,8" stroke-linecap="round" opacity="0.32" />
    <g filter="url(#pawShadow)" transform="translate(155, 345) rotate(-18) scale(1.1)" fill="url(#paw2Grad)">
      <use href="#single-paw" />
      <ellipse cx="0" cy="2" rx="10" ry="7" fill="#ffffff" opacity="0.5" />
    </g>
    <g filter="url(#pawShadow)" transform="translate(290, 240) rotate(16) scale(1.35)" fill="url(#paw1Grad)">
      <use href="#single-paw" />
      <path d="M 0,8 C -5,2 -10,6 -10,11 C -10,16 -2,20 0,22 C 2,20 10,16 10,11 C 10,6 5,2 0,8 Z" fill="#0d9488" opacity="0.45" />
      <ellipse cx="0" cy="-5" rx="14" ry="8" fill="#ffffff" opacity="0.55" />
    </g>
    <g filter="url(#pawShadow)" transform="translate(205, 125) rotate(-10) scale(0.95)" fill="url(#paw3Grad)">
      <use href="#single-paw" />
      <ellipse cx="0" cy="1" rx="8" ry="5" fill="#ffffff" opacity="0.5" />
    </g>
  </g>
</svg>`;

// Adaptive Icon Foreground (Paws centered in safe zone with transparent background)
const svgForeground = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="paw1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>
    <linearGradient id="paw2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#ffe4e6" />
      <stop offset="100%" stop-color="#fecdd3" />
    </linearGradient>
    <linearGradient id="paw3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#bae6fd" />
    </linearGradient>
    <filter id="pawShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#022c22" flood-opacity="0.55" />
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
    </filter>
    <g id="single-paw">
      <ellipse cx="-36" cy="-36" rx="12.5" ry="16" transform="rotate(-28 -36 -36)" />
      <ellipse cx="-12" cy="-54" rx="13.5" ry="18" transform="rotate(-8 -12 -54)" />
      <ellipse cx="15" cy="-54" rx="13.5" ry="18" transform="rotate(8 15 -54)" />
      <ellipse cx="38" cy="-36" rx="12.5" ry="16" transform="rotate(28 38 -36)" />
      <path d="M 0,26 C -32,26 -46,-4 -34,-22 C -24,-33 -7,-30 0,-18 C 7,-30 24,-33 34,-22 C 46,-4 32,26 0,26 Z" />
    </g>
  </defs>

  <g transform="translate(0, 0)">
    <!-- Playful Sparkles -->
    <g fill="#fef08a" opacity="0.9" transform="translate(130, 115)">
      <path d="M 0,-14 Q 0,0 14,0 Q 0,0 0,14 Q 0,0 -14,0 Q 0,0 0,-14 Z" />
    </g>
    <g fill="#ffffff" opacity="0.8" transform="translate(380, 120)">
      <path d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10 Z" />
    </g>
    <path d="M 160,370 C 195,340 220,270 215,190" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="4,8" stroke-linecap="round" opacity="0.4" />

    <!-- 3 Paws scaled slightly to fit inside adaptive icon safe area -->
    <g transform="translate(256, 256) scale(0.88) translate(-256, -256)">
      <!-- Paw 1 -->
      <g filter="url(#pawShadow)" transform="translate(155, 345) rotate(-18) scale(1.1)" fill="url(#paw2Grad)">
        <use href="#single-paw" />
        <ellipse cx="0" cy="2" rx="10" ry="7" fill="#ffffff" opacity="0.5" />
      </g>
      <!-- Paw 2 -->
      <g filter="url(#pawShadow)" transform="translate(290, 240) rotate(16) scale(1.35)" fill="url(#paw1Grad)">
        <use href="#single-paw" />
        <path d="M 0,8 C -5,2 -10,6 -10,11 C -10,16 -2,20 0,22 C 2,20 10,16 10,11 C 10,6 5,2 0,8 Z" fill="#0d9488" opacity="0.45" />
        <ellipse cx="0" cy="-5" rx="14" ry="8" fill="#ffffff" opacity="0.55" />
      </g>
      <!-- Paw 3 -->
      <g filter="url(#pawShadow)" transform="translate(205, 125) rotate(-10) scale(0.95)" fill="url(#paw3Grad)">
        <use href="#single-paw" />
        <ellipse cx="0" cy="1" rx="8" ry="5" fill="#ffffff" opacity="0.5" />
      </g>
    </g>
  </g>
</svg>`;

async function main() {
  console.log('Generating 3-paw PetCare icons...');

  // 1. Write public/icon.svg
  fs.writeFileSync('./public/icon.svg', svgIcon.trim(), 'utf8');
  console.log('✓ Wrote public/icon.svg');

  const svgBuf = Buffer.from(svgIcon);
  const svgRoundBuf = Buffer.from(svgIconRound);
  const svgFgBuf = Buffer.from(svgForeground);

  // 2. PWA icons
  await sharp(svgBuf).resize(192, 192).png().toFile('./public/pwa-192x192.png');
  await sharp(svgBuf).resize(512, 512).png().toFile('./public/pwa-512x512.png');
  await sharp(svgBuf).resize(512, 512).png().toFile('./public/pwa-maskable-512x512.png');
  await sharp(svgBuf).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
  console.log('✓ Generated public/ PWA and Apple Touch icons');

  // 3. Android Mipmaps
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 }
  ];

  for (const m of mipmaps) {
    const dirPath = path.join('./android/app/src/main/res', m.dir);
    if (fs.existsSync(dirPath)) {
      // Standard squircle icon
      await sharp(svgBuf).resize(m.size, m.size).png().toFile(path.join(dirPath, 'ic_launcher.png'));
      // Round icon
      await sharp(svgRoundBuf).resize(m.size, m.size).png().toFile(path.join(dirPath, 'ic_launcher_round.png'));
      // Foreground for adaptive icon
      await sharp(svgFgBuf).resize(m.size, m.size).png().toFile(path.join(dirPath, 'ic_launcher_foreground.png'));
      console.log(`✓ Generated ${m.dir} icons (${m.size}x${m.size})`);
    }
  }

  // 4. Update ic_launcher_background.xml
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0d9488</color>
</resources>
`;
  fs.writeFileSync('./android/app/src/main/res/values/ic_launcher_background.xml', bgXml, 'utf8');
  console.log('✓ Updated ic_launcher_background.xml to brand teal (#0d9488)');

  // 5. Remove obsolete drawable-v24/ic_launcher_foreground.xml
  const obsoleteV24 = './android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml';
  if (fs.existsSync(obsoleteV24)) {
    fs.unlinkSync(obsoleteV24);
    console.log('✓ Removed obsolete drawable-v24/ic_launcher_foreground.xml');
  }

  // 6. Generate splash screens with the 3 paws logo
  const splashDirs = [
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable', w: 480, h: 320 }
  ];

  for (const s of splashDirs) {
    const splashPath = path.join('./android/app/src/main/res', s.dir, 'splash.png');
    if (fs.existsSync(path.dirname(splashPath))) {
      const iconSize = Math.min(Math.min(s.w, s.h) * 0.45, 320);
      const iconBuf = await sharp(svgBuf).resize(Math.round(iconSize), Math.round(iconSize)).png().toBuffer();
      
      const splashSvg = `<svg width="${s.w}" height="${s.h}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#059669" />
            <stop offset="42%" stop-color="#0d9488" />
            <stop offset="100%" stop-color="#0f766e" />
          </linearGradient>
        </defs>
        <rect width="${s.w}" height="${s.h}" fill="url(#bg)" />
      </svg>`;

      await sharp(Buffer.from(splashSvg))
        .composite([{
          input: iconBuf,
          left: Math.round((s.w - iconSize) / 2),
          top: Math.round((s.h - iconSize) / 2)
        }])
        .png()
        .toFile(splashPath);
    }
  }
  console.log('✓ Generated Android splash screens with 3-paw emblem');

  console.log('All 3-paw icons and splash screens generated successfully!');
}

main().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
