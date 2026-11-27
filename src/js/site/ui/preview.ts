// Interactive page controls:
//   1. Work sticky orbital pass monitor (sweeps live track + real distance on hover/focus)
//   2. Trajectory stop ledger <-> map arc highlighting
//   3. Accessible connected segmented filter tabs (Writing/Talks/Press and Shelf)
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, ease } from '../engine';
import { TrackMap } from '../concept/map';
import { configFor, setTripsHighlight } from '../concept/driver';
import { PLACES, STATION, distanceKm, type PlaceKey } from '../concept/orbit';

function initWorkMonitor(reduced: boolean) {
  const list = document.querySelector<HTMLElement>('[data-index]');
  const monitor = document.querySelector<HTMLElement>('.work-monitor');
  const canvas = monitor?.querySelector<HTMLCanvasElement>('canvas');
  if (!list || !monitor || !canvas || !TrackMap.supported(canvas)) return undefined;

  const placeEl = monitor.querySelector<HTMLElement>('[data-monitor-place]');
  const coordsEl = monitor.querySelector<HTMLElement>('[data-monitor-coords]');
  const distEl = monitor.querySelector<HTMLElement>('[data-monitor-distance]');
  const summaryEl = monitor.querySelector<HTMLElement>('[data-monitor-summary]');
  const links = [...list.querySelectorAll<HTMLAnchorElement>('a[data-place]')];
  if (!links.length) return undefined;

  let map: TrackMap | null = null;
  let activeKey = '';
  const st = { p: 0 };
  let sweep: gsap.core.Tween | null = null;
  let idleLead = 0;

  const view = ScrollTrigger.create({ trigger: monitor, start: 'top bottom', end: 'bottom top' });

  const renderNow = (time = gsap.ticker.time) => {
    if (!map) return;
    map.render(st.p, time, 1);
  };

  const tick = (time: number) => {
    if (reduced || !map || !view.isActive) return;
    if (!sweep?.isActive()) st.p += 1 / 28000;
    map.render(st.p, time, 1);
  };
  gsap.ticker.add(tick);

  const select = (a: HTMLAnchorElement, immediate = false) => {
    const placeKey = (a.dataset.place ?? 'cdmx') as PlaceKey;
    const next = `${placeKey}-${a.dataset.descending ?? ''}-${a.dataset.rev ?? ''}`;
    links.forEach((item) => item.closest('.index__row')?.toggleAttribute('data-active', item === a));
    if (next === activeKey) return;
    activeKey = next;

    const cfg = configFor(a);
    idleLead = cfg.lead;
    map = new TrackMap(canvas, { ...cfg, placePhase: cfg.lead, labels: true });
    map.resize();

    const targetPlace = PLACES[placeKey];
    const km = targetPlace ? distanceKm(STATION, targetPlace) : 0;
    if (placeEl) placeEl.textContent = a.dataset.location ?? targetPlace?.name ?? '';
    if (coordsEl) coordsEl.textContent = a.dataset.coords ?? '';
    if (distEl) distEl.textContent = km > 0 ? `${km.toLocaleString('en-US')} km from ${STATION.name}` : `Home station · ${STATION.name}`;
    if (summaryEl) summaryEl.textContent = a.dataset.summary ?? '';

    sweep?.kill();
    const targetPhase = idleLead + 0.14;
    if (reduced || immediate) {
      st.p = targetPhase;
      renderNow();
    } else {
      st.p = idleLead - 0.32;
      sweep = gsap.to(st, { p: targetPhase, duration: 1.05, ease: ease.out, onUpdate: () => renderNow() });
      renderNow();
    }
  };

  const ro = new ResizeObserver(() => {
    if (map && map.resize()) renderNow();
  });
  ro.observe(canvas);

  const onEnter = (e: Event) => select(e.currentTarget as HTMLAnchorElement);
  links.forEach((a) => {
    a.addEventListener('pointerenter', onEnter);
    a.addEventListener('focus', onEnter);
  });

  // Prime with the first project immediately so the stage is never empty.
  select(links[0]!, true);

  return () => {
    gsap.ticker.remove(tick);
    sweep?.kill();
    ro.disconnect();
    view.kill();
    links.forEach((a) => {
      a.removeEventListener('pointerenter', onEnter);
      a.removeEventListener('focus', onEnter);
    });
  };
}

