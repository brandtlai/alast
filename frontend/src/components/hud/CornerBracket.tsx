import type { CSSProperties } from 'react'

interface Props {
  active?: boolean
  size?: number
  width?: number
}

export function CornerBracket({ active = false, size = 12, width = 1 }: Props) {
  const color = active ? 'var(--color-data)' : 'var(--color-line)'
  const base: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderColor: color,
    transition: 'border-color var(--duration-mid) var(--ease-mech)',
    pointerEvents: 'none',
  }
  return (
    <>
      <span aria-hidden style={{ ...base, top: 0, left: 0,    borderTop:    `${width}px solid`, borderLeft:  `${width}px solid` }} />
      <span aria-hidden style={{ ...base, top: 0, right: 0,   borderTop:    `${width}px solid`, borderRight: `${width}px solid` }} />
      <span aria-hidden style={{ ...base, bottom: 0, left: 0, borderBottom: `${width}px solid`, borderLeft:  `${width}px solid` }} />
      <span aria-hidden style={{ ...base, bottom: 0, right: 0,borderBottom: `${width}px solid`, borderRight: `${width}px solid` }} />
    </>
  )
}
