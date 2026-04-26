// src/components/Navbar.tsx
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Search, Menu, X } from 'lucide-react'
import SearchDialog from './SearchDialog'
import { pressTap } from '../lib/motion'

const LINKS = [
  { to: '/matches', label: '赛程' },
  { to: '/teams',   label: '战队' },
  { to: '/players', label: '选手' },
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
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-[#050714]/78 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setMobileOpen(false)}>
            <motion.span whileHover={{ rotate: -8, scale: 1.08 }} whileTap={pressTap} className="flex">
              <Trophy size={20} className="text-primary drop-shadow-[0_0_10px_rgba(255,138,0,0.35)]" />
            </motion.span>
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
                  <motion.span
                    className="inline-block"
                    whileHover={{ y: -1 }}
                    transition={{ duration: 0.16 }}
                  >
                    {l.label}
                  </motion.span>
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-[7px] left-[-8px] right-[-8px] h-[3px] rounded-full bg-gradient-to-r from-primary via-gold-orange to-accent"
                      style={{ boxShadow: '0 0 16px rgba(255,138,0,0.55)' }}
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-primary/30 hover:bg-primary/10 transition-all"
              aria-label="搜索"
              whileHover={{ y: -1, scale: 1.04 }}
              whileTap={pressTap}
            >
              <Search size={14} />
            </motion.button>
            <motion.button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-primary/30 hover:bg-primary/10 transition-all"
              aria-label="菜单"
              whileHover={{ y: -1, scale: 1.04 }}
              whileTap={pressTap}
            >
              {mobileOpen ? <X size={14} /> : <Menu size={14} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden border-t border-white/5 bg-[#050714]/92 backdrop-blur-xl"
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
