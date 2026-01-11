# 🚀 Technical Implementation Plan: "Orbital Orchestrator" (v2)

> **Project:** Ivan Galaviz Portfolio Rebrand
> **Status:** Active / In-Progress
> **Last Updated:** 2026-01-10
> **Based on:** DESIGN_CHARTER.md

---

## 1. High-Level Approach & Strategy

### **Layout Strategy (Mobile First)**
*   **Fluid Typography**: Implementation of `clamp()` functions for all "Cabinet Grotesk" headers to ensure cinematic scaling from mobile (360px) to ultra-wide (2560px).
*   **Grid System**: 
    *   **Mobile**: 4-column fluid grid.
    *   **Desktop**: 12-column robust grid.
    *   **Mission Control (Footer)**: Usage of CSS Subgrid for complex alignments.
*   **Viewport Handling**: Strict `100svh` (Small Viewport Height) handling for the Hero section to prevent mobile browser chrome jank.

### **Key Challenges & Solutions**
1.  **Hybrid Rendering (DOM + Canvas)**:
    *   *Challenge*: Blending Three.js hero particles with standard DOM content.
    *   *Solution*: `position: fixed` WebGL canvas at `z-index: -1` with `pointer-events: none` (except for specific interactive zones).
2.  **The "Dual-Slot" Transition (Flight Logs)**:
    *   *Challenge*: Swapping mission content needs to feel like a physical cartridge change.
    *   *Solution*: GSAP timeline triggering a CSS `clip-path` wipe + "white noise" opacity flash during the data swap.
3.  **Secure AI Integration (No Framework)**:
    *   *Challenge*: Need to hide API keys/URLs but we are using Vanilla JS (no build step injection).
    *   *Solution*: **Netlify Functions** (or Vercel Functions).
    *   *Mechanism*: We deploy a `functions/chat.js` file (Node.js). Netlify exposes this as an API endpoint. This function has access to secure `process.env.VARS` on the server. The frontend simply fetches `/.netlify/functions/chat`.
    *   *Benefit*: Secure, free tier, no complex React/Next.js setup required.

---

## 2. Component Architecture (The Tree)

Moving to a standard ES6 Module system (no more `window.Global` namespace pollution).

### **Atoms (Global Utilities)**
*   **`MagneticButton`** (`magnetic.js`): Applies GSAP physics to pull elements toward the cursor on hover.
*   **`ScrambleText`** (`text-scramble.js`): Decodes text on viewport entry (`X#9F` -> `EXPERIENCE`).
*   **`GlitchSpan`** (CSS/JS): Randomly flickers text characters (Mission 02 style).

### **Molecules (Functional Units)**
*   **`FlightLogControls`**: Tab system to toggle Mission 01 / Mission 02.
*   **`MissionCard`**: Displays "Orbit", "Status", and "Media Uplink" data.
*   **`TerminalInput`**: Handles user typing, cursor blinking, and command parsing.

### **Organisms (Complex Sections)**
1.  **`HeroSection`** (`hero-particles.js`)
    *   Manages Three.js scene, camera, resize events, and scroll parallax.
2.  **`FlightLogEngine`** (`flight-logs.js`)
    *   **State**: Holds active mission data (`misse-ff` vs `samara-cs`).
    *   **Renderer**: orchestration of DOM updates (Title, Status, Description) and 3D/SVG placeholder swapping.
3.  **`OrchestratorDiagram`** (`system-diagram.js`)
    *   **SVG Layer**: Static "Load Balancer", "Services", "DB" nodes.
    *   **Traffic Layer**: Animated "packets" (dots) flowing through paths.
    *   **Logic**: `runTrafficLoop()` (Pulse -> Spike -> Scale).

---

## 3. Data Layer & State Management

### **Schema (TypeScript Interfaces)**

```typescript
interface MissionData {
  id: string;             // 'misse-ff' | 'samara-cs'
  title: string;          // 'MISSE-FF / CRS-31'
  status: string;         // 'RETURNED TO EARTH'
  location?: string;      // 'SAMARA, RUSSIA'
  description: string;    // 'Material Science in Microgravity...'
  stats: Record<string, string>; // { "DURATION": "6 MONTHS" }
  mediaLinks: Array<{ label: string; url: string }>;
  visualType: 'artifact' | 'satellite';
}

interface AIChatRequest {
  query: string;
  context: string; // 'terminal'
}
```

### **State Strategy**
*   **Files**: `scripts/v2/data/missions.js` and `scripts/v2/data/career.js` (SSOT for content).
*   **Runtime State**: `activeFlightLog`, `soundEnabled`, `chatHistory`.

---

## 4. Implementation Steps & Phasing

### Phase 1: Foundation (Completed ✅)
*   [x] Setup Tailwind v4, Fonts (Cabinet/JetBrains), Lenis Scroll.

### Phase 1.5: Component Refactor (Completed ✅)
*   [x] **Module System**: Convert `window.HeroParticles` patterns to `export class HeroParticles` (ES Modules).
    *   `scripts/v2/utils/TextScramble.js`
    *   `scripts/v2/components/HeroParticles.js`
    *   `scripts/v2/components/MagneticHover.js`
    *   `scripts/v2/main.js` (Import entry point)
*   [x] **HTML Update**: Update `<script>` tags to `type="module"`.
*   [x] **Cleanup**: Remove global namespace pollution.

### Phase 2: The "Flight Logs" Engine (Next)
*   [ ] **HTML**: Structure the "Dual-Slot" container with "Cartridge" slots.
*   [ ] **JS**: Implement `flight-logs.js` state machine.
*   [ ] **Visuals**: Create CSS/SVG placeholders for the "Specimen Container" and "Wireframe Satellite".
*   [ ] **Animation**: "Scanline Wipe" transition effect.

### Phase 3: The Orchestrator (System Diagram)
*   [ ] **SVG**: Draw the core system architecture (LB -> Svc -> DB).
*   [ ] **GSAP**: Implement `system-diagram.js` with `MotionPathPlugin`.
*   [ ] **Logic**: Create the traffic spike simulation loop.

### Phase 4: Mission Timeline (Career)
*   [ ] **HTML**: Vertical timeline layout.
*   [ ] **JS**: `timeline.js` to handle scroll-linked SVG path drawing.
*   [ ] **Content**: Populate `career.js` with Netflix, Nubank, Wizeline data.

### Phase 5: Skills Terminal & AI Integration
*   [ ] **UI**: Retro terminal window styling.
*   [ ] **JS**: `terminal.js` for input handling and local command registry (`help`, `stack`).
*   [ ] **Backend**: Create `netlify/functions/chat.js` (or `functions/chat.js`).
*   [ ] **Security**: Configure environment variables in Netlify Dashboard (not in code).
*   [ ] **Integration**: Frontend calls `/.netlify/functions/chat`, backend calls secure AI endpoint.

### Phase 6: Mission Control (Footer)
*   [ ] **Layout**: Grid layout with magnetic social buttons.
*   [ ] **Polish**: "Book Mentoring" and PDF download actions.
