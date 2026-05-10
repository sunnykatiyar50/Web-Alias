const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgCode = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <!-- Background with transparent corners -->
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <!-- Lightning bolt for "instant" navigation -->
  <path d="M68 28 L36 72 L60 72 L52 104 L96 56 L72 56 Z" fill="#ffffff" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"/>
</svg>
`;

const SIZES = [16, 32, 48, 128];
const ICONS_DIR = path.join(__dirname, '../src/icons');

async function generate() {
  console.log('Generating icons...');
  
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgCode);

  for (const size of SIZES) {
    const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅ Generated ${outPath} (${size}x${size})`);
  }
  
  console.log('Done!');
}

generate().catch(console.error);
