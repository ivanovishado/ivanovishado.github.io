# DESIGN.md — Ground track

Planning artifacts for the portfolio redesign (branch `redesign/ground-track`). Later passes
read this first so the system stays consistent.

## Brief

- **Subject:** Ivan Galaviz, Senior Software Engineer at Netflix (promotional asset systems,
  agentic workflows), previously Nubank (Clojure) and Wizeline (Go, Python). Member of Mat X
  Space, whose MCB-1 experiment flew to the ISS on SpaceX CRS-31 (Nov 2024). Mentor, bilingual
  (EN/ES), studied in Guadalajara.
- **Audience:** engineering recruiters and hiring managers, peers, mentees, press.
- **Job:** in 3 seconds say "engineer, systems, and the person behind an experiment that went
  to orbit"; route to work, mentorship and email.
- **Assets:** all real content from the current site (roles, talks, press, education,
  recognition), headshot, Kennedy Space Center photo, Neue Montreal (owner's files),
  JetBrains Mono.
- **Language:** English (Spanish talks flagged ES).
- **Stack:** the existing Vite + TypeScript multi-page project. Engine pieces from the skill
  ported to vanilla TS, plus a small fetch-and-swap router so case pages get real transitions.
  Every page, mentorship included, shares one system and the router.

### Assumptions (owner to confirm)

- **Mexico City is the home station** since late 2026 (Guadalajara before; owner confirmed): almost all the work is remote, so it is
  drawn once, with a coverage ring, and each project's pass lands where the work is used:
  Netflix over the **Bay Area**, Nubank over **São Paulo**, Wizeline over **Guadalajara**.
- Trips (owner confirmed), each for work or education: Toronto 2015 (education), IAC Baku 2023
  (work), Samara 2024 (education), IAC Milan 2024 (work), Kennedy Space Center for the CRS-31
  launch, Nov 2024 (work), and regular visits to the Netflix offices in Los Gatos and Los Angeles (work).
- Case-study prose is written from facts on the current site; nothing beyond them is claimed.
  Paragraphs marked `data-placeholder` want the owner's own detail.
- The orbit is a **model** at ISS parameters (51.64° inclination, 92.9 min period), not live
  tracking. The day/night shading uses the real sun position for the visitor's current time.

## Concepts

| | Idea | Anchor | Signature | O / F / Fe / P |
|---|---|---|---|---|
| A. Material + place | The site is a ground track: a station orbit is drawn over a real Earth, and each chapter of the career is one pass over the place it happened | MCB-1 rode the ISS orbit for months; the career moves through Guadalajara, Mexico City, Cape Canaveral | Scrolling draws successive revolutions westward, and the Earth exists only where the track's swath has passed | 4 / 5 / 4 / 2 |
| B. Material | The page cycles between orbital day and night (+120 °C / −120 °C) like the sample on MISSE; type contracts in the cold like the muscle-fibre material | MCB-1's purpose: survive thermal cycling | one global temperature variable driving ink and type width | 3 / 5 / 3 / 2 |
| C. Formal | Every line exists in English and Spanish; hold a heading to read it in the other language | bilingual mentor, Spanish talks | headings flip language with a split-flap roll | 4 / 4 / 4 / 3 |

**Pick A.** Highest fit and the only one that survives to the 404 (Point Nemo). B is too close
to a scroll-driven temperature palette. Steal from C nothing structural; ES tags on Spanish
talks stay honest labels only.

## Concept card

```
Idea:        Ivan's work drawn as an orbit's ground track: each chapter is one pass over the place it happened.
Metaphor:    satellite ground tracks and imaging swaths (mission-control map, revolution counter, coordinates).
Signature:   the swath reveal. A sine track sweeps west to east over a dark Earth; land appears only
             inside the swath the track has flown. On case pages scroll adds revolutions (each shifted ~23° west, as real
             ground tracks do); pointer nudges the lead marker; at rest the orbit keeps going.
             Implemented in src/js/site/concept/ (orbit math + land mask + one driver).
Emotion:     calm precision, a control room at night. Then: "oh, that experiment actually went up".
Motion verb: sweep and lock. Things enter west to east like a track crossing the frame, then lock with an
             expo settle. Hovers draw a track line west to east; arrows travel east.
Station:     Mexico City is the home station (Guadalajara until late 2026). Passes land where the work is used and a dashed
             signal arc links them home; trips are solid arcs that reveal the land they cross
             (/trajectory/, linked from the nav and the MCB-1 section). Samara (53.2°N) sits just above the ISS reach line.
Screenshot:  the hero: "Ivan Galaviz" at poster size over three amber revolutions that have revealed the
             Americas in fine scanlines, with live coordinates in the corners.
```

## Art direction system

### Palette

Source of truth: `:root` in `src/styles/site.css`.

| Token | Value | Role |
|---|---|---|
| `--c-bg` | `#060a10` | eclipse ground (the night side of the map) |
| `--c-surface` | `#0c131d` | elevated launch slate chapters |
| `--c-surface-hi` | `#121c2a` | active row tint and hover surface |
| `--c-fg` | `#f0efe9` | sunlit ink on dark surfaces |
| `--c-muted` | `#94a0ae` | console secondary text on dark surfaces |
| `--c-line` | `rgb(240 239 233 / 0.12)` | hairline rules on dark surfaces |
| `--c-line-strong` | `rgb(240 239 233 / 0.22)` | stronger frames and monitor borders |
| `--c-paper` | `#f3f1ea` | sunlit lunar paper (light editorial chapters) |
| `--c-paper-soft` | `#e6e2d7` | recessed paper stage (portrait backing) |
| `--c-paper-fg` | `#0b111a` | primary ink on paper chapters |
| `--c-paper-muted` | `#4b5665` | secondary ink on paper chapters |
| `--c-paper-line` | `rgb(11 17 26 / 0.14)` | hairline rules on paper chapters |
| `--c-paper-accent` | `#a66200` | high-contrast amber accent on paper |
| `--c-accent` | `#f5a524` | solar ground-track trace, focus ring, the one field section |
| `--c-accent-ink` | `#060a10` | ink on solar accent fills |
| `--c-curtain` | `#0a1019` | page transitions, slightly lifted night |
| `--c-land` | `#92adc8` | map land scanlines (decorative canvas tone) |
| `--c-platform-ps` | `#1d4f9e` | PlayStation shelf case spine (PS4, PS5) |
| `--c-platform-xbox` | `#2f7a3a` | Xbox shelf case spine |

Near-black + one warm accent is a known default. It stays because the accent is not decoration:
it is the track itself, the only moving trace on a mission map, and it is used only where the
orbit is (track, marker, focus, the mentorship field). No glow, no gradient washes.

### Type

- **Neue Montreal** (owner's files, Regular 400 + Medium 500): display and text. Hero display
  `--t-hero` (`clamp(4.25rem, 0.85rem + 13.8vw, 15.25rem)`), tracking −0.058em, leading 0.83,
  optical `margin-left: -0.06em`; sub-page hero `--t-hero-sub` (`clamp(2.85rem, 1.1rem + 5.8vw, 7.25rem)`);
  navbar wordmark `--t-brand` (`1.125rem`). Below the hero, strictly 3 sizes (all >= 14 px):
  headings `--t-heading` (`clamp(1.625rem, 1.05rem + 1.75vw, 2.625rem)`, tracking −0.036em, leading 1.04),
  body `--t-body` (`1.0625rem` / 17 px, leading 1.55), and small `--t-sm` (`0.875rem` / 14 px).
- **JetBrains Mono Variable**: telemetry only (coordinates, revolution numbers, years, dates).
  `--t-sm` (`0.875rem` / 14 px), tabular figures, +0.01em, leading 1.45. Mono carries data, never decorative labels.
- No uppercase eyebrows. Section labels are coordinates, which are real information.

### Grid and rhythm

- 12 columns, gutter `clamp(1rem, 0.6rem + 1.6vw, 2.5rem)`, outer margin = gutter.
- Three hanging lines: **col 1**, **col 5**, **col 9**. Every text block starts on one.
- Section moods: hero = 100svh stage; work = normal; MCB-1 = airy; statement = airy;
  record = tight; mentorship = full field; footer = full viewport.

### Shape

Radius 0 everywhere except the marker dot. Hairlines 1 px.

### Motion language

- Eases: engine `ease.out` (expo.out) entrances, `ease.inOut` (expo.inOut) transitions,
  `ease.soft` (power3.out) hovers.
- Reveals: `data-reveal="sweep"` = `clip-path: inset(0 100% 0 0) → inset(0)`, 1.1 s; text lines
  mask up (engine split) with a small x offset (−12 px → 0) so lines also travel east.
- Page transition: a curtain whose leading edge is a sine wave (the ground track) sweeps west to
  east over the old page carrying the destination's coordinates, then exits east.
- Hovers: work rows draw an amber track line under the row west to east and the arrow travels
  east; the desktop nav is a track line (each page a tick, an amber marker rides to the
  current one and parks at the west end when none is); CTA fill sweeps west to east.
- Idle: the orbit keeps advancing (one revolution per ~6 min at rest), terminator from real
  time. Off screen the canvas stops; reduced motion shows one designed still frame.

### Composition plan

```
HERO (100svh stage, poster + scene)
┌──────────────────────────────────────────────────────────┐
│ Ivan Galaviz            Work  About  Mentorship  Email   │
│      ~~~~ track ~~~~/\~~~~~ scanline Earth in swath      │
│ IVAN                                                     │
│ GALAVIZ                         rev 003 · 20.67°N 103.35°W│
│ Senior software engineer at Netflix. Part of the team    │
│ whose experiment flew to the ISS.        [See the work]  │
└──────────────────────────────────────────────────────────┘
WORK (index list, cursor-following pass preview; inline mini track on touch)
 rev  title                         org          years    place
 001  Promotional asset workflows   Netflix      2023–    20.67°N
 002  How people apply              Nubank       2021–23  19.43°N
 ...
MCB-1 (asymmetric pair)
 [ photo 7 cols, Kennedy VAB ]     MCB-1 / story / facts (col 9)
STATEMENT (8–10 col paragraph at --t-heading) + portrait col 1–4 + instruments list
RECORD (tight 3-col ledger: kind / title / source)
MENTORSHIP (amber field, ink text, big line + CTA)
FOOTER (giant email, links, Point Nemo coordinates small)
```

Case page: track hero (pinned pass over that place, canvas) → title + meta row → context /
idea / craft / outcome on the hanging lines → next pass (full-width link, transition).

Mentorship: hero map centred on the home station → meta row (price, length, languages, where)
→ statement + record list → topics as ledger rows → three steps on an amber track line →
FAQ (details, amber + rotates) → amber field with the booking button.

Trajectory page: title + lede, 2:1 trips map, legend, every stop as a ledger (when, place,
what, coordinates), back to the passes.

Shelf: a personal preference kit (the small kit of personal things astronauts take to orbit).
Books and game cases stand on hairline planks as flat-shaded 3D objects turned to show their
east side (a book's page block, a case's opening edge in the platform's colour, with its thumb
notch); labels hang below. Thickness is true to the object. Hover turns the item square and
draws the plank amber west to east. Items come from `content/shelf.yaml`.

404: Point Nemo, 48°52′S 123°23′W, the farthest point from land where spacecraft are brought
down. Track over open ocean, nothing revealed.

### Genericness test

- A generic model would put a starfield or a glowing globe here. Changed to a flat
  mission-control map where land appears only under the swath (no globe, no stars, no glow).
- A generic work section would be cards. Changed to an index whose rows are revolutions, with
  previews that are the actual pass over that place.
- Generic labels ("01 / Work") replaced by coordinates and revolution numbers that are true
  to the model.
- The current site's Fraunces serif is retired (the skill flags it as a reflex choice).

### Idle and stillness decision

The orbit moves at rest on home and case pages (canvas on screen only). Below the hero the page
is still by design; the fixed coordinate readout keeps ticking with the orbit.
