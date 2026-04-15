// src/pages/PlayersPage.tsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePlayers } from '../api/players'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'

export default function PlayersPage() {
  const { data: players, isLoading, error } = usePlayers()

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">All Players</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">参赛选手</h1>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {players && (
        players.length === 0
          ? <p className="text-sm text-white/40">暂无选手数据</p>
          : <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    {['选手', '战队', '国家', '定位'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/35">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {players.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link to={`/players/${p.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                            {p.nickname.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-black text-sm text-white/90 group-hover:text-primary transition-colors">
                            {p.nickname}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        {p.team_name
                          ? <Link to={`/teams/${p.team_id ?? ''}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <TeamLogo url={p.team_logo_url} name={p.team_name} size={18} />
                              <span className="text-sm text-white/60 font-bold">{p.team_name}</span>
                            </Link>
                          : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-white/55 font-bold">{p.country ?? '—'}</td>
                      <td className="px-5 py-3">
                        {p.role
                          ? <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent">
                              {p.role}
                            </span>
                          : <span className="text-white/25">—</span>}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  )
}
