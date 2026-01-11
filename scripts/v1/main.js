/* ==========================================================================
   Orbital Orchestrator — Main Application
   Initializes Lenis smooth scrolling, GSAP animations, and core interactions
   ========================================================================== */

// ============================================================================
// LENIS SMOOTH SCROLLING
// ============================================================================

/**
 * Initialize Lenis with heavy inertia for premium "expensive" scroll feel
 */
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,           // Scroll animation duration
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Expo easing
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
  });

  // Integrate Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Use GSAP ticker for smooth animation loop
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  
  // Disable GSAP's default lag smoothing for perfect sync
  gsap.ticker.lagSmoothing(0);

  // Store lenis instance globally for access
  window.lenis = lenis;

  return lenis;
}

// ============================================================================
// GSAP SCROLL TRIGGERS
// ============================================================================

/**
 * Setup base ScrollTrigger configurations
 */
function initScrollTrigger() {
  // Register ScrollTrigger with GSAP
  gsap.registerPlugin(ScrollTrigger);

  // Set default scroll trigger to use Lenis-controlled scroll
  ScrollTrigger.defaults({
    scroller: document.body,
  });

  // Refresh ScrollTrigger after fonts load
  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
  });
}

/**
 * Animate sections on scroll reveal
 */
function initScrollRevealAnimations() {
  // Select all major sections
  const sections = document.querySelectorAll('section > div');
  
  sections.forEach((section) => {
    gsap.fromTo(section, 
      {
        y: 60,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
        }
      }
    );
  });

  // Staggered reveal for grid items
  const staggerGroups = document.querySelectorAll('.reveal-stagger');
  
  staggerGroups.forEach((group) => {
    const items = group.children;
    
    gsap.fromTo(items,
      {
        y: 50,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: group,
          start: 'top 80%',
          once: true,
        }
      }
    );
  });
}

// ============================================================================
// HERO SECTION ANIMATIONS
// ============================================================================

/**
 * Initialize hero section entrance animations
 */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.2 });
  
  // Profile picture fade in
  tl.fromTo('#hero-profile-pic',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
  );
  
  // Hero name reveal with scramble/decode effect placeholder
  // (TextPlugin will be used in Phase 2 for actual scramble)
  tl.fromTo('.hero-name',
    { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
    { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 1, ease: 'power3.inOut' },
    '-=0.4'
  );
  
  // Subtitle and tagline
  tl.fromTo('.rotating-tagline-container',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
    '-=0.3'
  );
  
  // Social links stagger
  const socialLinks = document.querySelectorAll('#hero .magnetic-btn');
  tl.fromTo(socialLinks,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
    '-=0.2'
  );
  
  // Scroll indicator
  tl.fromTo('#scrollIndicator',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
    '-=0.3'
  );
}

// ============================================================================
// MAGNETIC BUTTON EFFECT
// ============================================================================

/**
 * Enhanced magnetic effect for buttons using GSAP
 */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.magnetic-btn');
  
  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(btn, {
        x: x * 0.3,
        y: y * 0.3,
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    });
  });
}

// ============================================================================
// MOBILE MENU
// ============================================================================

/**
 * Mobile menu toggle functions (preserving existing logic)
 */
function toggleMobileMenu() {
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

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  
  menu.classList.remove('active');
  hamburger.classList.remove('active');
  
  window.lenis?.start();
  document.body.style.overflow = '';
}

// Make functions globally accessible
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// ============================================================================
// SCROLL INDICATOR
// ============================================================================

/**
 * Hide scroll indicator after first scroll
 */
function initScrollIndicator() {
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (!scrollIndicator) return;
  
  // Check if already scrolled previously
  if (sessionStorage.getItem('hasScrolled')) {
    scrollIndicator.classList.add('hidden');
    return;
  }
  
  // Listen for scroll
  const handleScroll = () => {
    if (window.scrollY > 50) {
      gsap.to(scrollIndicator, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          scrollIndicator.classList.add('hidden');
        }
      });
      sessionStorage.setItem('hasScrolled', 'true');
      window.removeEventListener('scroll', handleScroll);
    }
  };
  
  window.addEventListener('scroll', handleScroll);
}

// ============================================================================
// YEARS EXPERIENCE CALCULATOR
// ============================================================================

/**
 * Calculate and display years of experience
 */
function initYearsExperience() {
  const startDate = new Date(2018, 7, 1); // August 2018
  const now = new Date();
  const years = Math.floor((now - startDate) / (365.25 * 24 * 60 * 60 * 1000));
  
  const yearsEl = document.getElementById('years-experience');
  const footerYearsEl = document.getElementById('footer-years');
  
  if (yearsEl) yearsEl.textContent = years;
  if (footerYearsEl) footerYearsEl.textContent = years;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Main initialization function
 */
function init() {
  // Initialize core systems
  initScrollTrigger();
  initLenis();
  
  // Initialize animations
  initHeroAnimations();
  initScrollRevealAnimations();
  initMagneticButtons();
  
  // Initialize UI components
  initScrollIndicator();
  initYearsExperience();
  
  console.log('🚀 Orbital Orchestrator initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
