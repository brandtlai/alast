import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { easeOutQuart } from '../lib/motion'

interface Props {
  /** true = 播完整入场；false = 直接 settle 到 idle 状态 */
  playEntry: boolean
  className?: string
}

const SPARK_COUNT = 10

// 火花径向飞散方向（10 个均布 + 抖动）
function makeSparks() {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const dist = 80 + Math.random() * 40
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      delay: 0.6 + Math.random() * 0.05,
    }
  })
}

export default function TrophyHeroEntry({ playEntry, className = '' }: Props) {
  const reduceMotion = useReducedMotion()
  const skip = !playEntry || reduceMotion
  const sparks = useMemo(() => (skip ? [] : makeSparks()), [skip])

  return (
    <div className={`relative ${className}`} style={{ width: 220, height: 260 }}>
      {/* Background radial bloom — 0.6–0.8s burst */}
      {!skip && (
        <motion.div
          className="absolute inset-[-40%] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 55%, rgba(255,184,0,0.55) 0%, rgba(255,138,0,0.25) 25%, transparent 60%)',
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0, 1, 0.3, 0], scale: [0.4, 0.4, 1.2, 1, 0.9] }}
          transition={{
            duration: 1.4,
            times: [0, 0.42, 0.55, 0.7, 1],
            ease: easeOutQuart,
          }}
        />
      )}

      {/* Seed point — 0–0.2s */}
      {!skip && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 6,
            height: 6,
            background: '#FFD700',
            boxShadow: '0 0 12px 2px rgba(255,215,0,0.85)',
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: [1, 1, 0], scale: [1, 1.6, 0.6] }}
          transition={{ duration: 0.4, ease: easeOutQuart }}
        />
      )}

      {/* Trophy — settle 到中央 + idle 钟摆 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={skip ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: skip ? 0 : 0.2, ease: easeOutQuart }}
      >
        <div
          className="relative w-full h-full"
          style={{
            // idle pendulum + breath — 仅在 !reduceMotion 时跑（CSS keyframes 自动被 reduce-motion 媒体查询禁用）
            animation: skip ? undefined : 'trophyPendulum 6.5s ease-in-out 1.6s infinite, trophyBreath 5.5s ease-in-out 1.6s infinite',
            transformOrigin: '50% 5%',
          }}
        >
          <img
            src="/trophy.png"
            alt="ALAST Trophy"
            className="w-full h-full object-contain orange-gold-glow"
          />
          {/* Sheen sweep — 仅入场时一次（0.2–0.6s 段内） */}
          {!skip && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                backgroundSize: '240% 100%',
                WebkitMaskImage: 'url(/trophy.png)',
                maskImage: 'url(/trophy.png)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
              initial={{ backgroundPosition: '-160% 0' }}
              animate={{ backgroundPosition: '180% 0' }}
              transition={{ duration: 0.5, delay: 0.25, ease: 'easeInOut' }}
            />
          )}
        </div>
      </motion.div>

      {/* Sparks — 0.6s start, jitter 0–50ms (radial burst, all-at-once) */}
      {!skip && sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
          style={{
            width: 3,
            height: 3,
            background: '#FFD700',
            boxShadow: '0 0 6px 1px rgba(255,215,0,0.9)',
            ['--spark-x' as string]: `${s.x}px`,
            ['--spark-y' as string]: `${s.y}px`,
            animation: `sparkBurst 0.7s ease-out ${s.delay}s 1 both`,
          }}
        />
      ))}
    </div>
  )
}
