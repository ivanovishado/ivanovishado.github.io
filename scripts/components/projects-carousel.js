import gsap from 'gsap';

/**
 * Projects carousel — GSAP crossfade (desktop) + drag-tracking swipe (mobile)
 */
export function initProjectsCarousel() {
  const carousel = document.querySelector('.projects-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.project-slide');
  const tabs = document.querySelectorAll('.project-tab');
  const dots = document.querySelectorAll('.project-dot');
  const glow = document.querySelector('.projects-glow');
  const section = document.getElementById('projects');

  const CLEAR_PROPS = 'x,opacity,pointerEvents';

  let activeIndex = 0;
  let isAnimating = false;

  function updateIndicators(index) {
    tabs.forEach(tab => tab.classList.toggle('active', Number(tab.dataset.slide) === index));
    dots.forEach(dot => dot.classList.toggle('active', Number(dot.dataset.slide) === index));
  }

  /** Shared cleanup after any slide transition completes */
  function completeTransition(fromSlide, toSlide, targetIndex) {
    fromSlide.classList.remove('active');
    fromSlide.setAttribute('aria-hidden', 'true');
    toSlide.classList.add('active');
    toSlide.removeAttribute('aria-hidden');
    gsap.set(fromSlide, { clearProps: CLEAR_PROPS });
    gsap.set(toSlide, { clearProps: CLEAR_PROPS });
    activeIndex = targetIndex;
    isAnimating = false;
  }

  /** Shared slide animation — accepts easing/offset overrides */
  function animateTransition(targetIndex, opts = {}) {
    const {
      exitX = -60,
      entryX = 80,
      exitEase = 'power3.in',
      entryEase = 'power3.out',
      exitDuration = 0.45,
      entryDuration = 0.5,
      stagger = 0.15,
    } = opts;

    isAnimating = true;

    const currentSlide = slides[activeIndex];
    const nextSlide = slides[targetIndex];
    const direction = targetIndex > activeIndex ? 1 : -1;

    updateIndicators(targetIndex);

    const tl = gsap.timeline({
      onComplete: () => completeTransition(currentSlide, nextSlide, targetIndex),
    });

    tl.to(currentSlide, {
      x: exitX * direction,
      opacity: 0,
      pointerEvents: 'none',
      duration: exitDuration,
      ease: exitEase,
    }, 0);

    tl.fromTo(nextSlide, {
      x: entryX * direction,
      opacity: 0,
      pointerEvents: 'none',
    }, {
      x: 0,
      opacity: 1,
      pointerEvents: 'auto',
      duration: entryDuration,
      ease: entryEase,
    }, stagger);

    // Proportional glow shift — scales with slide count
    if (glow && slides.length > 1) {
      tl.to(glow, {
        x: -(targetIndex / (slides.length - 1)) * 30,
        duration: 0.7,
        ease: 'power3.inOut',
      }, 0);
    }
  }

  function goToSlide(targetIndex) {
    if (targetIndex === activeIndex || isAnimating) return;
    animateTransition(targetIndex);
  }

  // --- Tab & dot clicks ---
  tabs.forEach(tab => {
    tab.addEventListener('click', () => goToSlide(Number(tab.dataset.slide)));
  });
  dots.forEach(dot => {
    dot.addEventListener('click', () => goToSlide(Number(dot.dataset.slide)));
  });

  // --- Mobile touch: real-time finger tracking ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let isDragging = false;
  let isHorizontalSwipe = null; // null = undecided, true/false after threshold
  let previewedIndex = -1;

  if (section) {
    section.addEventListener('touchstart', (e) => {
      if (isAnimating) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchCurrentX = touchStartX;
      isDragging = true;
      isHorizontalSwipe = null;
      previewedIndex = -1;
    }, { passive: true });

    section.addEventListener('touchmove', (e) => {
      if (!isDragging || isAnimating) return;

      touchCurrentX = e.touches[0].clientX;
      const deltaX = touchCurrentX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;

      // Decide direction after 10px of movement
      if (isHorizontalSwipe === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
      }

      if (!isHorizontalSwipe) return;

      // Clamp: don't drag past first/last slide
      const atEdge = (deltaX > 0 && activeIndex === 0) || (deltaX < 0 && activeIndex === slides.length - 1);
      const clampedDelta = atEdge ? deltaX * 0.2 : deltaX;

      const currentSlide = slides[activeIndex];
      gsap.set(currentSlide, { x: clampedDelta, opacity: 1 - Math.abs(clampedDelta) / 600 });

      // Preview the incoming slide
      const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
      if (nextIndex >= 0 && nextIndex < slides.length) {
        previewedIndex = nextIndex;
        const nextSlide = slides[nextIndex];
        const entryOffset = deltaX < 0 ? 80 : -80;
        const progress = Math.min(Math.abs(clampedDelta) / 200, 1);
        gsap.set(nextSlide, {
          x: entryOffset * (1 - progress),
          opacity: progress * 0.8,
          pointerEvents: 'none',
        });
      }
    }, { passive: true });

    section.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;

      if (!isHorizontalSwipe || isAnimating) {
        gsap.set(slides[activeIndex], { clearProps: 'x,opacity' });
        return;
      }

      const deltaX = touchCurrentX - touchStartX;
      const threshold = 40;

      // Determine target
      let targetIndex = activeIndex;
      if (deltaX < -threshold && activeIndex < slides.length - 1) {
        targetIndex = activeIndex + 1;
      } else if (deltaX > threshold && activeIndex > 0) {
        targetIndex = activeIndex - 1;
      }

      if (targetIndex !== activeIndex) {
        // Snap to target with touch-tuned easing (faster since user already dragged partway)
        animateTransition(targetIndex, {
          exitX: -100,
          entryX: 0, // next slide is already partially visible from drag
          exitEase: 'expo.out',
          entryEase: 'expo.out',
          exitDuration: 0.5,
          entryDuration: 0.6,
          stagger: 0,
        });
      } else {
        // Snap back — didn't cross threshold
        gsap.to(slides[activeIndex], { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
        // Reset only the previewed neighbor
        if (previewedIndex >= 0 && previewedIndex < slides.length) {
          gsap.to(slides[previewedIndex], { x: 0, opacity: 0, pointerEvents: 'none', duration: 0.4, ease: 'expo.out' });
        }
      }
    }, { passive: true });
  }

  // --- Keyboard navigation ---
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === 'ArrowRight' && activeIndex < slides.length - 1) {
      goToSlide(activeIndex + 1);
    } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
      goToSlide(activeIndex - 1);
    }
  });
}
