// Media conditions page effects are set up under. gsap.matchMedia (./index, ./scroll) reverts and
// re-runs the setup whenever one of them changes. reduce and motion are complements, so one always
// matches: matchMedia only calls a handler while at least one condition matches.
export const media = {
  reduce: '(prefers-reduced-motion: reduce)',
  motion: '(prefers-reduced-motion: no-preference)',
  touch: '(hover: none), (pointer: coarse)',
  mobile: '(max-width: 767px)',
} as const;
export type Media = Record<keyof typeof media, boolean>;

export const prefersReducedMotion = () => matchMedia(media.reduce).matches;

// Shared easing vocabulary. Use these names everywhere; never invent per-component curves.
export const ease = {
  out: 'expo.out', // default entrance: the "lock" of sweep and lock
  inOut: 'expo.inOut', // curtains, page transitions
  soft: 'power3.out', // small UI
} as const;
