/* ==========================================================================
   Orbital Orchestrator — Main Application
   ========================================================================== */

import '../styles/tailwind.css';
import '../styles/design-tokens.css';
import '../styles.css';

import { initLenis } from './utils/lenis.js';
import { initScrollTrigger } from './animation/gsap-setup.js';
import { initScrollRevealAnimations } from './animation/scroll-reveal.js';
import { initSystemBootstrap } from './animation/hero.js';
import { initMagneticButtons } from './components/buttons.js';
import { initMenu } from './components/menu.js';
import { initYearsExperience } from './utils/data.js';

/**
 * Main initialization function
 */
function init() {
  // Initialize core systems
  initScrollTrigger();
  initLenis();

  // Initialize components
  initMenu();

  // Initialize animations
  initSystemBootstrap();
  initScrollRevealAnimations();
  initMagneticButtons();

  // Initialize UI components
  initYearsExperience();

  console.log('🚀 Orbital Orchestrator initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
