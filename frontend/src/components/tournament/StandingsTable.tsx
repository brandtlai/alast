import type { Team } from '../../types'

export interface StandingRow {
  team: Pick<Team, 'id' | 'name' | 'short_name' | 'logo_url'>
  wins: number
  losses: number
  buchholz: number
  roundDiff: number
  status: '晋级胜者组' | '进入败者组' | '待赛'
}

interface Props {
  rows: StandingRow[] | null
}

export default function StandingsTable({ rows }: Props) {
  if (rows === null || rows.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center text-sm text-white/40"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        小组赛尚未开始 — 待 admin 录入比赛数据后此处显示排名
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
            {(['#', 'Team', 'W-L', 'Buchholz', 'RD', 'Status'] as const).map(h => (
              <th key={h}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className="border-b last:border-0"
                style={{ borderColor: 'var(--color-data-divider)' }}>
              <td className="px-4 py-3 text-sm font-black tabular-nums text-white/60">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-bold text-white/90">{r.team.short_name ?? r.team.name}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums">{r.wins}-{r.losses}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-white/70">{r.buchholz}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-white/70">
                {r.roundDiff > 0 ? `+${r.roundDiff}` : r.roundDiff}
              </td>
              <td className="px-4 py-3 text-xs text-white/60">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
