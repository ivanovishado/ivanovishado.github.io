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
  gsap.registerPlugin(ScrollTrigger, TextPlugin);

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
/**
 * System Bootstrap Sequence
 * Simulates a "compilation" of the UI from wireframes
 */
function initSystemBootstrap() {
  document.body.style.overflow = 'hidden';

  const tl = gsap.timeline({
    delay: 0.2,
  });

  // Elements to animate
  const heroProfile = document.querySelector('#hero-profile-pic');
  const heroName = document.querySelector('.hero-name');
  const tagline = document.querySelector('.rotating-tagline-container');
  const socialLinks = document.querySelectorAll('#hero .magnetic-btn');
  const scrollIndicator = document.getElementById('scrollIndicator');
  const heroGradient = document.querySelector('.hero-gradient');

  // STEP 1: INITIALIZE WIREFRAME STATE
  // We manually set these to ensure no FOUC
  gsap.set([heroProfile, tagline, socialLinks, scrollIndicator], { opacity: 0 });
  gsap.set(heroName, { opacity: 0 });

  // STEP 2: THE CONSTRUCT (Gradient expands)
  tl.to(heroGradient, {
    duration: 1.5,
    scale: 1,
    opacity: 1,
    ease: "expo.out"
  });

  // STEP 3: THE CODE (Simple Fade-In)
  tl.add(() => {
    gsap.to(heroName, { opacity: 1, duration: 1.0, ease: "power2.out" });
  }, '-=1.0');

  // STEP 4: THE RENDER (UI Elements Pop In)

  // Profile Pic "Warps" in
  tl.fromTo(heroProfile,
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" },
    '-=0.8'
  );

  // Subtitle/Tagline Glitch Slide
  tl.fromTo(tagline,
    { x: -50, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    '-=0.5'
  );

  // Socials - Wireframe to Solid "Flash"
  // First set them as wireframes (using the class we added)
  socialLinks.forEach(btn => btn.classList.add('boot-wireframe'));

  tl.to(socialLinks, {
    opacity: 1,
    duration: 0.1,
    stagger: 0.1
  }, '-=0.3');

  // Then "Compile" them (remove wireframe class) with a flash
  tl.add(() => {
    socialLinks.forEach(btn => {
      btn.classList.remove('boot-wireframe');
      // Flash effect
      gsap.fromTo(btn, { filter: 'brightness(2)' }, { filter: 'brightness(1)', duration: 0.5 });
    });
  }, '+=0.2');
}

// ============================================================================
// MAGNETIC BUTTON EFFECT
// ============================================================================

/**
 * Enhanced magnetic effect for buttons using GSAP QuickTo and Elastic Ease
 * Effectively creates a "Gravity Well" physics simulation
 */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.magnetic-btn');

  if (!buttons.length) return;

  // Track mouse position globally for better performance
  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  buttons.forEach((btn) => {
    // xTo and yTo for high-performance updates
    const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });

    // Internal elements (icon) move slightly less for parallax depth
    const icon = btn.querySelector('svg');
    let iconXTo, iconYTo;

    if (icon) {
      iconXTo = gsap.quickTo(icon, "x", { duration: 0.4, ease: "power3.out" });
      iconYTo = gsap.quickTo(icon, "y", { duration: 0.4, ease: "power3.out" });
    }

    // Hover listener
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center
      const distX = mouseX - centerX;
      const distY = mouseY - centerY;

      // Magnetic pull strength (how far it can travel)
      // Increased range for "Gravity Well" feeling
      const pullStrength = 0.5;

      xTo(distX * pullStrength);
      yTo(distY * pullStrength);

      if (iconXTo && iconYTo) {
        iconXTo(distX * 0.2); // Parallax factor
        iconYTo(distY * 0.2);
      }

      // Dynamic scaling based on proximity could go here
      gsap.to(btn, { scale: 1.1, duration: 0.3, overwrite: 'auto' });
    });

    btn.addEventListener('mouseleave', () => {
      // Snap back with elastic wobble (Gravity/Spring effect)
      gsap.to(btn, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: "elastic.out(1, 0.3)", // The "Wobble"
        overwrite: true
      });

      if (icon) {
        gsap.to(icon, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.3)"
        });
      }
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
