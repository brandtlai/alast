// src/pages/StatsPage.tsx — Tactical OS re-skin (T29)
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { useCurrentTournament } from '../api/currentTournament'
import { useLeaderboard, useTournamentSummary, useTierComparison, useAvailableMaps } from '../api/stats'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'

// ── Types ─────────────────────────────────────────────────────────────────────

type StatKey = 'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'

// ── Constants ─────────────────────────────────────────────────────────────────

const STAT_TABS: { value: StatKey; label: string; format: (v: string) => string }[] = [
  { value: 'rating',       label: 'RATING',    format: v => parseFloat(v).toFixed(2) },
  { value: 'adr',          label: 'ADR',        format: v => parseFloat(v).toFixed(1) },
  { value: 'kast',         label: 'KAST%',      format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'headshot_pct', label: '爆头率',      format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'first_kills',  label: '首杀',        format: v => parseFloat(v).toFixed(2) },
  { value: 'clutches_won', label: '残局',        format: v => parseFloat(v).toFixed(2) },
  { value: 'kd_diff',      label: '+/−',        format: v => { const n = parseFloat(v); return (n > 0 ? '+' : '') + n.toFixed(1) } },
]

const BRACKET_FILTER = [
  { value: '',      label: '全部' },
  { value: 'swiss', label: '小组赛' },
  { value: 'ub',    label: '胜者组' },
  { value: 'lb',    label: '败者组' },
  { value: 'gf',    label: '总决赛' },
]

const TIER_FILTER = [
  { value: '',   label: '全部 TIER' },
  { value: 'S',  label: 'S' },
  { value: 'A',  label: 'A' },
  { value: 'B',  label: 'B' },
  { value: 'C+', label: 'C+' },
  { value: 'D',  label: 'D' },
]

const MIN_MAPS_FILTER = [
  { value: null, label: '不限' },
  { value: 3,    label: '≥3 图' },
  { value: 5,    label: '≥5 图' },
  { value: 10,   label: '≥10 图' },
]

// Tier label map (CN no letter-spacing)
const TIER_LABELS: Record<string, string> = {
  S: '特等马', A: '上等马', B: '中等马', 'C+': '下等马', D: '赠品马',
}

// Tier color map — new tokens only
const TIER_COLORS: Record<string, string> = {
  S:    'var(--color-gold-1)',
  A:    'var(--color-data)',
  B:    'var(--color-fg)',
  'C+': 'var(--color-fg-muted)',
  D:    'var(--color-fire)',
}

// Leaderboard column widths: # | PLAYER | TEAM | MAPS | STAT
const COL_WIDTHS = ['48px', '1fr', '160px', '72px', '100px']

// ── ECharts base theme ────────────────────────────────────────────────────────

