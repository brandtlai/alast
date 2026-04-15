import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeaderboard } from '../api/stats'
import { useTournaments } from '../api/tournaments'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'

type Stat = 'rating' | 'adr' | 'kast'

const STATS: { value: Stat; label: string }[] = [
  { value: 'rating', label: 'Rating' },
  { value: 'adr', label: 'ADR' },
  { value: 'kast', label: 'KAST%' },
]

export default function StatsPage() {
  const [stat, setStat] = useState<Stat>('rating')
  const [tournamentId, setTournamentId] = useState('')
  const { data: tournaments } = useTournaments()
  const { data: leaderboard, isLoading, error } = useLeaderboard({
    stat,
    tournament_id: tournamentId || undefined,
    limit: 20,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">数据中心</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {STATS.map(s => (
            <button key={s.value} onClick={() => setStat(s.value)}
              className="px-3 py-1.5 rounded-md text-sm transition-all"
              style={{
                background: stat === s.value ? 'var(--color-primary)' : 'var(--color-card)',
                color: stat === s.value ? '#fff' : 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        {tournaments && tournaments.length > 0 && (
          <select value={tournamentId} onChange={e => setTournamentId(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm"
            style={{ background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}>
            <option value="">全部赛事</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {leaderboard && (
        leaderboard.length === 0
          ? <p className="opacity-40">暂无数据（需要至少 3 图数据）</p>
          : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase opacity-50" style={{ background: 'rgba(10,15,45,0.8)' }}>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">选手</th>
                    <th className="px-4 py-3">战队</th>
                    <th className="px-4 py-3">参赛图数</th>
                    <th className="px-4 py-3">{STATS.find(s => s.value === stat)?.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(10,15,45,0.3)' }}>
                      <td className="px-4 py-3 font-bold opacity-40">#{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={`/players/${entry.id}`} className="font-semibold hover:underline" style={{ color: 'var(--color-foreground)' }}>
                          {entry.nickname}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {entry.team_name
                          ? <div className="flex items-center gap-2">
                              <TeamLogo url={entry.team_logo_url} name={entry.team_name} size={20} />
                              <span className="opacity-70">{entry.team_name}</span>
                            </div>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 opacity-60">{entry.maps_played}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-primary)' }}>{entry.avg_stat ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  )
}
