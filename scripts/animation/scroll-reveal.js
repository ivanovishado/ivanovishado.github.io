import gsap from 'gsap';

/**
 * Animate sections on scroll reveal
 * Includes alternating directions for experience and medal flips for awards
 */
export function initScrollRevealAnimations() {
  // General section fade-in
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

  // Projects — first slide entrance (subsequent slides animate via carousel)
  const projectText = document.querySelector('.project-slide[data-project="0"] .project-text');
  const projectImage = document.querySelector('.project-slide[data-project="0"] .project-image');

  if (projectText) {
    gsap.fromTo(projectText,
      { x: -60, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: projectText, start: 'top 75%', once: true }
      }
    );
  }

  if (projectImage) {
    gsap.fromTo(projectImage,
      { scale: 0.9, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: projectImage, start: 'top 75%', once: true }
      }
    );
  }

  // Experience cards — alternating slide directions (left, right, left)
  const experienceCards = document.querySelectorAll('#experience .experience-connector > div');

  experienceCards.forEach((card, i) => {
    const fromX = i % 2 === 0 ? -60 : 60;
    gsap.fromTo(card,
      { x: fromX, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 75%', once: true }
      }
    );
  });

  // Staggered reveal for grid items (skills, spotlight grid, etc.)
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

  // Award medals — Y-axis flip (coin flip effect)
  const medals = document.querySelectorAll('.award-medal');

  medals.forEach((medal, i) => {
    gsap.fromTo(medal,
      { rotateY: -90, opacity: 0 },
      {
        rotateY: 0, opacity: 1, duration: 0.6,
        delay: i * 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: medal, start: 'top 80%', once: true }
      }
    );
  });

  // Section Headers — slide from left
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
