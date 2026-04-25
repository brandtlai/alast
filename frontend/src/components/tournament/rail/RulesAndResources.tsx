import { Link } from 'react-router-dom'
import { FileText, Users, Info, ChevronRight, Trophy } from 'lucide-react'
import { RailCard } from './RightRail'

const ITEMS: { label: string; href: string; icon: typeof FileText }[] = [
  { label: '规则书',     href: '/about#rules',  icon: FileText },
  { label: '战队报名',   href: '/teams',         icon: Users },
  { label: '关于赛事',   href: '/about',         icon: Info },
]

export default function RulesAndResources() {
  return (
    <RailCard title="Resources">
      <ul className="space-y-1">
        {ITEMS.map(item => {
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                to={item.href}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/5 transition-colors group"
              >
                <Icon size={14} className="text-white/40 group-hover:text-primary transition-colors flex-shrink-0" />
                <span className="text-xs font-bold text-white/75 group-hover:text-white flex-1">{item.label}</span>
                <ChevronRight size={12} className="text-white/25 group-hover:text-primary transition-colors" />
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            to="/draft"
            className="flex items-center gap-3 py-2 px-2 rounded-md transition-colors group"
            style={{ background: 'var(--color-data-chip)' }}
          >
            <Trophy size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs font-bold text-white/90 flex-1">选马公示 / Draft</span>
            <ChevronRight size={12} className="text-primary" />
          </Link>
        </li>
      </ul>
    </RailCard>
  )
}
