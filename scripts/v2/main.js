/* ==========================================================================
   Orbital Orchestrator V2 — Main Application
   ========================================================================== */

import { TextScramble } from './utils/TextScramble.js';
import { HeroParticles } from './components/HeroParticles.js';
import { MagneticHover } from './components/MagneticHover.js';
import { ResponsiveNav } from './components/ResponsiveNav.js';
import { FlightLogEngine } from './components/FlightLogEngine.js';

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
    const heroContent = document.querySelector('.hero-content'); // Assuming this exists or using logic below

    // 1. Grain Overlay Fade (Clear Signal)
    gsap.to('.grain', {
        opacity: 0.04,
        duration: 2,
        ease: "power2.out",
        delay: 0.5
    });
    // Start grain higher in CSS or set immediately (handled by CSS default 0.04, so we might want to punch it up then down)
    gsap.fromTo('.grain', { opacity: 0.2 }, { opacity: 0.04, duration: 2.5, ease: "power2.inOut" });

    if (heroName) {
        // Start with scrambled text
        const targetText = heroName.innerText || 'IVAN GALAVIZ';
        const scramble = new TextScramble(heroName.querySelector('.gradient-text') || heroName);

        // Initial scramble effect - "Decrypting Identity"
        gsap.fromTo(heroName,
            { opacity: 0, scale: 0.95 },
            {
                opacity: 1,
                scale: 1,
                duration: 1.5, // Slower reveal
                ease: "power4.out",
                onStart: () => {
                    // Ensure text is set to target eventually, handled by scramble logic
                },
                onComplete: () => {
                    scramble.setText(targetText);
                }
            }
        );
    }

    // 2. Subtitle Glitch Entrance
    const subtitle = document.querySelector('#hero-name + p'); // Selects the p immediately after hero-name
    if (subtitle) {
        gsap.fromTo(subtitle,
            { x: -50, opacity: 0 },
            {
                x: 0,
                opacity: 1,
                duration: 0.6,
                delay: 1.0, // Wait for name
                ease: "power2.out",
                onStart: () => {
                    subtitle.classList.add('glitch-active');
                },
                onComplete: () => {
                    setTimeout(() => subtitle.classList.remove('glitch-active'), 300);
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
            delay: 1.5,
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
            delay: 1.2,
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
            delay: 2.0,
            ease: 'power3.out'
        }
    );

    // ============================================================================
    // HERO EXIT TRANSITION
    // ============================================================================
    // As user scrolls down, fade out hero elements and scale them down slightly
    // Creates a "leaving the atmosphere" effect

    // DELAYED INITIALIZATION:
    // We wait 2.5s for the boot-up/entry animations to finish before attaching
    // the scroll triggers. This prevents the "Exit" animation from overwriting 
    // the "Entry" animation (which caused the h1 to stay hidden).
    gsap.delayedCall(2.5, () => {
        // Group all hero content for cleaner animation
        const heroElements = [heroName, subtitle, '.social-icon', '#scroll-indicator', '.nav-box'];

        gsap.to(heroElements, {
            scrollTrigger: {
                trigger: "#hero",
                start: "top top-=100", // Wait until 100px scrolled before fading
                end: "center top", // Fade out completely by the time hero center hits top
                scrub: 1, // Smooth scrub (1s lag) for buttery feel
            },
            y: -50, // Subtle lift
            scale: 0.95, // Subtle shrink
            autoAlpha: 0, // Handles opacity + visibility
            filter: "blur(5px)", // Cinematic blur
            stagger: 0.05,
            ease: "none" // Linear tracking with scroll
        });
    });
}

// ============================================================================
// SCROLL INDICATOR
// ============================================================================

// ============================================================================
// FLIGHT LOGS ANIMATIONS (HUD INIT)
// ============================================================================

function initFlightLogAnimations() {
    const section = document.querySelector('#flight-logs');
    if (!section) return;

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: "top 70%", // Start earlier for better visibility
        }
    });

    // Cinematic Section Entrance (Scale Up from Background)
    // The entire section feels like it's coming forward from the depth of space
    tl.from(section, {
        scale: 0.9,
        opacity: 0,
        filter: "blur(10px)",
        duration: 1.0,
        ease: "power2.out"
    })

        // 1. HUD Lines Expansion (Draw from center)
        .from('.hud-lines', {
            scaleX: 0,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out"
        }, "-=0.2") // Overlap slightly with section entrance

        // 2. Glass Panel " Power On" Flicker
        .fromTo('.glass-panel',
            { opacity: 0 },
            {
                opacity: 1,
                duration: 0.1,
                repeat: 3,
                yoyo: true,
                ease: "steps(1)"
            }
            , "-=0.2")

        // 3. Stats Data Stream (Rapid Slide + Fade)
        .from('.stat-row dt, .stat-row dd', {
            x: -20,
            opacity: 0,
            duration: 0.4,
            stagger: 0.05, // Faster stagger
            ease: "power2.out" /* Data loading feel */
        })

        // 4. Circular Viewport Spin-Up
        .from('.orbit-window-ring', {
            rotation: -90,
            scale: 0.8,
            opacity: 0,
            duration: 1.2,
            ease: "back.out(1.7)"
        }, "<");
}

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
    const heroParticles = new HeroParticles('hero-canvas');

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
    initFlightLogAnimations();

    // Warp Speed Effect (Scroll Velocity -> Particle Speed)
    if (window.lenis) {
        window.lenis.on('scroll', ({ velocity }) => {
            heroParticles.setWarpSpeed(velocity);
        });
    }

    // Flight Logs Engine (3D artifact rendering)
    const flightLogs = new FlightLogEngine();
    flightLogs.init();

    console.log('🚀 Orbital Orchestrator V2 initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
