// Page transition: a curtain whose leading edge is a ground track (a sine) sweeps west to east
// over the old page carrying the destination, then exits east off the new one.
import { gsap } from 'gsap';
import { setTransition, ease } from '../engine';

const N = 48;

function edge(progress: number, wave: number) {
  // x of the edge (in % of width) at row i; amplitude shrinks as the edge settles.
  const amp = 7 * (1 - Math.abs(progress - 0.5) * 1.2);
  const xs: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    xs.push(progress * 116 - 8 + amp * Math.sin(t * Math.PI * 2 * 0.9 + wave));
  }
  return xs;
}

function paint(panel: HTMLElement, path: SVGPathElement, p: number, wave: number, covering: boolean) {
  const xs = edge(p, wave);
  const pts = xs.map((x, i) => `${x.toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  // Covering: the panel is everything west of the edge. Uncovering: everything east of it.
  const poly = covering
    ? ['0% 0%', ...pts, '0% 100%']
    : ['100% 0%', ...pts, '100% 100%'];
  panel.style.clipPath = `polygon(${poly.join(',')})`;
  const w = innerWidth;
  const h = innerHeight;
  path.setAttribute('d', xs.map((x, i) => `${i ? 'L' : 'M'}${((x / 100) * w).toFixed(1)} ${((i / N) * h).toFixed(1)}`).join(''));
}

export function initCurtain() {
  setTransition({
    leave: (c, to) => {
      const panel = c.querySelector<HTMLElement>('.curtain__panel')!;
      const path = c.querySelector<SVGPathElement>('.curtain__edge path')!;
      c.querySelector('.curtain__edge')!.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
      c.querySelector('.curtain__title')!.textContent = to.title;
      c.querySelector('.curtain__coords')!.textContent = to.label;
      const s = { p: 0 };
      const label = c.querySelectorAll('.curtain__label > *');
      return gsap.timeline()
        .set(c, { autoAlpha: 1 })
        .set(label, { autoAlpha: 0, x: -24 })
        .to(s, { p: 1, duration: 0.95, ease: ease.inOut, onUpdate: () => paint(panel, path, s.p, s.p * 3, true) })
        .to(label, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.06, ease: ease.out }, 0.5);
    },
    enter: (c) => {
      const panel = c.querySelector<HTMLElement>('.curtain__panel')!;
      const path = c.querySelector<SVGPathElement>('.curtain__edge path')!;
      const s = { p: 0 };
      return gsap.timeline()
        .to(c.querySelectorAll('.curtain__label > *'), { autoAlpha: 0, x: 24, duration: 0.35, stagger: 0.04, ease: ease.soft })
        .to(s, { p: 1, duration: 0.95, ease: ease.inOut, onUpdate: () => paint(panel, path, s.p, 3 + s.p * 3, false) }, 0.1)
        .set(c, { autoAlpha: 0 })
        .add(() => { panel.style.clipPath = ''; path.setAttribute('d', ''); });
    },
  });
}
