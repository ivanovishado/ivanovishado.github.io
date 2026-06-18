import '../styles/main.css';

import { initTrajectory } from './trajectory.js';
import { initScroll, gsap } from './scroll.js';
import { initNav } from './nav.js';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHero() {
  initTrajectory(document.getElementById('trajectory'));

  if (prefersReduced) {
    document.querySelectorAll('.hero [data-h]').forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
    return;
  }

  const tl = gsap.timeline({ delay: 0.25, defaults: { ease: 'power3.out' } });
  tl.to('.hero [data-h="eyebrow"]', { opacity: 1, y: 0, duration: 0.8 })
    .to('.hero [data-h="title"]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, '-=0.5')
    .to('.hero [data-h="sub"]', { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
    .to('.hero [data-h="cta"]', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('.hero [data-h="meta"]', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
    .to('.hero [data-h="cue"]', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4');
}

function initMagnetic() {
  if (prefersReduced || window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    const strength = 0.35;
    let raf = 0;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

function init() {
  initScroll();
  initNav();
  initHero();
  initMagnetic();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger && ScrollTrigger.refresh());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
