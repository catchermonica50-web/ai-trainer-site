export const MOTION = {
  micro: { min: 0.12, default: 0.16, max: 0.2, cssEase: 'cubic-bezier(0.2, 0, 0, 1)' },
  component: {
    min: 0.3,
    default: 0.4,
    max: 0.5,
    gsapEase: 'power3.out',
    ease: [0.16, 1, 0.3, 1],
  },
  section: { min: 0.6, default: 0.75, max: 0.9, gsapEase: 'expo.out' },
  scrub: 0.5,
  crossfade: 0.15,
  reduced: { duration: 0.15 },
  intro: { hintDelay: 1.5, scrollScreens: 2.5, frameCount: 122 },
  magnetic: { radius: 80, maxOffset: 12 },
  rail: { dragThreshold: 6 },
} as const;

export const ENHANCED_EFFECTS_QUERY =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
