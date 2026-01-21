/**
 * Mobile menu toggle functions
 */
export function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');

  menu.classList.toggle('active');
  hamburger.classList.toggle('active');

  // Prevent scrolling when menu is open
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

// Initialize global listeners (since these are used in onclick attributes in HTML)
export function initMenu() {
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobileMenu = closeMobileMenu;
}
