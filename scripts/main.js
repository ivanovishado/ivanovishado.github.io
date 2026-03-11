/* ==========================================================================
   Orbital Orchestrator — Main Application
   ========================================================================== */

import '@phosphor-icons/web/regular';
import '../styles/tailwind.css';
import '../styles.css';

import { initLenis } from './utils/lenis.js';
import { initScrollTrigger } from './animation/gsap-setup.js';
import { initScrollRevealAnimations } from './animation/scroll-reveal.js';
import { initSystemBootstrap } from './animation/hero.js';
import { initMagneticButtons } from './components/buttons.js';
import { initMenu, initNavbar } from './components/menu.js';
import { initYearsExperience } from './utils/data.js';
import { initProjectsCarousel } from './components/projects-carousel.js';
import { initNavTracker } from './components/nav-tracker.js';

/**
 * Main initialization function
 */
function init() {
  // Initialize core systems
  initScrollTrigger();
  initLenis();

  // Initialize components
  initMenu();
  initNavbar();

  // Initialize animations
  initSystemBootstrap();
  initScrollRevealAnimations();
  initNavTracker();
  initProjectsCarousel();
  initMagneticButtons();

  // Initialize UI components
  initYearsExperience();
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
