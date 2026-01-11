# 🚀 Technical Implementation Plan: "Orbital Orchestrator"

> **Project:** Ivan Galaviz Portfolio Rebrand  
> **Status:** Approved  
> **Last Updated:** 2026-01-10

---

## 📋 Executive Summary

Transform the current CV website into the "Orbital Orchestrator" — a cinematic, technically-impressive portfolio that represents a backend/distributed systems engineer's story through the metaphor of space exploration and system orchestration.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | **Vanilla JS** | Simpler, faster, no build tools needed |
| Animation Engine | **GSAP + ScrollTrigger** | Industry standard, performant, free |
| Smooth Scrolling | **Lenis** | Premium "expensive" feel |
| 3D Graphics | **Three.js** | Hero particle field |
| Hosting | **GitHub Pages** (static) | Free, fast |

---

## 🛠️ Technology Stack

### Frontend (Static Site)

```html
<!-- Core Libraries (CDN) -->
<script src="https://unpkg.com/lenis@1.2.3/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/TextPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.min.js"></script>

<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<!-- Cabinet Grotesk from Fontshare or self-hosted -->
```

---

## 📁 Project Structure

```
ivanovishado.github.io/
├── index.html                 # Main page
├── styles/
│   ├── main.css              # Core styles + CSS variables
│   ├── components.css        # Section-specific styles
│   └── animations.css        # Keyframe animations
├── scripts/
│   ├── main.js               # App initialization
│   ├── lenis-setup.js        # Smooth scrolling config
│   ├── animations/
│   │   ├── hero-particles.js # Three.js particle field
│   │   ├── scroll-triggers.js# GSAP ScrollTrigger setups
│   │   ├── text-scramble.js  # Header decode effect
│   │   └── magnetic.js       # Magnetic cursor effect
│   ├── terminal/
│   │   └── terminal-ui.js    # Terminal DOM/input handling
│   └── utils/
│       └── helpers.js        # Shared utilities
├── assets/
│   ├── fonts/               # Self-hosted fonts
│   ├── images/              # Optimized images
│   └── svg/                 # SVG schematics (MCB-1, system diagrams)
├── plans/
│   └── ORBITAL_ORCHESTRATOR_IMPL.md  # This file
└── DESIGN_CHARTER.md        # Design specifications
```

---

## 🎨 Implementation Phases

### Phase 1: Foundation ✅
> Setup, core structure, and smooth scrolling
> **Completed:** 2026-01-10

- [x] Refactor CSS into modular files (`styles/design-tokens.css`)
- [x] Implement new color palette ("Event Horizon")
- [x] Integrate Lenis smooth scrolling
- [x] Setup GSAP + ScrollTrigger base configuration
- [x] Implement new typography (Cabinet Grotesk + JetBrains Mono)
- [x] Create responsive breakpoint system

**Deliverable:** Site with new visual style + buttery scrolling ✅

---

### Phase 2: Hero Section
> "The View from the Platform"

#### Background Options (Choose One)

| Option | Pros | Cons |
|--------|------|------|
| **A) Three.js Particles** | Interactive, lightweight, unique | More complex to implement |
| **B) Background Video** | Cinematic, easy to implement, high visual impact | Larger file size, less interactive |

> **Note:** User has a UI mock for particle inspiration. Final decision TBD based on visual exploration.

#### Option A: Three.js Particles
- [ ] Create Three.js canvas for particle field
- [ ] Implement drifting "space dust" particles
- [ ] Add parallax response to scroll

```javascript
// Particle field pseudo-code
const particleCount = 1000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
// Randomize positions in 3D space
// Apply subtle drift animation in render loop
```

#### Option B: Background Video
- [ ] Source or create ambient space/tech video loop
- [ ] Implement `<video>` with autoplay, muted, loop
- [ ] Add overlay gradient for text readability
- [ ] Optimize for mobile (poster fallback, reduced quality)

```html
<video autoplay muted loop playsinline class="hero-video">
  <source src="assets/video/hero-bg.mp4" type="video/mp4">
</video>
```

#### Common Hero Elements
- [ ] Implement text scramble effect on name
- [ ] Add optional ambient sound toggle
- [ ] Magnetic hover on social links

**Deliverable:** Immersive hero with animated background

---

### Phase 3: Feature Project — MCB-1
> "Tested on the ISS. Returned to Earth."

