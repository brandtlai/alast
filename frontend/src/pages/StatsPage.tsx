// src/pages/StatsPage.tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentTournament } from '../api/currentTournament'
import { useLeaderboard, useTournamentSummary, useTierComparison, useAvailableMaps } from '../api/stats'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import TrophySymbol from '../components/TrophySymbol'
import TierChart from '../components/stats/TierChart'

type StatKey = 'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'

const STAT_TABS: { value: StatKey; label: string; format: (v: string) => string }[] = [
  { value: 'rating',       label: 'Rating',      format: v => parseFloat(v).toFixed(2) },
  { value: 'adr',          label: 'ADR',         format: v => parseFloat(v).toFixed(1) },
  { value: 'kast',         label: 'KAST%',       format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'headshot_pct', label: 'HS%',         format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'first_kills',  label: 'First Kills', format: v => parseFloat(v).toFixed(2) },
  { value: 'clutches_won', label: 'Clutches',    format: v => parseFloat(v).toFixed(2) },
  { value: 'kd_diff',      label: '+/−',         format: v => { const n = parseFloat(v); return (n > 0 ? '+' : '') + n.toFixed(1) } },
]

const BRACKET_FILTER = [
  { value: '',      label: '全部' },
  { value: 'swiss', label: '小组赛' },
  { value: 'ub',    label: '胜者组' },
  { value: 'lb',    label: '败者组' },
  { value: 'gf',    label: '总决赛' },
]

const TIER_FILTER = [
  { value: '',   label: '全部 Tier' },
  { value: 'S',  label: '特等马 S' },
  { value: 'A',  label: '上等马 A' },
  { value: 'B',  label: '中等马 B' },
  { value: 'C+', label: '下等马 C+' },
  { value: 'D',  label: '赠品马 D' },
]

const MIN_MAPS_FILTER = [
  { value: null, label: '不限' },
  { value: 3,    label: '≥3 图' },
  { value: 5,    label: '≥5 图' },
  { value: 10,   label: '≥10 图' },
]

const TIER_COLORS: Record<string, string> = {
  S: 'var(--color-gold)',
  A: 'var(--color-primary)',
  B: 'var(--color-accent)',
  'C+': 'rgba(255,255,255,0.5)',
  D: 'rgba(255,255,255,0.3)',
}

const RANK_STYLE: Record<number, string> = {
  0: 'text-gold',
  1: 'text-white/60',
  2: 'text-[#CD7F32]',
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
      style={{
        background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'rgba(248,250,252,0.45)',
        borderColor: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/25 w-14 flex-shrink-0">
        {label}
      </span>
      {children}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-5 py-4 flex flex-col gap-1 min-w-[130px]"
         style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--color-primary)' }}>{value}</span>
    </div>
  )
}

