// Engine core: page lifecycle for a multi-page static site.
//   boot(setup)            once, on first load: setup → page init → intro
//   leave() → cleanup()    before the router swaps <main> (leave runs in parallel with the fetch)
//   enter()                after the new <main> is in the DOM: init → enter animation → intro
// Project code hooks in with onPage(fn): fn runs on every page load inside a gsap.matchMedia, so the
// tweens and ScrollTriggers it creates are reverted automatically. Return a cleanup for the rest.
// When a media condition changes (reduced motion, mobile width, touch) the page setup is reverted
// and run again with the new `media`, without a navigation.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScroll, resetScroll, startScroll, stopScroll } from './scroll';
import { initReveals } from './reveal';
import { playEnter, playLeave } from './transition';
import { media as queries, prefersReducedMotion, type Media } from './env';

export { onScroll, scrollState, scrollToTarget, stopScroll, startScroll } from './scroll';
export { setTransition } from './transition';
export { ease, prefersReducedMotion, type Media } from './env';

export type PageFn = (page: { intro: gsap.core.Timeline; path: string; first: boolean; media: Media }) => void | (() => void);
const pageFns = new Set<PageFn>();
const cleanups: (() => void)[] = [];
let mm: gsap.MatchMedia | null = null;
let ctx: gsap.Context | null = null;
let intro: gsap.core.Timeline | null = null;
let media: Media = { reduce: false, motion: true, touch: false, mobile: false };
let started = false; // the intro has played: a re-run after a media change jumps it to the end
let ready = false;
let booted = false;
let first = true;

/** Run fn on every page load (and now, if a page is ready). Returns an unsubscribe. */
export function onPage(fn: PageFn) {
  pageFns.add(fn);
  if (ready) runPageFn(fn);
  return () => { pageFns.delete(fn); };
}

function runPageFn(fn: PageFn) {
  ctx?.add(() => {
    const c = fn({ intro: intro!, path: location.pathname, first, media });
    if (typeof c === 'function') cleanups.push(c);
  });
}

export function syncFlags() {
  const h = document.documentElement.classList;
  h.add('js', 'is-booted');
  h.toggle('motion', !prefersReducedMotion());
}

function runCleanups() {
  cleanups.splice(0).forEach((c) => c());
}

function initPage() {
  mm = gsap.matchMedia();
  mm.add(queries, (context) => {
    const c = context.conditions ?? {};
    media = { reduce: !!c.reduce, motion: !!c.motion, touch: !!c.touch, mobile: !!c.mobile };
    ctx = context;
    syncFlags();
    intro = initReveals(document.getElementById('main') ?? document);
    ready = true;
    pageFns.forEach(runPageFn);
    if (started) intro.progress(1);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { ready = false; runCleanups(); };
  });
}

/** First load. `setup` registers global behavior (transition, driver) before the first page. */
export async function boot(setup?: () => void) {
  if (booted) return;
  booted = true;
  syncFlags();
  initScroll();
  setup?.();
  initPage();
  document.documentElement.classList.add('is-loaded');
  intro?.play();
  started = true;
  first = false;
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/** Play the leave animation (resolves when the screen is covered). */
export async function leave(to: { title: string; label: string }) {
  stopScroll();
  await playLeave(to);
}

/** Tear down the current page: reverts every tween, ScrollTrigger and split. */
export function cleanup() {
  if (!ready) return;
  ready = false;
  runCleanups();
  mm?.revert();
  mm = null;
  ctx = null;
  started = false;
}

/** Init the new page. `transition: false` for back/forward, where no leave ran. */
export async function enter({ transition = true, scrollY = 0 } = {}) {
  if (!booted) return;
  cleanup();
  resetScroll(scrollY);
  initPage();
  if (transition) await playEnter();
  startScroll();
  intro?.play();
  started = true;
}
