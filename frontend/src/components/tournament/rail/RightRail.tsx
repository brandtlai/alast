import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function RightRail({ children }: Props) {
  return (
    <aside className="space-y-4">
      {children}
    </aside>
  )
}

interface CardProps {
  title?: string
  children: ReactNode
}

export function RailCard({ title, children }: CardProps) {
  return (
    <div
      className="rounded-md border p-4"
      style={{
        background: 'var(--color-data-surface)',
        borderColor: 'var(--color-data-divider)',
      }}
    >
      {title && (
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
