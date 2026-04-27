// src/components/Footer.tsx
import { Link } from 'react-router-dom'

const LINKS = [
  ['关于', '/about'],
  ['联系', '/about#contact'],
  ['数据来源', '/about#data'],
] as const

export default function Footer() {
  return (
    <footer
      style={{
        height: 80,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-line)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between gap-6"
      >
        {/* ALAST brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src="/trophy.png" width={18} height={18} alt="" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              background: 'var(--gold-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.02em',
              paddingRight: 3,
            }}
          >
            ALAST
          </span>
        </div>

        {/* Copyright */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-sm)',
            letterSpacing: '0.2em',
            color: 'var(--color-fg-dim)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          © 2026 ALAST PREMIER
        </span>

        {/* Nav links */}
        <div className="flex items-center gap-4">
          {LINKS.map(([label, to]) => (
            <Link
              key={to}
              to={to}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-mono-sm)',
                color: 'var(--color-fg-dim)',
                textDecoration: 'none',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-data)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-fg-dim)')}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
