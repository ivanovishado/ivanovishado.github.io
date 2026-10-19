// The driver: one variable, the orbit phase, feeds every map on the page and the header readout.
// phase = intro sweep + scroll through the stage + an idle term (the orbit never stops).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, isMobile, prefersReducedMotion, ease } from '../engine';
import { TrackMap, type Link } from './map';
import { PLACES, STATION, formatCoords, passOver, type PlaceKey } from './orbit';

type Mounted = {
  map: TrackMap;
  el: HTMLCanvasElement;
  visible: boolean;
  phase: (t: number) => number;
  links: (t: number) => number;
  rev: number;
  still: boolean;
};

const mounted: Mounted[] = [];
let readout: HTMLElement[] = [];
let lastText = '';

/** Hero: one continuous orbit that crosses Guadalajara during the intro. */
function heroConfig() {
  const place = PLACES.gdl;
  const lead = 1.34; // the first revolution is flown during the intro; the second crosses home
  return {
    place,
    lead,
    pass: passOver(place, lead),
    station: STATION,
    // Work done from home lands elsewhere: dashed signals to where it is used.
    links: [{ to: PLACES.bay, kind: 'signal' }, { to: PLACES.sao, kind: 'signal' }] as Link[],
    latSpan: 136,
    center: (w: number, h: number) => (w / h < 0.9 ? { lon: -92, lat: 4 } : { lon: -78, lat: 2 }),
    swath: 13,
  };
}

function passConfig(key: PlaceKey, descending = false) {
  const place = PLACES[key];
  const lead = 2.5; // two earlier revolutions cross the view first: parallel bands, east of the place
  return {
    place,
    lead,
    pass: passOver(place, lead, descending),
    station: STATION,
    links: (key === 'gdl' || key === 'nemo' ? [] : [{ to: place, kind: key === 'ksc' ? 'trip' : 'signal' }]) as Link[],
    latSpan: 64,
    center: (w: number, h: number) => ({ lon: place.lon + (w / h > 1.2 ? -8 : 6), lat: place.lat < -40 ? place.lat - 8 : Math.min(40, place.lat) }),
    swath: 7,
  };
}

/** Every trip (solid, it reveals the land it crosses) and where the work lands (dashed). */
export const TRIPS: Link[] = [
  { to: PLACES.toronto, kind: 'trip', label: '2015' },
  { to: PLACES.sao, kind: 'signal', label: 'Nubank' },
  { to: PLACES.baku, kind: 'trip', label: 'IAC 2023' },
  { to: PLACES.bay, kind: 'signal', label: 'Netflix' },
  { to: PLACES.samara, kind: 'trip', label: '2024' },
  { to: PLACES.milan, kind: 'trip', label: 'IAC 2024' },
  { to: PLACES.ksc, kind: 'trip', label: 'CRS-31, 2024' },
];

function tripsConfig() {
  return {
    station: STATION,
    links: TRIPS,
    reach: true,
    lead: 0,
    // Narrow frames zoom out so Bay Area and Samara both fit.
    latSpan: (w: number, h: number) => (w / h < 1.6 ? h / (w / 205) : 118),
    center: (w: number, h: number) => (w / h < 1.6 ? { lon: -36, lat: 18 } : { lon: -34, lat: 20 }),
    swath: 6,
  };
}

export function configFor(el: HTMLElement) {
  if (el.dataset.track === 'hero') return heroConfig();
  if (el.dataset.track === 'trips') return tripsConfig();
  const cfg = passConfig((el.dataset.place ?? 'gdl') as PlaceKey, el.dataset.descending !== undefined);
  // Index strips are wide and short: show more of the Earth around the place.
  return el.dataset.static !== undefined ? { ...cfg, latSpan: 70, swath: 9 } : cfg;
}

let frame = 0;
let isCoarse: boolean | null = null;
const coarse = () => (isCoarse ??= matchMedia('(pointer: coarse)').matches);

function tick(time: number) {
  const reduced = prefersReducedMotion();
  // Phones redraw the maps every other frame: the orbit is slow, the scroll stays at 60.
  const draw = !coarse() || (frame++ & 1) === 0;
  let primary: Mounted | undefined;
  for (const m of mounted) {
    if (m.still) continue;
    if (!primary) primary = m;
    if (draw && m.visible && !reduced) m.map.render(m.phase(time), time, m.links(time));
  }
  if (primary && readout.length) {
    const p = primary.phase(time);
    const s = primary.map.coordsAt(p);
    const text = `Rev ${String(primary.rev + Math.floor(p)).padStart(3, '0')}  ${formatCoords(s.lat, s.lon)}`;
    if (text !== lastText) {
      lastText = text;
      for (const r of readout) r.textContent = text;
    }
  }
}

