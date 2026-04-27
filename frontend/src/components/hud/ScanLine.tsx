import { motion } from 'framer-motion'

/** Container must be `position: relative` and have an explicit height. */
export function ScanLine() {
  return (
    <motion.div
      aria-hidden
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
      style={{
        position: 'absolute',
        left: 0, right: 0,
        height: 1,
        background: 'var(--color-data)',
        boxShadow: '0 0 8px var(--color-data)',
        pointerEvents: 'none',
      }}
    />
  )
}
