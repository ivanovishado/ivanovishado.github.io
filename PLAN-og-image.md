# Plan: OG Image (Social Share Preview)

## What's needed

A 1200x630px PNG at `public/og-image.png` — referenced by existing meta tags in `index.html`.

## Design spec

- **Background:** `#06080C` (--color-void)
- **Left side:** "Ivan Galaviz" in Cabinet Grotesk Bold, white. Below: "Software Engineer at Netflix" in `#2563EB` (--color-event-horizon)
- **Right side:** Headshot (img/headshot.webp), circular or rounded crop
- **Subtle accent:** Gradient glow or arc matching the hero section aesthetic
- **Bottom:** `ivanovishado.dev` in small gray text

## How to generate

**Option A — Figma/Canva (quickest)**
1. Create 1200x630 canvas, dark background
2. Place text + headshot, export as PNG
3. Save to `public/og-image.png`

**Option B — Programmatic (HTML → screenshot)**
1. Create `og-template.html` with inline styles matching the spec
2. Open in browser, screenshot at 1200x630, save as PNG
3. Delete the template file after

## Verification

After deploy, paste `https://www.ivanovishado.dev` into:
- https://www.opengraph.xyz/ (general OG preview)
- https://cards-dev.twitter.com/validator (Twitter/X cards)
- LinkedIn post composer (paste URL, check preview)
