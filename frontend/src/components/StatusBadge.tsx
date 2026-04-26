import { glowPulse } from '../lib/motion'

interface Props {
  status: 'upcoming' | 'live' | 'finished'
}

export default function StatusBadge({ status }: Props) {
  if (status === 'live') {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border"
        style={{
          background: 'rgba(255, 43, 214, 0.12)',
          borderColor: 'rgba(255, 43, 214, 0.5)',
          ...glowPulse('loss'),
        }}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: 'var(--color-neon-pink)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: 'var(--color-neon-pink)' }}
          />
        </span>
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#FF6EC7' }}
        >
          LIVE
        </span>
      </div>
    )
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-sm bg-accent/10 border border-accent/20 text-[10px] font-black uppercase tracking-widest text-accent/80">
        即将开始
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
      已结束
    </span>
  )
}
