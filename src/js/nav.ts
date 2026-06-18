/* Nav: scroll state, progress bar, active section, mobile menu. */

import { getLenis } from './scroll';

export function initNav() {
  const nav = document.querySelector<HTMLElement>('.nav');
  const bar = document.querySelector<HTMLElement>('.progress__bar');
  const burger = document.querySelector<HTMLElement>('.burger');
  const menu = document.querySelector<HTMLElement>('.mobile-menu');
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link[data-target]');
  const sections = Array.from(links)
    .map((l) => document.getElementById(l.dataset.target ?? ''))
    .filter((el): el is HTMLElement => Boolean(el));

  // progress + scrolled state
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const p = max > 0 ? doc.scrollTop / max : 0;
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (nav) nav.classList.toggle('nav--scrolled', doc.scrollTop > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // active section
  if (sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const id = en.target.id;
          links.forEach((l) => l.classList.toggle('is-active', l.dataset.target === id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }

  // mobile menu
  const close = () => {
    menu?.classList.remove('is-open');
    burger?.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  const open = () => {
    menu?.classList.add('is-open');
    burger?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };
  burger?.addEventListener('click', () => {
    menu?.classList.contains('is-open') ? close() : open();
  });
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // smooth anchor scroll (works even without lenis)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.2 });
      else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      close();
    });
  });
}
