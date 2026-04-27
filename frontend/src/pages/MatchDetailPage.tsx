import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import dayjs from 'dayjs'
import {
  useMatch, useMatchMaps, useMapStats, useMapRounds, useMapEconomy, useMapHighlights,
} from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { formatStage } from '../components/tournament/lib/tournamentRounds'
import { pageReveal, staggerContainer, fadeUp } from '../lib/motion'
import type { MapStatPlayer, MatchRound } from '../types'

type TabId = 'OVERVIEW' | 'SCOREBOARD' | 'ROUNDS' | 'STATS'
const TABS: TabId[] = ['OVERVIEW', 'SCOREBOARD', 'ROUNDS', 'STATS']

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

interface OverviewProps {
  teamAName: string
  teamBName: string
  teamAId: string | null
  teamBId: string | null
  rounds: MatchRound[]
}

function OverviewTab({ teamAName, teamBName, teamAId, teamBId, rounds }: OverviewProps) {
  const getColor = (round: MatchRound) => {
    if (!round.winner_team_id) return 'var(--color-fg-dim)'
    if (round.winner_team_id === teamAId) return 'var(--color-data)'
    if (round.winner_team_id === teamBId) return 'var(--color-fire)'
    return 'var(--color-fg-dim)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Team summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <HudPanel staticCorners style={{ padding: 24 }}>
          <TacticalLabel text="TEAM A" />
          <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-fg)' }}>
            {teamAName}
          </div>
        </HudPanel>
        <HudPanel staticCorners style={{ padding: 24 }}>
          <TacticalLabel text="TEAM B" />
          <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-fg)' }}>
            {teamBName}
          </div>
        </HudPanel>
      </div>

      {/* Round timeline */}
      <HudPanel staticCorners style={{ padding: 24 }}>
        <TacticalLabel text="ROUND TIMELINE" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 16 }}>
          {rounds.length === 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-fg-dim)' }}>
              NO DATA
            </span>
          )}
          {rounds.map(round => (
            <div
              key={round.id}
              title={`Round ${round.round_number}`}
              style={{
                width: 8,
                height: 32,
                borderRadius: 2,
                background: getColor(round),
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </HudPanel>
    </div>
  )
}

// ─── SCOREBOARD ───────────────────────────────────────────────────────────────

interface ScoreboardProps {
  stats: MapStatPlayer[]
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
}

// Shared column widths: PLAYER 1fr | K 56px | D 56px | A 56px | ADR 64px | RATING 72px
const COL_WIDTHS = '1fr 56px 56px 56px 64px 72px'

const TH_MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 10,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--color-fg-dim)',
  fontWeight: 400,
  textAlign: 'right',
  padding: '8px 0',
}

const TD_NUM: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 13,
  textAlign: 'right',
  color: 'var(--color-fg)',
  padding: '11px 0',
  borderBottom: '1px solid var(--color-line)',
}

