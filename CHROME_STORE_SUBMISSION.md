# Chrome Web Store Submission Guide

## 1) Prepare release package

Run:

```bash
npm run release
```

This creates:

- `release/chrome-new-tab-bookmarks.zip`

Upload that ZIP to the Chrome Web Store.

## 2) Store listing copy (starter)

### Name

Bookmarks

### Summary

Replace your new tab with a clean, customizable grid of bookmarks from your bookmarks bar.

### Description

Bookmarks replaces the default new tab page with a simple, fast bookmark dashboard.

Features:
- Shows bookmarks from your bookmarks bar in a clean grid
- Displays each site's favicon
- Drag-and-drop to reorder cards
- Saves your custom order locally
- Supports light and dark mode

No account required. No ads.

## 3) Privacy disclosures (recommended answers)

Use `PRIVACY_POLICY.md` as your policy page content.

Chrome Web Store privacy section:
- **Single purpose**: Replaces new tab and displays bookmarks bar links.
- **Data sold**: No
- **Data shared with third parties**: No
- **Data used for ads**: No
- **Sensitive permissions rationale**:
  - `bookmarks`: read bookmark titles/URLs for display in new tab grid
  - `storage`: save user-defined card order
  - `favicon`: show site icons

## 4) Assets checklist

- [ ] Extension icon (already included in `manifest.json`)
- [ ] At least one screenshot of the extension UI
- [ ] Optional promo assets if requested by dashboard fields
- [ ] Support/contact URL
- [ ] Published Privacy Policy URL

## 5) Before submitting each update

- [ ] Bump `manifest.json` version
- [ ] Run `npm run release`
- [ ] Upload new ZIP
- [ ] Update changelog text in listing if needed
