import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeams } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'

const REGIONS = ['', 'Asia', 'EU', 'NA', 'CIS']

export default function TeamsPage() {
  const [region, setRegion] = useState('')
  const { data: teams, isLoading, error } = useTeams(region || undefined)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">参赛战队</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {REGIONS.map(r => (
          <button key={r} onClick={() => setRegion(r)}
            className="px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              background: region === r ? 'var(--color-primary)' : 'var(--color-card)',
              color: region === r ? '#fff' : 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}>
            {r || '全部'}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {teams && (
        teams.length === 0
          ? <p className="opacity-40">暂无战队</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map(team => (
                <Link key={team.id} to={`/teams/${team.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <TeamLogo url={team.logo_url} name={team.name} size={56} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{team.name}</div>
                    {team.short_name && <div className="text-sm opacity-50">{team.short_name}</div>}
                    {team.region && <div className="text-xs mt-1 px-2 py-0.5 rounded inline-block" style={{ background: 'rgba(0,209,255,0.1)', color: 'var(--color-accent)' }}>{team.region}</div>}
                  </div>
                </Link>
              ))}
            </div>
      )}
    </div>
  )
}
