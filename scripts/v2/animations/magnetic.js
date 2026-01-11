/* ==========================================================================
   Orbital Orchestrator V2 — Magnetic Hover Effect
   Creates a "magnetic" pull effect on elements when cursor approaches
   ========================================================================== */

class MagneticHover {
    constructor(selector, options = {}) {
        this.elements = document.querySelectorAll(selector);
        this.options = {
            strength: options.strength || 0.3,
            radius: options.radius || 100,
            ease: options.ease || 0.15,
            ...options
        };

        // Store original positions and current transforms
        this.items = [];

        this.init();
    }

    init() {
        // Skip on touch devices for better UX
        if ('ontouchstart' in window) return;

        this.elements.forEach(el => {
            const item = {
                el,
                x: 0,
                y: 0,
                targetX: 0,
                targetY: 0,
                width: el.offsetWidth,
                height: el.offsetHeight,
            };
            this.items.push(item);

            // Add magnetic class for styling
            el.classList.add('magnetic-element');
        });

        this.bindEvents();
        this.animate();
    }

    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            this.items.forEach(item => {
                const rect = item.el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const distX = e.clientX - centerX;
                const distY = e.clientY - centerY;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distance < this.options.radius) {
                    // Calculate magnetic pull (stronger when closer)
                    const pull = (1 - distance / this.options.radius) * this.options.strength;
                    item.targetX = distX * pull;
                    item.targetY = distY * pull;
                    item.el.classList.add('magnetic-active');
                } else {
                    item.targetX = 0;
                    item.targetY = 0;
                    item.el.classList.remove('magnetic-active');
                }
            });
        });

        // Reset on mouse leave viewport
        document.addEventListener('mouseleave', () => {
            this.items.forEach(item => {
                item.targetX = 0;
                item.targetY = 0;
                item.el.classList.remove('magnetic-active');
            });
        });
    }

    animate() {
        this.items.forEach(item => {
            // Smooth interpolation
            item.x += (item.targetX - item.x) * this.options.ease;
            item.y += (item.targetY - item.y) * this.options.ease;

            // Apply transform
            item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Export for use
window.MagneticHover = MagneticHover;
