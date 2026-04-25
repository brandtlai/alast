import { Link } from 'react-router-dom'

interface CardProps {
  children: React.ReactNode
  className?: string
  href?: string
  hover?: boolean
}

export default function Card({ children, className = '', href, hover = true }: CardProps) {
  const base = [
    'relative group block bg-card border border-white/[0.08] rounded-2xl overflow-hidden',
    'transition-all duration-300',
    hover ? 'hover:border-primary/50' : '',
    className,
  ].join(' ')

  const accent = hover ? (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-gold-orange scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
  ) : null

  if (href) {
    return (
      <Link to={href} className={base}>
        {children}
        {accent}
      </Link>
    )
  }
  return (
    <div className={base}>
      {children}
      {accent}
    </div>
  )
}
