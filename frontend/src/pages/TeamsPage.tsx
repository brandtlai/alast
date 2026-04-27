// src/pages/TeamsPage.tsx — Tactical OS re-skin (T20)
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTeams } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { hudStagger, hudEnter } from '../design/motion'

const REGIONS = ['', 'Asia', 'EU', 'NA', 'CIS']

export default function TeamsPage() {
  const [region, setRegion] = useState('')
  const { data: teams, isLoading, error } = useTeams(region || undefined)

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

      {/* Region filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 32px', marginBottom: 24 }}>
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            style={{
              padding: '6px 16px',
              border: `1px solid ${region === r ? 'var(--color-data)' : 'var(--color-line)'}`,
              borderRadius: 'var(--radius-sm)',
              background: region === r ? 'rgba(199,255,61,0.1)' : 'transparent',
              color: region === r ? 'var(--color-data)' : 'var(--color-fg-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all var(--duration-mid) var(--ease-hud)',
            }}
          >
            {r || '全部'}
          </button>
        ))}
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
              {teams.map(t => (
                <motion.div key={t.id} variants={hudEnter}>
                  <Link to={`/teams/${t.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <HudPanel
                      style={{
                        padding: 24,
                        borderColor: (t as any).is_champion ? 'var(--color-gold-2)' : undefined,
                      }}
                    >
                      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {t.logo_url && (
                          <img src={t.logo_url} width={40} height={40} alt="" style={{ objectFit: 'contain' }} />
                        )}
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: 'var(--color-fg)' }}>
                            {t.name}
                          </div>
                          {(t as any).cn_name && (
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--color-fg-muted)', marginTop: 4 }}>
                              {(t as any).cn_name}
                            </div>
                          )}
                          {t.short_name && !(t as any).cn_name && (
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--color-fg-muted)', marginTop: 4 }}>
                              {t.short_name}
                            </div>
                          )}
                        </div>
                      </header>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 16,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-sm)',
                          color: 'var(--color-fg-muted)',
                        }}
                      >
                        <span>
                          {(t as any).wins ?? 0}W-{(t as any).losses ?? 0}L
                        </span>
                        {(t as any).rank != null && (
                          <span>RANK #{(t as any).rank}</span>
                        )}
                        {t.region && (
                          <span style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>{t.region}</span>
                        )}
                      </div>

                      {(t as any).players?.length ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          {(t as any).players.slice(0, 5).map((p: any) => (
                            p.avatar_url
                              ? (
                                <img
                                  key={p.id}
                                  src={p.avatar_url}
                                  width={28}
                                  height={28}
                                  alt={p.name ?? p.nickname}
                                  style={{ borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                                />
                              )
                              : null
                          ))}
                        </div>
                      ) : null}
                    </HudPanel>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )
      )}

      <div style={{ height: 64 }} />
    </div>
  )
}
