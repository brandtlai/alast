// src/components/Footer.tsx
import { Link } from 'react-router-dom'
import TrophySymbol from './TrophySymbol'

const NAV = [
  ['赛程', '/matches'],
  ['战队', '/teams'],
  ['选手', '/players'],
  ['数据中心', '/stats'],
] as const

const SUPPORT = [
  ['战报新闻', '/news'],
  ['关于赛事', '/about'],
] as const

export default function Footer() {
  return (
    <footer className="relative bg-[#020510] border-t border-white/5 pt-16 pb-8 overflow-hidden">
      {/* Trophy watermark */}
      <div className="absolute right-0 bottom-0 w-[360px] pointer-events-none select-none opacity-60">
        <TrophySymbol variant="outline" className="w-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="logo-primary text-4xl mb-1">ALAST</div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-primary mb-4">PREMIER 2026</p>
            <p className="text-sm text-white/40 leading-relaxed">
              中国区顶级 CS2 精英赛事，汇聚最强战队，见证传奇时刻。
            </p>
          </div>

          {/* Nav */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">赛事导航</h4>
            <ul className="space-y-2.5">
              {NAV.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-white/50 hover:text-primary transition-colors font-bold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">支持</h4>
            <ul className="space-y-2.5">
              {SUPPORT.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-white/50 hover:text-primary transition-colors font-bold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social placeholder */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">社交媒体</h4>
            <p className="text-sm text-white/30">敬请期待</p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-white/25">© 2026 ALAST Premier — All rights reserved</p>
        </div>
      </div>
    </footer>
  )
}
