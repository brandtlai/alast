import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TrophySymbol from '../TrophySymbol.js'
import { useCurrentTournament } from '../../api/currentTournament.js'
import { fadeUp, staggerContainer } from '../../lib/motion.js'

const INFO_ITEMS = [
  { label: 'Tournament Phase', value: '小组赛', accent: false },
  { label: 'Venue',            value: 'Online', accent: false },
  { label: 'Grand Prize',      value: '¥500,000', accent: true },
]

export default function TournamentHubHero() {
  const { data: tournament } = useCurrentTournament()

  return (
    <section className="relative overflow-hidden stage-gradient" style={{ height: 360 }}>
      {/* Single ambient blob */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
        style={{
          width: '900px',
          height: '500px',
          background: 'rgba(255,138,0,0.12)',
          filter: 'blur(140px)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center gap-8">
        {/* Left: brand text */}
        <motion.div
          className="flex-1"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.p variants={fadeUp} className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
            ALAST PREMIER
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-black italic tracking-tighter leading-none mb-2"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            <span className="gold-gradient">PREMIER 2026</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-5">
            {tournament?.name ?? 'SEASON 2026'}
          </motion.p>

          {/* Info bar */}
          <motion.div variants={fadeUp} className="flex items-center gap-6 flex-wrap">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-7 bg-white/10" />}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35">
                    {item.label}
                  </p>
                  <p className={`text-sm font-black italic mt-0.5 ${item.accent ? 'text-primary' : 'text-white/80'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Trophy */}
        <motion.div
          className="flex-shrink-0 hidden md:block"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
          transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5 }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <TrophySymbol variant="full" className="w-[180px] lg:w-[220px]" />
        </motion.div>
      </div>

      {/* Hidden CTA — kept off the hub hero per design (CTA lives in tabs). Link reserved for /about. */}
      <Link to="/about" className="sr-only">关于赛事</Link>
    </section>
  )
}
