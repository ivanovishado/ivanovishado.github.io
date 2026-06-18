import '../styles/main.css';

import { initOrbital } from './orbital.js';
import { initScroll, gsap } from './scroll.js';
import { initNav } from './nav.js';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHero() {
  initOrbital(document.getElementById('orbital'));

  if (prefersReduced) {
    document.querySelectorAll('.hero [data-h]').forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
    return;
  }

  const tl = gsap.timeline({ delay: 0.25, defaults: { ease: 'power3.out' } });
  tl.to('.hero [data-h="eyebrow"]', { opacity: 1, y: 0, duration: 0.8 })
    .to('.hero [data-h="name"]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, '-=0.5')
    .to('.hero [data-h="sub"]', { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
    .to('.hero [data-h="meta"]', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('.hero [data-h="cue"]', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5');
}

function init() {
  initScroll();
  initNav();
  initHero();
  // refresh ScrollTrigger after fonts load to fix offsets
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger && ScrollTrigger.refresh());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
