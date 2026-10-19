// Entry for the portfolio pages (home, case studies, 404). Mentorship has its own entry.
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../styles/site.css';

import { boot } from './site/engine';
import { initRouter } from './site/engine/router';
import { startDriver } from './site/concept/driver';
import { initCurtain } from './site/motion/curtain';
import { initFrame, initMenu } from './site/ui/frame';
import { initPreview } from './site/ui/preview';

function init() {
  boot(() => {
    initCurtain();
    startDriver();
    initFrame();
    initMenu();
    initPreview();
    initRouter();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
