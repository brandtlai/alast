import { motion } from 'framer-motion'

export type StatusKind = 'live' | 'upcoming' | 'completed' | 'eliminated'

const colorFor: Record<StatusKind, string> = {
  live:        'var(--color-alert)',
  upcoming:    'var(--color-data)',
  completed:   'var(--color-fg-dim)',
  eliminated:  'var(--color-fg-dim)',
}

interface Props {
  status: StatusKind
  size?: number
}

export function StatusDot({ status, size = 8 }: Props) {
  const base = {
    display: 'inline-block',
    width: size, height: size,
    borderRadius: '50%',
    background: colorFor[status],
  } as const

  if (status === 'live') {
    return (
      <motion.span
        aria-label="live"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
        style={base}
      />
    )
  }
  return <span aria-label={status} style={base} />
}
