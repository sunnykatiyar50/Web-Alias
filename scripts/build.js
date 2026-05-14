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

    // Sync version from package.json to manifest
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const manifestSrc = path.join(MANIFESTS, browser, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf8'));
    manifest.version = pkg.version;

    const manifestDest = path.join(outDir, 'manifest.json');
    fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));

    // Flatten utils into root for background.js (service worker can't use ES imports)
    // background.js uses inline storage helpers, so no action needed

    console.log(`  ✅ ${browser.padEnd(8)} → dist/${browser}/  (v${manifest.version})`);
  }
  
  // Create releases (clean previous builds)
  const releasesDir = path.join(ROOT, 'releases');
  // Remove old releases folder if it exists
  if (fs.existsSync(releasesDir)) {
    fs.rmSync(releasesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releasesDir, { recursive: true });  
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  console.log('\n📦 Creating versioned releases...');

  const { execSync } = require('child_process');
  for (const browser of BROWSERS) {
    const zipName = `web-alias-${browser}-v${pkg.version}.zip`;
    const zipPath = path.join(releasesDir, zipName);
    const distDir = path.join(DIST, browser);
    
    try {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`);
      console.log(`  ✅ ${zipName}`);
    } catch (err) {
      console.error(`  ❌ Failed to create zip for ${browser}: ${err.message}`);
    }
  }

  console.log('\n✨ Done!');
  console.log('📦 Marketplace-ready zips are in: releases/');
}

build();
