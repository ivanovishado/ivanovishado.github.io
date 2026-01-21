import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

/**
 * Setup base ScrollTrigger configurations
 */
export function initScrollTrigger() {
  // Register ScrollTrigger with GSAP
  gsap.registerPlugin(ScrollTrigger, TextPlugin);

  // Set default scroll trigger to use Lenis-controlled scroll
  ScrollTrigger.defaults({
    scroller: document.body,
  });

  // Refresh ScrollTrigger after fonts load
  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
  });
}
