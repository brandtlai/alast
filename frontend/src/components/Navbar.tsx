import { Link, NavLink } from 'react-router-dom'
import { Trophy } from 'lucide-react'

const links = [
  { to: '/matches', label: '赛程' },
  { to: '/teams', label: '战队' },
  { to: '/players', label: '选手' },
  { to: '/news', label: '新闻' },
  { to: '/stats', label: '数据' },
  { to: '/about', label: '关于' },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(5,7,20,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
          <Trophy size={22} />
          <span>ALAST Premier</span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'font-semibold' : 'opacity-70 hover:opacity-100'}`
              }
              style={({ isActive }) => ({ color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)' })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
