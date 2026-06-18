/* Smooth scroll (Lenis) + GSAP ScrollTrigger integration, reveals, parallax. */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initScroll() {
  let lenis = null;

  if (!prefersReduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  } else {
    document.documentElement.style.scrollBehavior = 'auto';
  }

  initReveals();
  initParallax();

  return lenis;
}

function initReveals() {
  const items = document.querySelectorAll('[data-reveal]');
  const groups = document.querySelectorAll('[data-reveal-stagger]');

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => io.observe(el));

  groups.forEach((g) => {
    const kids = g.children;
    for (const k of kids) k.style.transitionDelay = '';
    io.observe(g);
  });

  // stagger delays
  document.querySelectorAll('[data-reveal-stagger]').forEach((g) => {
    Array.from(g.children).forEach((c, i) => {
      c.style.transitionDelay = `${i * 0.07}s`;
    });
  });
}

function initParallax() {
  if (prefersReduced) return;
  const els = document.querySelectorAll('[data-parallax]');
  els.forEach((el) => {
    const strength = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el,
      { y: strength * 100 },
      {
        y: -strength * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
  });
}

export { gsap, ScrollTrigger };
