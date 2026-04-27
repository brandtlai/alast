// Tactical OS-compliant motion primitives.
// All exported names preserved for legacy consumers (MatchDetailPage, DraftPage, ...);
// internals migrated to opacity+translate-only — no scale, no rotate, no blur.
// Prefer importing from `src/design/motion.ts` directly for new code.

import type { Variants } from 'framer-motion'
import type React from 'react'

export const easeOutQuart = [0.22, 1, 0.36, 1] as const
export const easeSoft = [0.16, 1, 0.3, 1] as const

export const pageReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easeOutQuart },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
    },
  },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeOutQuart },
  },
}

export const panelReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeSoft },
  },
}

// Hover effects intentionally minimal — Tactical OS uses CornerBracket activate
// (CSS-only border-color transition) as the canonical hover signal.
export const softHover = {
  opacity: 1,
  transition: { duration: 0.12 },
}

export const pressTap = {
  opacity: 0.85,
  transition: { duration: 0.08 },
}

// ── Rank semantic axis (used by leaderboard/standings/result decorations) ──
export type Outcome = 'win' | 'loss' | 'neutral'

const RANK_GRADIENT: Record<Outcome, string> = {
  win:     'linear-gradient(135deg, #FFE066 0%, #FFB800 45%, #FF8A00 100%)',
  loss:    'linear-gradient(135deg, #FF3D14 0%, #FF2D2D 100%)',
  neutral: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))',
}

const RANK_GLOW: Record<Outcome, string> = {
  win:     'rgba(255, 184, 0, 0.55)',
  loss:    'rgba(255, 61, 20, 0.5)',
  neutral: 'rgba(255, 255, 255, 0.18)',
}

export function rankGradient(outcome: Outcome): string {
  return RANK_GRADIENT[outcome]
}

export function rankGlow(outcome: Outcome): string {
  return RANK_GLOW[outcome]
}

// Reveal for rank-tagged elements. No scale.
export const rankReveal = (_outcome: Outcome): Variants => ({
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeSoft },
  },
})

export const glowPulse = (tone: Outcome) => ({
  animation: 'glowPulseRank 6.5s ease-in-out infinite',
  ['--rank-glow' as string]: rankGlow(tone),
}) as React.CSSProperties

// Heading reveal — replaced clipPath wipe with simple opacity+y to match Tactical OS tone.
export const headingMask: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easeOutQuart },
  },
}

// Score change — replaced rotateX 3D flip with opacity dip (digit-flip handled
// by DataReadout odometer when used; this variant is kept only for legacy callers).
export const scoreFlip: Variants = {
  hidden: { opacity: 0, y: -4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: easeOutQuart },
  },
}
