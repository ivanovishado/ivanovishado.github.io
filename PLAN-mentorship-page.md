# Plan: /mentorship Landing Page

## Context

The portfolio currently has a single "Book a Mentoring Session" CTA button in the contact section that links directly to cal.com. A dedicated `/mentorship` page would:
- Rank for queries like "software engineer mentoring", "Netflix engineer mentorship"
- Give recruiters/mentees more context before booking
- Provide a richer SEO surface (separate URL = separate ranking opportunity)

## Technical Approach

Vite supports multi-page apps natively via `build.rollupOptions.input`. No framework change needed.

### File structure

```
mentorship/
  index.html          ← new page entry point
  src/
    sections/
      mentorship-hero.html
      mentorship-topics.html
      mentorship-cta.html
```

### Vite config change

```js
// vite.config.js
import { resolve } from 'path';

export default defineConfig({
  plugins: [htmlInject()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mentorship: resolve(__dirname, 'mentorship/index.html'),
      },
    },
  },
});
```

## Page Structure

### 1. Hero
- Headline: "Mentorship for Engineers" (or similar keyword-rich H1)
- Subtext: brief pitch — who you are, why you mentor, who it's for
- Primary CTA: "Book a Session" (cal.com link)

### 2. What I Can Help With (topics grid)
- Career growth (junior → senior, IC track)
- System design & distributed systems
- Interviewing at FAANG/big tech
- Go, Java, Clojure, Python deep-dives
- Transitioning from Latin America to global companies
- Space/aerospace side projects

### 3. How It Works
- 1-on-1 video call (duration, platform)
- Async follow-up or not
- Pricing (free? pay-what-you-want? fixed?)
- cal.com embed or link

### 4. Social Proof (future)
- Testimonials from mentees (add as they come in)
- Number of sessions completed

### 5. CTA + FAQ
- FAQ section with schema markup (FAQPage) for SEO
- Final booking CTA

## SEO Requirements

- [ ] Dedicated `<title>`: "Mentorship — Ivan Galaviz | Software Engineer at Netflix"
- [ ] Dedicated `<meta description>` targeting mentoring queries
- [ ] JSON-LD: `Service` schema (type: mentoring, provider: Person)
- [ ] `FAQPage` schema for the FAQ section
- [ ] Add `/mentorship/` to `sitemap.xml`
- [ ] Internal link from main site's contact section → /mentorship
- [ ] Canonical URL: `https://www.ivanovishado.dev/mentorship/`

## Design

- Reuse existing design system (Deep Space theme, Tailwind classes, Cabinet Grotesk + JetBrains Mono)
- Shared navbar and footer (same partials or duplicated with back-link to home)
- Simpler layout than main page — no GSAP animations, no Lenis needed
- Mobile-first, single-column with optional 2-col on desktop for topics grid

## Implementation Order

1. Create `mentorship/index.html` with shared head (meta, fonts, styles)
2. Build section partials (hero, topics, CTA)
3. Update `vite.config.js` with multi-page input
4. Add JSON-LD (Service + FAQPage schemas)
5. Update `sitemap.xml` with new URL
6. Add internal link from main site contact section
7. Test build and verify `/mentorship/` route works
