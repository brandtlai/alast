// 14 颗慢飘金色粒子，纯 CSS 实现。
// 仅挂在视觉密度低的 hero 区域（首页 + 战队详情），数据页不挂避免噪声。
// reduce-motion 通过 .ambient-particles 类整层 display:none。

const COLORS = ['#FFD700', '#FFB800', '#FF8A00'] as const
const COUNT = 14

interface Particle {
  size: number       // 1–3 px
  left: number       // 0–100 (%)
  startBottom: number // 0–60 (%) — 起飞高度随机化避免一齐起跳
  duration: number   // 30–60 s
  delay: number      // -60 – 0 s（负值让初始就处在动画中段）
  drift: number      // -20 – 20 px 横向终点
  color: string
  opacity: number    // 0.15–0.35
}

function makeParticles(): Particle[] {
  // 固定 seed 也行，但每次刷新轻微变化更有「活感」
  return Array.from({ length: COUNT }, () => ({
    size: 1 + Math.random() * 2,
    left: Math.random() * 100,
    startBottom: Math.random() * 60,
    duration: 30 + Math.random() * 30,
    delay: -Math.random() * 60,
    drift: -20 + Math.random() * 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 0.15 + Math.random() * 0.2,
  }))
}

interface Props {
  className?: string
}

export default function AmbientParticles({ className = '' }: Props) {
  const particles = makeParticles()

  return (
    <div
      className={`ambient-particles absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden
      style={{ zIndex: 1 }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: `${p.startBottom}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `particleDrift ${p.duration}s linear ${p.delay}s infinite`,
            ['--particle-x' as string]: `${p.drift}px`,
            ['--particle-opacity' as string]: String(p.opacity),
          }}
        />
      ))}
    </div>
  )
}
