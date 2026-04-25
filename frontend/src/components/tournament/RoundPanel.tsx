import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function RoundPanel({ title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-black text-white/90">{title}</span>
          {subtitle && <span className="text-[10px] font-mono text-white/35">{subtitle}</span>}
        </div>
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--color-data-divider)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
