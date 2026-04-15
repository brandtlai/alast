// src/components/TrophySymbol.tsx
import { motion } from 'framer-motion'

interface TrophySymbolProps {
  variant?: 'full' | 'cropped' | 'outline' | 'dark'
  className?: string
}

const variantStyles: Record<string, React.CSSProperties> = {
  cropped: { opacity: 0.4, filter: 'grayscale(1)', clipPath: 'inset(0 0 40% 0)' },
  outline: { opacity: 0.1, filter: 'grayscale(1)' },
  dark:    { opacity: 0.03, filter: 'grayscale(1) invert(1)' },
}

export default function TrophySymbol({ variant = 'full', className = '' }: TrophySymbolProps) {
  if (variant === 'full') {
    return (
      <div className={`relative ${className}`}>
        <img
          src="/trophy.png"
          alt="ALAST Trophy"
          className="w-full h-full object-contain orange-gold-glow"
        />
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 3, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <img
      src="/trophy.png"
      alt=""
      aria-hidden
      className={`object-contain pointer-events-none select-none ${className}`}
      style={variantStyles[variant]}
    />
  )
}
