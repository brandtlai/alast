// src/pages/NewsPage.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useNewsList } from '../api/news'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import Card from '../components/Card'
import { fadeUp, headingMask, pageReveal, pressTap, softHover, staggerContainer } from '../lib/motion'

const CATEGORIES = ['', '战报', '资讯', '专访']

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const { data: articles, isLoading, error } = useNewsList({ category: category || undefined })

  return (
    <motion.div className="max-w-7xl mx-auto px-6 py-8" variants={pageReveal} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={staggerContainer} initial="hidden" animate="show">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Latest News</p>
        <motion.h1 variants={headingMask} className="text-4xl font-black italic tracking-tighter text-white/90">战报新闻</motion.h1>
      </motion.div>

      <motion.div className="flex gap-2 mb-6 flex-wrap" variants={staggerContainer} initial="hidden" animate="show">
        {CATEGORIES.map(c => (
          <motion.button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
            variants={fadeUp}
            whileHover={{ y: -1, scale: 1.03 }}
            whileTap={pressTap}
            style={{
              background: category === c ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              color: category === c ? '#fff' : 'rgba(248,250,252,0.5)',
              borderColor: category === c ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {c || '全部'}
          </motion.button>
        ))}
      </motion.div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {articles && (
        articles.length === 0
          ? <p className="text-sm text-white/40">暂无文章</p>
          : <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" variants={staggerContainer} initial="hidden" animate="show">
              {articles.map(a => (
                <motion.div
                  key={a.id}
                  variants={fadeUp}
                  whileHover={softHover}
                  whileTap={pressTap}
                >
                  <Card href={`/news/${a.slug}`} className="flex flex-col">
                    <div className="h-44 overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                      {a.cover_image_url
                        ? <img
                            src={a.cover_image_url}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        : <span className="text-5xl opacity-20">🏆</span>}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      {a.category && (
                        <span className="inline-flex mb-2 self-start px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[9px] font-black uppercase tracking-widest text-primary">
                          {a.category}
                        </span>
                      )}
                      <h3 className="font-black text-sm leading-snug line-clamp-2 flex-1 text-white/90">{a.title}</h3>
                      {a.summary && (
                        <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{a.summary}</p>
                      )}
                      {a.match && (
                        <div className="mt-3 text-[10px] font-bold text-white/40 truncate">
                          {a.match.stage ?? '比赛'} · {a.match.team_a_name ?? 'TBD'} vs {a.match.team_b_name ?? 'TBD'} · {a.match.final_score}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-white/35 font-bold">{a.author ?? 'ALAST'}</span>
                        <span className="text-[10px] text-white/35">{dayjs(a.published_at).format('YYYY-MM-DD')}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
      )}
    </motion.div>
  )
}
