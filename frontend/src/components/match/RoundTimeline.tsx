import { useState, useMemo } from 'react'
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
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        回合数据待导入
      </div>
    )
  }

  return (
    <div className="rounded-md border p-4"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Round Timeline</p>

      <div className="flex items-stretch gap-px">
        {rounds.map((r, idx) => {
          const isHalfGap = idx === 12
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
          const tooltipRight = idx < 14

          return (
            <div key={r.id} className="flex items-stretch gap-px">
              {/* Half-time divider */}
              {isHalfGap && (
                <div className="flex items-center mx-1.5">
                  <div className="w-px self-stretch" style={{ background: 'var(--color-data-divider)' }} />
                </div>
              )}

              <div
                className="relative flex flex-col cursor-default select-none"
                style={{ width: 28 }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* CT survivors (top) */}
                <div
                  className="flex flex-wrap content-end justify-center gap-[2px] p-[3px] rounded-t-sm"
                  style={{
                    minHeight: 38,
                    background: ctWon
                      ? 'rgba(56,189,248,0.22)'
                      : isHovered
                        ? 'rgba(56,189,248,0.07)'
                        : 'rgba(56,189,248,0.04)',
                  }}
                >
                  {Array.from({ length: ctSurvivors }).map((_, ki) => (
                    <span key={ki} className="block rounded-full flex-shrink-0"
                          style={{ width: 7, height: 7, background: CT_COLOR, opacity: 0.9 }} />
                  ))}
                </div>

                {/* End reason — center band */}
                <div className="flex items-center justify-center flex-shrink-0"
                     style={{ height: 18, background: 'rgba(255,255,255,0.03)' }}>
                  {r.end_reason === 9  && <span className="text-[11px] leading-none">✂️</span>}
                  {r.end_reason === 12 && <span className="text-[11px] leading-none">⏱</span>}
                  {r.end_reason === 1  && <span className="text-[11px] leading-none">💣</span>}
                </div>

                {/* T survivors (bottom) */}
                <div
                  className="flex flex-wrap content-start justify-center gap-[2px] p-[3px] rounded-b-sm"
                  style={{
                    minHeight: 38,
                    background: tWon
                      ? 'rgba(234,179,8,0.22)'
                      : isHovered
                        ? 'rgba(234,179,8,0.07)'
                        : 'rgba(234,179,8,0.04)',
                  }}
                >
                  {Array.from({ length: tSurvivors }).map((_, ki) => (
                    <span key={ki} className="block rounded-full flex-shrink-0"
                          style={{ width: 7, height: 7, background: T_COLOR, opacity: 0.9 }} />
                  ))}
                </div>

                {/* Round number */}
                <div className="text-center text-[8px] tabular-nums mt-1"
                     style={{ color: ctWon || tWon ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }}>
                  {r.round_number}
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className={`absolute z-50 bottom-full mb-2 min-w-[15rem] w-max max-w-xs rounded-md border shadow-xl pointer-events-none ${tooltipRight ? 'left-0' : 'right-0'}`}
                    style={{ background: '#0A0F2D', borderColor: 'var(--color-data-divider)' }}
                  >
                    {/* Header */}
                    <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                        Round {r.round_number}
                      </div>
                      <div className="text-xl font-black tabular-nums text-white">
                        {r.team_a_score ?? 0} – {r.team_b_score ?? 0}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="px-3 py-2 border-b space-y-1" style={{ borderColor: 'var(--color-data-divider)' }}>
                      {(r.team_a_economy_type || r.team_b_economy_type) && (
                        <div className="text-[10px] text-white/45">
                          {teamAName}: <span className="text-white/70">{fmtEco(r.team_a_economy_type)}</span>
                          {'  ·  '}
                          {teamBName}: <span className="text-white/70">{fmtEco(r.team_b_economy_type)}</span>
                        </div>
                      )}
                      {r.duration_ms != null && (
                        <div className="text-[10px] text-white/35">
                          {(r.duration_ms / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>

                    {/* Kills */}
                    {kills.length > 0 && (
                      <div className="px-3 py-2 space-y-1">
                        {kills.map((k, ki) => {
                          const killer = k.killer_player_id ? playerNameMap.get(k.killer_player_id) : null
                          const victim = k.victim_player_id ? playerNameMap.get(k.victim_player_id) : null
                          const killerTeamId2 = k.killer_player_id ? playerTeamMap.get(k.killer_player_id) : null
                          const isCtKill = killerTeamId2 === ctTeamId
                          return (
                            <div key={ki} className="flex items-baseline gap-1.5 text-[11px]">
                              <span
                                className="block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                                style={{ background: isCtKill ? CT_COLOR : T_COLOR }}
                              />
                              {killer && <span className="text-white/80 font-medium">{killer}</span>}
                              <span className="text-white/40 flex-shrink-0">{fmtWeapon(k.weapon_name, k.is_headshot)}</span>
                              {victim && <span className="text-white/50">{victim}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: CT_COLOR }} />
          CT Win
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: T_COLOR }} />
          T Win
        </span>
        <span className="ml-auto text-white/25">💣=爆破 ✂️=拆除 ⏱=超时</span>
      </div>
    </div>
  )
}
