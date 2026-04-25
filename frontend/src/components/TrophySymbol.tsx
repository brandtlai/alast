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
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src="/trophy.png"
          alt="ALAST Trophy"
          className="w-full h-full object-contain orange-gold-glow"
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 34%, rgba(255,255,255,0.28) 47%, rgba(255,213,94,0.18) 52%, transparent 66%)',
            backgroundSize: '240% 100%',
            backgroundPosition: '-160% 0',
            WebkitMaskImage: 'url(/trophy.png)',
            maskImage: 'url(/trophy.png)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
          animate={{ backgroundPosition: ['-160% 0', '180% 0'] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
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
