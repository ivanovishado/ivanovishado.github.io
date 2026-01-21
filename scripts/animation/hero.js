import gsap from 'gsap';

/**
 * Initialize hero section entrance animations
 * System Bootstrap Sequence
 * Simulates a "compilation" of the UI from wireframes
 */
export function initSystemBootstrap() {
  document.body.style.overflow = 'hidden';

  const tl = gsap.timeline({
    delay: 0.2,
    onComplete: () => {
      // Re-enable scrolling after bootstrap animation completes
      document.body.style.overflow = '';
    }
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

  // STEP 5: INTERACTIVE PARALLAX (Mouse movement)
  // We use quickTo for performant 60fps mouse tracking
  const shapes = document.querySelectorAll('.floating-shape');
  
  if (shapes.length === 0) return;

  // Store tween references for performance
  const shapeTweens = Array.from(shapes).map(shape => ({
    x: gsap.quickTo(shape, "x", { duration: 1, ease: "power3.out" }),
    y: gsap.quickTo(shape, "y", { duration: 1, ease: "power3.out" }),
    // Varies speed based on "depth" (index)
    factor: 0.05 + (Math.random() * 0.05) 
  }));

  window.addEventListener('mousemove', (e) => {
    // Calculate normalized mouse position (-1 to 1)
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;

    shapeTweens.forEach((t, i) => {
      // Deeper elements move slower (simulated depth)
      // We flip direction for some to create chaotic flow
      const direction = i % 2 === 0 ? 1 : -1; 
      const moveAmount = 100 * t.factor * direction;
      
      t.x(x * moveAmount);
      t.y(y * moveAmount);
    });
  });
}
