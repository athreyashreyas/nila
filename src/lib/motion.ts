// Motion tokens, single-sourced so every animation across Nila feels like one
// hand. Springs, not linear tweens, so motion stays physical. Keep durations
// short and calm. prefers-reduced-motion is honoured app-wide by
// <MotionConfig reducedMotion="user"> in the app layout, which makes every
// spring and tween below instant without removing any functional motion.
import type { Variants, Transition } from 'framer-motion';

// A snappy, reactive spring for taps, toggles, and card presses.
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 32 };

// A softer spring for larger surfaces: sheets, rings, phase transitions.
export const softSpring: Transition = { type: 'spring', stiffness: 240, damping: 26 };

// Standard press feedback for any tappable surface.
export const tap = { scale: 0.96 } as const;
export const tapSmall = { scale: 0.9 } as const;

// A gently staggered list: children ease up in sequence.
export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.03 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: spring },
};

// Sheet / overlay rise from the bottom.
export const sheetRise: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: softSpring },
  exit: { y: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

// A calm cross-fade for swapping content in place.
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
};
