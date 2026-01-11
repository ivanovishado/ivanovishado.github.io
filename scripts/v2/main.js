/* ==========================================================================
   Orbital Orchestrator V2 — Main Application
   ========================================================================== */

import { TextScramble } from './utils/TextScramble.js';
import { HeroParticles } from './components/HeroParticles.js';
import { MagneticHover } from './components/MagneticHover.js';
import { ResponsiveNav } from './components/ResponsiveNav.js';

// ============================================================================
// LENIS SMOOTH SCROLLING
// ============================================================================

function initLenis() {
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
    });

    // Integrate with GSAP
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;

    return lenis;
}

// ============================================================================
// GSAP SETUP
// ============================================================================

function initGSAP() {
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.defaults({
        scroller: document.body,
    });
}

// ============================================================================
// HERO ANIMATIONS
// ============================================================================

function initHeroAnimations() {
    const heroName = document.getElementById('hero-name');

    if (heroName) {
        // Start with scrambled text
        const targetText = heroName.innerText || 'IVAN GALAVIZ';
        const scramble = new TextScramble(heroName.querySelector('.gradient-text') || heroName);

        // Initial scramble effect
        gsap.fromTo(heroName,
            { opacity: 0 },
            {
                opacity: 1,
                duration: 0.5,
                onComplete: () => {
                    scramble.setText(targetText);
                }
            }
        );
    }

    // Animate social icons
    gsap.fromTo('.social-icon',
        { x: -20, opacity: 0 },
        {
            x: 0,
            opacity: 0.6,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.5,
            ease: 'power3.out'
        }
    );

    // Animate nav boxes
    gsap.fromTo('.nav-box',
        { y: -20, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.3,
            ease: 'power3.out'
        }
    );

    // Animate scroll indicator
    gsap.fromTo('#scroll-indicator',
        { y: 20, opacity: 0 },
        {
            y: 0,
            opacity: 0.5,
            duration: 0.8,
            delay: 1.2,
            ease: 'power3.out'
        }
    );
}

// ============================================================================
// SCROLL INDICATOR
// ============================================================================

function initScrollIndicator() {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;

    const handleScroll = () => {
        if (window.scrollY > 100) {
            indicator.classList.add('hidden');
            window.removeEventListener('scroll', handleScroll);
        }
    };

    window.addEventListener('scroll', handleScroll);
}

// ============================================================================
// INIT
// ============================================================================

function init() {
    // Core systems
    initGSAP();
    initLenis();

    // Three.js particles
    new HeroParticles('hero-canvas');

    // Magnetic hover on social links
    new MagneticHover('[data-magnetic]', {
        strength: 0.4,
        radius: 80,
        ease: 0.12
    });

    // Responsive navigation (hamburger menu)
    new ResponsiveNav();

    // Animations
    initHeroAnimations();
    initScrollIndicator();

    console.log('🚀 Orbital Orchestrator V2 initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
