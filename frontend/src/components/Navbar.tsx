// src/components/Navbar.tsx
import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Menu, X } from 'lucide-react'
import SearchDialog from './SearchDialog'
import { apiFetch } from '../api/client'

const LINKS = [
  { to: '/matches', label: '赛程' },
  { to: '/teams',   label: '战队' },
  { to: '/players', label: '选手' },
  { to: '/news',    label: '新闻' },
  { to: '/stats',   label: '数据' },
  { to: '/about',   label: '关于' },
]

const SECTOR_MAP: Record<string, string> = {
  '/':        'HOME',
  '/matches': 'MATCH_LOG',
  '/teams':   'ROSTER',
  '/players': 'OPERATIVES',
  '/stats':   'ANALYTICS',
  '/news':    'DISPATCH',
  '/about':   'BRIEFING',
}

function getSector(pathname: string): string {
  // Exact match first
  if (SECTOR_MAP[pathname]) return SECTOR_MAP[pathname]
  // Prefix match
  const prefix = Object.keys(SECTOR_MAP).find(
    k => k !== '/' && pathname.startsWith(k)
  )
  return prefix ? SECTOR_MAP[prefix] : 'UNKNOWN'
}

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liveCount, setLiveCount]   = useState(0)
  const location = useLocation()
  const sector = getSector(location.pathname)

  // Poll live matches every 30s
  useEffect(() => {
    let cancelled = false

    async function fetchLive() {
      try {
        const data = await apiFetch<unknown[]>('/api/matches?status=live')
        if (!cancelled) setLiveCount(Array.isArray(data) ? data.length : 0)
      } catch {
        // silently ignore — backend may not be running in preview
      }
    }

    fetchLive()
    const id = setInterval(fetchLive, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const navGlass: React.CSSProperties = {
    background: 'rgba(7,9,12,0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--color-line)',
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[60]"
        style={navGlass}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-6" style={{ height: 56 }}>

          {/* ALAST logo */}
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              background: 'var(--gold-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              flexShrink: 0,
              letterSpacing: '0.02em',
              paddingRight: 4,
            }}
          >
            ALAST
          </Link>

          {/* SECTOR indicator — desktop only */}
          <span
            className="hidden md:block"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              letterSpacing: '0.2em',
              color: 'var(--color-data)',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            SECTOR :: {sector}
          </span>

          {/* Desktop nav links — fills remaining space */}
          <div className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {LINKS.map(l => {
              const active = l.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(l.to)
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className="relative py-1"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: active ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                    textDecoration: 'none',
                    transition: 'color 150ms',
                  }}
                >
                  {l.label}
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        left: 0,
                        right: 0,
                        height: 1,
                        background: 'var(--color-data)',
                      }}
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 ml-auto">
            {/* ⌘K search button */}
            <motion.button
              onClick={() => setSearchOpen(true)}
              aria-label="搜索 (⌘K)"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--color-fg-dim)',
              }}
            >
              <Search size={13} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  letterSpacing: '0.1em',
                }}
              >
                ⌘K
              </span>
            </motion.button>

            {/* LIVE indicator */}
            {liveCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  border: '1px solid rgba(255,45,45,0.35)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,45,45,0.08)',
                }}
              >
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-alert)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-mono-xs)',
                    letterSpacing: '0.2em',
                    color: 'var(--color-alert)',
                  }}
                >
                  LIVE {String(liveCount).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Mobile hamburger */}
            <motion.button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden"
              aria-label="菜单"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--color-fg-muted)',
              }}
            >
              {mobileOpen ? <X size={14} /> : <Menu size={14} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden"
              style={{
                borderTop: '1px solid var(--color-line)',
                background: 'rgba(7,9,12,0.96)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex flex-col py-2">
                {LINKS.map(l => {
                  const active = l.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(l.to)
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        padding: '12px 24px',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: active ? 'var(--color-data)' : 'var(--color-fg-muted)',
                        textDecoration: 'none',
                        background: active ? 'rgba(199,255,61,0.05)' : 'transparent',
                        borderLeft: active ? '2px solid var(--color-data)' : '2px solid transparent',
                        transition: 'color 150ms',
                        display: 'block',
                      }}
                    >
                      {l.label}
                    </NavLink>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
