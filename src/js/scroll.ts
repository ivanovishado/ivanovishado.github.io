/* Smooth scroll (Lenis) + GSAP ScrollTrigger integration, reveals, parallax. */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function initScroll(): Lenis | null {
  lenisInstance = null;

  if (!prefersReduced) {
    lenisInstance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisInstance.on('scroll', () => ScrollTrigger.update());
    gsap.ticker.add((time) => lenisInstance?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    document.documentElement.style.scrollBehavior = 'auto';
  }

  initReveals();
  initParallax();

  return lenisInstance;
}

function initReveals() {
  const items = document.querySelectorAll('[data-reveal]');
  const groups = document.querySelectorAll<HTMLElement>('[data-reveal-stagger]');

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
    for (const k of g.children) (k as HTMLElement).style.transitionDelay = '';
    io.observe(g);
  });

  // stagger delays
  document.querySelectorAll('[data-reveal-stagger]').forEach((g) => {
    Array.from((g as HTMLElement).children).forEach((c, i) => {
      (c as HTMLElement).style.transitionDelay = `${i * 0.07}s`;
    });
  });
}

function initParallax() {
  if (prefersReduced) return;
  const els = document.querySelectorAll<HTMLElement>('[data-parallax]');
  els.forEach((el) => {
    const strength = parseFloat(el.dataset.parallax ?? '') || 0.12;
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
