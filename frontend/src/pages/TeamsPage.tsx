// src/pages/TeamsPage.tsx — Tactical OS re-skin (T20)
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTeams } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { hudStagger, hudEnter } from '../design/motion'

export default function TeamsPage() {
  const { data: teams, isLoading, error } = useTeams()

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '64px 32px 24px' }}>
        <TacticalLabel text="SECTOR :: ROSTER" />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-display-lg)',
            lineHeight: 1,
            color: 'var(--color-fg)',
            margin: '8px 0 0',
          }}
        >
          参赛战队
        </h1>
      </div>

      {/* States */}
      {isLoading && (
        <div style={{ padding: '0 32px' }}>
          <Spinner />
        </div>
      )}
      {error && (
        <div style={{ padding: '0 32px' }}>
          <ErrorBox message={error.message} />
        </div>
      )}

      {/* Grid */}
      {teams && (
        teams.length === 0
          ? (
            <p style={{ padding: '0 32px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-dim)' }}>
              暂无战队
            </p>
          )
          : (
            <motion.div
              variants={hudStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              style={{
                display: 'grid',
                gap: 24,
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                padding: '0 32px',
              }}
            >
              {teams.map((t, idx) => {
                const wins = (t as any).wins ?? 0
                const losses = (t as any).losses ?? 0
                const isLeader = idx === 0 && wins > 0
                return (
                <motion.div key={t.id} variants={hudEnter} style={{ display: 'flex' }}>
                  <Link to={`/teams/${t.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', width: '100%' }}>
                    <HudPanel
                      watermark={isLeader ? true : undefined}
                      style={{
                        padding: 24,
                        borderColor: isLeader ? 'var(--color-gold-2)' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        minHeight: 160,
                      }}
                    >
                      {isLeader && (
                        <img
                          src="/trophy.png"
                          width={28}
                          height={28}
                          alt=""
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            opacity: 0.85,
                            filter: 'drop-shadow(0 0 6px rgba(255,184,0,0.4))',
                          }}
                        />
                      )}
                      <header style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 48 }}>
                        <div style={{
                          width: 48, height: 48, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--color-line)',
                          background: 'rgba(255,255,255,0.02)',
                        }}>
                          {t.logo_url
                            ? <img src={t.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-fg-dim)', letterSpacing: '0.1em' }}>NO LOGO</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 22,
                            lineHeight: 1.15,
                            color: 'var(--color-fg)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {t.name}
                          </div>
                          {t.short_name && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-fg-muted)', marginTop: 4, letterSpacing: '0.1em' }}>
                              {t.short_name}
                            </div>
                          )}
                        </div>
                      </header>

                      <div style={{ flex: 1 }} />

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginTop: 16,
                          paddingTop: 12,
                          borderTop: '1px solid var(--color-line)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--color-fg-muted)',
                        }}
                      >
                        <span>
                          <span style={{ color: 'var(--color-data)', fontVariantNumeric: 'tabular-nums' }}>{wins}</span>
                          <span style={{ color: 'var(--color-fg-dim)' }}>W</span>
                          <span style={{ margin: '0 4px', color: 'var(--color-fg-dim)' }}>·</span>
                          <span style={{ color: 'var(--color-fire)', fontVariantNumeric: 'tabular-nums' }}>{losses}</span>
                          <span style={{ color: 'var(--color-fg-dim)' }}>L</span>
                        </span>
                        <span style={{ letterSpacing: '0.2em' }}>#{idx + 1}</span>
                      </div>
                    </HudPanel>
                  </Link>
                </motion.div>
              )})}
            </motion.div>
          )
      )}

      <div style={{ height: 64 }} />
    </div>
  )
}