function PlayerTable({ players, teamName }: { players: MapStatPlayer[]; teamName: string }) {
  if (players.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <TacticalLabel text={teamName} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: COL_WIDTHS,
          borderBottom: '1px solid var(--color-line)',
          paddingBottom: 4,
        }}>
          {(['PLAYER', 'K', 'D', 'A', 'ADR', 'RTG'] as const).map(col => (
            <span key={col} style={{ ...TH_MONO, textAlign: col === 'PLAYER' ? 'left' : 'right' }}>
              {col}
            </span>
          ))}
        </div>
        {/* Body rows */}
        {players.map(p => {
          const rating = p.rating ?? 0
          const ratingColor = rating >= 1.0 ? 'var(--color-data)' : 'var(--color-fg-muted)'
          return (
            <div key={p.player_id} style={{
              display: 'grid',
              gridTemplateColumns: COL_WIDTHS,
              alignItems: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--color-fg)',
                padding: '11px 0',
                borderBottom: '1px solid var(--color-line)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <Link
                  to={`/players/${p.player_id}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {p.nickname}
                </Link>
              </span>
              <span style={TD_NUM}>{p.kills ?? 0}</span>
              <span style={TD_NUM}>{p.deaths ?? 0}</span>
              <span style={TD_NUM}>{p.assists ?? 0}</span>
              <span style={TD_NUM}>{p.adr != null ? Math.round(p.adr) : '—'}</span>
              <span style={{ ...TD_NUM, color: ratingColor }}>{rating.toFixed(2)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreboardTab({ stats, teamAId, teamBId, teamAName, teamBName }: ScoreboardProps) {
  const teamA = stats.filter(p => p.team_id === teamAId)
  const teamB = stats.filter(p => p.team_id === teamBId)
  return (
    <HudPanel staticCorners style={{ padding: 24 }}>
      <PlayerTable players={teamA} teamName={teamAName} />
      <PlayerTable players={teamB} teamName={teamBName} />
      {stats.length === 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-fg-dim)' }}>
          NO SCOREBOARD DATA
        </span>
      )}
    </HudPanel>
  )
}

// ─── ROUNDS ──────────────────────────────────────────────────────────────────

interface RoundsTabProps {
  rounds: MatchRound[]
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
}

// end_reason codes from CSDM: 1=TargetBombed 7=TerroristWin 8=CTWin 9=BombDefused 12=TargetSaved
function formatEndReason(code: number | null): string {
  switch (code) {
    case 1: return 'BOMB EXPLODED'
    case 7: return 'T ELIMINATED'
    case 8: return 'CT ELIMINATED'
    case 9: return 'BOMB DEFUSED'
    case 12: return 'TIME EXPIRED'
    default: return ''
  }
}

const HALF_LABEL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: 'var(--color-fg-dim)',
}

function RoundsTab({ rounds, teamAId, teamBId, teamAName, teamBName }: RoundsTabProps) {
  if (rounds.length === 0) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-fg-dim)' }}>
        NO ROUND DATA
      </span>
    )
  }

  const firstHalf = rounds.filter(r => r.round_number <= 12)
  const secondHalf = rounds.filter(r => r.round_number >= 13 && r.round_number <= 24)
  const overtime = rounds.filter(r => r.round_number > 24)

  function renderHalfRows(halfRounds: MatchRound[]) {
    return halfRounds.map(round => {
      const isAWinner = round.winner_team_id === teamAId
      const isBWinner = round.winner_team_id === teamBId
      const winnerName = isAWinner ? teamAName : isBWinner ? teamBName : null
      const barColor = isAWinner ? 'var(--color-data)' : isBWinner ? 'var(--color-fire)' : 'var(--color-line)'
      const endReasonLabel = formatEndReason(round.end_reason)

      // Detect clutch: single killer got 3+ kills in the round
      let clutchKiller: string | null = null
      if (round.kills && round.kills.length >= 3) {
        const killerMap = new Map<string, number>()
        for (const k of round.kills) {
          if (k.killer_player_id) {
            killerMap.set(k.killer_player_id, (killerMap.get(k.killer_player_id) ?? 0) + 1)
          }
        }
        for (const [pid, count] of killerMap) {
          if (count >= 3) { clutchKiller = pid; break }
        }
      }

      const scoreA = round.team_a_score
      const scoreB = round.team_b_score
      const hasScore = scoreA != null && scoreB != null

      return (
        <div
          key={round.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '4px 44px 1fr auto auto auto',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-line)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(199,255,61,0.04)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }}
        >
          {/* Colored side bar */}
          <div style={{ width: 4, height: '100%', minHeight: 32, background: barColor, borderRadius: 2 }} />

          {/* Round number pill */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 12,
            color: 'var(--color-fg-dim)',
            letterSpacing: '0.05em',
          }}>
            R{String(round.round_number).padStart(2, '0')}
          </span>

          {/* Winner team name */}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            color: isAWinner ? 'var(--color-data)' : isBWinner ? 'var(--color-fire)' : 'var(--color-fg-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {winnerName ?? '—'}
          </span>

          {/* Win condition tag */}
          {endReasonLabel ? (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-fg-dim)',
              padding: '2px 6px',
              border: '1px solid var(--color-line)',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}>
              {endReasonLabel}
            </span>
          ) : <span />}

          {/* Running score */}
          {hasScore ? (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 13,
              color: 'var(--color-fg-muted)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
            }}>
              <span style={{ color: isAWinner ? 'var(--color-data)' : 'inherit' }}>
                {String(scoreA).padStart(2, '0')}
              </span>
              {' : '}
              <span style={{ color: isBWinner ? 'var(--color-fire)' : 'inherit' }}>
                {String(scoreB).padStart(2, '0')}
              </span>
            </span>
          ) : <span />}

          {/* Clutch indicator */}
          {clutchKiller ? (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-data)',
              letterSpacing: '0.1em',
            }}>
              <Zap size={12} />
              <span>CLUTCH</span>
            </span>
          ) : <span />}
        </div>
      )
    })
  }

  const dividerLine = <div style={{ width: 40, height: 1, background: 'var(--color-line)', flex: 1 }} />

  return (
    <HudPanel staticCorners style={{ overflow: 'hidden' }}>
      {firstHalf.length > 0 && (
        <>
          <div style={HALF_LABEL_STYLE}>
            {dividerLine}
            <span>HALF 1</span>
            {dividerLine}
          </div>
          {renderHalfRows(firstHalf)}
        </>
      )}
      {secondHalf.length > 0 && (
        <>
          <div style={HALF_LABEL_STYLE}>
            {dividerLine}
            <span>HALF 2</span>
            {dividerLine}
          </div>
          {renderHalfRows(secondHalf)}
        </>
      )}
      {overtime.length > 0 && (
        <>
          <div style={HALF_LABEL_STYLE}>
            {dividerLine}
            <span>OVERTIME</span>
            {dividerLine}
          </div>
          {renderHalfRows(overtime)}
        </>
      )}
    </HudPanel>
  )
}

// ─── STATS (Economy chart inline) ────────────────────────────────────────────

import EconomyChart from '../components/match/EconomyChart'
import type { EconomyRound } from '../types'

interface StatsTabProps {
  economy: EconomyRound[]
  teamAName: string
  teamBName: string
}

function StatsTab({ economy, teamAName, teamBName }: StatsTabProps) {
  return (
    <HudPanel staticCorners style={{ padding: 24 }}>
      <TacticalLabel text="ECONOMY" />
      <div style={{ marginTop: 16 }}>
        <EconomyChart
          rounds={economy}
          teamAName={teamAName}
          teamBName={teamBName}
        />
      </div>
    </HudPanel>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: match, isLoading, error } = useMatch(id!)
  const { data: maps = [] } = useMatchMaps(id)

  const [selectedMapId, setSelectedMapId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabId>('OVERVIEW')

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

  // suppress unused variable warning for highlights (no HIGHLIGHTS tab in spec)
  void highlights

  return (
    <motion.div
      variants={pageReveal}
      initial="hidden"
      animate="show"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}
    >
      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--color-line)',
        padding: '96px 32px 32px',
      }}>
        {/* Match ID label */}
        <div style={{ marginBottom: 16 }}>
          <TacticalLabel text={`MATCH :: ${match.id}`} />
        </div>

        {/* Meta row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 32,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-mono-xs)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-fg-dim)',
        }}>
          {match.stage && <span>{formatStage(match.stage)}</span>}
          {match.best_of != null && match.best_of > 0 && <span>· BO{match.best_of}</span>}
          {totalDurationSec > 0 && <span>· {formatDuration(totalDurationSec)}</span>}
          {match.scheduled_at && <span>· {dayjs(match.scheduled_at).format('YYYY-MM-DD HH:mm')}</span>}
        </div>

        {/* Reschedule / admin note (from main: matches.note column) */}
        {match.note && (
          <div
            style={{
              marginBottom: 16,
              padding: '8px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              letterSpacing: '0.1em',
              textAlign: 'center',
              background: 'var(--color-fire-soft)',
              border: '1px solid rgba(255,61,20,0.35)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-fire)',
            }}
          >
            ⓘ {match.note}
          </div>
        )}

        {/* 3-column score grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24 }}>
          {/* Team A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={64} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-display-xl)',
              lineHeight: 1,
              textAlign: 'right',
              color: teamAWon ? 'var(--color-fg)' : 'var(--color-fg-muted)',
            }}>
              {match.team_a_name ?? 'TBD'}
            </span>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DataReadout value={match.maps_won_a} size={80} pad={2} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 48, color: 'var(--color-fg-dim)' }}>:</span>
            <DataReadout value={match.maps_won_b} size={80} pad={2} />
          </div>

          {/* Team B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={64} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-display-xl)',
              lineHeight: 1,
              color: teamBWon ? 'var(--color-fg)' : 'var(--color-fg-muted)',
            }}>
              {match.team_b_name ?? 'TBD'}
            </span>
          </div>
        </div>

        {/* Map chips */}
        {maps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32, justifyContent: 'center' }}>
            {maps.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  border: `1px solid ${m.id === selectedMapId ? 'var(--color-data)' : 'var(--color-line)'}`,
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: m.id === selectedMapId ? 'var(--color-data)' : 'var(--color-fg-muted)',
                  cursor: 'pointer',
                }}
              >
                {m.map_name.replace('de_', '').toUpperCase()}
                {m.score_a != null && m.score_b != null ? ` ${m.score_a}-${m.score_b}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 32px',
        borderBottom: '1px solid var(--color-line)',
        gap: 4,
      }}>
        {TABS.map(tab => {
          const isActive = tab === activeTab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--color-data)' : 'transparent'}`,
                color: isActive ? 'var(--color-data)' : 'var(--color-fg-muted)',
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <motion.div
        key={activeTab + selectedMapId}
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{ padding: '32px 0' }}
      >
        <motion.div variants={fadeUp}>
          {activeTab === 'OVERVIEW' && (
            <OverviewTab
              teamAName={match.team_a_name ?? 'Team A'}
              teamBName={match.team_b_name ?? 'Team B'}
              teamAId={match.team_a_id}
              teamBId={match.team_b_id}
              rounds={rounds}
            />
          )}
          {activeTab === 'SCOREBOARD' && (
            <ScoreboardTab
              stats={stats}
              teamAId={match.team_a_id}
              teamBId={match.team_b_id}
              teamAName={match.team_a_name ?? 'Team A'}
              teamBName={match.team_b_name ?? 'Team B'}
            />
          )}
          {activeTab === 'ROUNDS' && (
            <RoundsTab
              rounds={rounds}
              teamAId={match.team_a_id}
              teamBId={match.team_b_id}
              teamAName={match.team_a_name ?? 'Team A'}
              teamBName={match.team_b_name ?? 'Team B'}
            />
          )}
          {activeTab === 'STATS' && (
            <StatsTab
              economy={economy}
              teamAName={match.team_a_name ?? 'Team A'}
              teamBName={match.team_b_name ?? 'Team B'}
            />
          )}
        </motion.div>

        {/* News link (if available) */}
        {match.status === 'finished' && match.news && (
          <motion.div variants={fadeUp} style={{ marginTop: 32 }}>
            <HudPanel staticCorners style={{ padding: 24 }}>
              <TacticalLabel text="POST-MATCH REPORT" />
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  color: 'var(--color-fg)',
                  marginBottom: 8,
                }}>
                  {match.news.title}
                </div>
                {match.news.summary && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--color-fg-muted)',
                    marginBottom: 16,
                    lineHeight: 1.6,
                  }}>
                    {match.news.summary}
                  </div>
                )}
                <Link
                  to={`/news/${match.news.slug}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-mono-xs)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--color-data)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--color-data)',
                    paddingBottom: 2,
                  }}
                >
                  READ FULL REPORT
                </Link>
              </div>
            </HudPanel>
          </motion.div>
        )}

        {/* Map detail label when map selected */}
        {selectedMap && (
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              letterSpacing: '0.2em',
              color: 'var(--color-fg-dim)',
              textTransform: 'uppercase',
            }}>
              VIEWING :: {selectedMap.map_name.replace('de_', '').toUpperCase()}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
