import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dayjs from 'dayjs'
import { useNewsArticle } from '../api/news'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: article, isLoading, error } = useNewsArticle(slug!)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!article) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/news" className="text-sm opacity-50 hover:opacity-80" style={{ color: 'var(--color-accent)' }}>← 返回新闻</Link>
      </div>

      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} className="w-full h-64 object-cover rounded-xl mb-6" />
      )}

      <div className="mb-6">
        {article.category && <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>{article.category} · </span>}
        <span className="text-sm opacity-40">{dayjs(article.published_at).format('YYYY年MM月DD日')} · {article.author ?? 'ALAST'}</span>
      </div>

      <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
      {article.summary && <p className="text-lg opacity-60 mb-6 border-l-2 pl-4" style={{ borderColor: 'var(--color-primary)' }}>{article.summary}</p>}

      {article.content && (
        <div className="prose prose-invert max-w-none"
          style={{ '--tw-prose-body': 'rgba(248,250,252,0.8)', '--tw-prose-headings': '#F8FAFC', '--tw-prose-links': 'var(--color-accent)' } as React.CSSProperties}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
