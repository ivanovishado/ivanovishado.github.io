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
bun run build          # sitemap + Vite build + agent discovery files → dist/
bun run preview        # static Vite preview
bun run preview:worker # local Worker preview (Markdown negotiation, 404s, /mcp)
```

## Tech Stack

- **Vite** — build tool and dev server
- **Cloudflare Workers (Static Assets)** — edge hosting, `Accept: text/markdown` content negotiation, Markdown 404s, and a read-only Mentorship MCP server (`/mcp`)
- **Plain CSS** with design tokens (`src/styles/site.css`)
- **GSAP** — scroll reveals, parallax, hero entrance (ScrollTrigger)
- **Lenis** — smooth scrolling
- Custom canvas 2D ground-track map (`src/js/site/concept/`), land from Natural Earth

## Project Structure

```
├── index.html, work/*/, trajectory/, mentorship/, shelf/, privacy/, 404.html
├── worker/                # Cloudflare Worker (Markdown negotiation + /mcp)
├── wrangler.jsonc         # Cloudflare Workers Static Assets config
├── src/
│   ├── styles/site.css    # the design system
│   └── js/site/           # engine, ground-track concept, transitions, UI
├── tools/                 # sitemap, shelf, agent discovery files, SEO checks, local Worker server
├── DESIGN.md              # concept, palette, type, motion rules
├── img/, public/          # images, favicon, OG, sitemap, robots
└── .github/workflows/     # Cloudflare Workers deploy (Bun + Wrangler)
```

## Deployment

Pushes to `main` run GitHub Actions (`deploy.yml`), which typechecks, builds, runs `tools/check-seo.ts`, and deploys `dist/` + `worker/index.ts` to Cloudflare Workers at https://www.ivanovishado.dev. Pull requests upload preview versions automatically.

## License

See [LICENSE](LICENSE) for details.
