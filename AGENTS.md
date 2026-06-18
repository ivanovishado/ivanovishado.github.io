# AGENTS.md

Guidance for coding agents working in this repo. Read this before making changes.

## What this is

**Ivan Galaviz — Field Notes.** A monograph-style personal site (plus a `/mentorship`
landing page). Static, no web framework: the pages are hand-written HTML files
(`index.html`, `mentorship/index.html`) with sections inlined, styled by a single
CSS sheet, with small TypeScript modules for motion and generative canvas art.

Production: https://www.ivanovishado.dev (GitHub Pages).

## Toolchain — use Bun

This repo is Bun-first. **Do not use npm, yarn, or pnpm.** Bun is the runtime,
package manager, and script runner (the `build` script also runs a Bun TS file
directly: `bun run tools/og-image.ts`).

- Requires **Bun 1.3+** (CI pins `1.3` in `.github/workflows/deploy.yml`).
- `.nvmrc` pins Node 24 only for editor/CI parity; Node is not required to run tasks.
- `.npmrc` sets `save-exact=true` — when adding deps with `bun add`, pin exact versions.

Commands:

```bash
bun install              # install deps (CI uses --frozen-lockfile)
bun run dev              # Vite dev server → http://localhost:5173
bun run dev:host         # dev server exposed on LAN
bun run build            # sitemap + OG image + vite build → dist/
bun run preview          # preview the production build
bun run typecheck        # tsc --noEmit (strict) — run before declaring done
```

Always run `bun run typecheck` after touching any `.ts` file.

## Project layout

```
index.html                  # main page entry (all sections inline)
mentorship/index.html       # /mentorship entry (shares src/styles + src/js)
src/
  styles/main.css           # design tokens (@theme) + base + components — the ONLY stylesheet
  js/                       # TypeScript modules (strict)
    main.ts                 # main-page entry: orbital hero + reveals + nav
    mentorship.ts           # mentorship-page entry: trajectory hero + reveals + nav
    orbital.ts              # generative canvas: guide orbits + fading light trails
    trajectory.ts           # generative canvas: transfer arc + traveler (mentorship hero)
    scroll.ts               # Lenis smooth scroll + GSAP ScrollTrigger, reveals, parallax
    nav.ts                  # nav scroll state, progress bar, active section, mobile menu
    globals.d.ts            # ambient Window typings (ScrollTrigger)
  partials/                 # shared HTML fragments inlined by the Vite partials plugin
    critical-css.html       # FOUC-preventing <style> block (shared by both pages)
    head-links.html         # icon, apple-touch-icon, manifest <link>s
    body-chrome.html        # ambient/vignette/grain/progress divs
    analytics.html          # Umami analytics script
tools/
  og-image.ts               # Bun script: composites branded OG image (satori + resvg → sharp → JPG)
  sitemap.ts                # Bun script: generates sitemap.xml with lastmod from git
  fonts/, og-image-base.png # inputs for the OG compositor
vite.config.ts              # two inputs: main + mentorship; base './'; HTML partials plugin
postcss.config.ts           # @tailwindcss/postcss
public/                     # static assets served as-is (favicon, apple-touch-icon, og-image.jpg, sitemap, 404)
img/                        # headshot.webp, space-experiment.webp
.github/workflows/          # deploy.yml (Bun → GitHub Pages), dependabot-auto-merge.yml
```

## TypeScript conventions

- **Strict mode is on** (`tsconfig.json`: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitOverride`, `noUncheckedIndexedAccess`).
  No `any` without justification; prefer typed DOM generics
  (`querySelector<HTMLElement>(...)`, `querySelectorAll<HTMLAnchorElement>(...)`)
  and explicit interfaces for canvas state (see `orbital.ts` `Body`/`Point`/`Star`/`RGB`).
  Use tuple types (`RGB = [number, number, number]`, `Arc = [Point, Point, Point, Point]`)
  for fixed-length arrays — `noUncheckedIndexedAccess` makes `number[]` indexing
  return `T | undefined`, but tuple literal indexing stays safe.
- `moduleResolution: "bundler"` — use **extensionless relative imports**
  (`import { initNav } from './nav'`), not `.js`/`.ts` extensions.
- Entry HTML `<script type="module" src="/src/js/*.ts">` — Vite resolves these.
- Vite client types (`vite/client`) are included, so CSS/asset imports are typed.
- `src/js/globals.d.ts` declares `window.ScrollTrigger` — extend it if you add
  more globals rather than casting `window as any`.
- Fonts are self-hosted via `@fontsource-variable` (Fraunces opsz + italic,
  JetBrains Mono wght). Import them in the TS entry files; the font-family names
  are `"Fraunces Variable"` and `"JetBrains Mono Variable"`. The `public/404.html`
  page is standalone (no Vite bundle) and still uses Google Fonts CDN.

## HTML partials

Both pages share `<head>` and `<body>` chrome via `<!-- partial:name -->` tokens
that a Vite plugin (`htmlPartials()` in `vite.config.ts`) replaces at dev and
build time. Partial files live in `src/partials/`. To change shared critical CSS,
icon links, or analytics across both pages, edit one partial — not both HTML files.

## Styling conventions

- **Tailwind CSS v4** via `@tailwindcss/postcss`. The design system lives in
  `src/styles/main.css` under `@theme { ... }` (tokens) and `:root` (derived vars).
  Use the existing tokens — do not introduce ad-hoc colors.
- Palette: `--color-ink` (near-black canvas), `--color-paper` (warm ivory text),
  `--color-amber` / `--color-amber-soft` (the single accent), plus `--paper-*`
  opacity variants. Type: Fraunces (`--font-display`) + JetBrains Mono (`--font-mono`).
- It's a component-class CSS file (BEM-ish: `.tile`, `.tile--accent`, `.tile__k`),
  **not** utility-first in markup. Add component styles to `main.css`, not inline.
- Respect `prefers-reduced-motion` — every animated/canvas module already checks
  `window.matchMedia('(prefers-reduced-motion: reduce)')` and renders a static
  fallback. Keep that pattern for any new motion.

## Canvas modules

`orbital.ts` and `trajectory.ts` each export an `init<Name>(canvas)` that:
returns a cleanup `() => void`, guards `getContext('2d')`, handles HiDPI via
`devicePixelRatio` (capped at 2), starts/stops an rAF loop via `IntersectionObserver`
(only animates while on-screen), and draws a static frame when reduced-motion is set.
Mirror this structure for any new canvas piece.

## Build & deploy

- Push to `main` → `deploy.yml` runs `bun install --frozen-lockfile` → `bun run build`
  → uploads `dist/` → deploys to GitHub Pages.
- `bun run build` regenerates `public/og-image.jpg` (via satori → resvg → sharp)
  and `public/sitemap.xml` (lastmod from `git log`). The `og-image.jpg` is
  committed, so only re-run the build if the OG branding or page list changes.

## Things to keep in mind

- Two independent HTML entries share `src/` but have different hero canvases
  (`orbital` vs `trajectory`) and entries (`main.ts` vs `mentorship.ts`).
  Changes to shared modules (`scroll.ts`, `nav.ts`, `main.css`) affect both pages.
- Don't add a test framework unless asked — there is none today.
- Don't commit `dist/` (it's gitignored) or `node_modules/`.
