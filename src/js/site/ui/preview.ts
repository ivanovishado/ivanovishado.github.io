// Work index: a pass preview follows the pointer and sweeps the track over the row's place.
import { gsap } from 'gsap';
import { onPage, onScroll, isTouch, prefersReducedMotion, ease } from '../engine';
import { TrackMap } from '../concept/map';
import { configFor } from '../concept/driver';

export function initPreview() {
  onPage(() => {
    const list = document.querySelector<HTMLElement>('[data-index]');
    const box = document.querySelector<HTMLElement>('.preview');
    const canvas = box?.querySelector('canvas');
    if (!list || !box || !canvas || isTouch()) return;
    const rev = box.querySelector<HTMLElement>('[data-preview-rev]')!;
    const coords = box.querySelector<HTMLElement>('[data-preview-coords]')!;
    const reduced = prefersReducedMotion();
    const x = gsap.quickTo(box, 'x', { duration: reduced ? 0.01 : 0.7, ease: ease.soft });
    const y = gsap.quickTo(box, 'y', { duration: reduced ? 0.01 : 0.7, ease: ease.soft });
    let px = 0;
    let py = 0;
    let map: TrackMap | null = null;
    let key = '';
    const st = { p: 0 };
    let sweep: gsap.core.Tween | null = null;
    const draw = () => map?.render(st.p, gsap.ticker.time);

    // The card rides in the empty band between the coordinates and the titles, so it never
    // covers the title being read; where that band is too narrow it trails the pointer.
    const firstTitle = list.querySelector<HTMLElement>('.index__title');
    const place = () => {
      const left = firstTitle?.getBoundingClientRect().left ?? 0;
      const w = box.offsetWidth;
      const band = left - w - 24 > 150;
      x(band ? left - w - 24 : px + 24);
      y(py);
    };
    const move = (e: PointerEvent) => { px = e.clientX; py = e.clientY; place(); };
    const show = (e: Event) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const next = `${a.dataset.place}-${a.dataset.descending ?? ''}-${a.dataset.rev}`;
      if (e.type === 'focus') {
        const r = a.getBoundingClientRect();
        px = r.left + r.width * 0.62; py = r.top + r.height / 2;
        place();
      }
      if (next !== key) {
        key = next;
        const cfg = configFor(a);
        map = new TrackMap(canvas, { ...cfg, placePhase: cfg.lead, labels: true });
        map.resize();
        rev.textContent = `Rev ${String(a.dataset.rev).padStart(3, '0')}`;
        coords.textContent = a.dataset.coords ?? '';
        sweep?.kill();
        st.p = reduced ? cfg.lead + 0.12 : cfg.lead - 0.3;
        sweep = gsap.to(st, { p: cfg.lead + 0.14, duration: reduced ? 0.01 : 1.1, ease: ease.out, onUpdate: draw });
        draw();
      }
      gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: ease.out, overwrite: 'auto' });
    };
    const hide = () => gsap.to(box, { autoAlpha: 0, scale: 0.92, duration: 0.35, ease: ease.soft, overwrite: 'auto' });

    const links = [...list.querySelectorAll<HTMLAnchorElement>('a[data-place]')];
    links.forEach((a) => { a.addEventListener('pointerenter', show); a.addEventListener('focus', show); a.addEventListener('blur', hide); });
    list.addEventListener('pointerleave', hide);
    addEventListener('pointermove', move, { passive: true });
    // pointerleave never fires when the page scrolls out from under a still pointer.
    const off = onScroll(() => { if (!list.contains(document.elementFromPoint(px, py))) hide(); });
    gsap.set(box, { scale: 0.92 });
    return () => {
      removeEventListener('pointermove', move);
      off();
      links.forEach((a) => { a.removeEventListener('pointerenter', show); a.removeEventListener('focus', show); a.removeEventListener('blur', hide); });
      list.removeEventListener('pointerleave', hide);
    };
  });
}
