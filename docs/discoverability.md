# Search and answer-engine discoverability

This repository owns the homepage, mentorship landing page, and static assets. The external blog, slides, and other linked applications need separate audits in their own repositories.

## Source of truth

- Homepage: Ivan Galaviz's professional profile and links to supporting work, press, and mentorship.
- Mentorship: remote software engineering mentorship, 45 minutes over Google Meet, English or Spanish, 500 MXN for every session including the first.
- Keep JSON-LD descriptions and answers consistent with visible copy. Use the same `https://www.ivanovishado.dev/#person` identity on both pages.
- `public/profile.webp` is the stable structured-data image; update it if `img/headshot.webp` changes.
- Do not claim review scores, job guarantees, or employer endorsement without evidence.

## Validation

After changes, run:

```sh
bun run typecheck
bunx --no-install vite build
bun run tools/check-seo.ts
```

The check verifies built HTML, canonical URLs, sitemap inclusion, JSON-LD entity references, FAQ parity, image files, pricing presence, and 404 noindex. This is a local regression check, not Google's Rich Results Test or proof of indexing.

The deployment build regenerates the sitemap using committed page modification dates. Commit page changes before the deployment build so `lastmod` reflects the actual revision. Do not bump dates without meaningful content changes.

## After publishing

1. Inspect both canonical URLs in Google Search Console and Bing Webmaster Tools. Confirm indexing is allowed, the intended canonical is selected, and the crawled content includes the current profile and pricing.
2. Submit `https://www.ivanovishado.dev/sitemap.xml` and request recrawling of the two updated pages.
3. Validate the live URLs with Google's Rich Results Test and Schema.org Validator. FAQ markup describes content; it is not a promise of a Google FAQ rich result.
4. Record search impressions, clicks, queries, and mentorship bookings as a baseline. Compare over several weeks rather than interpreting immediate changes as ranking gains.
5. Keep the LinkedIn, GitHub, and blog author profiles consistent and link back to the canonical profile and mentorship page where relevant.

A useful future content expansion is a fully translated Spanish mentorship page with its own canonical and reciprocal hreflang links. Only add language markup when the translated page exists. Publish original answers to recurring mentorship questions on the blog, grounded in real experience, and link to the relevant offer.

## Guidance

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/structured-data/profile-page

Google's AI features use the foundations of SEO: crawl access, helpful text, internal links, and accurate structured data. No special AI file or markup guarantees inclusion. Robots permissions enable access; they do not ensure indexing or citations.
