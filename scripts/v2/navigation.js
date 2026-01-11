/* ==========================================================================
   Orbital Orchestrator V2 — Responsive Navigation
   Hamburger menu with scroll-triggered desktop transformation
   ========================================================================== */

class ResponsiveNav {
    constructor() {
        this.nav = document.getElementById('main-nav');
        this.hamburger = document.getElementById('hamburger-btn');
        this.navLinks = document.getElementById('nav-links');
        this.navItems = document.querySelectorAll('.nav-link');

        if (!this.nav || !this.hamburger || !this.navLinks) {
            console.warn('ResponsiveNav: Required elements not found');
            return;
        }

        this.isOpen = false;
        this.isMobile = window.innerWidth < 768;
        this.scrollThreshold = window.innerHeight * 0.8; // 80% of hero section

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateNavState();
    }

    bindEvents() {
        // Hamburger click
        this.hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Close menu on link click
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (this.isOpen) this.closeMenu();
            });
        });

        // Use RAF loop for scroll detection (works with Lenis)
        this.checkScrollLoop();

        // Resize event
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth < 768;
            this.scrollThreshold = window.innerHeight * 0.8;
            this.updateNavState();
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.closeMenu();
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.nav.contains(e.target)) {
                this.closeMenu();
            }
        });
    }

    checkScrollLoop() {
        // Get scroll position from Lenis if available, otherwise use window.scrollY
        const scrollY = window.lenis ? window.lenis.scroll : window.scrollY;
        this.handleScroll(scrollY);
        requestAnimationFrame(() => this.checkScrollLoop());
    }

    handleScroll(scrollY) {
        if (this.isMobile) {
            // Mobile: always hamburger mode
            this.nav.classList.add('nav-compact');
        } else {
            // Desktop: transform to hamburger after scrolling past hero
            if (scrollY > this.scrollThreshold) {
                if (!this.nav.classList.contains('nav-compact')) {
                    // Prevent transition glitch when appearing
                    this.navLinks.style.transition = 'none';
                    this.nav.classList.add('nav-compact');
                    // Force reflow
                    void this.navLinks.offsetWidth;
                    this.navLinks.style.transition = '';
                }
            } else {
                if (this.nav.classList.contains('nav-compact')) {
                    this.nav.classList.remove('nav-compact');
                    // Ensure menu is closed when returning to full nav
                    if (this.isOpen) this.closeMenu();
                }
            }
        }
    }

    updateNavState() {
        if (this.isMobile) {
            this.nav.classList.add('nav-compact');
        } else {
            const scrollY = window.lenis ? window.lenis.scroll : window.scrollY;
            this.handleScroll(scrollY);
        }
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.isOpen = true;
        this.hamburger.classList.add('hamburger-open');
        this.navLinks.classList.add('nav-links-open');
        this.nav.classList.add('nav-open');

        // Animate menu items stagger
        this.navItems.forEach((item, i) => {
            item.style.transitionDelay = `${i * 50}ms`;
            item.classList.add('nav-link-visible');
        });
    }

    closeMenu() {
        this.isOpen = false;
        this.hamburger.classList.remove('hamburger-open');
        this.navLinks.classList.remove('nav-links-open');
        this.nav.classList.remove('nav-open');

        // Reset stagger delays
        this.navItems.forEach(item => {
            item.style.transitionDelay = '0ms';
            item.classList.remove('nav-link-visible');
        });
    }
}

// Export for use
window.ResponsiveNav = ResponsiveNav;
