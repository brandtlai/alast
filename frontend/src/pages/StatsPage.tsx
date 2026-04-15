// src/pages/StatsPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeaderboard } from '../api/stats'
import { useTournaments } from '../api/tournaments'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import TrophySymbol from '../components/TrophySymbol'

type Stat = 'rating' | 'adr' | 'kast'

const STATS: { value: Stat; label: string }[] = [
  { value: 'rating', label: 'Rating' },
  { value: 'adr',    label: 'ADR' },
  { value: 'kast',   label: 'KAST%' },
]

const RANK_COLORS: Record<number, string> = {
  0: 'text-gold',
  1: 'text-white/60',
  2: 'text-[#CD7F32]',
}

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
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      {/* Trophy watermark */}
      <div className="absolute right-0 top-0 w-[280px] pointer-events-none select-none">
        <TrophySymbol variant="outline" className="w-full" />
      </div>

      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Leaderboard</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">数据中心</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {STATS.map(s => (
            <button
              key={s.value}
              onClick={() => setStat(s.value)}
              className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
              style={{
                background: stat === s.value ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                color: stat === s.value ? '#fff' : 'rgba(248,250,252,0.5)',
                borderColor: stat === s.value ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        {tournaments && tournaments.length > 0 && (
          <select
            value={tournamentId}
            onChange={e => setTournamentId(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/70 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="">全部赛事</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {leaderboard && (
        leaderboard.length === 0
          ? <p className="text-sm text-white/40">暂无数据（需要至少 3 图数据）</p>
          : <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    {['#', '选手', '战队', '参赛图数', STATS.find(s => s.value === stat)?.label ?? stat].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/35">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3 w-12">
                        <span className={`text-sm font-black italic tabular-nums ${RANK_COLORS[i] ?? 'text-white/30'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link to={`/players/${entry.id}`} className="font-black text-sm text-white/90 hover:text-primary transition-colors">
                          {entry.nickname}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        {entry.team_name
                          ? <div className="flex items-center gap-2">
                              <TeamLogo url={entry.team_logo_url} name={entry.team_name} size={18} />
                              <span className="text-sm text-white/55 font-bold">{entry.team_name}</span>
                            </div>
                          : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-white/50 font-bold tabular-nums">{entry.maps_played}</td>
                      <td className="px-5 py-3">
                        <span className="electric-blue-accent text-sm font-black italic tabular-nums">
                          {entry.avg_stat ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  )
}
