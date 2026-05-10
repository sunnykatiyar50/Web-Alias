# Web Alias — Browser Extension

Assign short aliases to URLs and navigate instantly via the address bar.

## Features

- **Omnibox redirect** — Type `z <space> <alias>` in the address bar to instantly navigate
- **Popup UI** — Add, edit, delete, and search aliases with favicons
- **Import / Export** — Backup and restore aliases as JSON
- **Themes** — Follows system preference (dark/light) with manual toggle
- **Keyboard shortcut** — `Ctrl+Shift+S` to open the popup

## Quick Start

### Build

```bash
node scripts/build.js
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/chrome/`

### Load in Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `dist/firefox/manifest.json`

## Usage

- **Address bar:** Type `z` then press Space, then type your alias and Enter
- **Popup:** Click the extension icon (or `Ctrl+Shift+S`) to manage aliases
- **Add alias:** Click **Add** button or press `Ctrl+N` in the popup

## Project Structure

```
src/                  # Shared source (both browsers)
  background.js       # Omnibox handler + install seed
  popup/              # Popup UI
  utils/              # Storage, favicon, theme utilities
manifests/            # Browser-specific manifests
  chrome/             
  firefox/            
dist/                 # Build output (gitignored)
  chrome/             # Ready to load in Chrome
  firefox/            # Ready to load in Firefox
```

## Future Plans

- Google login for GDrive sync (import/export settings)
- Alias categories / folders
- Usage analytics (most used aliases)
