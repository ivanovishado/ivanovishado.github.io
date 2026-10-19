# AGENTS.md

Guidance for coding agents working in this repo. Read this before making changes.

## What this is

**Ivan Galaviz — Ground track.** A personal portfolio: home, four case pages under
`/work/`, `/trajectory/`, `/mentorship/` and a Point Nemo 404. Static, no web
framework: hand-written HTML files with sections inlined, one CSS design system and
small TypeScript modules for motion and the canvas map. The concept, palette, type
and motion rules live in `DESIGN.md`: read it before changing anything visual.

Production: https://www.ivanovishado.dev (GitHub Pages).

## Toolchain — use Bun

This repo is Bun-first. **Do not use npm, yarn, or pnpm.** Bun is the runtime,
package manager, and script runner (the `build` script also runs Bun TS files
directly: `bun run tools/sitemap.ts`).

- Requires **Bun 1.3+** (CI pins `1.3` in `.github/workflows/deploy.yml`).
- `.nvmrc` pins Node 24 only for editor/CI parity; Node is not required to run tasks.
- `.npmrc` sets `save-exact=true` — when adding deps with `bun add`, pin exact versions.

Commands:

```bash
bun install                  # install deps (CI uses --frozen-lockfile)
bun run dev                  # Vite dev server → http://localhost:5173
bun run dev:host             # dev server exposed on LAN
bun run build                # sitemap + vite build → dist/
bun run preview              # preview the production build
bun run typecheck            # tsc --noEmit (strict) — run before declaring done
bun run tools/check-seo.ts   # after a build: canonicals, sitemap, JSON-LD, FAQ parity
```

Always run `bun run typecheck` after touching any `.ts` file.

## Project layout

```
index.html                  # home (all sections inline)
work/<slug>/index.html      # case pages: netflix, mcb-1, nubank, wizeline
trajectory/index.html       # trips and where the work lands, on one map
mentorship/index.html       # mentorship (its FAQ must match its FAQPage JSON-LD)
404.html                    # Point Nemo (Vite entry, served by GitHub Pages for misses)
DESIGN.md                   # concept card, palette, type, grid, motion language
src/
  styles/site.css           # the design system (tokens + components)
  fonts/                    # Neue Montreal woff2 (owner's files)
  js/
    site.ts                 # entry for every page: engine boot + driver + UI
    site/engine/            # one-clock lifecycle: Lenis on gsap.ticker, reveals, curtain, router
    site/concept/           # ground-track model (orbit.ts), land mask, canvas map, driver
    site/motion/curtain.ts  # page transition: sine-edged curtain sweeping west to east
    site/ui/                # frame (header), mobile menu, work-index pass preview
  partials/                 # site-head, site-chrome (header, menu, curtain), site-footer, analytics
tools/
  land.ts                   # rasterizes Natural Earth land into src/js/site/concept/land-data.ts
  sitemap.ts                # generates public/sitemap.xml with lastmod from git
  check-seo.ts              # validates dist/ (run after a build)
  fonts/                    # Neue Montreal source files
vite.config.ts              # one input per page; base '/'; partials plugin
public/                     # favicon, apple-touch-icon, og.jpg, og-mentorship.jpg, sitemap, robots
img/                        # headshot.webp, space-experiment.webp
.github/workflows/          # deploy.yml (Bun → GitHub Pages), dependabot-auto-merge.yml
```

## TypeScript conventions

- **Strict mode is on** (`tsconfig.json`: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitOverride`, `noUncheckedIndexedAccess`).
  No `any` without justification; prefer typed DOM generics
  (`querySelector<HTMLElement>(...)`) and explicit types for canvas state
  (see `concept/map.ts` `MapOptions`/`Link`, `concept/orbit.ts` `Pass`/`Place`).
- `moduleResolution: "bundler"` — use **extensionless relative imports**
  (`import { onPage } from '../engine'`), not `.js`/`.ts` extensions.
- Entry HTML `<script type="module" src="/src/js/site.ts">` — Vite resolves it.
- Fonts: Neue Montreal (`src/fonts/`, declared in `site.css`) and JetBrains Mono
  via `@fontsource-variable/jetbrains-mono` (imported in `site.ts`).

## HTML partials

Pages share `<head>` and `<body>` chrome via `<!-- partial:name -->` tokens
that a Vite plugin (`htmlPartials()` in `vite.config.ts`) replaces at dev and
build time. Edit the partial, not each page. Partials are not nested (one replace pass).
A new page needs: the partials, `<main id="main" tabindex="-1">`, the `site.ts`
script, an input in `vite.config.ts` and an entry in `tools/sitemap.ts`.

## Site rules (see DESIGN.md)

- One clock: every animation runs on `gsap.ticker` (Lenis, ScrollTrigger, the map).
  No `requestAnimationFrame` loops or scroll listeners of your own.
- Page effects live in `onPage()` (`src/js/site/engine`) so the router can revert them.
  Same-origin links are fetched and `<main>` is swapped behind the curtain.
- Maps are `<canvas data-track="hero|pass|trips">`; the driver mounts them. Guadalajara
  is the home station; passes land where the work is used (DESIGN.md, Station).
- Everything enters west to east ("sweep and lock"); hovers draw an amber line west to east.
- Under reduced motion: no Lenis, no reveals, one still map frame, content fully visible.
- Visible copy: no em or en dashes, sentence case.

## Styling conventions

- Plain CSS tokens in `src/styles/site.css` (`--c-*`, `--t-*`, grid helpers `.c-1-4` etc.).
  Use the existing tokens — do not introduce ad-hoc colors.
- Component classes (BEM-ish: `.index__row`, `.case-hero__title`), not utilities in markup.
- Respect `prefers-reduced-motion` in any new motion.

## Build & deploy

- Push to `main` → `deploy.yml` runs `bun install --frozen-lockfile` → `bun run build`
  → uploads `dist/` → deploys to GitHub Pages.
- OG images (`public/og.jpg`, `public/og-mentorship.jpg`) are captures of the live
  heroes (the awwwards skill's `og.mjs`), committed; regenerate only when a hero changes.

## Things to keep in mind

- QA: `playwright` and `axe-core` are dev deps for the awwwards skill's shoot/audit scripts.
- Don't add a test framework unless asked — there is none today.
- Don't commit `dist/` (it's gitignored) or `node_modules/`.
