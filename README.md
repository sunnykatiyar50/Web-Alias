# Web Alias — Browser Extension

Assign short aliases to URLs and navigate instantly via the address bar. 

*Note: This is a vibe code utility tool.*

## 🚀 Features

- **Omnibox redirect** — Type `b <space> <alias>` in the address bar to instantly navigate
- **Popup UI** — Add, edit, delete, and search aliases with favicons
- **Import / Export** — Backup and restore aliases as JSON (Export now auto‑closes the popup)
- **Themes** — Follows system preference (dark/light) with manual toggle
- **Keyboard shortcut** — `Ctrl+Shift+S` to open the popup
- **Search‑engine aliases** — Use `%s` in an alias URL to perform a quick search (e.g. `google.com/search?q=%s`)
- **Compact grid view** — Toggle between list and grid layouts with the view‑mode button in the popup header


## 📖 Usage

- **Address bar:** Type `b` then press Space, then type your alias and Enter
- **Popup:** Click the extension icon (or `Ctrl+Shift+S`) to manage aliases
- **Add alias:** Click **Add** button or press `Ctrl+N` in the popup
- **Theme toggle:** Click the icon in the header to switch between System, Dark, and Light modes

---

## 🛠 Developer Instructions

### Build & Release

### Build & Release

To build the extension and generate marketplace‑ready zip files:

```bash
npm run build
```

This will:
1. Sync the version from `package.json` to both manifests.
2. Build the shared source into `dist/chrome/` and `dist/firefox/`.
3. Generate versioned zip files in the `releases/` directory.

### Loading in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/chrome/`

### Loading in Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `dist/firefox/manifest.json`

## 📂 Project Structure

```
src/                  # Shared source (both browsers)
  background.js       # Omnibox handler + install seed
  popup/              # Popup UI
  utils/              # Storage, favicon, theme utilities
manifests/            # Browser-specific manifests
  chrome/             
  firefox/            
dist/                 # Build output (gitignored)
releases/             # Versioned zip files for marketplaces (tracked)
scripts/              # Build and asset generation scripts
```

## 🗺 Future Plans

- Google login for GDrive sync (import/export settings)
- Alias categories / folders
- Usage analytics (most used aliases)
