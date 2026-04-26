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
    hover ? 'surface-sheen interactive-lift hover:border-primary/50' : '',
    className,
  ].join(' ')

  const accent = hover ? (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-gold-orange to-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 36px rgba(255,138,0,0.08)' }} />
    </>
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
