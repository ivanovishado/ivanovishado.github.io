# Ivan Galaviz — Ground track

A personal portfolio drawn as an orbit's ground track: each chapter of the work is one pass over the place it happened, and the Earth appears only where the track's swath has flown. Neue Montreal and JetBrains Mono on a night map, one amber accent for the track. See `DESIGN.md` for the full system.

## Quick Start

Requires [Bun](https://bun.sh) 1.3+.

```bash
bun install
bun run dev        # http://localhost:5173
```

## Building for Production

```bash
bun run build      # outputs to dist/
bun run preview    # preview the production build
```

## Tech Stack

- **Vite** — build tool and dev server
- **Plain CSS** with design tokens (`src/styles/site.css`)
- **GSAP** — scroll reveals, parallax, hero entrance (ScrollTrigger)
- **Lenis** — smooth scrolling
- Custom canvas 2D ground-track map (`src/js/site/concept/`), land from Natural Earth

## Project Structure

```
├── index.html, work/*/, trajectory/, mentorship/, 404.html   # pages
├── src/
│   ├── styles/site.css    # the design system
│   └── js/site/           # engine, ground-track concept, transitions, UI
├── DESIGN.md              # concept, palette, type, motion rules
├── img/, public/          # images, favicon, OG, sitemap, robots
└── .github/workflows/     # GitHub Pages deploy (Bun)
```

## Deployment

Pushed to `main` → GitHub Actions (`deploy.yml`) builds with Bun and deploys `dist/` to GitHub Pages at https://www.ivanovishado.dev.

## License

See [LICENSE](LICENSE) for details.
