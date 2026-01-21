import gsap from 'gsap';

/**
 * Animate sections on scroll reveal
 */
export function initScrollRevealAnimations() {
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
          start: 'top 65%',
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
          start: 'top 75%',
          once: true,
        }
      }
    );
  });

  // Special treatment for Section Headers (h2)
  // Creates a sophisticated "leading" effect where the title reveals first
  const sectionHeaders = document.querySelectorAll('section h2');
  
  sectionHeaders.forEach(header => {
    gsap.fromTo(header, 
      {
        x: -30,
        opacity: 0
      },
      {
        x: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: header,
          start: 'top 60%',
          once: true
        }
      }
    );
  });
}