export function startDriver() {
  gsap.ticker.add(tick);
  onPage(({ intro }) => {
    readout = [...document.querySelectorAll<HTMLElement>('[data-readout]')];
    const reduced = prefersReducedMotion();
    const els = [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-track]')];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const m = mounted.find((x) => x.el === e.target);
        if (m) m.visible = e.isIntersecting;
      }
    });
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const m = mounted.find((x) => x.el === e.target);
        if (m && m.map.resize()) m.map.render(m.phase(gsap.ticker.time), gsap.ticker.time, m.links(gsap.ticker.time));
      }
    });

    for (const el of els) {
      if (!TrackMap.supported(el)) continue;
      const cfg = configFor(el);
      const map = new TrackMap(el, { ...cfg, placePhase: cfg.lead, labels: true });
      const isHero = el.dataset.track === 'hero';
      const isTrips = el.dataset.track === 'trips';
      const still = el.dataset.static !== undefined;
      const st = { intro: reduced ? 1 : 0, scroll: 0, born: gsap.ticker.time };
      // Sweep to just past the place: the first frame after the intro has the place acquired.
      const sweep = cfg.lead + (isHero ? 0.14 : 0.045);
      const travel = isHero ? 1.7 : 0.12;
      const idleRate = isHero ? 1 / 360 : 1 / 1200; // revolutions per second at rest
      const phase = (t: number) =>
        isTrips ? (reduced ? 1 : st.intro)
        : still ? sweep
        : reduced ? sweep + travel * 0.62
        : st.intro * sweep + st.scroll * travel + Math.max(0, t - st.born - 3.1) * idleRate;
      const links = (t: number) => (isTrips ? phase(t) : still || reduced ? 1 : st.intro);
      // The readout counts revolutions from the one that crosses the place, so it agrees with the page.
      const rev = parseInt(el.dataset.rev ?? '1', 10) - Math.floor(sweep);
      const m: Mounted = { map, el, visible: true, phase, links, rev, still };
      mounted.push(m);
      io.observe(el);
      ro.observe(el);
      if (still) continue;
      if (!reduced) {
        const tween = gsap.to(st, { intro: 1, duration: isHero ? 3 : isTrips ? 3.2 : 1.8, ease: isHero || isTrips ? ease.soft : ease.out, paused: isTrips });
        // Trips fly when their map scrolls into view; everything else plays with the page intro.
        if (isTrips) ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: () => { tween.play(); } });
        else intro.add(tween, 0.1);
        const trigger = el.closest<HTMLElement>('[data-stage]') ?? el;
        ScrollTrigger.create({
          trigger,
          start: 'top top',
          end: isHero ? 'bottom bottom' : 'bottom top',
          onUpdate: (s) => { st.scroll = s.progress; },
        });
      }
      if (isHero && !reduced && !isMobile()) {
        // Pointer leans the map a few pixels: the stage answers before the first scroll.
        const wrap = el.parentElement!;
        const qx = gsap.quickTo(wrap, 'x', { duration: 1.2, ease: ease.soft });
        const qy = gsap.quickTo(wrap, 'y', { duration: 1.2, ease: ease.soft });
        const move = (e: PointerEvent) => { qx((e.clientX / innerWidth - 0.5) * -18); qy((e.clientY / innerHeight - 0.5) * -10); };
        addEventListener('pointermove', move, { passive: true });
        m.el.dataset.pointer = 'on';
        (m as Mounted & { off?: () => void }).off = () => removeEventListener('pointermove', move);
      }
    }
    document.fonts?.ready.then(() => mounted.forEach((m) => m.map.render(m.phase(gsap.ticker.time), gsap.ticker.time, m.links(gsap.ticker.time))));

    return () => {
      io.disconnect();
      ro.disconnect();
      for (const m of mounted) (m as Mounted & { off?: () => void }).off?.();
      mounted.length = 0;
      readout = [];
      lastText = '';
    };
  });
}
