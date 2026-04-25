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
  return decimals > 0 ? v.toFixed(decimals) : String(v)
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

  const COL_HEADERS = ['Player', 'K', 'D', 'A', '+/−', 'HS%', 'KAST', 'ADR', 'Rating'] as const

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
            {COL_HEADERS.map(h => (
              <th key={h}
                  className={`py-2 px-2 font-black uppercase tracking-widest text-[10px] text-white/40 ${h === 'Player' ? 'text-left pl-4' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamA.map(p => <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />)}

          <tr style={{ background: 'var(--color-data-divider)' }}>
            <td colSpan={9} className="py-1 px-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                {teamAName}
                {halfScore && (
                  <span className="ml-2 tabular-nums">
                    {halfScore.a} – {halfScore.b}
                  </span>
                )}
                {' '}→{' '}
                {halfScore && (
                  <span className="tabular-nums mr-2">
                    {halfScore.b} – {halfScore.a}
                  </span>
                )}
                {teamBName}
              </span>
            </td>
          </tr>

          {teamB.map(p => <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />)}
        </tbody>
      </table>
    </div>
  )
}

function PlayerRow({ player: p, isMvp }: { player: MapStatPlayer; isMvp: boolean }) {
  const kd = (p.kills ?? 0) - (p.deaths ?? 0)
  const ratingColor = (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)'

  return (
    <tr className="border-b transition-colors hover:bg-white/[0.02] cursor-pointer"
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
          <span className="font-bold text-white/90 group-hover:text-primary transition-colors truncate max-w-[120px]">
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
      <td className="py-2 px-2 text-right tabular-nums text-white/85">{fmt(p.kills)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/50">{fmt(p.deaths)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.assists)}</td>
      <td className="py-2 px-2 text-right tabular-nums" style={{ color: kd >= 0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.4)' }}>
        {kd > 0 ? `+${kd}` : kd}
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.headshot_pct, 0)}{p.headshot_pct != null ? '%' : ''}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.kast, 1)}{p.kast != null ? '%' : ''}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/70">{fmt(p.adr, 1)}</td>
      <td className="py-2 px-2 text-right tabular-nums font-black" style={{ color: ratingColor }}>
        {fmt(p.rating, 2)}
      </td>
    </tr>
  )
}
