# Ivan Galaviz — Field Notes

A monograph-style personal site. Cool near-black canvas, warm ivory text, a single archival-amber accent. Fraunces (editorial serif) for narrative voice, JetBrains Mono for instrument-like metadata. The signature visual is a custom generative orbital canvas — hairline guide orbits with bodies leaving fading light trails.

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
- **Tailwind CSS v4** — styling (via `@tailwindcss/postcss`)
- **GSAP** — scroll reveals, parallax, hero entrance (ScrollTrigger)
- **Lenis** — smooth scrolling
- Custom canvas 2D renderer for the orbital hero piece (`src/js/orbital.js`)

## Project Structure

```
├── index.html              # Monograph entry point (all sections inline)
├── src/
│   ├── styles/main.css     # Design tokens, base, components (single sheet)
│   └── js/
│       ├── main.js         # Entry point
│       ├── orbital.js      # Generative canvas hero piece
│       ├── scroll.js       # Lenis + GSAP ScrollTrigger, reveals, parallax
│       └── nav.js          # Nav state, progress bar, mobile menu
├── img/                    # headshot.webp, space-experiment.webp
├── public/                 # favicon, manifest, 404, og-image, robots, sitemap
└── .github/workflows/      # GitHub Pages deploy (Bun)
```

## Deployment

Pushed to `main` → GitHub Actions (`deploy.yml`) builds with Bun and deploys `dist/` to GitHub Pages at https://www.ivanovishado.dev.

## License

See [LICENSE](LICENSE) for details.
