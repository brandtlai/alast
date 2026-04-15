import { useParams } from 'react-router-dom'
import { useMatch } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import type { MapPlayer } from '../types'

function PlayerStatsTable({ players, teamId, teamName }: { players: MapPlayer[]; teamId: string | null; teamName: string }) {
  const filtered = players.filter(p => p.team_id === teamId)
  if (filtered.length === 0) return null
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold mb-2 opacity-70">{teamName}</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left opacity-40">
            <th className="py-1 pr-3">选手</th>
            <th className="py-1 pr-3">K</th>
            <th className="py-1 pr-3">D</th>
            <th className="py-1 pr-3">A</th>
            <th className="py-1 pr-3">ADR</th>
            <th className="py-1 pr-3">KAST</th>
            <th className="py-1">Rating</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.player_id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
              <td className="py-1.5 pr-3 font-medium">{p.nickname}</td>
              <td className="py-1.5 pr-3">{p.kills ?? '—'}</td>
              <td className="py-1.5 pr-3">{p.deaths ?? '—'}</td>
              <td className="py-1.5 pr-3">{p.assists ?? '—'}</td>
              <td className="py-1.5 pr-3 opacity-70">{p.adr?.toFixed(1) ?? '—'}</td>
              <td className="py-1.5 pr-3 opacity-70">{p.kast?.toFixed(1) ?? '—'}%</td>
              <td className="py-1.5 font-bold" style={{ color: (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'inherit' }}>
                {p.rating?.toFixed(2) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: match, isLoading, error } = useMatch(id!)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!match) return null

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-3">
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={64} />
            <span className="font-bold text-lg">{match.team_a_name ?? 'TBD'}</span>
          </div>
          <div className="text-center">
            {match.status === 'finished'
              ? <div className="text-4xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{match.maps_won_a} – {match.maps_won_b}</div>
              : <StatusBadge status={match.status} />}
            <div className="text-sm opacity-50 mt-2">{match.stage}</div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={64} />
            <span className="font-bold text-lg">{match.team_b_name ?? 'TBD'}</span>
          </div>
        </div>
      </div>

      {/* Maps */}
      {match.maps && match.maps.length > 0 && match.maps.map((map, i) => (
        <div key={map.id} className="rounded-lg p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: 'var(--color-accent)' }}>MAP {i + 1} — {map.map_name.toUpperCase()}</h3>
            {map.score_a !== null && (
              <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{map.score_a} – {map.score_b}</span>
            )}
          </div>
          {map.players && map.players.length > 0 && (
            <div>
              <PlayerStatsTable players={map.players} teamId={match.team_a_id} teamName={match.team_a_name ?? 'Team A'} />
              <PlayerStatsTable players={map.players} teamId={match.team_b_id} teamName={match.team_b_name ?? 'Team B'} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
