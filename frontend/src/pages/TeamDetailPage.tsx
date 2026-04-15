import { useParams, Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useTeam } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading, error } = useTeam(id!)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!team) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <TeamLogo url={team.logo_url} name={team.name} size={80} />
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          {team.short_name && <div className="opacity-60">{team.short_name}</div>}
          {team.region && <div className="text-sm mt-1 px-2 py-0.5 rounded inline-block" style={{ background: 'rgba(0,209,255,0.1)', color: 'var(--color-accent)' }}>{team.region}</div>}
        </div>
      </div>

      {/* Roster */}
      {team.players && team.players.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">阵容</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {team.players.map(p => (
              <Link key={p.id} to={`/players/${p.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-lg text-center transition-all hover:scale-105"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--color-secondary)' }}>
                  {p.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm">{p.nickname}</div>
                  {p.real_name && <div className="text-xs opacity-50">{p.real_name}</div>}
                  {p.role && <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>{p.role}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Matches */}
      {team.recent_matches && team.recent_matches.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">近期比赛</h2>
          <div className="space-y-2">
            {team.recent_matches.map(m => (
              <Link key={m.id} to={`/matches/${m.id}`}
                className="flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={m.status} />
                  <span className="text-sm opacity-70">{m.stage}</span>
                </div>
                <div className="font-bold" style={{ color: 'var(--color-primary)' }}>
                  {m.team_a_name} {m.maps_won_a} – {m.maps_won_b} {m.team_b_name}
                </div>
                {m.scheduled_at && (
                  <span className="text-xs opacity-40">{dayjs(m.scheduled_at).format('MM-DD')}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
