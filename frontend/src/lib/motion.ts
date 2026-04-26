import type { Variants } from 'framer-motion'

export const easeOutQuart = [0.22, 1, 0.36, 1] as const
export const easeSoft = [0.16, 1, 0.3, 1] as const

export const pageReveal: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: easeOutQuart },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOutQuart },
  },
}

export const panelReveal: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: easeSoft },
  },
}

export const softHover = {
  y: -4,
  scale: 1.01,
  transition: { duration: 0.18, ease: easeOutQuart },
}

export const pressTap = {
  scale: 0.985,
  transition: { duration: 0.08 },
}
