import { Fragment, useState, useMemo } from 'react'
import type { MatchRound, MapStatPlayer } from '../../types'

const ECONOMY_LABEL: Record<string, string> = {
  semi: '钢枪',
  full: '全起',
  eco: 'eco',
  pistol: '手枪局',
}

const WEAPON_CN: Record<string, string> = {
  'Incendiary Grenade': '燃烧弹',
  'Molotov': '燃烧瓶',
  'HE Grenade': '手雷',
  'Flashbang': '闪光弹',
  'Smoke Grenade': '烟雾弹',
  'Decoy Grenade': '诱骗弹',
  'grenade': '手雷',
}

function fmtEco(v: string | null) {
  if (!v) return '—'
  return ECONOMY_LABEL[v.toLowerCase()] ?? v
}

function fmtWeapon(name: string | null, isHeadshot: boolean) {
  const w = name ? (WEAPON_CN[name] ?? name) : '?'
  return isHeadshot ? `${w} 爆头` : w
}

interface Props {
  rounds: MatchRound[]
  teamAName: string
  teamBName: string
  teamAId?: string | null
  teamBId?: string | null
  players?: MapStatPlayer[]
}

const CT_COLOR = 'var(--color-data-2)'
const T_COLOR = 'var(--color-fire)'

export default function RoundTimeline({ rounds, teamAName, teamBName, teamAId, teamBId, players = [] }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const playerTeamMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of players) if (p.player_id && p.team_id) m.set(p.player_id, p.team_id)
    return m
  }, [players])

  const playerNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of players) m.set(p.player_id, p.nickname)
    return m
  }, [players])

  if (rounds.length === 0) {
    return (
      <div className="rounded-md border py-6 text-center text-xs text-white/30"
           style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        回合数据待导入
      </div>
    )
  }

  // Half-time divider sits between regulation rounds 12 and 13 (idx 12).
  const HALF_GAP_AFTER = 12

  return (
    <div className="rounded-md border p-4"
         style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Round Timeline</p>

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 1,
          width: '100%',
          minWidth: 0,
        }}
      >
        {rounds.map((r, idx) => {
          const ctTeamId = r.team_a_side === 3 ? teamAId : r.team_b_side === 3 ? teamBId : null
          const tTeamId  = r.team_a_side === 2 ? teamAId : r.team_b_side === 2 ? teamBId : null
          const kills = r.kills ?? []
          const ctDeaths = kills.filter(k => k.victim_player_id && playerTeamMap.get(k.victim_player_id) === ctTeamId).length
          const tDeaths  = kills.filter(k => k.victim_player_id && playerTeamMap.get(k.victim_player_id) === tTeamId).length
          const ctSurvivors = Math.max(0, 5 - ctDeaths)
          const tSurvivors  = Math.max(0, 5 - tDeaths)
          const ctWon = r.winner_side === 3
          const tWon  = r.winner_side === 2
          const isHovered = hoveredIdx === idx
          // Right-align tooltip when column is in the latter half (avoid right-edge clipping).
          const tooltipRight = idx >= rounds.length / 2

          return (
            <Fragment key={r.id}>
              {idx === HALF_GAP_AFTER && (
                <div
                  aria-hidden
                  style={{
                    flex: '0 0 auto',
                    alignSelf: 'stretch',
                    width: 1,
                    margin: '0 6px',
                    background: 'var(--color-line)',
                  }}
                />
              )}

              <div
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '1 1 0',
                  minWidth: 14,
                  maxWidth: 32,
                  cursor: 'default',
                  userSelect: 'none',
                  transition: 'transform 120ms var(--ease-hud, ease-out)',
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                }}
              >
                {/* CT survivors (top) */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-end',
                    justifyContent: 'center',
                    gap: 2,
                    padding: 3,
                    minHeight: 38,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    background: ctWon
                      ? 'rgba(56,189,248,0.22)'
                      : isHovered
                        ? 'rgba(56,189,248,0.10)'
                        : 'rgba(56,189,248,0.04)',
                    boxShadow: ctWon ? 'inset 0 -1px 0 rgba(56,189,248,0.45)' : undefined,
                    transition: 'background 120ms',
                  }}
                >
                  {Array.from({ length: ctSurvivors }).map((_, ki) => (
                    <span key={ki} style={{
                      display: 'block',
                      width: 7, height: 7,
                      borderRadius: 999,
                      background: CT_COLOR,
                      opacity: 0.9,
                      flexShrink: 0,
                    }} />
                  ))}
                </div>

                {/* End reason — center band */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  height: 18,
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  {r.end_reason === 9  && <span style={{ fontSize: 11, lineHeight: 1 }}>✂️</span>}
                  {r.end_reason === 12 && <span style={{ fontSize: 11, lineHeight: 1 }}>⏱</span>}
                  {r.end_reason === 1  && <span style={{ fontSize: 11, lineHeight: 1 }}>💣</span>}
                </div>

                {/* T survivors (bottom) */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    justifyContent: 'center',
                    gap: 2,
                    padding: 3,
                    minHeight: 38,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    background: tWon
                      ? 'rgba(234,179,8,0.22)'
                      : isHovered
                        ? 'rgba(234,179,8,0.10)'
                        : 'rgba(234,179,8,0.04)',
                    boxShadow: tWon ? 'inset 0 1px 0 rgba(234,179,8,0.45)' : undefined,
                    transition: 'background 120ms',
                  }}
                >
                  {Array.from({ length: tSurvivors }).map((_, ki) => (
                    <span key={ki} style={{
                      display: 'block',
                      width: 7, height: 7,
                      borderRadius: 999,
                      background: T_COLOR,
                      opacity: 0.9,
                      flexShrink: 0,
                    }} />
                  ))}
                </div>

                {/* Round number */}
                <div style={{
                  textAlign: 'center',
                  fontSize: 8,
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: 4,
                  color: ctWon || tWon ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)',
                }}>
                  {r.round_number}
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 50,
                      bottom: '100%',
                      marginBottom: 8,
                      [tooltipRight ? 'right' : 'left']: 0,
                      minWidth: 240,
                      maxWidth: 320,
                      width: 'max-content',
                      borderRadius: 6,
                      border: '1px solid var(--color-line)',
                      boxShadow: '0 12px 32px -8px rgba(0,0,0,0.65)',
                      pointerEvents: 'none',
                      background: '#0A0F2D',
                    }}
                  >
                    {/* Header */}
                    <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-line)' }}>
                      <div style={{
                        fontSize: 10, fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.15em',
                        color: 'rgba(255,255,255,0.4)', marginBottom: 4,
                      }}>
                        Round {r.round_number}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'white' }}>
                        {r.team_a_score ?? 0} – {r.team_b_score ?? 0}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-line)' }}>
                      {(r.team_a_economy_type || r.team_b_economy_type) && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                          {teamAName}: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtEco(r.team_a_economy_type)}</span>
                          {'  ·  '}
                          {teamBName}: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtEco(r.team_b_economy_type)}</span>
                        </div>
                      )}
                      {r.duration_ms != null && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          {(r.duration_ms / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>

                    {/* Kills */}
                    {kills.length > 0 && (
                      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {kills.map((k, ki) => {
                          const killer = k.killer_player_id ? playerNameMap.get(k.killer_player_id) : null
                          const victim = k.victim_player_id ? playerNameMap.get(k.victim_player_id) : null
                          const killerTeamId2 = k.killer_player_id ? playerTeamMap.get(k.killer_player_id) : null
                          const isCtKill = killerTeamId2 === ctTeamId
                          return (
                            <div key={ki} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11 }}>
                              <span style={{
                                display: 'block',
                                width: 6, height: 6,
                                borderRadius: 999,
                                flexShrink: 0,
                                marginTop: 4,
                                background: isCtKill ? CT_COLOR : T_COLOR,
                              }} />
                              {killer && <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{killer}</span>}
                              <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{fmtWeapon(k.weapon_name, k.is_headshot)}</span>
                              {victim && <span style={{ color: 'rgba(255,255,255,0.5)' }}>{victim}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: CT_COLOR }} />
          CT Win
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: T_COLOR }} />
          T Win
        </span>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)' }}>💣=爆破 ✂️=拆除 ⏱=超时</span>
      </div>
    </div>
  )
}
