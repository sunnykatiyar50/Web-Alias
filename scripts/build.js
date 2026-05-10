/**
 * build.js — Assembles dist/chrome and dist/firefox from shared src/ + browser manifests.
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const MANIFESTS = path.join(ROOT, 'manifests');

const BROWSERS = ['chrome', 'firefox'];

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('🔨 Building Web Alias extension...\n');

  for (const browser of BROWSERS) {
    const outDir = path.join(DIST, browser);
    cleanDir(outDir);

    // Copy shared source
    copyRecursive(SRC, outDir);

    // Copy browser-specific manifest
    const manifestSrc = path.join(MANIFESTS, browser, 'manifest.json');
    const manifestDest = path.join(outDir, 'manifest.json');
    fs.copyFileSync(manifestSrc, manifestDest);

    // Flatten utils into root for background.js (service worker can't use ES imports)
    // background.js uses inline storage helpers, so no action needed

    const manifest = JSON.parse(fs.readFileSync(manifestDest, 'utf8'));
    console.log(`  ✅ ${browser.padEnd(8)} → dist/${browser}/  (v${manifest.version})`);
  }

  console.log('\n✨ Done! Load the extension from:');
  console.log(`   Chrome:  dist/chrome/   (chrome://extensions → Load unpacked)`);
  console.log(`   Firefox: dist/firefox/  (about:debugging → Load Temporary Add-on → manifest.json)`);
}

build();