- [ ] Create SVG schematic of compliant mechanism/flexure joint
- [ ] Implement GSAP timeline for SVG line-draw animation
- [ ] Add scroll-triggered reveal
- [ ] Include press links (Forbes, El País)
- [ ] Add "Flight Data" metrics overlay

**Animation Flow:**
1. Lines draw in (stroke-dasharray animation)
2. Mechanism renders and fills
3. Flexure joint animates (subtle bend)
4. Text reveals below

**Deliverable:** Animated technical schematic with impact story

---

### Phase 4: System Orchestration Diagram
> "Classical Structure, Jazz Improvisation"

- [ ] Create living system diagram (SVG + GSAP)
- [ ] Animate traffic flow (pulse effects)
- [ ] Implement load spike → scaling animation loop
- [ ] Add interactive hover states on nodes
- [ ] Scroll-triggered story progression

**Animation Sequence:**
1. Idle state: subtle pulse on services
2. Traffic spike: particles flow from ingress
3. Scaling: new service nodes appear
4. Recovery: system contracts, returns to idle

**Deliverable:** Interactive architecture visualization

---

### Phase 5: Mission Log Timeline
> Experience as a space mission

- [ ] Create vertical "data pipe" SVG
- [ ] Implement scroll-progress fill animation
- [ ] Design experience cards with metrics
- [ ] Add pulsing "active" indicator for current role
- [ ] Implement staggered reveal for each career node

**Data Structure:**
```javascript
const missions = [
  {
    company: 'Netflix',
    role: 'Software Engineer',
    status: 'active', // Pulsing node
    highlight: 'Building internal tools that power marketing campaigns for Netflix titles worldwide'
  },
  // ... previous roles
];
```

**Deliverable:** Interactive career timeline

---

### Phase 6: Skills Terminal
> "ROOT ACCESS GRANTED"

- [ ] Create terminal UI component (dark theme)
- [ ] Implement command line input with blinking cursor
- [ ] Add skill cycling animation (Java → Go → Clojure)
- [ ] Implement static command responses

**Terminal Commands:**
```
> help              # Show available commands
> skills            # Display tech stack
> about             # Quick bio
> clear             # Clear terminal
```

> **Note:** LLM-powered chat deferred to future iteration.

**Deliverable:** Interactive terminal with static responses

---

### Phase 7: Mission Control Footer
> Final call-to-action zone

- [ ] Implement magnetic social links
- [ ] Add "Book Mentoring" CTA (Cal.com link)
- [ ] Create PDF resume direct download
- [ ] Add location indicator ("Based in Mexico")
- [ ] Subtle floating particles continuation from hero

**Deliverable:** Polished, actionable footer

---

### Phase 8: Polish & Optimization

- [ ] Performance audit (Lighthouse 90+ target)
- [ ] Responsive testing across all breakpoints
- [ ] Accessibility audit (WCAG AA compliance)
- [ ] Add loading states / skeleton screens
- [ ] Implement reduced-motion media query support
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Add SEO meta tags, og:image, favicon

**Deliverable:** Production-ready site

---

## 📐 Responsive Breakpoints

```css
/* Mobile First */
:root {
  --bp-sm: 640px;   /* Large phones */
  --bp-md: 768px;   /* Tablets */
  --bp-lg: 1024px;  /* Laptops */
  --bp-xl: 1280px;  /* Desktops */
  --bp-2xl: 1536px; /* Large screens */
}
```

**Key Responsive Considerations:**
- Hero: Particles reduce in count on mobile
- System diagram: Simplified/stacked on mobile
- Terminal: Full-width on mobile
- Typography: Fluid scaling with `clamp()`

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 90+ |
| Lighthouse Accessibility | 95+ |
| Time to Interactive | < 3s |
| Largest Contentful Paint | < 2.5s |
| Mobile Responsive | 100% |
| Cross-browser Support | Chrome, Firefox, Safari, Edge |

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Three.js performance on mobile | High | Reduce particle count, provide fallback |
| SVG animations janky | Medium | Use GSAP transform instead of path |
| Font loading flash | Low | Preload critical fonts, use `font-display: swap` |

---

## ✅ Approval Checklist

Before proceeding to implementation:

- [ ] Color palette approved ("Event Horizon")
- [ ] Typography choices confirmed
- [ ] Phase priorities reviewed

---

*Ready for review. Please confirm or suggest modifications before implementation begins.*
