import { Link } from 'react-router-dom'
import { usePlayers } from '../api/players'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'

export default function PlayersPage() {
  const { data: players, isLoading, error } = usePlayers()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">参赛选手</h1>
      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {players && (
        players.length === 0
          ? <p className="opacity-40">暂无选手数据</p>
          : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase opacity-50" style={{ background: 'rgba(10,15,45,0.8)' }}>
                    <th className="px-4 py-3">选手</th>
                    <th className="px-4 py-3">战队</th>
                    <th className="px-4 py-3">国家</th>
                    <th className="px-4 py-3">定位</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className="border-t transition-colors hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(10,15,45,0.3)' }}>
                      <td className="px-4 py-3">
                        <Link to={`/players/${p.id}`} className="flex items-center gap-2 font-semibold hover:underline" style={{ color: 'var(--color-foreground)' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--color-secondary)' }}>
                            {p.nickname.slice(0, 2).toUpperCase()}
                          </div>
                          {p.nickname}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {p.team_name
                          ? <Link to={`/teams/${p.team_id}`} className="flex items-center gap-2 hover:opacity-80">
                              <TeamLogo url={p.team_logo_url} name={p.team_name} size={20} />
                              <span className="opacity-70">{p.team_name}</span>
                            </Link>
                          : <span className="opacity-30">—</span>}
                      </td>
                      <td className="px-4 py-3 opacity-60">{p.country ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.role ? <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,209,255,0.1)', color: 'var(--color-accent)' }}>{p.role}</span> : '—'}
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
