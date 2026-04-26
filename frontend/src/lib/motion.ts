import type { Variants } from 'framer-motion'
import type React from 'react'

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

// ── Rank semantic axis ──
export type Outcome = 'win' | 'loss' | 'neutral'

const RANK_GRADIENT: Record<Outcome, string> = {
  win:     'linear-gradient(135deg, #FFD700 0%, #FFB800 45%, #FF8A00 100%)',
  loss:    'linear-gradient(135deg, #FF2BD6 0%, #B026FF 100%)',
  neutral: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))',
}

const RANK_GLOW: Record<Outcome, string> = {
  win:     'rgba(255, 184, 0, 0.55)',
  loss:    'rgba(255, 43, 214, 0.5)',
  neutral: 'rgba(255, 255, 255, 0.18)',
}

export function rankGradient(outcome: Outcome): string {
  return RANK_GRADIENT[outcome]
}

export function rankGlow(outcome: Outcome): string {
  return RANK_GLOW[outcome]
}

// 几何 spring 入场。颜色由消费方读 rankGradient(outcome) 注入到 style.backgroundImage —
// 避免 framer-motion variants 嵌入动态颜色字符串。outcome 参数保留以让调用点语义自描述
// （未来可按 outcome 调整 spring 参数 / 错峰）。
export const rankReveal = (_outcome: Outcome): Variants => ({
  hidden: { opacity: 0, scale: 0.7 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 18,
      mass: 0.7,
    },
  },
})

export const glowPulse = (tone: Outcome) => ({
  animation: 'glowPulseRank 6.5s ease-in-out infinite',
  // CSS custom prop consumed by @keyframes glowPulseRank
  ['--rank-glow' as string]: rankGlow(tone),
}) as React.CSSProperties

export const headingMask: Variants = {
  hidden: {
    opacity: 0,
    clipPath: 'inset(0 100% 0 0)',
  },
  show: {
    opacity: 1,
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.7, ease: easeOutQuart },
  },
}

export const scoreFlip: Variants = {
  hidden: { opacity: 0, rotateX: -90, y: -8 },
  show: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: { duration: 0.45, ease: easeOutQuart },
  },
}
