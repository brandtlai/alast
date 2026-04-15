import { useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'

const STATUSES = [
  { value: '', label: '全部' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'live', label: '进行中' },
  { value: 'finished', label: '已结束' },
]

export default function MatchesPage() {
  const [status, setStatus] = useState('')
  const { data: matches, isLoading, error } = useMatches({ status: status || undefined })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">赛程 / 战绩</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            className="px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              background: status === s.value ? 'var(--color-primary)' : 'var(--color-card)',
              color: status === s.value ? '#fff' : 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {matches && (
        matches.length === 0
          ? <p className="opacity-40">暂无比赛</p>
          : <div className="space-y-3">
              {matches.map(m => (
                <Link key={m.id} to={`/matches/${m.id}`}
                  className="flex items-center p-4 rounded-lg transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  {/* Team A */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TeamLogo url={m.team_a_logo} name={m.team_a_name ?? '?'} size={36} />
                    <span className="font-semibold truncate">{m.team_a_name ?? 'TBD'}</span>
                  </div>
                  {/* Score / Status */}
                  <div className="text-center px-6 flex-shrink-0 space-y-1">
                    {m.status === 'finished'
                      ? <div className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{m.maps_won_a} – {m.maps_won_b}</div>
                      : <StatusBadge status={m.status} />}
                    <div className="text-xs opacity-40">{m.stage ?? '—'}</div>
                    {m.scheduled_at && <div className="text-xs opacity-30">{dayjs(m.scheduled_at).format('MM-DD HH:mm')}</div>}
                  </div>
                  {/* Team B */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                    <span className="font-semibold truncate">{m.team_b_name ?? 'TBD'}</span>
                    <TeamLogo url={m.team_b_logo} name={m.team_b_name ?? '?'} size={36} />
                  </div>
                </Link>
              ))}
            </div>
      )}
    </div>
  )
}
