import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMatches } from '../../../api/matches.js'
import { useNewsList } from '../../../api/news.js'
import { useCurrentTournament } from '../../../api/currentTournament.js'
import { groupByRound } from '../lib/groupByRound.js'
import MatchRow from '../MatchRow.js'
import Spinner from '../../Spinner.js'
import Card from '../../Card.js'
import RightRail from '../rail/RightRail.js'
import StageCard from '../rail/StageCard.js'
import StageTimeline from '../rail/StageTimeline.js'
import MvpMini from '../rail/MvpMini.js'
import RulesAndResources from '../rail/RulesAndResources.js'
import FaqWidget from '../rail/FaqWidget.js'

export default function OverviewTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches, isLoading } = useMatches({
    tournament_id: tournament?.id,
  })
  const { data: news } = useNewsList({ limit: 3 })

  const groups = useMemo(() => groupByRound(matches ?? []), [matches])

  if (isLoading) return <div className="py-12"><Spinner /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-8 min-w-0">
        {groups.length === 0 && (
          <div className="text-sm text-white/40 py-12 text-center">
            暂无比赛数据
          </div>
        )}
        {groups.map(g => (
          <section key={g.stage}>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                {g.stage}
              </h2>
              {g.dateRange && (
                <span className="text-[10px] font-mono text-white/35">{g.dateRange}</span>
              )}
            </div>
            <div className="space-y-2">
              {g.matches.map(m => (
                <MatchRow key={m.id} match={m} variant="overview" />
              ))}
            </div>
          </section>
        ))}

        {/* News mini-strip — hidden entirely when empty */}
        {news && news.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">最新资讯</h2>
              <Link to="/news" className="text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-primary transition-colors">
                更多 →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {news.map(a => (
                <Card key={a.id} href={`/news/${a.slug}`}>
                  {a.cover_image_url && (
                    <div className="h-28 overflow-hidden">
                      <img src={a.cover_image_url} alt={a.title}
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-black text-xs leading-snug line-clamp-2 text-white/90">{a.title}</h3>
                    <p className="text-[10px] text-white/30 mt-1.5">{dayjs(a.published_at).format('YYYY-MM-DD')}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right rail */}
      <div className="hidden lg:block">
        <RightRail>
          <StageCard />
          <StageTimeline />
          <MvpMini />
          <RulesAndResources />
          <FaqWidget />
        </RightRail>
      </div>
    </div>
  )
}
