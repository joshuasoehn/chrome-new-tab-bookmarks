# Chrome New Tab Bookmarks

A Chrome extension that replaces the New Tab page with a simple grid of bookmark links from your bookmarks bar.

## Local development

### 1) Install dependencies

```bash
npm install
```

### 2) Build once

```bash
npm run build
```

This creates a `dist/` folder containing:
- `manifest.json`
- `newtab.html`
- bundled assets

### 3) Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory from this project

### 4) Iterate with watch mode

Run:

```bash
npm run dev
```

Then, after edits compile, click **Reload** on the extension card in `chrome://extensions`, and open a new tab to verify changes.

## Scripts

- `npm run build` - production build into `dist/`
- `npm run dev` - watch build for local iteration
- `npm run typecheck` - TypeScript type check

## Notes

- The extension requests the `bookmarks` permission to read your bookmarks bar.
- The current implementation shows direct bookmark links in the bookmarks bar (not nested folder contents yet).
