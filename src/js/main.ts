import '@fontsource-variable/jetbrains-mono/wght.css';
import '../styles/main.css';

import { initSupernovaIntro } from './supernova-intro';
import { initSupernova } from './supernova';
import { initScroll } from './scroll';
import { initNav } from './nav';

function initHero() {
  const cleanup = initSupernova(document.getElementById('supernova') as HTMLCanvasElement | null);
  const cleanupIntro = initSupernovaIntro();
  import.meta.hot?.dispose(() => { cleanupIntro(); cleanup(); });
}

function init() {
  initScroll();
  document.body.classList.add('reveals-ready');
  initNav();
  initHero();
  // refresh ScrollTrigger after fonts load to fix offsets
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger?.refresh());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
