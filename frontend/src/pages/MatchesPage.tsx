// src/pages/MatchesPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/Card'
import { formatStage } from '../components/tournament/lib/tournamentRounds'
import { fadeUp, headingMask, pageReveal, pressTap, rankGradient, staggerContainer } from '../lib/motion'

const STATUSES = [
  { value: '',         label: '全部' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'live',     label: 'LIVE' },
  { value: 'finished', label: '已结束' },
]

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-shrink-0 px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all"
      whileHover={{ y: -1, scale: 1.03 }}
      whileTap={pressTap}
      style={{
        clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : 'rgba(248,250,252,0.5)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </motion.button>
  )
}

export default function MatchesPage() {
  const [status, setStatus] = useState('')
  const { data: matches, isLoading, error } = useMatches({ status: status || undefined })

  return (
    <motion.div className="max-w-7xl mx-auto px-6 py-8" variants={pageReveal} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={staggerContainer} initial="hidden" animate="show">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Match Schedule</p>
        <motion.h1 variants={headingMask} className="text-4xl font-black italic tracking-tighter text-white/90">赛程 / 战绩</motion.h1>
      </motion.div>

      <motion.div className="flex gap-2 mb-6 flex-wrap" variants={staggerContainer} initial="hidden" animate="show">
        {STATUSES.map(s => (
          <motion.span key={s.value} variants={fadeUp}>
            <FilterPill label={s.label} active={status === s.value} onClick={() => setStatus(s.value)} />
          </motion.span>
        ))}
      </motion.div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {matches && (
        matches.length === 0
          ? <p className="text-sm text-white/40">暂无比赛</p>
          : <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
              {matches.map(m => (
                <motion.div
                  key={m.id}
                  variants={fadeUp}
                  whileHover={{ x: 3 }}
                >
                  <Card href={`/matches/${m.id}`} className="px-4 py-3">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2.5">
                      {m.stage && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{formatStage(m.stage)}</span>
                      )}
                      {m.scheduled_at && (
                        <span className="text-[9px] text-white/25 ml-auto tabular-nums">
                          {dayjs(m.scheduled_at).format('MM-DD HH:mm')}
                        </span>
                      )}
                    </div>

                    {/* Teams + score */}
                    <div className="flex items-center gap-3">
                      {/* Team A */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <TeamLogo url={m.team_a_logo} name={m.team_a_name ?? '?'} size={28} />
                        <span className={`font-black text-sm truncate ${m.status === 'finished' && (m.maps_won_a ?? 0) > (m.maps_won_b ?? 0) ? 'text-white/95' : 'text-white/55'}`}>
                          {m.team_a_name ?? 'TBD'}
                        </span>
                      </div>

                      {/* Score / status */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 px-2">
                        {m.status === 'finished' ? (
                          <>
                            <span
                              className="text-xl font-black italic tabular-nums"
                              style={{
                                backgroundImage: rankGradient(
                                  (m.maps_won_a ?? 0) > (m.maps_won_b ?? 0) ? 'win' :
                                  (m.maps_won_a ?? 0) < (m.maps_won_b ?? 0) ? 'loss' : 'neutral'
                                ),
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >
                              {m.maps_won_a}
                            </span>
                            <span className="text-white/20 text-sm font-bold">:</span>
                            <span
                              className="text-xl font-black italic tabular-nums"
                              style={{
                                backgroundImage: rankGradient(
                                  (m.maps_won_b ?? 0) > (m.maps_won_a ?? 0) ? 'win' :
                                  (m.maps_won_b ?? 0) < (m.maps_won_a ?? 0) ? 'loss' : 'neutral'
                                ),
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >
                              {m.maps_won_b}
                            </span>
                          </>
                        ) : (
                          <StatusBadge status={m.status} />
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                        <span className={`font-black text-sm truncate text-right ${m.status === 'finished' && (m.maps_won_b ?? 0) > (m.maps_won_a ?? 0) ? 'text-white/95' : 'text-white/55'}`}>
                          {m.team_b_name ?? 'TBD'}
                        </span>
                        <TeamLogo url={m.team_b_logo} name={m.team_b_name ?? '?'} size={28} />
                      </div>
                    </div>

                    {m.news_slug && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-primary truncate">
                        赛后解读 · {m.news_title ?? '阅读战报'}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </motion.div>
      )}
    </motion.div>
  )
}