export default function StatsPage() {
  const [stat, setStat] = useState<StatKey>('rating')
  const [bracketKind, setBracketKind] = useState('')
  const [map, setMap] = useState('')
  const [tier, setTier] = useState('')
  const [minMaps, setMinMaps] = useState<number | null>(null)

  const { data: tournament } = useCurrentTournament()
  const tournamentId = tournament?.id

  const { data: summary } = useTournamentSummary(tournamentId)
  const { data: tierData = [] } = useTierComparison(tournamentId)
  const { data: availableMaps = [] } = useAvailableMaps(tournamentId)
  const { data: leaderboard, isLoading, error } = useLeaderboard({
    tournament_id: tournamentId,
    stat,
    bracket_kind: bracketKind || undefined,
    map: map || undefined,
    tier: tier || undefined,
    min_maps: minMaps ?? undefined,
    limit: 20,
  })

  const currentStatDef = STAT_TABS.find(s => s.value === stat)!

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      {/* Trophy watermark */}
      <div className="absolute right-0 top-0 w-[260px] pointer-events-none select-none opacity-20">
        <TrophySymbol variant="outline" className="w-full" />
      </div>

      {/* Page heading */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Leaderboard</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">数据中心</h1>
        {tournament && <p className="text-xs text-white/35 mt-1">{tournament.name}</p>}
      </div>

      {/* Tournament summary cards */}
      {summary && (
        <div className="flex gap-3 flex-wrap mb-8">
          <SummaryCard label="已完赛场数" value={String(summary.matches_played)} />
          <SummaryCard label="总击杀数" value={Number(summary.total_kills).toLocaleString()} />
          <SummaryCard
            label="平均爆头率"
            value={summary.avg_headshot_pct != null ? (parseFloat(summary.avg_headshot_pct) / 100).toFixed(1) + '%' : '—'}
          />
        </div>
      )}

      {/* Stat tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STAT_TABS.map(s => (
          <FilterChip key={s.value} label={s.label} active={stat === s.value} onClick={() => setStat(s.value)} />
        ))}
      </div>

      {/* Filter bar — one row per dimension */}
      <div className="space-y-2 mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
        <FilterRow label="赛段">
          {BRACKET_FILTER.map(f => (
            <FilterChip key={f.value} label={f.label} active={bracketKind === f.value} onClick={() => setBracketKind(f.value)} />
          ))}
        </FilterRow>

        {availableMaps.length > 0 && (
          <FilterRow label="地图">
            {[{ value: '', label: '全部' }, ...availableMaps.map(m => ({ value: m, label: m.replace('de_', '').toUpperCase() }))].map(f => (
              <FilterChip key={f.value} label={f.label} active={map === f.value} onClick={() => setMap(f.value)} />
            ))}
          </FilterRow>
        )}

        <FilterRow label="Tier">
          {TIER_FILTER.map(f => (
            <FilterChip key={f.value} label={f.label} active={tier === f.value} onClick={() => setTier(f.value)} />
          ))}
        </FilterRow>

        <FilterRow label="最少图数">
          {MIN_MAPS_FILTER.map(f => (
            <FilterChip key={String(f.value)} label={f.label} active={minMaps === f.value} onClick={() => setMinMaps(f.value)} />
          ))}
        </FilterRow>
      </div>

      {/* Leaderboard table */}
      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {leaderboard && (
        leaderboard.length === 0
          ? <p className="text-sm text-white/40 py-8 text-center">暂无符合条件的数据</p>
          : (
            <div className="rounded-xl overflow-hidden border mb-10" style={{ borderColor: 'var(--color-data-divider)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--color-data-surface)', borderBottom: '1px solid var(--color-data-divider)' }}>
                    {['#', '选手', '战队', '图数', currentStatDef.label].map(h => (
                      <th key={h}
                          className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/35 ${['#', '图数', currentStatDef.label].includes(h) ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id}
                        className="border-b transition-colors hover:bg-white/[0.025]"
                        style={{ borderColor: 'var(--color-data-divider)', background: i % 2 === 0 ? 'transparent' : 'var(--color-data-row)' }}>
                      <td className="px-4 py-3 w-10 text-center">
                        <span className={`text-sm font-black italic tabular-nums ${RANK_STYLE[i] ?? 'text-white/30'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                            {entry.avatar_url
                              ? <img src={entry.avatar_url} alt={entry.nickname} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/40">
                                  {entry.nickname[0]}
                                </div>}
                          </div>
                          <Link to={`/players/${entry.id}`}
                                className="font-black text-sm text-white/90 hover:text-primary transition-colors">
                            {entry.nickname}
                          </Link>
                          {entry.tier && (
                            <span className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0"
                                  style={{ color: TIER_COLORS[entry.tier] ?? 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
                              {entry.tier}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {entry.team_name
                          ? <div className="flex items-center gap-2">
                              <TeamLogo url={entry.team_logo_url} name={entry.team_name} size={18} />
                              <span className="text-sm text-white/55 font-bold truncate max-w-[120px]">{entry.team_name}</span>
                            </div>
                          : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-white/45 font-bold tabular-nums">
                        {entry.maps_played}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="electric-blue-accent text-sm font-black italic tabular-nums">
                          {entry.avg_stat != null ? currentStatDef.format(entry.avg_stat) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* Tier comparison chart */}
      {tournamentId && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Tier 对比分析</p>
          <TierChart data={tierData} />
        </div>
      )}
    </div>
  )
}
