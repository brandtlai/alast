// src/pages/PlayersPage.tsx — Tactical OS re-skin (T27)
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { usePlayers } from '../api/players'
import { useCurrentTournament } from '../api/currentTournament'
import { useDraft } from '../api/tournaments'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { HudPanel } from '../components/hud/HudPanel'
import { hudStagger, hudEnter } from '../design/motion'
import type { DraftPlayer } from '../types'

// ── Draft board data ──────────────────────────────────────────────────────────

const TIER_META: Record<string, { label: string; accent: string; desc: string }> = {
  'S':  { label: '特等马', accent: 'var(--color-data)',     desc: '前 20% 战力 / 队长' },
  'A':  { label: '上等马', accent: 'var(--color-fg)',       desc: '高战力' },
  'B':  { label: '中等马', accent: 'var(--color-fg-muted)', desc: '中坚' },
  'C+': { label: '下等马', accent: 'var(--color-fg-dim)',   desc: '潜力' },
  'D':  { label: '赠品马', accent: 'var(--color-fire)',     desc: '友情参与' },
}
const TIER_ORDER = ['S', 'A', 'B', 'C+', 'D'] as const
const N_TEAMS = 16

// ── Role filters ──────────────────────────────────────────────────────────────

const ROLE_FILTERS = [
  { value: '',        label: 'ALL' },
  { value: 'rifler',  label: 'RIFLER' },
  { value: 'awper',   label: 'AWPER' },
  { value: 'igl',     label: 'IGL' },
  { value: 'support', label: 'SUPPORT' },
  { value: 'lurker',  label: 'LURKER' },
] as const

type SortKey = 'rating' | 'kills' | 'adr' | null
type SortDir = 'asc' | 'desc'

// ── Col widths ────────────────────────────────────────────────────────────────

const COL_WIDTHS = ['1fr', '200px', '90px', '60px', '60px', '60px']
// PLAYER | TEAM | ROLE | COUNTRY | K/D | RATING

// ── Rating colorization ───────────────────────────────────────────────────────

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'var(--color-fg-muted)'
  const v = parseFloat(rating)
  if (isNaN(v)) return 'var(--color-fg-muted)'
  if (v >= 1.0) return 'var(--color-data)'
  if (v >= 0.9) return 'var(--color-fg)'
  return 'var(--color-fg-muted)'
}

// ── Pill filter button ────────────────────────────────────────────────────────

const pillBase: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  padding: '6px 16px',
  border: '1px solid var(--color-line)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'border-color 120ms, color 120ms',
  color: 'var(--color-fg-muted)',
}
const pillActive: React.CSSProperties = {
  ...pillBase,
  borderColor: 'var(--color-data)',
  color: 'var(--color-data)',
  background: 'rgba(199,255,61,0.06)',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [tab, setTab] = useState<'list' | 'draft'>('list')

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '64px 32px 24px' }}>
        <TacticalLabel text="SECTOR :: OPERATIVES" />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-display-lg)',
            lineHeight: 1,
            color: 'var(--color-fg)',
            margin: '8px 0 0',
          }}
        >
          选手
        </h1>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 32px', marginBottom: 24 }}>
        <button
          onClick={() => setTab('list')}
          style={tab === 'list' ? pillActive : pillBase}
        >
          选手列表
        </button>
        <button
          onClick={() => setTab('draft')}
          style={tab === 'draft' ? pillActive : pillBase}
        >
          选马公示
        </button>
      </div>

      {tab === 'list' ? <PlayerList /> : <DraftBoard />}
    </div>
  )
}

// ── Player list tab ───────────────────────────────────────────────────────────

