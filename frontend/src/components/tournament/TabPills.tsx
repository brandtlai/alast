import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

export const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'groups',   label: 'Group Stage' },
  { key: 'bracket',  label: 'Bracket' },
  { key: 'results',  label: 'Results' },
] as const

export type TabKey = (typeof TABS)[number]['key']

export function useActiveTab(): [TabKey, (k: TabKey) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const active: TabKey =
    (TABS.find(t => t.key === raw)?.key) ?? 'overview'
  const setActive = (k: TabKey) => {
    const next = new URLSearchParams(params)
    if (k === 'overview') next.delete('tab')
    else next.set('tab', k)
    setParams(next, { replace: false })
  }
  return [active, setActive]
}

export default function TabPills() {
  const [active, setActive] = useActiveTab()

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
      <div className="max-w-7xl mx-auto px-6 flex gap-2 overflow-x-auto custom-scrollbar">
        {TABS.map(t => {
          const isActive = active === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={[
                'relative px-5 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors',
                isActive ? 'text-primary' : 'text-white/45 hover:text-white/80',
              ].join(' ')}
            >
              {t.label}
              {isActive && (
                <motion.div
                  layoutId="hub-tab-active"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary"
                  style={{ boxShadow: '0 0 10px rgba(255,138,0,0.5)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
