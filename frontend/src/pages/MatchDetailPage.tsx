import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatch, useMatchMaps, useMapStats, useMapRounds, useMapEconomy, useMapHighlights } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import MapPicker from '../components/match/MapPicker'
import Scoreboard from '../components/match/Scoreboard'
import RoundTimeline from '../components/match/RoundTimeline'
import EconomyChart from '../components/match/EconomyChart'
import HighlightCards from '../components/match/HighlightCards'
import { formatStage } from '../components/tournament/lib/tournamentRounds'
import { fadeUp, pageReveal, panelReveal, scoreFlip, staggerContainer } from '../lib/motion'

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: match, isLoading, error } = useMatch(id!)
  const { data: maps = [] } = useMatchMaps(id)

  const [selectedMapId, setSelectedMapId] = useState<string>('')

  useEffect(() => {
    if (!selectedMapId && maps.length > 0) {
      const first = maps.find(m => m.score_a !== null) ?? maps[0]
      setSelectedMapId(first.id)
    }
  }, [maps, selectedMapId])

  const selectedMap = maps.find(m => m.id === selectedMapId) ?? null

  const { data: stats = [] } = useMapStats(id, selectedMapId || undefined)
  const { data: rounds = [] } = useMapRounds(id, selectedMapId || undefined)
  const { data: economy = [] } = useMapEconomy(id, selectedMapId || undefined)
  const { data: highlights } = useMapHighlights(id, selectedMapId || undefined)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!match) return null

  const totalDurationSec = maps.reduce((acc, m) => acc + (m.duration_seconds ?? 0), 0)

  const teamAWon = match.maps_won_a > match.maps_won_b
  const teamBWon = match.maps_won_b > match.maps_won_a

  return (
    <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6" variants={pageReveal} initial="hidden" animate="show">

      {/* A. Match Header */}
      <motion.div className="rounded-xl p-6 surface-sheen"
           variants={panelReveal}
           style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}>
        <div className="flex items-center justify-center gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-white/40">
          {match.stage && <span>{formatStage(match.stage)}</span>}
          {match.best_of != null && match.best_of > 0 && <span>· BO{match.best_of}</span>}
          {totalDurationSec > 0 && <span>· {formatDuration(totalDurationSec)}</span>}
          {match.scheduled_at && <span>· {dayjs(match.scheduled_at).format('YYYY-MM-DD HH:mm')}</span>}
        </div>

        <div className="flex items-center justify-around gap-4">
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={72} />
            <span className={`font-black text-xl text-center leading-tight ${teamAWon ? 'text-white' : 'text-white/50'}`}>
              {match.team_a_name ?? 'TBD'}
            </span>
          </div>

          <div className="text-center flex-shrink-0 px-4">
            {match.status === 'finished' ? (
              <div className="flex items-center gap-3" style={{ perspective: 600 }}>
                <motion.span
                  variants={scoreFlip}
                  initial="hidden"
                  animate="show"
                  className={`text-5xl font-black tabular-nums ${
                    teamAWon ? 'gold-gradient' : teamBWon ? 'pink-gradient' : 'text-white/40'
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  {match.maps_won_a}
                </motion.span>
                <span className="text-3xl font-black text-white/20">–</span>
                <motion.span
                  variants={scoreFlip}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.12 }}
                  className={`text-5xl font-black tabular-nums ${
                    teamBWon ? 'gold-gradient' : teamAWon ? 'pink-gradient' : 'text-white/40'
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  {match.maps_won_b}
                </motion.span>
              </div>
            ) : (
              <StatusBadge status={match.status} />
            )}
          </div>

          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={72} />
            <span className={`font-black text-xl text-center leading-tight ${teamBWon ? 'text-white' : 'text-white/50'}`}>
              {match.team_b_name ?? 'TBD'}
            </span>
          </div>
        </div>
      </motion.div>

      {match.status === 'finished' && match.news && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-xl p-5 surface-sheen"
          style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">赛后解读</p>
              <h2 className="text-lg font-black text-white/90 leading-snug">{match.news.title}</h2>
              {match.news.summary && (
                <p className="text-sm text-white/50 mt-2 line-clamp-2">{match.news.summary}</p>
              )}
            </div>
            <Link
              to={`/news/${match.news.slug}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-primary text-white hover:brightness-110 transition"
            >
              阅读战报
            </Link>
          </div>
        </motion.section>
      )}

      {/* B. Map Picker */}
      {maps.length > 0 && (
        <MapPicker maps={maps} selectedId={selectedMapId} onSelect={setSelectedMapId} />
      )}

      {/* C. Per-Map Scoreboard */}
      <motion.section variants={fadeUp} initial="hidden" animate="show">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
          {selectedMap ? `${selectedMap.map_name.replace('de_', '').toUpperCase()}  ` : ''}
          Scoreboard
        </h2>
        <Scoreboard
          players={stats}
          teamAId={match.team_a_id}
          teamBId={match.team_b_id}
          teamAName={match.team_a_name ?? 'Team A'}
          teamBName={match.team_b_name ?? 'Team B'}
          rounds={rounds}
          matchWinner={teamAWon ? 'a' : teamBWon ? 'b' : null}
        />
      </motion.section>

      {/* D. Round Timeline */}
      {(rounds.length > 0 || selectedMap) && (
        <motion.section variants={fadeUp} initial="hidden" animate="show">
          <RoundTimeline
            rounds={rounds}
            teamAName={match.team_a_name ?? 'Team A'}
            teamBName={match.team_b_name ?? 'Team B'}
            teamAId={match.team_a_id}
            teamBId={match.team_b_id}
            players={stats}
          />
        </motion.section>
      )}

      {/* E. Economy Chart */}
      {(economy.length > 0 || selectedMap) && (
        <motion.section variants={fadeUp} initial="hidden" animate="show">
          <EconomyChart
            rounds={economy}
            teamAName={match.team_a_name ?? 'Team A'}
            teamBName={match.team_b_name ?? 'Team B'}
          />
        </motion.section>
      )}

      {/* F. Highlights */}
      {highlights && (
        <motion.section variants={staggerContainer} initial="hidden" animate="show">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Highlights</h2>
          <HighlightCards highlights={highlights} />
        </motion.section>
      )}
    </motion.div>
  )
}