function PlayerList() {
  const [role, setRole] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: players, isLoading, error } = usePlayers(role ? { role } : undefined)

  const sorted = useMemo(() => {
    if (!players) return []
    if (!sortKey) return players
    return [...players].sort((a, b) => {
      let va = 0
      let vb = 0
      if (sortKey === 'rating') {
        va = parseFloat(a.career_stats?.avg_rating ?? '0') || 0
        vb = parseFloat(b.career_stats?.avg_rating ?? '0') || 0
      } else if (sortKey === 'kills') {
        va = parseFloat(a.career_stats?.total_kills ?? '0') || 0
        vb = parseFloat(b.career_stats?.total_kills ?? '0') || 0
      } else if (sortKey === 'adr') {
        va = parseFloat(a.career_stats?.avg_adr ?? '0') || 0
        vb = parseFloat(b.career_stats?.avg_adr ?? '0') || 0
      }
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [players, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const hasCareerStats = players?.some(p => p.career_stats)

  const thBase: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-line)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-mono-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: 'var(--color-fg-dim)',
    fontWeight: 400,
    whiteSpace: 'nowrap' as const,
  }

  return (
    <div>
      {/* Role filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 32px', marginBottom: 24 }}>
        {ROLE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setRole(f.value)}
            style={role === f.value ? pillActive : pillBase}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ padding: '0 32px' }}><Spinner /></div>}
      {error && <div style={{ padding: '0 32px' }}><ErrorBox message={error.message} /></div>}

      {sorted.length === 0 && !isLoading && !error && (
        <p style={{ padding: '0 32px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-dim)' }}>
          暂无选手数据
        </p>
      )}

      {sorted.length > 0 && (
        <div style={{ padding: '0 32px 48px' }}>
          <motion.div
            variants={hudStagger}
            initial="hidden"
            animate="show"
            style={{
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: 'var(--color-surface)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                {COL_WIDTHS.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
                {hasCareerStats && <col style={{ width: 70 }} />}  {/* RATING */}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...thBase, textAlign: 'left' }}>PLAYER</th>
                  <th style={{ ...thBase, textAlign: 'left' }}>TEAM</th>
                  <th style={{ ...thBase, textAlign: 'left' }}>ROLE</th>
                  <th style={{ ...thBase, textAlign: 'left' }}>COUNTRY</th>
                  <th
                    style={{ ...thBase, textAlign: 'right', cursor: 'pointer', color: sortKey === 'kills' ? 'var(--color-data)' : 'var(--color-fg-dim)' }}
                    onClick={() => toggleSort('kills')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      K
                      {sortKey === 'kills' ? (
                        sortDir === 'desc' ? <ChevronDown size={12} color="var(--color-data)" /> : <ChevronUp size={12} color="var(--color-data)" />
                      ) : null}
                    </span>
                  </th>
                  <th
                    style={{ ...thBase, textAlign: 'right', cursor: 'pointer', color: sortKey === 'adr' ? 'var(--color-data)' : 'var(--color-fg-dim)' }}
                    onClick={() => toggleSort('adr')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      ADR
                      {sortKey === 'adr' ? (
                        sortDir === 'desc' ? <ChevronDown size={12} color="var(--color-data)" /> : <ChevronUp size={12} color="var(--color-data)" />
                      ) : null}
                    </span>
                  </th>
                  {hasCareerStats && (
                    <th
                      style={{ ...thBase, textAlign: 'right', cursor: 'pointer', color: sortKey === 'rating' ? 'var(--color-data)' : 'var(--color-fg-dim)' }}
                      onClick={() => toggleSort('rating')}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        RATING
                        {sortKey === 'rating' ? (
                          sortDir === 'desc' ? <ChevronDown size={12} color="var(--color-data)" /> : <ChevronUp size={12} color="var(--color-data)" />
                        ) : null}
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <motion.tr
                    key={p.id}
                    variants={hudEnter}
                    style={{
                      borderBottom: '1px solid var(--color-line)',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* PLAYER */}
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        to={`/players/${p.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.nickname}
                            style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28, height: 28,
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-line)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              color: 'var(--color-fg-dim)',
                              flexShrink: 0,
                            }}
                          >
                            {p.nickname.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 18,
                            color: 'var(--color-fg)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.nickname}
                        </span>
                      </Link>
                    </td>

                    {/* TEAM */}
                    <td style={{ padding: '12px 16px' }}>
                      {p.team_name ? (
                        <Link
                          to={`/teams/${p.team_id ?? ''}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                        >
                          <TeamLogo url={p.team_logo_url} name={p.team_name} size={20} />
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-mono-sm)',
                              color: 'var(--color-fg-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.team_name}
                          </span>
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--color-fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>—</span>
                      )}
                    </td>

                    {/* ROLE */}
                    <td style={{ padding: '12px 16px' }}>
                      {p.role ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-mono-xs)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            border: '1px solid var(--color-line)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-fg-muted)',
                          }}
                        >
                          {p.role}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>—</span>
                      )}
                    </td>

                    {/* COUNTRY */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--color-fg-muted)',
                        }}
                      >
                        {p.country ?? '—'}
                      </span>
                    </td>

                    {/* KILLS */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--color-fg-muted)',
                        }}
                      >
                        {p.career_stats?.total_kills ?? '—'}
                      </span>
                    </td>

                    {/* ADR */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--color-fg-muted)',
                        }}
                      >
                        {p.career_stats?.avg_adr != null
                          ? parseFloat(p.career_stats.avg_adr).toFixed(1)
                          : '—'}
                      </span>
                    </td>

                    {/* RATING — only if hasCareerStats */}
                    {hasCareerStats && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 'var(--text-mono-sm)',
                            color: ratingColor(p.career_stats?.avg_rating),
                          }}
                        >
                          {p.career_stats?.avg_rating != null
                            ? parseFloat(p.career_stats.avg_rating).toFixed(2)
                            : '—'}
                        </span>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ── Draft board tab ───────────────────────────────────────────────────────────

