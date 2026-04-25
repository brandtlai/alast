import type { MatchMap } from '../../types'

interface Props {
  maps: MatchMap[]
  selectedId: string
  onSelect: (id: string) => void
}

export default function MapPicker({ maps, selectedId, onSelect }: Props) {
  if (maps.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {maps.map((m, i) => {
        const hasScore = m.score_a !== null && m.score_b !== null
        const selected = m.id === selectedId
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="px-4 py-2 rounded-md text-sm font-black transition-all"
            style={{
              background: selected ? 'var(--color-primary)' : 'var(--color-data-chip)',
              color: selected ? '#fff' : 'var(--color-data-text-muted)',
              border: `1px solid ${selected ? 'transparent' : 'var(--color-data-divider)'}`,
            }}
          >
            <span className="uppercase tracking-wide text-xs opacity-70 mr-1.5">MAP {i + 1}</span>
            {m.map_name.replace('de_', '')}
            {hasScore && (
              <span className="ml-2 tabular-nums font-mono text-xs" style={{ color: selected ? '#fff' : 'var(--color-data-text-muted)' }}>
                {m.score_a}–{m.score_b}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
