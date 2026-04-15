import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import { useTeams } from '../api/teams'
import { useNewsList } from '../api/news'
import Spinner from '../components/Spinner'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'

function MatchCard({ match }: { match: import('../types').Match }) {
  return (
    <Link to={`/matches/${match.id}`} className="block rounded-lg p-4 transition-all hover:scale-[1.02]"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={32} />
          <span className="font-semibold truncate text-sm">{match.team_a_name ?? 'TBD'}</span>
        </div>
        <div className="text-center flex-shrink-0">
          {match.status === 'finished'
            ? <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{match.maps_won_a} – {match.maps_won_b}</span>
            : <StatusBadge status={match.status} />}
          <div className="text-xs opacity-50 mt-0.5">{match.stage}</div>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-semibold truncate text-sm">{match.team_b_name ?? 'TBD'}</span>
          <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={32} />
        </div>
      </div>
      {match.scheduled_at && (
        <div className="text-xs opacity-40 text-center mt-2">
          {dayjs(match.scheduled_at).format('MM-DD HH:mm')}
        </div>
      )}
    </Link>
  )
}

function NewsCard({ article }: { article: import('../types').NewsArticle }) {
  return (
    <Link to={`/news/${article.slug}`} className="block rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        {article.category && (
          <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-accent)' }}>{article.category}</span>
        )}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{article.title}</h3>
        {article.summary && <p className="text-xs opacity-60 mt-1 line-clamp-2">{article.summary}</p>}
        <div className="text-xs opacity-40 mt-2">{dayjs(article.published_at).format('YYYY-MM-DD')}</div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { data: matches, isLoading: ml } = useMatches()
  const { data: teams, isLoading: tl } = useTeams()
  const { data: news, isLoading: nl } = useNewsList({ limit: 6 })

  const recentMatches = matches?.slice(0, 6) ?? []
  const topTeams = teams?.slice(0, 8) ?? []

  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span style={{ color: 'var(--color-primary)' }}>ALAST</span>{' '}
          <span style={{ color: 'var(--color-accent)' }}>Premier 2026</span>
        </h1>
        <p className="text-lg opacity-60 max-w-xl mx-auto">中国区顶级 CS2 精英赛事</p>
      </motion.section>

      {/* Recent Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">近期比赛</h2>
          <Link to="/matches" className="text-sm opacity-60 hover:opacity-100" style={{ color: 'var(--color-accent)' }}>查看全部 →</Link>
        </div>
        {ml ? <Spinner /> : (
          recentMatches.length === 0
            ? <p className="opacity-40 text-sm">暂无比赛数据</p>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
        )}
      </section>

      {/* Teams */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">参赛战队</h2>
          <Link to="/teams" className="text-sm opacity-60 hover:opacity-100" style={{ color: 'var(--color-accent)' }}>全部战队 →</Link>
        </div>
        {tl ? <Spinner /> : (
          topTeams.length === 0
            ? <p className="opacity-40 text-sm">暂无战队数据</p>
            : <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {topTeams.map(t => (
                  <Link key={t.id} to={`/teams/${t.id}`}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-all hover:scale-105"
                    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <TeamLogo url={t.logo_url} name={t.name} size={48} />
                    <span className="text-xs font-medium truncate w-full text-center">{t.short_name ?? t.name}</span>
                  </Link>
                ))}
              </div>
        )}
      </section>

      {/* News */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">最新资讯</h2>
          <Link to="/news" className="text-sm opacity-60 hover:opacity-100" style={{ color: 'var(--color-accent)' }}>更多新闻 →</Link>
        </div>
        {nl ? <Spinner /> : (
          !news || news.length === 0
            ? <p className="opacity-40 text-sm">暂无新闻</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map(a => <NewsCard key={a.id} article={a} />)}
              </div>
        )}
      </section>
    </div>
  )
}
