// src/pages/MatchesPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/Card'

const STATUSES = [
  { value: '',         label: '全部' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'live',     label: 'LIVE' },
  { value: 'finished', label: '已结束' },
]

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all"
      style={{
        clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : 'rgba(248,250,252,0.5)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </button>
  )
}

export default function MatchesPage() {
  const [status, setStatus] = useState('')
  const { data: matches, isLoading, error } = useMatches({ status: status || undefined })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Match Schedule</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">赛程 / 战绩</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map(s => (
          <FilterPill key={s.value} label={s.label} active={status === s.value} onClick={() => setStatus(s.value)} />
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {matches && (
        matches.length === 0
          ? <p className="text-sm text-white/40">暂无比赛</p>
          : <div className="space-y-3">
              {matches.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card href={`/matches/${m.id}`} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <TeamLogo url={m.team_a_logo} name={m.team_a_name ?? '?'} size={36} />
                        <span className="font-black truncate text-white/90">{m.team_a_name ?? 'TBD'}</span>
                      </div>
                      <div className="text-center px-4 flex-shrink-0 space-y-0.5">
                        {m.status === 'finished'
                          ? <div className="text-xl font-black italic tabular-nums text-primary">{m.maps_won_a}–{m.maps_won_b}</div>
                          : <StatusBadge status={m.status} />}
                        {m.stage && (
                          <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{m.stage}</div>
                        )}
                        {m.scheduled_at && (
                          <div className="text-xs text-white/30">{dayjs(m.scheduled_at).format('MM-DD HH:mm')}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                        <span className="font-black truncate text-white/90">{m.team_b_name ?? 'TBD'}</span>
                        <TeamLogo url={m.team_b_logo} name={m.team_b_name ?? '?'} size={36} />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
      )}
    </div>
  )
}
