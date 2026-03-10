/**
 * Mobile menu toggle functions + scroll-aware navbar
 */

let menuEl;
let hamburgerEl;

function getMenuElements() {
  if (!menuEl) menuEl = document.getElementById('mobileMenu');
  if (!hamburgerEl) hamburgerEl = document.getElementById('hamburger');
  return { menu: menuEl, hamburger: hamburgerEl };
}

export function toggleMobileMenu() {
  const { menu, hamburger } = getMenuElements();

  menu.classList.toggle('active');
  hamburger.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', menu.classList.contains('active'));

  if (menu.classList.contains('active')) {
    window.lenis?.stop();
    document.body.style.overflow = 'hidden';
  } else {
    window.lenis?.start();
    document.body.style.overflow = '';
  }
}

export function closeMobileMenu() {
  const { menu, hamburger } = getMenuElements();
  if (!menu.classList.contains('active')) return;

  menu.classList.remove('active');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');

  window.lenis?.start();
  document.body.style.overflow = '';
}

/**
 * Scroll-aware navbar: transparent at top, blurred on scroll
 */
export function initNavbar() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  let isScrolled = false;

  const updateNav = () => {
    const shouldBeScrolled = window.scrollY > 50;
    if (shouldBeScrolled === isScrolled) return;
    isScrolled = shouldBeScrolled;
    nav.classList.toggle('nav-scrolled', isScrolled);
  };

  // Initial state
  updateNav();

  window.addEventListener('scroll', updateNav, { passive: true });
}

// Initialize global listeners (used in onclick attributes in HTML)
export function initMenu() {
  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu = closeMobileMenu;

  const { hamburger } = getMenuElements();
  if (hamburger) {
    hamburger.addEventListener('click', () => toggleMobileMenu());
    hamburger.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        toggleMobileMenu();
      }
    });
  }
}
