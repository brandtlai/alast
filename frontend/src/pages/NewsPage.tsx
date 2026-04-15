import { useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useNewsList } from '../api/news'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'

const CATEGORIES = ['', '战报', '资讯', '专访']

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const { data: articles, isLoading, error } = useNewsList({ category: category || undefined })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新闻资讯</h1>

      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              background: category === c ? 'var(--color-primary)' : 'var(--color-card)',
              color: category === c ? '#fff' : 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}>
            {c || '全部'}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {articles && (
        articles.length === 0
          ? <p className="opacity-40">暂无文章</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map(a => (
                <Link key={a.id} to={`/news/${a.slug}`}
                  className="flex flex-col rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  {a.cover_image_url
                    ? <img src={a.cover_image_url} alt={a.title} className="w-full h-44 object-cover" />
                    : <div className="w-full h-44 flex items-center justify-center text-4xl" style={{ background: 'var(--color-secondary)' }}>🏆</div>}
                  <div className="p-4 flex-1 flex flex-col">
                    {a.category && <span className="text-xs font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>{a.category}</span>}
                    <h3 className="font-semibold leading-snug line-clamp-2 flex-1">{a.title}</h3>
                    {a.summary && <p className="text-sm opacity-60 mt-2 line-clamp-2">{a.summary}</p>}
                    <div className="flex items-center justify-between mt-3 text-xs opacity-40">
                      <span>{a.author ?? 'ALAST'}</span>
                      <span>{dayjs(a.published_at).format('YYYY-MM-DD')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
      )}
    </div>
  )
}
