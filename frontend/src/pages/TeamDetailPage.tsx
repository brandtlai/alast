// src/pages/TeamDetailPage.tsx
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useTeam } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/Card'
import TrophySymbol from '../components/TrophySymbol'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading, error } = useTeam(id!)

  if (isLoading) return <div className="max-w-7xl mx-auto px-6 py-8"><Spinner /></div>
  if (error)     return <div className="max-w-7xl mx-auto px-6 py-8"><ErrorBox message={error.message} /></div>
  if (!team)     return null

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Background trophy watermark */}
      <div className="absolute right-0 top-0 w-[300px] pointer-events-none select-none">
        <TrophySymbol variant="dark" className="w-full" />
      </div>

      {/* Header */}
      <motion.div
        className="flex items-center gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <TeamLogo url={team.logo_url} name={team.name} size={88} />
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white/90">{team.name}</h1>
          {team.short_name && (
            <p className="text-sm font-black uppercase tracking-widest text-white/40 mt-0.5">{team.short_name}</p>
          )}
          {team.region && (
            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent">
              {team.region}
            </span>
          )}
        </div>
      </motion.div>

      {/* Roster */}
      {team.players && team.players.length > 0 && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Roster</p>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white/80 mb-4">阵容</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {team.players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card href={`/players/${p.id}`} className="p-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-black text-primary mx-auto mb-3">
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="font-black text-sm text-white/90 truncate">{p.nickname}</div>
                  {p.real_name && (
                    <div className="text-xs text-white/40 mt-0.5 truncate">{p.real_name}</div>
                  )}
                  {p.role && (
                    <div className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-accent">{p.role}</div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recent matches */}
      {team.recent_matches && team.recent_matches.length > 0 && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Recent Results</p>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white/80 mb-4">近期比赛</h2>
          <div className="space-y-2">
            {team.recent_matches.map(m => (
              <Card key={m.id} href={`/matches/${m.id}`} className="p-3">
                <div className="flex items-center justify-between gap-4">
                  <StatusBadge status={m.status} />
                  <span className="text-xs font-black text-white/50">{m.stage}</span>
                  <div className="flex-1 text-center font-black text-sm text-primary">
                    {m.team_a_name}&nbsp;
                    <span className="font-black italic tabular-nums">{m.maps_won_a}–{m.maps_won_b}</span>
                    &nbsp;{m.team_b_name}
                  </div>
                  {m.scheduled_at && (
                    <span className="text-xs text-white/30 flex-shrink-0">
                      {dayjs(m.scheduled_at).format('MM-DD')}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
