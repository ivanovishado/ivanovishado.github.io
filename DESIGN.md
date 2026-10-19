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

- **Guadalajara is the home station** (owner confirmed): almost all the work is remote, so it is
  drawn once, with a coverage ring, and each project's pass lands where the work is used:
  Netflix over the **Bay Area**, Nubank over **São Paulo**, Wizeline at the station itself.
- Trips (owner confirmed): Toronto 2015, IAC Baku 2023, Samara 2024, IAC Milan 2024, Kennedy
  Space Center for the CRS-31 launch, Nov 2024 (assumed attended, from the launch-guest photo).
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
             inside the swath the track has flown. Scroll adds revolutions (each shifted ~23° west, as real
             ground tracks do); pointer nudges the lead marker; at rest the orbit keeps going.
             Implemented in src/js/site/concept/ (orbit math + land mask + one driver).
Emotion:     calm precision, a control room at night. Then: "oh, that experiment actually went up".
Motion verb: sweep and lock. Things enter west to east like a track crossing the frame, then lock with an
             expo settle. Hovers draw a track line west to east; arrows travel east.
Station:     Guadalajara is the home station. Passes land where the work is used and a dashed
             signal arc links them home; trips are solid arcs that reveal the land they cross
             (/trajectory/, linked from the nav and the MCB-1 section). Samara (53.2°N) sits just above the ISS reach line.
Screenshot:  the hero: "Ivan Galaviz" at poster size over three amber revolutions that have revealed the
             Americas in fine scanlines, with live coordinates in the corners.
```

## Art direction system

### Palette

| Role | Hex | Source |
|---|---|---|
| ground (Eclipse) | `#07090c` | the night side of the map |
| ink (Sunlit) | `#ecebe6` | cool ivory of a lit display |
| muted | `#8f959d` | console secondary text (AA on ground, 6.7:1) |
| line | `rgb(236 235 230 / 0.12)` | graticule hairlines |
| terrain | `#33404d` | land scanlines (decorative only) |
| accent (Track) | `#f5a524` | the ground-track trace, focus ring, the one field section |
| curtain | `#0c1015` | transitions, slightly lifted night |

Near-black + one warm accent is a known default. It stays because the accent is not decoration:
it is the track itself, the only moving trace on a mission map, and it is used only where the
orbit is (track, marker, focus, the mentorship field). No glow, no gradient washes.

### Type

- **Neue Montreal** (owner's files, Regular 400 + Medium 500): display and text. Display mega
  `clamp(4.25rem, 0.6rem + 15.4vw, 17rem)`, tracking −0.055em, leading 0.84, optical
  `margin-left: -0.065em`. Headings `--t-xl` tracking −0.04em. Body 17–18 px, 1.5 leading.
- **JetBrains Mono Variable**: telemetry only (coordinates, revolution numbers, years, dates).
  12–13 px, tabular figures, +0.02em. Mono carries data, never decorative labels.
- No uppercase eyebrows. Section labels are coordinates, which are real information.

### Grid and rhythm

- 12 columns, gutter `clamp(1rem, 0.6rem + 1.6vw, 2.5rem)`, outer margin = gutter.
- Three hanging lines: **col 1**, **col 5**, **col 9**. Every text block starts on one.
- Section moods: hero = 200svh sticky stage; work = normal; MCB-1 = airy; statement = airy;
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
  east; nav links underline-draw; CTA fill sweeps west to east.
- Idle: the orbit keeps advancing (one revolution per ~6 min at rest), terminator from real
  time. Off screen the canvas stops; reduced motion shows one designed still frame.

### Composition plan

```
HERO (sticky stage, poster + scene)
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
STATEMENT (8–10 col paragraph at t-l) + portrait col 1–4 + instruments list
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
