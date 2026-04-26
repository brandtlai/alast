import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { MapStatPlayer, MatchRound } from '../../types'

interface Props {
  players: MapStatPlayer[]
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
  rounds?: MatchRound[]
}

function fmt(v: number | null, decimals = 0): string {
  if (v == null) return '—'
  return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
}

function HsBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-white/30 text-xs tabular-nums">—</span>
  const value = Math.round(pct / 100)
  return (
    <div className="relative h-[18px] w-14 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="absolute inset-y-0 left-0 rounded-sm"
        style={{ width: `${value}%`, background: value >= 60 ? '#22c55e' : value >= 40 ? '#4ade80' : '#86efac' }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
        {value}
      </span>
    </div>
  )
}

export default function Scoreboard({ players, teamAId, teamBId, teamAName, teamBName, rounds }: Props) {
  const teamA = useMemo(() =>
    players.filter(p => p.team_id === teamAId).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [players, teamAId]
  )
  const teamB = useMemo(() =>
    players.filter(p => p.team_id === teamBId).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [players, teamBId]
  )

  const mvpId = useMemo(() => {
    let best: MapStatPlayer | null = null
    for (const p of players) {
      if (best == null || (p.rating ?? 0) > (best.rating ?? 0)) best = p
    }
    return best?.player_id ?? null
  }, [players])

  const halfScore = useMemo(() => {
    if (!rounds || rounds.length === 0) return null
    const halfRound = rounds.find(r =>
      r.team_a_score !== null && r.team_b_score !== null &&
      r.team_a_score + r.team_b_score === 12
    )
    if (!halfRound) return null
    return { a: halfRound.team_a_score!, b: halfRound.team_b_score! }
  }, [rounds])

  if (players.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-sm text-white/40"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        详细数据待 CSDM 解析后导入
      </div>
    )
  }

  const teamALogo = teamA[0]?.team_logo_url ?? null
  const teamBLogo = teamB[0]?.team_logo_url ?? null

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <table className="w-full text-xs border-collapse">
        <tbody>
          <TeamSection
            team={teamA}
            teamName={teamAName}
            logoUrl={teamALogo}
            mvpId={mvpId}
            accentColor="rgba(56,189,248,0.18)"
            borderColor="rgba(56,189,248,0.35)"
          />

          {/* Half-time divider */}
          <tr style={{ background: 'var(--color-data-divider)' }}>
            <td colSpan={8} className="py-1 px-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                半场
                {halfScore && (
                  <span className="ml-2 tabular-nums font-mono">
                    {halfScore.a} – {halfScore.b}
                  </span>
                )}
              </span>
            </td>
          </tr>

          <TeamSection
            team={teamB}
            teamName={teamBName}
            logoUrl={teamBLogo}
            mvpId={mvpId}
            accentColor="rgba(234,179,8,0.15)"
            borderColor="rgba(234,179,8,0.35)"
          />
        </tbody>
      </table>
    </div>
  )
}

const COL_HEADERS = ['K', 'A', 'D', '爆头%', 'ADR', 'Rating'] as const

function TeamSection({
  team, teamName, logoUrl, mvpId, accentColor, borderColor,
}: {
  team: MapStatPlayer[]
  teamName: string
  logoUrl: string | null
  mvpId: string | null
  accentColor: string
  borderColor: string
}) {
  return (
    <>
      {/* Team header row */}
      <tr style={{ background: accentColor, borderBottom: `1px solid ${borderColor}` }}>
        <td className="py-2 pl-4 pr-2 w-full">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt={teamName} className="w-5 h-5 object-contain flex-shrink-0" />
            )}
            <span className="font-black text-sm text-white tracking-wide">{teamName}</span>
          </div>
        </td>
        {COL_HEADERS.map(h => (
          <td key={h} className="py-2 px-2 text-right text-[10px] font-black uppercase tracking-widest text-white/35 whitespace-nowrap">
            {h}
          </td>
        ))}
      </tr>

      {/* Player rows */}
      {team.map(p => (
        <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />
      ))}
    </>
  )
}

function PlayerRow({ player: p, isMvp }: { player: MapStatPlayer; isMvp: boolean }) {
  const ratingColor = (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)'

  return (
    <tr className="border-b transition-colors hover:bg-white/[0.03]"
        style={{ borderColor: 'var(--color-data-divider)' }}>
      <td className="py-2 pl-4 pr-2">
        <Link to={`/players/${p.player_id}`} className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
            {p.avatar_url
              ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/40">
                  {p.nickname[0]}
                </div>}
          </div>
          <span className="font-bold text-white/90 group-hover:text-primary transition-colors">
            {p.nickname}
          </span>
          {isMvp && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: 'var(--color-gold)22', color: 'var(--color-gold)' }}>MVP</span>
          )}
          {p.is_sub && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: '#ffffff15', color: 'rgba(255,255,255,0.5)' }}>SUB</span>
          )}
        </Link>
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-white/85 font-bold">{fmt(p.kills)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/55">{fmt(p.assists)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/50">{fmt(p.deaths)}</td>
      <td className="py-2 px-2 text-right">
        <div className="flex justify-end"><HsBar pct={p.headshot_pct} /></div>
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-white/70">{fmt(p.adr, 1)}</td>
      <td className="py-2 px-2 text-right tabular-nums font-black" style={{ color: ratingColor }}>
        {fmt(p.rating, 2)}
      </td>
    </tr>
  )
}