function DraftBoard() {
  const { data: tournament } = useCurrentTournament()
  const { data: players, isLoading } = useDraft(tournament?.id)

  const byTier = TIER_ORDER.reduce<Record<string, DraftPlayer[]>>((acc, t) => {
    acc[t] = (players ?? []).filter(p => p.tier === t).sort((a, b) => (a.pick_order ?? 999) - (b.pick_order ?? 999))
    return acc
  }, {} as Record<string, DraftPlayer[]>)

  const hasData = (players?.length ?? 0) > 0

  if (isLoading) return <div style={{ padding: '0 32px' }}><Spinner /></div>

  return (
    <div style={{ padding: '0 32px 48px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)', marginBottom: 24 }}>
        每队 5 人 = 5 等级各 1 人。前 20% 战力为队长，第 1 轮 S 型逆向选马，第 2–4 轮按公布顺序。
      </p>

      <motion.div
        variants={hudStagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {TIER_ORDER.map(tierKey => {
          const meta = TIER_META[tierKey]
          const tierPlayers = byTier[tierKey]
          return (
            <motion.div key={tierKey} variants={hudEnter}>
              <HudPanel staticCorners>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--color-line)',
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      background: meta.accent + '22',
                      color: meta.accent,
                      border: `1px solid ${meta.accent}66`,
                      flexShrink: 0,
                    }}
                  >
                    {tierKey}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-fg)' }}>{meta.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)' }}>{meta.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)' }}>
                    {tierPlayers.length} 人
                  </div>
                </div>

                {hasData ? (
                  tierPlayers.length === 0 ? (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)', padding: '12px 20px' }}>
                      暂无该等级选手
                    </p>
                  ) : (
                    <div>
                      {tierPlayers.map((p, i) => (
                        <div
                          key={p.player_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 20px',
                            borderBottom: i < tierPlayers.length - 1 ? '1px solid var(--color-line)' : undefined,
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)', width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {p.pick_order ?? '—'}
                          </span>
                          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-2)', border: '1px solid var(--color-line)' }}>
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt={p.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-fg-dim)' }}>{p.nickname[0]}</div>
                            }
                          </div>
                          <Link
                            to={`/players/${p.player_id}`}
                            style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-fg)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                          >
                            {p.nickname}
                          </Link>
                          {p.is_captain && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.15em', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: meta.accent + '22', color: meta.accent }}>
                              C
                            </span>
                          )}
                          {p.team_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <TeamLogo url={p.team_logo_url} name={p.team_name} size={18} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-muted)' }}>{p.team_name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)', padding: '12px 20px' }}>
                    选手分配数据待 admin 录入
                  </p>
                )}
              </HudPanel>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Snake order viz */}
      <div style={{ marginTop: 32 }}>
        <TacticalLabel text="PICK ORDER" />
        <HudPanel staticCorners style={{ marginTop: 12, padding: 24 }}>
          <SnakeOrderViz rounds={4} teams={N_TEAMS} players={players ?? []} />
          {!hasData && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)', marginTop: 16, textAlign: 'center' }}>
              选手分配数据待 admin 录入 — 此处显示 S 型逆向选马顺序示意
            </p>
          )}
        </HudPanel>
      </div>
    </div>
  )
}

function SnakeOrderViz({ rounds, teams, players }: { rounds: number; teams: number; players: DraftPlayer[] }) {
  const pickToPlayer = new Map(players.map(p => [p.pick_order, p]))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rounds }, (_, r) => {
        const reverse = r % 2 === 1
        const order = Array.from({ length: teams }, (_, i) => reverse ? teams - i : i + 1)
        return (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.15em', color: 'var(--color-fg-dim)', width: 48, flexShrink: 0 }}>
              R{r + 1} {reverse ? '←' : '→'}
            </div>
            <div style={{ flex: 1, display: 'grid', gap: 4, gridTemplateColumns: `repeat(${teams}, minmax(0, 1fr))` }}>
              {order.map(n => {
                const globalPick = r * teams + n
                const p = pickToPlayer.get(globalPick)
                return (
                  <div
                    key={n}
                    title={p ? p.nickname : `Pick ${globalPick}`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--color-fg-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p ? p.nickname[0] : n}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
