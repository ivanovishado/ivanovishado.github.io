// The frame: steps aside while scrolling down, returns on scroll up; marks where you are.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, onScroll, scrollToTarget, stopScroll, startScroll, ease, prefersReducedMotion } from '../engine';

export function initFrame() {
  let last = 0;
  onScroll(({ y }) => {
    document.documentElement.classList.toggle('frame-scrolled', y > 80);
    if (Math.abs(y - last) < 6) return;
    document.documentElement.classList.toggle('frame-away', y > 200 && y > last);
    last = y;
  });

  onPage(({ path }) => {
    // Over the amber field the frame switches to ground ink.
    const field = document.querySelector('.field');
    if (field) ScrollTrigger.create({ trigger: field, start: 'top 34px', end: 'bottom 34px', toggleClass: { targets: document.documentElement, className: 'on-field' } });
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.frame__nav [data-nav]')];
    links.forEach((a) => a.removeAttribute('aria-current'));
    if (path.startsWith('/work/')) links.find((a) => a.dataset.nav === 'work')?.setAttribute('aria-current', 'true');
    if (path.startsWith('/mentorship')) links.find((a) => a.dataset.nav === 'mentorship')?.setAttribute('aria-current', 'page');
    if (path.startsWith('/trajectory')) links.find((a) => a.dataset.nav === 'trajectory')?.setAttribute('aria-current', 'page');
    if (path !== '/') return;
    // Home: the nav marks the section in view.
    for (const a of links) {
      const id = a.dataset.nav!;
      const section = document.getElementById(id);
      if (!section) continue;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (s) => { if (s.isActive) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); },
      });
    }
  });
}

export function initMenu() {
  const button = document.querySelector<HTMLButtonElement>('.frame__menu');
  const menu = document.getElementById('menu');
  if (!button || !menu) return;
  const close = menu.querySelector<HTMLButtonElement>('.menu__close')!;
  const lines = () => menu.querySelectorAll('.menu__line > a');
  let open = false;

  const focusables = () => [...menu.querySelectorAll<HTMLElement>('a, button')];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    const first = f[0]!;
    const lastEl = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  };

  function show() {
    if (open) return;
    open = true;
    menu!.setAttribute('data-open', '');
    button!.setAttribute('aria-expanded', 'true');
    stopScroll();
    const reduced = prefersReducedMotion();
    gsap.timeline()
      .fromTo(menu, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0.01 : 0.9, ease: ease.inOut })
      .fromTo(lines(), { yPercent: 110, x: -14 }, { yPercent: 0, x: 0, duration: reduced ? 0.01 : 1, stagger: 0.06, ease: ease.out }, reduced ? 0 : 0.35);
    document.addEventListener('keydown', onKey);
    focusables()[0]?.focus();
  }

  function hide(restore = true) {
    if (!open) return;
    open = false;
    button!.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    gsap.to(menu, {
      clipPath: 'inset(0% 0% 0% 100%)', duration: prefersReducedMotion() ? 0.01 : 0.7, ease: ease.inOut,
      onComplete: () => { menu!.removeAttribute('data-open'); gsap.set(menu, { clearProps: 'clipPath' }); },
    });
    startScroll();
    if (restore) button!.focus();
  }

  button.addEventListener('click', show);
  close.addEventListener('click', () => hide());
  menu.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    if (!a) return;
    const url = new URL(a.href, location.href);
    hide(false);
    if (url.pathname === location.pathname && url.hash) {
      e.preventDefault();
      setTimeout(() => scrollToTarget(url.hash), 350);
    }
  });
}