function initTrajectoryLinks() {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-stop-place]')];
  if (!rows.length) return undefined;

  const enter = (e: Event) => {
    const row = e.currentTarget as HTMLElement;
    const key = row.dataset.stopPlace as PlaceKey;
    rows.forEach((r) => r.toggleAttribute('data-active', r === row));
    setTripsHighlight(key);
  };
  const leave = () => {
    rows.forEach((r) => r.removeAttribute('data-active'));
    setTripsHighlight(null);
  };

  rows.forEach((r) => {
    r.addEventListener('pointerenter', enter);
    r.addEventListener('focusin', enter);
    r.addEventListener('pointerleave', leave);
    r.addEventListener('focusout', leave);
  });

  return () => {
    setTripsHighlight(null);
    rows.forEach((r) => {
      r.removeEventListener('pointerenter', enter);
      r.removeEventListener('focusin', enter);
      r.removeEventListener('pointerleave', leave);
      r.removeEventListener('focusout', leave);
    });
  };
}

function initFilterTabs(reduced: boolean) {
  const groups = [...document.querySelectorAll<HTMLElement>('[data-filter-group]')];
  if (!groups.length) return undefined;
  const cleanups: (() => void)[] = [];

  for (const group of groups) {
    const scope = group.dataset.filterGroup!;
    const tabs = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const items = [...document.querySelectorAll<HTMLElement>(`[data-filter-target="${scope}"]`)];
    const countEl = document.querySelector<HTMLElement>(`[data-filter-count="${scope}"]`);
    if (!tabs.length || !items.length) continue;

    const apply = (tab: HTMLButtonElement, animate: boolean) => {
      const filter = tab.dataset.filter ?? 'all';
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      const shown: HTMLElement[] = [];
      for (const item of items) {
        const cat = item.dataset.category ?? '';
        const match = filter === 'all' || cat.split(' ').includes(filter);
        item.hidden = !match;
        if (match) shown.push(item);
      }
      if (countEl) {
        countEl.textContent = `${shown.length} ${shown.length === 1 ? 'item' : 'items'}`;
      }
      if (animate && !reduced && shown.length) {
        gsap.fromTo(shown, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.24, stagger: 0.025, ease: ease.soft, clearProps: 'opacity,transform' });
      }
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    const onClick = (e: Event) => apply(e.currentTarget as HTMLButtonElement, true);
    const onKey = (e: KeyboardEvent) => {
      const idx = tabs.indexOf(e.currentTarget as HTMLButtonElement);
      if (idx < 0) return;
      let next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next >= 0) {
        e.preventDefault();
        tabs[next]!.focus();
        apply(tabs[next]!, true);
      }
    };

    tabs.forEach((t) => {
      t.addEventListener('click', onClick);
      t.addEventListener('keydown', onKey);
    });

    cleanups.push(() => {
      tabs.forEach((t) => {
        t.removeEventListener('click', onClick);
        t.removeEventListener('keydown', onKey);
      });
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

export function initPreview() {
  onPage(({ media }) => {
    const cleanups: (() => void)[] = [];
    if (!media.mobile) {
      const offMonitor = initWorkMonitor(media.reduce);
      if (offMonitor) cleanups.push(offMonitor);
    }
    if (!media.reduce) {
      document.querySelectorAll<HTMLImageElement>('.space__frame img, .case-figure img').forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -5, scale: 1.08 },
          {
            yPercent: 5,
            scale: 1.08,
            ease: 'none',
            scrollTrigger: { trigger: img.parentElement ?? img, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
    }
    const offTraj = initTrajectoryLinks();
    if (offTraj) cleanups.push(offTraj);
    const offTabs = initFilterTabs(media.reduce);
    if (offTabs) cleanups.push(offTabs);
    return () => cleanups.forEach((fn) => fn());
  });
}
