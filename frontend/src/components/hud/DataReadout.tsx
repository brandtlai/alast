import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'

interface Props {
  value: number | string
  pad?: number
  size?: number | string
  color?: string
  className?: string
}

/** Renders each character with an odometer-style roll on change. */
export function DataReadout({ value, pad, size, color, className }: Props) {
  const str = typeof value === 'number' && pad ? value.toString().padStart(pad, '0') : String(value)
  const chars = Array.from(str)

  const style: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums',
    fontSize: size,
    color: color ?? 'var(--color-data)',
    display: 'inline-flex',
    lineHeight: 1,
  }

  return (
    <span style={style} className={className}>
      {chars.map((ch, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', height: '1em', lineHeight: 1 }}>
          <motion.span
            key={ch + i}
            initial={{ y: '-100%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.38, ease: [0.7, 0, 0.3, 1], delay: (chars.length - i - 1) * 0.025 }}
            style={{ display: 'inline-block' }}
          >
            {ch}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
