// src/components/Navbar.tsx
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Search, Menu, X } from 'lucide-react'
import SearchDialog from './SearchDialog'

const LINKS = [
  { to: '/matches', label: '赛程' },
  { to: '/teams',   label: '战队' },
  { to: '/players', label: '选手' },
  { to: '/draft',   label: '选马' },
  { to: '/news',    label: '新闻' },
  { to: '/stats',   label: '数据' },
  { to: '/about',   label: '关于' },
]

export default function Navbar() {
  const [searchOpen, setSearchOpen]   = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const location = useLocation()

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-[#050714]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setMobileOpen(false)}>
            <Trophy size={20} className="text-primary" />
            <div className="flex flex-col leading-none gap-0">
              <span className="logo-primary text-[22px]">ALAST</span>
              <span className="hidden lg:block text-[8px] font-black uppercase tracking-[0.3em] text-primary/60 -mt-0.5">
                PREMIER 2026
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {LINKS.map(l => {
              const active = location.pathname.startsWith(l.to)
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={[
                    'relative text-xs font-black uppercase tracking-widest py-1 transition-colors',
                    active ? 'text-primary' : 'text-white/60 hover:text-white',
                  ].join(' ')}
                >
                  {l.label}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-primary"
                      style={{ boxShadow: '0 0 10px rgba(255,138,0,0.5)' }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
              aria-label="搜索"
            >
              <Search size={14} />
            </button>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
              aria-label="菜单"
            >
              {mobileOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/5"
            >
              <div className="flex flex-col py-2">
                {LINKS.map(l => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => [
                      'px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors',
                      isActive ? 'text-primary bg-primary/5' : 'text-white/60 hover:text-white',
                    ].join(' ')}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
