// src/pages/HomePage.tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import { useTeams } from '../api/teams'
import { useNewsList } from '../api/news'
import Spinner from '../components/Spinner'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/Card'
import TrophySymbol from '../components/TrophySymbol'
import type { Match, NewsArticle } from '../types'

// Module-level: computed once, stable across renders
const PARTICLE_DATA = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 5,
  duration: 5 + Math.random() * 5,
  size: 2 + Math.floor(Math.random() * 3),
}))

function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLE_DATA.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/60"
          style={{ left: `${p.x}%`, bottom: -6, width: p.size, height: p.size }}
          animate={{ y: [-6, -520], opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Card href={`/matches/${match.id}`} className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={32} />
          <span className="font-black text-sm truncate text-white/90">{match.team_a_name ?? 'TBD'}</span>
        </div>
        <div className="text-center flex-shrink-0 space-y-0.5">
          {match.status === 'finished'
            ? <div className="text-lg font-black italic tabular-nums text-primary">{match.maps_won_a}–{match.maps_won_b}</div>
            : <StatusBadge status={match.status} />}
          {match.stage && (
            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{match.stage}</div>
          )}
          {match.scheduled_at && (
            <div className="text-[10px] text-white/30">{dayjs(match.scheduled_at).format('MM-DD HH:mm')}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-black text-sm truncate text-white/90">{match.team_b_name ?? 'TBD'}</span>
          <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={32} />
        </div>
      </div>
    </Card>
  )
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Card href={`/news/${article.slug}`}>
      {article.cover_image_url && (
        <div className="h-40 overflow-hidden">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-4">
        {article.category && (
          <span className="inline-flex mb-2 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[9px] font-black uppercase tracking-widest text-primary">
            {article.category}
          </span>
        )}
        <h3 className="font-black text-sm leading-snug line-clamp-2 text-white/90">{article.title}</h3>
        {article.summary && (
          <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{article.summary}</p>
        )}
        <p className="text-[10px] text-white/30 mt-2">{dayjs(article.published_at).format('YYYY-MM-DD')}</p>
      </div>
    </Card>
  )
}

const INFO_ITEMS = [
  { label: 'Tournament Phase', value: '小组赛', accent: false },
  { label: 'Venue',            value: 'Online', accent: false },
  { label: 'Grand Prize',      value: '¥500,000', accent: true },
]

export default function HomePage() {
  const { data: matches, isLoading: ml } = useMatches()
  const { data: teams,   isLoading: tl } = useTeams()
  const { data: news,    isLoading: nl } = useNewsList({ limit: 6 })

  const recentMatches = useMemo(() => matches?.slice(0, 6) ?? [], [matches])
  const topTeams      = useMemo(() => teams?.slice(0, 8) ?? [], [teams])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative min-h-[calc(100vh-60px)] flex flex-col overflow-hidden stage-gradient">
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: '1200px', height: '800px', background: 'rgba(255,138,0,0.15)', filter: 'blur(150px)' }} />
          <div className="absolute bottom-0 left-0 rounded-full"
            style={{ width: '600px', height: '600px', background: 'rgba(0,209,255,0.1)', filter: 'blur(120px)' }} />
          <div className="absolute bottom-0 right-0 rounded-full"
            style={{ width: '600px', height: '600px', background: 'rgba(255,138,0,0.1)', filter: 'blur(120px)' }} />
        </div>

        {/* Light beams */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-0 w-[2px] h-full bg-gradient-to-b from-white/20 via-white/5 to-transparent"
            style={{ left: '35%', transform: 'rotate(-15deg)', transformOrigin: 'top center' }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-0 w-[2px] h-full bg-gradient-to-b from-white/20 via-white/5 to-transparent"
            style={{ right: '35%', transform: 'rotate(15deg)', transformOrigin: 'top center' }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        {/* Background watermark letters */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="font-black italic text-white/[0.025] tracking-tighter whitespace-nowrap leading-none"
            style={{ fontSize: '25vw' }}>
            AL&nbsp;&nbsp;ST
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-8 py-16">
            {/* Left: brand text */}
            <motion.div
              className="flex-1 text-center lg:text-left order-2 lg:order-1"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3">ALAST PREMIER</p>
              <h1 className="font-black italic tracking-tighter leading-none mb-2"
                style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}>
                <span className="gold-gradient">PREMIER</span>
              </h1>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-white/50 mb-8">SEASON 2026</p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  to="/matches"
                  className="relative overflow-hidden inline-flex items-center justify-center px-8 py-3 rounded-sm font-black text-sm uppercase tracking-widest text-white"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFB800, #FF8A00)',
                    boxShadow: '0 0 50px rgba(255,184,0,0.4)',
                  }}
                >
                  立即观赛
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                  />
                </Link>
                <Link
                  to="/matches"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-sm font-black text-sm uppercase tracking-widest border-2 border-white/15 bg-white/5 text-white/80 hover:border-accent hover:text-accent transition-colors"
                >
                  赛程大厅
                </Link>
              </div>
            </motion.div>

            {/* Trophy */}
            <motion.div
              className="flex-shrink-0 order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <TrophySymbol
                variant="full"
                className="w-[240px] md:w-[380px] lg:w-[520px]"
              />
            </motion.div>
          </div>
        </div>

        {/* Info bar */}
        <div className="relative z-10 border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-6 flex-wrap">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-7 bg-white/10 hidden sm:block" />}
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35">{item.label}</p>
                  <p className={`text-sm font-black italic mt-0.5 ${item.accent ? 'text-primary' : 'text-white/80'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Particles />
      </section>

      {/* ── Content sections ── */}
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* Recent Matches */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Match Center</p>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white/90">近期比赛</h2>
            </div>
            <Link to="/matches" className="text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-primary transition-colors">
              查看全部 →
            </Link>
          </div>
          {ml ? <Spinner /> : recentMatches.length === 0
            ? <p className="text-sm text-white/40">暂无比赛数据</p>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentMatches.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <MatchRow match={m} />
                  </motion.div>
                ))}
              </div>
          }
        </motion.section>

        {/* Teams */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Competing Teams</p>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white/90">参赛战队</h2>
            </div>
            <Link to="/teams" className="text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-primary transition-colors">
              全部战队 →
            </Link>
          </div>
          {tl ? <Spinner /> : topTeams.length === 0
            ? <p className="text-sm text-white/40">暂无战队数据</p>
            : <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {topTeams.map((t, i) => (
                  <motion.div key={t.id} whileHover={{ y: -5 }} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                    <Link to={`/teams/${t.id}`} className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center bg-card border border-white/[0.08] hover:border-primary/50 transition-all group">
                      <TeamLogo url={t.logo_url} name={t.name} size={44} />
                      <span className="text-[10px] font-black uppercase tracking-wide truncate w-full text-center text-white/60 group-hover:text-white transition-colors">
                        {t.short_name ?? t.name}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
          }
        </motion.section>

        {/* News */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Latest News</p>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white/90">最新资讯</h2>
            </div>
            <Link to="/news" className="text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-primary transition-colors">
              更多新闻 →
            </Link>
          </div>
          {nl ? <Spinner /> : !news || news.length === 0
            ? <p className="text-sm text-white/40">暂无新闻</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <NewsCard article={a} />
                  </motion.div>
                ))}
              </div>
          }
        </motion.section>
      </div>
    </div>
  )
}
