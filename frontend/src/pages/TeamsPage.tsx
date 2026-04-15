// src/pages/TeamsPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTeams } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import Card from '../components/Card'

const REGIONS = ['', 'Asia', 'EU', 'NA', 'CIS']

export default function TeamsPage() {
  const [region, setRegion] = useState('')
  const { data: teams, isLoading, error } = useTeams(region || undefined)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Competing Teams</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">参赛战队</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
            style={{
              background: region === r ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              color: region === r ? '#fff' : 'rgba(248,250,252,0.5)',
              borderColor: region === r ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {r || '全部'}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {teams && (
        teams.length === 0
          ? <p className="text-sm text-white/40">暂无战队</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map((team, i) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <Card href={`/teams/${team.id}`} className="p-5">
                    <div className="flex items-center gap-4">
                      <TeamLogo url={team.logo_url} name={team.name} size={56} />
                      <div className="min-w-0">
                        <div className="font-black text-white/90 truncate">{team.name}</div>
                        {team.short_name && (
                          <div className="text-sm text-white/40 font-bold truncate">{team.short_name}</div>
                        )}
                        {team.region && (
                          <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent">
                            {team.region}
                          </span>
                        )}
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
