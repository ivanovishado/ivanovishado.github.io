import gsap from 'gsap';

/**
 * Initialize hero section entrance animations
 * Asymmetric layout boot sequence with arc parallax
 */
export function initSystemBootstrap() {
  document.body.style.overflow = 'hidden';

  const tl = gsap.timeline({
    delay: 0.2,
    onComplete: () => {
      document.body.style.overflow = '';
    }
  });

  // Elements to animate
  const heroProfile = document.querySelector('#hero-profile-pic');
  const heroName = document.querySelector('.hero-name');
  const tagline = document.querySelector('.rotating-tagline-container');
  const socialLinks = document.querySelectorAll('#hero .magnetic-btn');
  const heroGradient = document.querySelector('.hero-gradient');
  const heroArc = document.querySelector('.hero-arc');

  // STEP 1: INITIALIZE — hide all elements
  gsap.set([heroProfile, tagline, socialLinks], { opacity: 0 });
  gsap.set(heroName, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
  if (heroArc) gsap.set(heroArc, { y: 100, opacity: 0 });

  // STEP 2: GRADIENT EXPANDS
  tl.to(heroGradient, {
    duration: 1.5,
    scale: 1,
    opacity: 1,
    ease: "expo.out"
  });

  // STEP 3: ARC RISES into position
  if (heroArc) {
    tl.to(heroArc, {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power3.out"
    }, '-=1.2');
  }

  // STEP 4: NAME CLIP-PATH REVEAL
  tl.to(heroName, {
    opacity: 1,
    clipPath: 'inset(0 0% 0 0)',
    duration: 1.0,
    ease: "power2.out"
  }, '-=0.8');

  // STEP 5: PROFILE PIC warps in
  tl.fromTo(heroProfile,
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" },
    '-=0.6'
  );

  // STEP 6: TAGLINE slides in
  tl.fromTo(tagline,
    { x: -50, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    '-=0.5'
  );

  // STEP 7: SOCIAL LINKS — wireframe to solid flash
  socialLinks.forEach(btn => btn.classList.add('boot-wireframe'));

  tl.to(socialLinks, {
    opacity: 1,
    duration: 0.1,
    stagger: 0.1
  }, '-=0.3');

  tl.add(() => {
    socialLinks.forEach(btn => {
      btn.classList.remove('boot-wireframe');
      gsap.fromTo(btn, { filter: 'brightness(2)' }, { filter: 'brightness(1)', duration: 0.5 });
    });
  }, '+=0.2');

  // STEP 8: INTERACTIVE PARALLAX
  // Arc and name move in opposite directions for depth
  const shapes = document.querySelectorAll('.floating-shape');

  if (shapes.length === 0 && !heroArc) return;

  const shapeTweens = Array.from(shapes).map(shape => ({
    x: gsap.quickTo(shape, "x", { duration: 1, ease: "power3.out" }),
    y: gsap.quickTo(shape, "y", { duration: 1, ease: "power3.out" }),
    factor: 0.05 + (Math.random() * 0.05)
  }));

  let arcXTo, arcYTo, nameXTo;
  if (heroArc) {
    arcXTo = gsap.quickTo(heroArc, "x", { duration: 1.2, ease: "power3.out" });
    arcYTo = gsap.quickTo(heroArc, "y", { duration: 1.2, ease: "power3.out" });
  }
  if (heroName) {
    nameXTo = gsap.quickTo(heroName, "x", { duration: 0.8, ease: "power3.out" });
  }

  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;

    // Floating shapes
    shapeTweens.forEach((t, i) => {
      const direction = i % 2 === 0 ? 1 : -1;
      const moveAmount = 100 * t.factor * direction;
      t.x(x * moveAmount);
      t.y(y * moveAmount);
    });

    // Arc moves in one direction, name in opposite — creates depth
    if (arcXTo) arcXTo(x * 20);
    if (arcYTo) arcYTo(y * 15);
    if (nameXTo) nameXTo(x * -8);
  });
}
