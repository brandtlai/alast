import type { Variants, Transition } from 'framer-motion'

export const easeHud: Transition['ease']  = [0.2, 0.8, 0.2, 1]
export const easeMech: Transition['ease'] = [0.7, 0, 0.3, 1]

/** M1: HUD entrance for cards and rows. Use with `whileInView` and `viewport={{ once: true }}`. */
export const hudEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeHud } },
}

/** Stagger container for grouped HUD entrance. */
export const hudStagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.04 } },
}

/** M3: scan line — top → bottom. Apply to a 1px-tall absolute element. */
export const scanLine: Variants = {
  loop: {
    y: ['0%', '4000%'],
    transition: { duration: 4, ease: 'linear', repeat: Infinity },
  },
}

/** M4: status pulse — only used by StatusDot LIVE state. */
export const statusPulse: Variants = {
  pulse: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
  },
}

/** M5: corner bracket activate. Color transitions handled via CSS variables; this is just timing. */
export const cornerActivate: Transition = { duration: 0.2, ease: easeMech }
