import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Active nav link indicator — highlights the desktop nav link
 * matching the currently visible section.
 *
 * Depends on initScrollTrigger() (gsap-setup.js) running first
 * to register the ScrollTrigger plugin.
 */
export function initNavTracker() {
  // Desktop-only feature — skip on mobile to avoid needless scroll observers
  if (!window.matchMedia('(min-width: 768px)').matches) return;

  const sections = ['#projects', '#experience', '#spotlight', '#skills', '#education', '#awards', '#contact'];
  const navLinks = document.querySelectorAll('#main-nav .hidden.md\\:flex a[href^="#"]');

  // Cache href values once — they never change
  const linksByHref = new Map();
  navLinks.forEach(link => {
    linksByHref.set(link.getAttribute('href'), link);
  });

  let currentActive = null;

  function setActive(hash) {
    if (currentActive === hash) return;
    // Clear previous
    if (currentActive) {
      const prev = linksByHref.get(currentActive);
      if (prev) prev.classList.remove('nav-link-active');
    }
    // Set new
    const next = linksByHref.get(hash);
    if (next) next.classList.add('nav-link-active');
    currentActive = hash;
  }

  function clearAll() {
    if (!currentActive) return;
    const prev = linksByHref.get(currentActive);
    if (prev) prev.classList.remove('nav-link-active');
    currentActive = null;
  }

  sections.forEach(id => {
    const el = document.querySelector(id);
    if (!el) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 40%',
      end: 'bottom 40%',
      onEnter: () => setActive(id),
      onEnterBack: () => setActive(id),
      onLeave: () => clearAll(),
      onLeaveBack: () => clearAll(),
    });
  });
}