const AXIS_STYLE = {
  axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  axisLabel: { color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono', fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface)',
  borderColor: 'rgba(255,255,255,0.08)',
  textStyle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'JetBrains Mono', fontSize: 11 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ratingColor(raw: string | number | null | undefined): string {
  const v = typeof raw === 'string' ? parseFloat(raw) : (raw ?? 0)
  if (isNaN(v)) return 'var(--color-fg-muted)'
  if (v >= 1.0) return 'var(--color-data)'
  if (v >= 0.9) return 'var(--color-fg)'
  return 'var(--color-fg-muted)'
}

function statColor(statKey: StatKey, raw: string | null | undefined): string {
  if (statKey === 'rating') return ratingColor(raw)
  return 'var(--color-data)'
}

function rankLabel(i: number, total: number): { label: string; color: string } {
  if (i === 0)                              return { label: '01', color: 'var(--color-gold-1)' }
  if (i === 1)                              return { label: '02', color: 'var(--color-fg)' }
  if (i === 2)                              return { label: '03', color: 'var(--color-fg-muted)' }
  if (total > 5 && i === total - 1)         return { label: String(i + 1).padStart(2, '0'), color: 'var(--color-fire)' }
  return { label: String(i + 1).padStart(2, '0'), color: 'var(--color-fg-dim)' }
}

// ── Pill filter button ────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${active ? 'var(--color-data)' : 'var(--color-line)'}`,
        background: active ? 'rgba(199,255,61,0.08)' : 'transparent',
        color: active ? 'var(--color-data)' : 'var(--color-fg-muted)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  )
}

// ── Filter row ────────────────────────────────────────────────────────────────

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--color-fg-dim)',
        width: 64,
        flexShrink: 0,
      }}>
        {label}
      </span>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [stat, setStat]               = useState<StatKey>('rating')
  const [bracketKind, setBracketKind] = useState('')
  const [map, setMap]                 = useState('')
  const [tier, setTier]               = useState('')
  const [minMaps, setMinMaps]         = useState<number | null>(null)

  const { data: tournament } = useCurrentTournament()
  const tournamentId = tournament?.id

  const { data: summary }           = useTournamentSummary(tournamentId)
  const { data: tierData = [] }     = useTierComparison(tournamentId)
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

  // ── Tier chart option ────────────────────────────────────────────────────────

  const tierChartOption = tierData.length > 0 ? {
    backgroundColor: 'transparent',
    textStyle: { color: 'var(--color-fg-muted)', fontFamily: 'JetBrains Mono', fontSize: 11 },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (params: Array<{ seriesName: string; value: number; dataIndex: number }>) => {
        const idx = params[0]?.dataIndex
        const d = tierData[idx]
        return `<b>Tier ${d?.tier ?? ''}</b> (${d?.players ?? 0} 人)<br>` +
               params.map(p => `${p.seriesName}: ${p.value}`).join('<br>')
      }
    },
    legend: {
      data: ['Avg Rating', 'Avg ADR'],
      textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'JetBrains Mono' },
      top: 4,
    },
    grid: { left: 55, right: 55, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: tierData.map(d => `${d.tier}\n${TIER_LABELS[d.tier] ?? ''}`),
      ...AXIS_STYLE,
      axisLabel: { ...AXIS_STYLE.axisLabel, lineHeight: 16 },
    },
    yAxis: [
      { type: 'value', name: 'Rating', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...AXIS_STYLE, min: 0, max: 2 },
      { type: 'value', name: 'ADR',    nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...AXIS_STYLE, min: 0 },
    ],
    series: [
      {
        name: 'Avg Rating',
        type: 'bar',
        yAxisIndex: 0,
        data: tierData.map(d => parseFloat(d.avg_rating ?? '0')),
        itemStyle: { color: '#C7FF3D' },
        barMaxWidth: 28,
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: ({ value }: { value: number }) => value.toFixed(2) },
      },
      {
        name: 'Avg ADR',
        type: 'bar',
        yAxisIndex: 1,
        data: tierData.map(d => parseFloat(d.avg_adr ?? '0')),
        itemStyle: { color: '#5EEAD4' },
        barMaxWidth: 28,
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: ({ value }: { value: number }) => value.toFixed(1) },
      },
    ],
  } : null

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '64px 32px 24px' }}>
        <TacticalLabel text="SECTOR :: ANALYTICS" />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display-lg)',
          color: 'var(--color-fg)',
          margin: '8px 0 4px',
          lineHeight: 1,
        }}>
          数据
        </h1>
        {tournament && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-xs)',
            color: 'var(--color-fg-dim)',
            marginTop: 4,
            letterSpacing: '0.1em',
          }}>
            {tournament.name}
          </p>
        )}
      </div>

      {/* ── KPI summary tiles ───────────────────────────────────────────────── */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          padding: '0 32px 32px',
        }}>
          <HudPanel staticCorners style={{ padding: 24 }}>
            <TacticalLabel text="MATCHES PLAYED" />
            <div style={{ marginTop: 12 }}>
              <DataReadout value={summary.matches_played} size={48} />
            </div>
          </HudPanel>

          <HudPanel staticCorners style={{ padding: 24 }}>
            <TacticalLabel text="TOTAL KILLS" />
            <div style={{ marginTop: 12 }}>
              <DataReadout value={Number(summary.total_kills).toLocaleString()} size={48} />
            </div>
          </HudPanel>

          <HudPanel staticCorners style={{ padding: 24 }}>
            <TacticalLabel text="AVG HS%" />
            <div style={{ marginTop: 12 }}>
              <DataReadout
                value={summary.avg_headshot_pct != null
                  ? parseFloat(summary.avg_headshot_pct).toFixed(1) + '%'
                  : '—'}
                size={48}
              />
            </div>
          </HudPanel>
        </div>
      )}

      {/* ── Stat tab pills ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        padding: '0 32px 16px',
      }}>
        {STAT_TABS.map(s => (
          <Pill key={s.value} label={s.label} active={stat === s.value} onClick={() => setStat(s.value)} />
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '0 32px 24px',
        borderBottom: '1px solid var(--color-line)',
        marginBottom: 24,
      }}>
        <FilterRow label="赛段">
          {BRACKET_FILTER.map(f => (
            <Pill key={f.value} label={f.label} active={bracketKind === f.value} onClick={() => setBracketKind(f.value)} />
          ))}
        </FilterRow>

        {availableMaps.length > 0 && (
          <FilterRow label="地图">
            {[{ value: '', label: '全部' }, ...availableMaps.map(m => ({ value: m, label: m.replace('de_', '').toUpperCase() }))].map(f => (
              <Pill key={f.value} label={f.label} active={map === f.value} onClick={() => setMap(f.value)} />
            ))}
          </FilterRow>
        )}

        <FilterRow label="TIER">
          {TIER_FILTER.map(f => (
            <Pill key={f.value} label={f.label} active={tier === f.value} onClick={() => setTier(f.value)} />
          ))}
        </FilterRow>

        <FilterRow label="图数">
          {MIN_MAPS_FILTER.map(f => (
            <Pill key={String(f.value)} label={f.label} active={minMaps === f.value} onClick={() => setMinMaps(f.value)} />
          ))}
        </FilterRow>
      </div>

      {/* ── Leaderboard table ───────────────────────────────────────────────── */}
      <div style={{ padding: '0 32px', marginBottom: 40 }}>
        {isLoading && <Spinner />}
        {error    && <ErrorBox message={error.message} />}
        {leaderboard && (
          leaderboard.length === 0
            ? (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                color: 'var(--color-fg-dim)',
                textAlign: 'center',
                padding: '48px 0',
              }}>
                暂无符合条件的数据
              </p>
            )
            : (
              <HudPanel staticCorners style={{ overflow: 'hidden', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <colgroup>
                    {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
                      {['#', 'PLAYER', 'TEAM', 'MAPS', currentStatDef.label].map((h, i) => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-xs)',
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'var(--color-fg-dim)',
                          textAlign: i === 0 || i >= 3 ? 'center' : 'left',
                          fontWeight: 400,
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const { label: rankStr, color: rankClr } = rankLabel(i, leaderboard.length)
                      return (
                        <tr key={entry.id} style={{
                          borderBottom: '1px solid var(--color-line)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}>
                          {/* Rank */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-mono-xs)',
                              color: rankClr,
                              letterSpacing: '0.1em',
                            }}>
                              {rankStr}
                            </span>
                          </td>

                          {/* Player */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-surface-2)',
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}>
                                {entry.avatar_url
                                  ? <img src={entry.avatar_url} alt={entry.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-fg-dim)' }}>
                                      {entry.nickname[0]}
                                    </div>}
                              </div>
                              <Link
                                to={`/players/${entry.id}`}
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 13,
                                  color: 'var(--color-fg)',
                                  textDecoration: 'none',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {entry.nickname}
                              </Link>
                              {entry.tier && (
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 9,
                                  letterSpacing: '0.1em',
                                  padding: '2px 4px',
                                  borderRadius: 2,
                                  color: TIER_COLORS[entry.tier] ?? 'var(--color-fg-muted)',
                                  border: `1px solid ${TIER_COLORS[entry.tier] ?? 'var(--color-line)'}`,
                                  opacity: 0.8,
                                }}>
                                  {entry.tier}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Team */}
                          <td style={{ padding: '10px 12px' }}>
                            {entry.team_name
                              ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <TeamLogo url={entry.team_logo_url} name={entry.team_name} size={20} />
                                  <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12,
                                    color: 'var(--color-fg-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 120,
                                    display: 'inline-block',
                                  }}>
                                    {entry.team_name}
                                  </span>
                                </div>
                              )
                              : <span style={{ color: 'var(--color-fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>—</span>}
                          </td>

                          {/* Maps played */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              color: 'var(--color-fg-muted)',
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              {entry.maps_played}
                            </span>
                          </td>

                          {/* Stat value */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 13,
                              fontVariantNumeric: 'tabular-nums',
                              color: statColor(stat, entry.avg_stat),
                              letterSpacing: '0.02em',
                            }}>
                              {entry.avg_stat != null ? currentStatDef.format(entry.avg_stat) : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </HudPanel>
            )
        )}
      </div>

      {/* ── Multi-chart grid ────────────────────────────────────────────────── */}
      {tournamentId && tierChartOption && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
          padding: '0 32px 64px',
        }}>
          <HudPanel staticCorners style={{ padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <TacticalLabel text="TIER :: COMPARISON" />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                color: 'var(--color-fg-dim)',
                letterSpacing: '0.2em',
              }}>
                RATING / ADR
              </span>
            </header>
            {tierData.length === 0
              ? (
                <div style={{
                  height: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  color: 'var(--color-fg-dim)',
                }}>
                  Tier 数据需至少一场已完赛且有 tier 指定的选手
                </div>
              )
              : <ReactECharts option={tierChartOption} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
            }
          </HudPanel>
        </div>
      )}
    </div>
  )
}
