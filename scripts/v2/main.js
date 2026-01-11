/* ==========================================================================
   Orbital Orchestrator V2 — Main Application
   ========================================================================== */

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
// TEXT SCRAMBLE EFFECT
// ============================================================================

class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];

            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="text-signal/60">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
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
    if (window.HeroParticles) {
        window.heroParticles = new HeroParticles('hero-canvas');
    }

    // Magnetic hover on social links
    if (window.MagneticHover) {
        window.magneticHover = new MagneticHover('[data-magnetic]', {
            strength: 0.4,
            radius: 80,
            ease: 0.12
        });
    }

    // Responsive navigation (hamburger menu)
    if (window.ResponsiveNav) {
        window.responsiveNav = new ResponsiveNav();
    }

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
