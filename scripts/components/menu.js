/**
 * Mobile menu toggle functions + scroll-aware navbar
 */
export function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');

  menu.classList.toggle('active');
  hamburger.classList.toggle('active');

  if (menu.classList.contains('active')) {
    window.lenis?.stop();
    document.body.style.overflow = 'hidden';
  } else {
    window.lenis?.start();
    document.body.style.overflow = '';
  }
}

export function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');

  menu.classList.remove('active');
  hamburger.classList.remove('active');

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
}
