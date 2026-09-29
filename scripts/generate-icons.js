import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Brand new modern, distinctive PetCare Icon
// Features: Sleek modern squircle with deep ocean-emerald to cyan gradient,
// a gleaming heart-shaped medical veterinary shield, an adorable dog and cat silhouette in golden glow,
// and a crisp medical cross star.
const newIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="40%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>

    <!-- Shield Glow -->
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#f0fdf4" stop-opacity="0.98" />
    </linearGradient>

    <!-- Warm Amber Dog Fur -->
    <linearGradient id="dogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <!-- Vibrant Coral-Orange Cat Fur -->
    <linearGradient id="catGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>

    <!-- Medical Cross Gradient -->
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Filter for soft shadow -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.35" />
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#047857" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background App Squircle -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />

  <!-- Subtle Inner Ring Highlight -->
  <rect x="16" y="16" width="480" height="480" rx="100" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="4" />

  <!-- Central Medical Heart-Shield Emblem -->
  <g filter="url(#softShadow)">
    <path d="M 256,430 C 160,350 96,285 96,195 C 96,130 145,80 210,80 C 235,80 250,90 256,102 C 262,90 277,80 302,80 C 367,80 416,130 416,195 C 416,285 352,350 256,430 Z" 
          fill="url(#shieldGrad)" />
  </g>

  <!-- Paw Print Impression inside Heart -->
  <!-- Top Beans -->
  <ellipse cx="180" cy="175" rx="19" ry="26" transform="rotate(-18 180 175)" fill="#0d9488" fill-opacity="0.85" />
  <ellipse cx="230" cy="150" rx="19" ry="27" transform="rotate(-6 230 150)" fill="#0d9488" fill-opacity="0.85" />
  <ellipse cx="282" cy="150" rx="19" ry="27" transform="rotate(6 282 150)" fill="#0d9488" fill-opacity="0.85" />
  <ellipse cx="332" cy="175" rx="19" ry="26" transform="rotate(18 332 175)" fill="#0d9488" fill-opacity="0.85" />

  <!-- Main Paw Pad as Medical Heart-Pad -->
  <path d="M 256,310 C 215,260 190,230 190,205 C 190,190 202,180 220,180 C 232,180 248,188 256,198 C 264,188 280,180 292,180 C 310,180 322,190 322,205 C 322,230 297,260 256,310 Z" 
        fill="#0d9488" fill-opacity="0.9" />

  <!-- Crisp White Medical Cross embedded in Paw Pad -->
  <g fill="#ffffff">
    <rect x="249" y="210" width="14" height="42" rx="5" />
    <rect x="235" y="224" width="42" height="14" rx="5" />
  </g>

  <!-- Happy Dog Silhouette Profile (Left) -->
  <path d="M 125,290 C 135,275 145,260 160,265 C 168,268 174,277 172,286 C 170,296 160,305 152,314 C 145,322 140,335 144,345 C 150,358 170,365 185,360 C 180,375 160,385 145,382 C 128,378 116,360 114,342 C 112,324 118,303 125,290 Z" 
        fill="url(#dogGrad)" filter="url(#glow)" />

  <!-- Happy Cat Silhouette Profile (Right) -->
  <path d="M 387,290 C 377,275 367,260 352,265 C 344,268 338,277 340,286 C 342,296 352,305 360,314 C 367,322 372,335 368,345 C 362,358 342,365 327,360 C 332,375 352,385 367,382 C 384,378 396,360 398,342 C 400,324 394,303 387,290 Z" 
        fill="url(#catGrad)" filter="url(#glow)" />

  <!-- Stethoscope Ring Ribbon framing base -->
  <path d="M 170,380 C 210,415 302,415 342,380" fill="none" stroke="#059669" stroke-width="7" stroke-linecap="round" />

  <!-- Vital Heartbeat Wave Line -->
  <path d="M 195,355 L 225,355 L 235,340 L 247,372 L 259,335 L 271,365 L 280,355 L 317,355" 
        fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Sparkle of Health Top Right -->
  <g transform="translate(380, 75)" fill="#fef08a">
    <path d="M 0,-18 Q 0,0 18,0 Q 0,0 0,18 Q 0,0 -18,0 Q 0,0 0,-18 Z" />
  </g>
  <g transform="translate(130, 95)" fill="#fef08a" opacity="0.8">
    <path d="M 0,-12 Q 0,0 12,0 Q 0,0 0,12 Q 0,0 -12,0 Q 0,0 0,-12 Z" />
  </g>
</svg>`;

async function main() {
  console.log('Generating new icons...');
  fs.writeFileSync('public/icon.svg', newIconSvg, 'utf-8');

  const svgBuffer = Buffer.from(newIconSvg);

  // Generate Web & PWA icons
  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/pwa-512x512.png');
  
  // Maskable icon with safe zone padding
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 13, g: 148, b: 136, alpha: 1 },
    })
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  // Generate Android icons
  const androidResDir = 'android/app/src/main/res';
  const densities = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of densities) {
    const targetDir = path.join(androidResDir, dir);
    if (fs.existsSync(targetDir)) {
      // Main launcher icon
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetDir, 'ic_launcher.png'));
      // Round launcher icon
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetDir, 'ic_launcher_round.png'));
      // Foreground launcher icon
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
    }
  }

  console.log('All icons generated successfully!');
}

main().catch(console.error);
