import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePlayers } from '../api/players'
import { useCurrentTournament } from '../api/currentTournament'
import { useDraft } from '../api/tournaments'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import type { DraftPlayer } from '../types'

// ── Draft board data ──────────────────────────────────────────────────────────

const TIER_META: Record<string, { label: string; accent: string; desc: string }> = {
  'S':  { label: '特等马', accent: '#FFD700', desc: '前 20% 战力 / 队长' },
  'A':  { label: '上等马', accent: '#FF8A00', desc: '高战力' },
  'B':  { label: '中等马', accent: '#00D1FF', desc: '中坚' },
  'C+': { label: '下等马', accent: '#A0AEC0', desc: '潜力' },
  'D':  { label: '赠品马', accent: '#718096', desc: '友情参与' },
}
const TIER_ORDER = ['S', 'A', 'B', 'C+', 'D'] as const
const N_TEAMS = 16

// ── Tab pill ──────────────────────────────────────────────────────────────────

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'draft' ? 'draft' : 'list'
  const setTab = (t: string) => setParams(t === 'list' ? {} : { tab: t })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Players</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">选手</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabPill label="选手列表" active={tab === 'list'}  onClick={() => setTab('list')} />
        <TabPill label="选马公示" active={tab === 'draft'} onClick={() => setTab('draft')} />
      </div>

      {tab === 'list' ? <PlayerList /> : <DraftBoard />}
    </div>
  )
}

// ── Player list tab ───────────────────────────────────────────────────────────

function PlayerList() {
  const { data: players, isLoading, error } = usePlayers()

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!players || players.length === 0) return <p className="text-sm text-white/40">暂无选手数据</p>

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="bg-white/[0.02] border-b border-white/[0.06]">
            {['选手', '战队', '国家', '定位'].map(h => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/35">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {players.map((p, i) => (
            <motion.tr
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="hover:bg-white/[0.03] transition-colors"
            >
              <td className="px-5 py-3">
                <Link to={`/players/${p.id}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-black text-sm text-white/90 group-hover:text-primary transition-colors">
                    {p.nickname}
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3">
                {p.team_name
                  ? <Link to={`/teams/${p.team_id ?? ''}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <TeamLogo url={p.team_logo_url} name={p.team_name} size={18} />
                      <span className="text-sm text-white/60 font-bold">{p.team_name}</span>
                    </Link>
                  : <span className="text-white/25">—</span>}
              </td>
              <td className="px-5 py-3 text-sm text-white/55 font-bold">{p.country ?? '—'}</td>
              <td className="px-5 py-3">
                {p.role
                  ? <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent">
                      {p.role}
                    </span>
                  : <span className="text-white/25">—</span>}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
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

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-10">
      <p className="text-sm text-white/50 -mt-2">
        每队 5 人 = 5 等级各 1 人。前 20% 战力为队长，第 1 轮 S 型逆向选马，第 2–4 轮按公布顺序。
      </p>

      {/* Tier tables */}
      <div className="space-y-4">
        {TIER_ORDER.map(tierKey => {
          const meta = TIER_META[tierKey]
          const tierPlayers = byTier[tierKey]
          return (
            <div key={tierKey}
                 className="rounded-md border"
                 style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
              <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
                <div className="w-10 h-10 rounded flex items-center justify-center font-black text-lg flex-shrink-0"
                     style={{ background: meta.accent + '22', color: meta.accent, border: `1px solid ${meta.accent}66` }}>
                  {tierKey}
                </div>
                <div>
                  <div className="text-sm font-black text-white/90">{meta.label}</div>
                  <div className="text-[11px] text-white/45">{meta.desc}</div>
                </div>
                <div className="ml-auto text-xs text-white/40">{tierPlayers.length} 人</div>
              </div>
              {hasData ? (
                tierPlayers.length === 0
                  ? <p className="text-xs text-white/30 px-4 py-3">暂无该等级选手</p>
                  : <div className="divide-y" style={{ borderColor: 'var(--color-data-divider)' }}>
                      {tierPlayers.map((p, i) => (
                        <motion.div key={p.player_id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-xs text-white/30 tabular-nums w-5 text-right">{p.pick_order ?? '—'}</span>
                          <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                                  {p.nickname[0]}
                                </div>}
                          </div>
                          <Link to={`/players/${p.player_id}`}
                                className="text-sm font-bold text-white/90 flex-1 min-w-0 truncate hover:text-primary transition-colors">
                            {p.nickname}
                          </Link>
                          {p.is_captain && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                  style={{ background: meta.accent + '22', color: meta.accent }}>C</span>
                          )}
                          {p.team_name && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <TeamLogo url={p.team_logo_url} name={p.team_name} size={18} />
                              <span className="text-xs text-white/50 hidden sm:block">{p.team_name}</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
              ) : (
                <p className="text-xs text-white/30 px-4 py-3">选手分配数据待 admin 录入</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Snake order viz */}
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">Pick Order</p>
        <div className="rounded-md border p-6"
             style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
          <SnakeOrderViz rounds={4} teams={N_TEAMS} players={players ?? []} />
          {!hasData && (
            <p className="text-xs text-white/40 mt-4 text-center">
              选手分配数据待 admin 录入 — 此处显示 S 型逆向选马顺序示意
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SnakeOrderViz({ rounds, teams, players }: { rounds: number; teams: number; players: DraftPlayer[] }) {
  const pickToPlayer = new Map(players.map(p => [p.pick_order, p]))
  return (
    <div className="space-y-2">
      {Array.from({ length: rounds }, (_, r) => {
        const reverse = r % 2 === 1
        const order = Array.from({ length: teams }, (_, i) => reverse ? teams - i : i + 1)
        return (
          <motion.div key={r} className="flex items-center gap-2"
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: r * 0.06 }}>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35 w-12 flex-shrink-0">
              R{r + 1} {reverse ? '←' : '→'}
            </div>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${teams}, minmax(0, 1fr))` }}>
              {order.map(n => {
                const globalPick = r * teams + n
                const p = pickToPlayer.get(globalPick)
                return (
                  <div key={n}
                       title={p ? p.nickname : `Pick ${globalPick}`}
                       className="aspect-square rounded text-[9px] font-black flex items-center justify-center text-white/55 tabular-nums"
                       style={{ background: 'var(--color-data-chip)' }}>
                    {p ? p.nickname[0] : n}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
