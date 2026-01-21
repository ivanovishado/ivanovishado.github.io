import gsap from 'gsap';

/**
 * Enhanced magnetic effect for buttons using GSAP QuickTo and Elastic Ease
 * Effectively creates a "Gravity Well" physics simulation
 */
export function initMagneticButtons() {
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
