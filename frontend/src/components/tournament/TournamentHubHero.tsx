import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import AmbientParticles from '../AmbientParticles.js'
import { useCurrentTournament } from '../../api/currentTournament.js'
import { fadeUp, headingMask, staggerContainer } from '../../lib/motion.js'

const INFO_ITEMS = [
  { label: 'Tournament Phase', value: '小组赛', accent: false },
  { label: 'Venue',            value: 'Online', accent: false },
  { label: 'Grand Prize',      value: '¥500,000', accent: true },
]

export default function TournamentHubHero() {
  const { data: tournament } = useCurrentTournament()

  return (
    <section className="relative overflow-hidden" style={{ height: 420 }}>
      {/* Official poster — full-bleed hero background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/poster.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      />

      {/* Left-to-right darken so text stays legible over the poster */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,10,18,0.92) 0%, rgba(8,10,18,0.72) 35%, rgba(8,10,18,0.35) 65%, rgba(8,10,18,0.15) 100%)',
        }}
      />

      {/* Bottom fade into the page */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(8,10,18,0) 0%, rgba(8,10,18,0.85) 100%)',
        }}
      />

      {/* Ambient gold particles */}
      <AmbientParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center">
        <motion.div
          className="flex-1"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.p variants={fadeUp} className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
            ALAST PREMIER
          </motion.p>
          <motion.h1
            variants={headingMask}
            className="font-black italic tracking-tighter leading-none mb-2"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
          >
            <span className="gold-gradient">PREMIER 2026</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xs font-black uppercase tracking-[0.3em] text-white/50 mb-5">
            {tournament?.name ?? 'SEASON 2026'}
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center gap-6 flex-wrap">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-7 bg-white/15" />}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/45">
                    {item.label}
                  </p>
                  <p className={`text-sm font-black italic mt-0.5 ${item.accent ? 'text-primary' : 'text-white/90'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <Link to="/about" className="sr-only">关于赛事</Link>
    </section>
  )
}
