import { useState, type ReactNode, type CSSProperties } from 'react'
import { CornerBracket } from './CornerBracket'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  staticCorners?: boolean
  label?: string
  watermark?: boolean
}

export function HudPanel({ children, className, style, staticCorners, label, watermark }: Props) {
  const [hover, setHover] = useState(false)
  const active = !staticCorners && hover
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      onMouseEnter={() => !staticCorners && setHover(true)}
      onMouseLeave={() => !staticCorners && setHover(false)}
      className={className}
      style={{
        position: 'relative',
        background: 'var(--color-surface)',
        border: `1px solid ${active ? 'var(--color-line-strong)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'border-color var(--duration-mid) var(--ease-mech)',
        ...style,
      }}
    >
      <CornerBracket active={active} />
      {children}
      {watermark && (
        <img
          src="/trophy.png"
          aria-hidden
          alt=""
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            width: 96,
            height: 96,
            opacity: 0.04,
            filter: 'grayscale(1) brightness(2)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
