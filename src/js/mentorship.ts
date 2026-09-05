import '@fontsource-variable/jetbrains-mono/wght.css';
import '../styles/main.css';

import { initSupernova } from './supernova';
import { initScroll } from './scroll';
import { initNav } from './nav';

function init() {
  initScroll();
  document.body.classList.add('reveals-ready');
  initNav();
  const cleanup = initSupernova(document.querySelector<HTMLCanvasElement>('#mentorship-stars'));
  import.meta.hot?.dispose(cleanup);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger?.refresh());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
