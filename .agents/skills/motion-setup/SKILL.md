---
name: motion-setup
description: How page motion is set up in this portfolio, centered on the gsap.matchMedia handler in src/js/site/engine. Use this whenever you add or edit an animation, tween, timeline, ScrollTrigger, SplitText, reveal, hover or pointer effect, Lenis behavior, or any onPage() setup under src/js/site/, and whenever code needs to branch on reduced motion, touch or the mobile breakpoint (prefers-reduced-motion, matchMedia, isMobile, 767px). Also use it when adding a new media condition, debugging motion that breaks after resizing or toggling reduced motion, or seeing leaked ScrollTriggers or listeners after a page navigation. Read it before touching that code, even for a small tweak.
---

# Motion setup

Page motion in this repo runs inside **one `gsap.matchMedia()` per page**, owned by the engine
(`src/js/site/engine/index.ts`). Page code doesn't create its own; it registers with `onPage()`
and reads the current media from its argument. Read `DESIGN.md` for the motion language. This skill
covers how to set it up so it survives navigations and media changes.

## The lifecycle

- `initPage()` calls `mm.add(media, handler)`. The handler runs reveals plus every `onPage` function
  and records each tween, timeline, ScrollTrigger and SplitText they create.
- **Navigation**: the router calls `cleanup()`, which runs returned cleanups and calls `mm.revert()`.
  The new page gets a fresh `matchMedia`.
- **Media change** (reduced motion toggled, window crossing 767px, touch changing): GSAP reverts the
  handler and runs it again on the same page, without a navigation. If the intro already played,
  the engine calls `intro.progress(1)`, so intro content lands in its end state instead of replaying.

So every `onPage` function can run **many times on one page**. It has to be idempotent: set up from
scratch, return a cleanup for anything GSAP doesn't own.

## Writing page code

```ts
onPage(({ intro, media, path, first }) => {
  if (media.touch) return;                 // decide from `media`, not by querying the browser
  const d = media.reduce ? 0.01 : 0.7;
  const t = gsap.to(st, { p: 1, duration: d });        // recorded: reverted for you
  ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: () => t.play() });
  addEventListener('pointermove', move, { passive: true });
  return () => removeEventListener('pointermove', move); // not GSAP: clean it yourself
});
```

- **Read `media` (`reduce`, `motion`, `touch`, `mobile`) from the page argument.** Don't call
  `prefersReducedMotion()` or `matchMedia()` to make setup decisions inside `onPage`. A one-off
  query is right when the page loads and stale after the user resizes. `media` is always current
  because the handler re-runs when it changes.
- **Don't create another `gsap.matchMedia()` in page code.** The engine's handler already re-runs on
  these conditions, and a second one is another lifecycle to keep in step with navigations. If you
  need a new condition, add it to the engine (below).
- **Create tweens and ScrollTriggers synchronously in the page function.** The context only records
  what's created while the handler runs. A ScrollTrigger created later (in a `.then()`, a
  `setTimeout`, or `document.fonts.ready`) isn't reverted and leaks into the next page. Short
  tweens created in event handlers are fine, as long as the listener itself is removed in the
  returned cleanup.
- **The returned cleanup is for non-GSAP things only:** listeners, observers, module state like
  `mounted.length = 0`. Never call `revert()` in it, because GSAP already does.
- **Anything outside the intro replays after a media change.** Scroll-triggered tweens that already
  fired run again (the trips map flies in again after crossing 767px). If something must not
  replay, add it to `intro`, which jumps to its end, or derive its state from scroll position.

## Global code (outlives pages)

Some code runs once from `boot()` and survives navigations: the menu (`ui/frame.ts` `initMenu`),
Lenis (`engine/scroll.ts`) and the transition curtain.

- If it needs to **react** to a media change, give it its own `gsap.matchMedia()` with a cleanup
  that fully undoes it. Lenis does this: under reduced motion it destroys Lenis, restores
  `lagSmoothing` and falls back to a native scroll listener.
- If it only needs the value **at interaction time** (opening the menu, starting a transition),
  calling `prefersReducedMotion()` right then is correct, because it reads the live value.
- For tweens that a user can retrigger (open/close, show/hide), keep a handle and `kill()` it before
  starting the next one, or pass `overwrite: 'auto'`. Otherwise an old tween's `onComplete` can
  undo the new state. The menu used to hide itself on a quick close and reopen because of this.

## Adding a media condition

1. Add the query to `media` in `engine/env.ts`. The `Media` type follows from it.
2. Add it to the object built in the handler in `engine/index.ts`:
   `media = { reduce: !!c.reduce, ... }`. That list is explicit.
3. Keep `reduce` and `motion` both there. They're complements, so one always matches.
   `gsap.matchMedia` only calls a conditions handler while **at least one** condition matches;
   without the pair, a desktop user with motion on would get no page setup at all.

Every condition re-runs the **whole** page setup whenever it changes, so only add one whose change
should rebuild the page. Something cosmetic belongs in CSS media queries.

## Pausing work off screen

Use a ScrollTrigger and read `isActive`, not an `IntersectionObserver`: it's recorded and reverted
with everything else, and it stays on the one clock.
For a sticky element, trigger on the section that scrolls through the viewport (`[data-stage]`),
not on the sticky element itself. See `concept/driver.ts`:
`ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top' })`.

## Verifying a change

Run `bun run typecheck`, then `bun run build` and the `prod` preview (or `dev`):

- **Media change**: `resize_window` to the mobile preset and back to desktop. This crosses 767px and
  also flips `touch`. Afterwards no on-screen `[data-split]` or `[data-reveal]` should have
  computed `visibility: hidden`, and the console should show no errors.
- **Navigation**: go to another page and back. Only the current page's effects should run. One way
  to check the maps is to wrap `CanvasRenderingContext2D.prototype.clearRect` and count calls per
  `canvas.dataset.track`: they should drop to zero off screen and for pages you left.
- **Reduced motion** can't be toggled in the browser pane. It goes through the same handler as
  the resize, so a passing resize test is the closest check. Say so when you report.
