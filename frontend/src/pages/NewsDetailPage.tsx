import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useNewsArticle } from '../api/news'
import { useMatchMaps, useMapRounds, useMapStats } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import MapPicker from '../components/match/MapPicker'
import RoundTimeline from '../components/match/RoundTimeline'
import Scoreboard from '../components/match/Scoreboard'
import { fadeUp, pageReveal, panelReveal, staggerContainer } from '../lib/motion'

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: article, isLoading, error } = useNewsArticle(slug!)
  const matchId = article?.match?.id
  const { data: maps = [] } = useMatchMaps(matchId)
  const [selectedMapId, setSelectedMapId] = useState('')

  useEffect(() => {
    if (!matchId) {
      setSelectedMapId('')
      return
    }
    if (!selectedMapId && maps.length > 0) {
      const first = maps.find(m => m.score_a !== null) ?? maps[0]
      setSelectedMapId(first.id)
    }
  }, [maps, matchId, selectedMapId])

  const selectedMap = maps.find(m => m.id === selectedMapId) ?? null
  const { data: stats = [] } = useMapStats(matchId, selectedMapId || undefined)
  const { data: rounds = [] } = useMapRounds(matchId, selectedMapId || undefined)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!article) return null

  return (
    <motion.div className="max-w-7xl mx-auto px-4 sm:px-6" variants={pageReveal} initial="hidden" animate="show">
      <div className="max-w-3xl mx-auto">
        <motion.div className="mb-6" variants={fadeUp}>
          <Link to="/news" className="text-sm opacity-50 hover:opacity-80" style={{ color: 'var(--color-accent)' }}>← 返回新闻</Link>
        </motion.div>

        {article.cover_image_url && (
          <motion.img src={article.cover_image_url} alt={article.title} className="w-full h-64 object-cover rounded-xl mb-6" variants={panelReveal} />
        )}

        {article.match && (
          <motion.div
            variants={panelReveal}
            className="mb-6 rounded-xl p-4"
            style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">
                  {article.match.stage ?? '比赛'} · {article.match.final_score}
                </p>
                <div className="text-sm font-black text-white/85 truncate">
                  {article.match.team_a_name ?? 'TBD'} vs {article.match.team_b_name ?? 'TBD'}
                </div>
              </div>
              <Link
                to={`/matches/${article.match.id}`}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/70 hover:bg-white/15 transition"
              >
                查看比赛数据
              </Link>
            </div>
          </motion.div>
        )}

        <motion.div className="mb-6" variants={staggerContainer} initial="hidden" animate="show">
          {article.category && <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>{article.category} · </span>}
          <span className="text-sm opacity-40">{dayjs(article.published_at).format('YYYY年MM月DD日')} · {article.author ?? 'ALAST'}</span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-3xl font-bold mb-4">{article.title}</motion.h1>
        {article.summary && <motion.p variants={fadeUp} className="text-lg opacity-60 mb-6 border-l-2 pl-4" style={{ borderColor: 'var(--color-primary)' }}>{article.summary}</motion.p>}
      </div>

      {article.match && selectedMap && (
        <motion.section
          variants={panelReveal}
          className="mb-8 rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">比赛经过 / 最终数据</p>
              <h2 className="text-xl font-black text-white/90">
                {article.match.team_a_name ?? 'TBD'} vs {article.match.team_b_name ?? 'TBD'}
              </h2>
              <p className="text-xs text-white/40 mt-1">
                {article.match.stage ?? '比赛'} · {selectedMap.map_name.replace('de_', '').toUpperCase()} · {selectedMap.score_a ?? 0}–{selectedMap.score_b ?? 0}
              </p>
            </div>
            {maps.length > 1 && (
              <div className="sm:min-w-72">
                <MapPicker maps={maps} selectedId={selectedMapId} onSelect={setSelectedMapId} />
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                {selectedMap.map_name.replace('de_', '').toUpperCase()} Scoreboard
              </h3>
              <Scoreboard
                players={stats}
                teamAId={article.match.team_a_id}
                teamBId={article.match.team_b_id}
                teamAName={article.match.team_a_name ?? 'Team A'}
                teamBName={article.match.team_b_name ?? 'Team B'}
                rounds={rounds}
              />
            </div>

            <RoundTimeline
              rounds={rounds}
              teamAName={article.match.team_a_name ?? 'Team A'}
              teamBName={article.match.team_b_name ?? 'Team B'}
              teamAId={article.match.team_a_id}
              teamBId={article.match.team_b_id}
              players={stats}
            />
          </div>
        </motion.section>
      )}

      <div className="max-w-3xl mx-auto">
        {article.content && (
          <motion.div className="prose prose-invert max-w-none"
            variants={panelReveal}
            style={{ '--tw-prose-body': 'rgba(248,250,252,0.8)', '--tw-prose-headings': '#F8FAFC', '--tw-prose-links': 'var(--color-accent)' } as React.CSSProperties}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </motion.div>
        )}

        {article.ai_generated && (
          <motion.p variants={fadeUp} className="mt-8 text-xs text-white/35 italic">
            本文由 AI 模仿「玩机器」解说风格生成，仅为致敬，与本人无关。
          </motion.p>
        )}

        {article.match && (
          <motion.div variants={fadeUp} className="mt-6">
            <Link to={`/matches/${article.match.id}`} className="text-sm font-bold text-primary hover:opacity-80">
              返回本场比赛数据 →
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
